/**
 * InvoiceService — Core invoice lifecycle engine
 * State machine: DRAFT → SENT → PARTIAL → PAID / OVERDUE / VOID
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InvoiceStatus, InvoiceType, AuditAction } from '@prisma/client'
import Decimal from 'decimal.js'
import { PrismaService } from '../../../shared/prisma.service'
import { AuditService, AuditContext } from '../../audit/audit.service'
import { VatService, TaxLineInput } from './vat.service'
import { CurrencyService } from './currency.service'
import { InvoiceNumberingService } from './invoice-numbering.service'
import { d, round, sumAll } from '../../../shared/decimal.util'
import { CreateInvoiceDto } from '../dto/create-invoice.dto'
import { UpdateInvoiceDto } from '../dto/update-invoice.dto'

export interface InvoiceSummary {
  id: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  customerId: string
  customerName: string
  currency: string
  grandTotal: Decimal
  grandTotalBase: Decimal
  amountPaid: Decimal
  amountDue: Decimal
  issueDate: Date
  dueDate: Date | null
  createdAt: Date
}

const VOIDABLE: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIAL,
]

const EDITABLE: InvoiceStatus[] = [InvoiceStatus.DRAFT]

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vat: VatService,
    private readonly currency: CurrencyService,
    private readonly numbering: InvoiceNumberingService,
  ) {}

  async create(ctx: AuditContext, dto: CreateInvoiceDto): Promise<string> {
    const invoice = await this.prisma.$transaction(async (tx: any) => {
      const invoiceNumber = await this.numbering.next(tx, ctx.companyId, dto.type)

      const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date()
      const { rate: exchangeRate, rateDate } = await this.currency.toBase(
        ctx.companyId, 1, dto.currency, issueDate,
      )

      const taxLines: TaxLineInput[] = dto.items.map((item) => ({
        description: item.description,
        subtotal: d(item.unitPrice).mul(d(item.quantity)).minus(d(item.discountAmount ?? 0)),
        taxRatePct: item.taxRatePct !== undefined ? d(item.taxRatePct) : undefined,
        isTaxInclusive: item.isTaxInclusive ?? false,
      }))

      const resolvedItems = await Promise.all(
        dto.items.map(async (item, i) => {
          let taxRate = d(0)
          let taxRateId: string | undefined = item.taxRateId

          if (item.taxRateId) {
            const tr = await this.vat.getTaxRate(ctx.companyId, item.taxRateId)
            taxRate = tr.rate
            taxLines[i].taxRatePct = taxRate
          } else if (item.taxRatePct !== undefined) {
            taxRate = d(item.taxRatePct)
          }

          return { item, taxRate, taxRateId }
        }),
      )

      const breakdown = this.vat.computeBreakdown(taxLines)
      const grandTotalBase = round(breakdown.grandTotal.mul(exchangeRate))

      const invoice = await tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          invoiceNumber,
          type: dto.type,
          status: InvoiceStatus.DRAFT,
          customerId: dto.customerId,
          bookingId: dto.bookingId ?? null,
          currency: dto.currency,
          baseCurrency: 'MAD',
          exchangeRate: exchangeRate.toFixed(8) as any,
          exchangeRateDate: rateDate,
          issueDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          subtotalAmount: breakdown.subtotalExcl.toFixed(4) as any,
          taxAmount: breakdown.totalTaxAmount.toFixed(4) as any,
          totalAmount: breakdown.grandTotal.toFixed(4) as any,
          totalAmountBase: grandTotalBase.toFixed(4) as any,
          amountPaid: '0' as any,
          amountDue: breakdown.grandTotal.toFixed(4) as any,
          notes: dto.notes ?? null,
          termsAndConditions: dto.termsAndConditions ?? null,
          taxBreakdown: {
            byRate: breakdown.byRate.map((b) => ({
              rate: b.rate.toFixed(4),
              taxType: b.taxType,
              taxableAmount: b.taxableAmount.toFixed(4),
              taxAmount: b.taxAmount.toFixed(4),
            })),
          },
        },
      })

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i]
        const { taxRate, taxRateId } = resolvedItems[i]
        const computed = breakdown.lines[i]

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            sortOrder: i,
            description: item.description,
            quantity: item.quantity.toString() as any,
            unitPrice: d(item.unitPrice).toFixed(4) as any,
            discountAmount: d(item.discountAmount ?? 0).toFixed(4) as any,
            taxRateId: taxRateId ?? null,
            taxRatePct: taxRate.toFixed(4) as any,
            taxAmount: computed.taxAmount.toFixed(4) as any,
            subtotalExcl: computed.taxableAmount.toFixed(4) as any,
            subtotalIncl: computed.grossAmount.toFixed(4) as any,
          },
        })
      }

      return invoice
    })

    await this.audit.log(ctx, {
      action: AuditAction.CREATE,
      entityType: 'Invoice',
      entityId: invoice.id,
      entityRef: invoice.invoiceNumber,
      after: { type: invoice.type, status: invoice.status, currency: invoice.currency },
    })

    this.logger.log(`Invoice created: ${invoice.invoiceNumber} [${invoice.id}]`)
    return invoice.id
  }

  async send(ctx: AuditContext, invoiceId: string): Promise<void> {
    const invoice = await this.findOrFail(ctx.companyId, invoiceId)

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(`Cannot send invoice in status ${invoice.status}.`)
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.SENT, sentAt: new Date() },
    })

    await this.audit.logInvoiceTransition(ctx, invoiceId, invoice.invoiceNumber, 'DRAFT', 'SENT')
    this.logger.log(`Invoice sent: ${invoice.invoiceNumber}`)
  }

  async void(ctx: AuditContext, invoiceId: string, reason: string): Promise<void> {
    const invoice = await this.findOrFail(ctx.companyId, invoiceId)

    if (!VOIDABLE.includes(invoice.status)) {
      throw new BadRequestException(`Cannot void invoice in status ${invoice.status}.`)
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.VOID, voidedAt: new Date(), voidReason: reason },
    })

    await this.audit.logInvoiceTransition(ctx, invoiceId, invoice.invoiceNumber, invoice.status, 'VOID', reason)
    this.logger.log(`Invoice voided: ${invoice.invoiceNumber}`)
  }

  async update(ctx: AuditContext, invoiceId: string, dto: UpdateInvoiceDto): Promise<void> {
    const invoice = await this.findOrFail(ctx.companyId, invoiceId)

    if (!EDITABLE.includes(invoice.status)) {
      throw new BadRequestException(`Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot be edited.`)
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        notes: dto.notes ?? invoice.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
        termsAndConditions: dto.termsAndConditions ?? invoice.termsAndConditions,
      },
    })

    await this.audit.log(ctx, {
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      entityRef: invoice.invoiceNumber,
    })
  }

  async syncPaymentStatus(ctx: AuditContext, invoiceId: string): Promise<void> {
    const invoice = await this.findOrFail(ctx.companyId, invoiceId)

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: {
        invoiceId,
        payment: { status: { not: 'VOID' } },
      },
      select: { allocatedAmount: true },
    })

    const totalPaid = sumAll(...allocations.map((a) => d(a.allocatedAmount.toString())))
    const total = d(invoice.totalAmount.toString())
    const amountDue = round(total.minus(totalPaid))

    let newStatus = invoice.status
    if (totalPaid.gte(total)) {
      newStatus = InvoiceStatus.PAID
    } else if (totalPaid.gt(0)) {
      newStatus = InvoiceStatus.PARTIAL
    }

    const prevStatus = invoice.status

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: totalPaid.toFixed(4) as any,
        amountDue: amountDue.toFixed(4) as any,
        status: newStatus,
        paidAt: newStatus === InvoiceStatus.PAID ? new Date() : invoice.paidAt,
      },
    })

    if (prevStatus !== newStatus) {
      await this.audit.logInvoiceTransition(ctx, invoiceId, invoice.invoiceNumber, prevStatus, newStatus)
    }
  }

  async markOverdue(companyId: string): Promise<number> {
    const result = await this.prisma.invoice.updateMany({
      where: {
        companyId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL] },
        dueDate: { lt: new Date() },
      },
      data: { status: InvoiceStatus.OVERDUE },
    })
    return result.count
  }

  async findById(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId, deletedAt: null },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        customer: { select: { id: true, name: true, email: true, taxNumber: true } },
        booking: { select: { id: true, bookingRef: true } },
        allocations: {
          include: { payment: true },
          where: { payment: { status: { not: 'VOID' } } },
        },
      },
    })

    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`)
    return invoice
  }

  async list(
    companyId: string,
    opts: {
      customerId?: string
      status?: InvoiceStatus
      type?: InvoiceType
      from?: Date
      to?: Date
      page?: number
      limit?: number
    } = {},
  ): Promise<{ items: InvoiceSummary[]; total: number }> {
    const page = opts.page ?? 1
    const limit = Math.min(opts.limit ?? 25, 100)
    const skip = (page - 1) * limit

    const where: any = {
      companyId,
      deletedAt: null,
      ...(opts.customerId && { customerId: opts.customerId }),
      ...(opts.status && { status: opts.status }),
      ...(opts.type && { type: opts.type }),
      ...(opts.from || opts.to
        ? { issueDate: { ...(opts.from && { gte: opts.from }), ...(opts.to && { lte: opts.to }) } }
        : {}),
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ])

    const items: InvoiceSummary[] = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      status: inv.status,
      customerId: inv.customerId,
      customerName: (inv as any).customer?.name ?? '',
      currency: inv.currency,
      grandTotal: d(inv.totalAmount.toString()),
      grandTotalBase: d(inv.totalAmountBase.toString()),
      amountPaid: d(inv.amountPaid.toString()),
      amountDue: d(inv.amountDue.toString()),
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    }))

    return { items, total }
  }

  async softDelete(ctx: AuditContext, invoiceId: string): Promise<void> {
    const invoice = await this.findOrFail(ctx.companyId, invoiceId)

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be deleted.')
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { deletedAt: new Date() },
    })

    await this.audit.log(ctx, {
      action: AuditAction.DELETE,
      entityType: 'Invoice',
      entityId: invoiceId,
      entityRef: invoice.invoiceNumber,
    })
  }

  private async findOrFail(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId, deletedAt: null },
    })
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`)
    return invoice
  }
}
