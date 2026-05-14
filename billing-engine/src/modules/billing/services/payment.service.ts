/**
 * PaymentService — Payment recording, allocation, and reconciliation
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *  - Recording payments (full, partial, overpayment detection)
 *  - Allocating a single payment across multiple invoices
 *  - Voiding payments (reverses allocations)
 *  - Refunds (creates Refund record + reversal transaction)
 *  - Outstanding balance queries
 *
 * Immutability rules:
 *  - Payments are never modified after recording — void + re-record instead
 *  - Every payment creates a FinancialTransaction (immutable ledger)
 *  - Voids create a REVERSAL transaction, not a delete
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PaymentStatus, TransactionType, AuditAction } from '@prisma/client'
import Decimal from 'decimal.js'
import { PrismaService } from '../../../shared/prisma.service'
import { AuditService, AuditContext } from '../../audit/audit.service'
import { CurrencyService } from './currency.service'
import { InvoiceService } from './invoice.service'
import { d, round, sumAll } from '../../../shared/decimal.util'
import { RecordPaymentDto } from '../dto/record-payment.dto'

export interface PaymentResult {
  paymentId: string
  totalAllocated: Decimal
  fullyPaidInvoices: string[]
  partiallyPaidInvoices: string[]
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly currency: CurrencyService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ── RECORD PAYMENT ────────────────────────────────────────────────

  async record(
    ctx: AuditContext,
    dto: RecordPaymentDto,
  ): Promise<PaymentResult> {
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date()
    const amountD = d(dto.amount)

    // 1. Validate all invoices belong to this company
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: dto.invoiceIds },
        companyId: ctx.companyId,
        deletedAt: null,
      },
    })

    if (invoices.length !== dto.invoiceIds.length) {
      throw new NotFoundException('One or more invoices not found')
    }

    // Guard: can only pay SENT, PARTIAL, OVERDUE invoices
    const nonPayable = invoices.filter(
      (inv) =>
        !['SENT', 'PARTIAL', 'OVERDUE'].includes(inv.status),
    )
    if (nonPayable.length > 0) {
      throw new BadRequestException(
        `Invoices not in payable status: ${nonPayable.map((i) => i.invoiceNumber).join(', ')}`,
      )
    }

    // 2. Compute exchange rate to base currency
    const { amountBase, rate: exchangeRate } = await this.currency.toBase(
      ctx.companyId,
      amountD,
      dto.currency,
      paymentDate,
    )

    const result = await this.prisma.$transaction(async (tx: any) => {
      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          companyId: ctx.companyId,
          customerId: dto.customerId,
          currency: dto.currency,
          amount: amountD.toFixed(4) as any,
          amountBase: amountBase.toFixed(4) as any,
          exchangeRate: exchangeRate.toFixed(8) as any,
          paymentDate,
          method: dto.method,
          reference: dto.reference ?? null,
          bankAccount: dto.bankAccount ?? null,
          notes: dto.notes ?? null,
          status: PaymentStatus.COMPLETED,
        },
      })

      // 4. Allocate to invoices (FIFO — oldest first)
      const sortedInvoices = [...invoices].sort(
        (a, b) => a.issueDate.getTime() - b.issueDate.getTime(),
      )

      let remaining = amountD
      const fullyPaid: string[] = []
      const partiallyPaid: string[] = []
      let totalAllocated = new Decimal(0)

      for (const inv of sortedInvoices) {
        if (remaining.lte(0)) break

        const amountDue = d(inv.amountDue.toString())
        const allocate = round(Decimal.min(remaining, amountDue))

        if (allocate.lte(0)) continue

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: inv.id,
            allocatedAmount: allocate.toFixed(4) as any,
            allocatedAmountBase: round(allocate.mul(exchangeRate)).toFixed(4) as any,
          },
        })

        remaining = round(remaining.minus(allocate))
        totalAllocated = totalAllocated.plus(allocate)

        if (allocate.gte(amountDue)) {
          fullyPaid.push(inv.id)
        } else {
          partiallyPaid.push(inv.id)
        }
      }

      // 5. Record unallocated overpayment if any
      if (remaining.gt(0)) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { unallocatedAmount: remaining.toFixed(4) as any },
        })
        this.logger.warn(
          `Payment ${payment.id} has unallocated amount: ${remaining.toFixed(4)} ${dto.currency}`,
        )
      }

      // 6. Immutable ledger entry
      await tx.financialTransaction.create({
        data: {
          companyId: ctx.companyId,
          type: TransactionType.PAYMENT,
          referenceId: payment.id,
          referenceType: 'Payment',
          amount: amountD.toFixed(4) as any,
          amountBase: amountBase.toFixed(4) as any,
          currency: dto.currency,
          exchangeRate: exchangeRate.toFixed(8) as any,
          transactionDate: paymentDate,
          description: `Payment from customer ${dto.customerId}`,
          customerId: dto.customerId,
        },
      })

      return { payment, totalAllocated, fullyPaid, partiallyPaid }
    })

    // 7. Sync invoice statuses AFTER transaction commits
    for (const invoiceId of dto.invoiceIds) {
      await this.invoiceService.syncPaymentStatus(ctx, invoiceId)
    }

    // 8. Audit log
    await this.audit.log(ctx, {
      action: AuditAction.CREATE,
      entityType: 'Payment',
      entityId: result.payment.id,
      after: {
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        invoiceIds: dto.invoiceIds,
        totalAllocated: result.totalAllocated.toFixed(4),
      },
    })

    this.logger.log(
      `Payment ${result.payment.id} recorded: ${amountD.toFixed(4)} ${dto.currency} allocated to ${dto.invoiceIds.length} invoice(s)`,
    )

    return {
      paymentId: result.payment.id,
      totalAllocated: result.totalAllocated,
      fullyPaidInvoices: result.fullyPaid,
      partiallyPaidInvoices: result.partiallyPaid,
    }
  }

  // ── VOID PAYMENT ──────────────────────────────────────────────────

  async void(
    ctx: AuditContext,
    paymentId: string,
    reason: string,
  ): Promise<void> {
    const payment = await this.findPaymentOrFail(ctx.companyId, paymentId)

    if (payment.status === PaymentStatus.VOID) {
      throw new BadRequestException('Payment is already voided.')
    }

    // Gather invoices affected by this payment before voiding
    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentId },
      select: { invoiceId: true },
    })
    const affectedInvoiceIds = [...new Set(allocations.map((a) => a.invoiceId))]

    await this.prisma.$transaction(async (tx: any) => {
      // Mark payment void
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.VOID, voidReason: reason, voidedAt: new Date() },
      })

      // Reversal ledger entry
      await tx.financialTransaction.create({
        data: {
          companyId: ctx.companyId,
          type: TransactionType.REVERSAL,
          referenceId: paymentId,
          referenceType: 'Payment',
          amount: (-(parseFloat(payment.amount.toString()))).toFixed(4) as any,
          amountBase: (-(parseFloat(payment.amountBase.toString()))).toFixed(4) as any,
          currency: payment.currency,
          exchangeRate: payment.exchangeRate as any,
          transactionDate: new Date(),
          description: `Reversal of payment ${paymentId}: ${reason}`,
          customerId: payment.customerId,
        },
      })
    })

    // Re-sync all affected invoices
    for (const invoiceId of affectedInvoiceIds) {
      await this.invoiceService.syncPaymentStatus(ctx, invoiceId)
    }

    await this.audit.log(ctx, {
      action: AuditAction.VOID,
      entityType: 'Payment',
      entityId: paymentId,
      notes: reason,
    })

    this.logger.log(`Payment ${paymentId} voided: ${reason}`)
  }

  // ── REFUND ────────────────────────────────────────────────────────

  async refund(
    ctx: AuditContext,
    paymentId: string,
    amount: string | number | Decimal,
    reason: string,
    method?: string,
  ): Promise<string> {
    const payment = await this.findPaymentOrFail(ctx.companyId, paymentId)

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund a completed payment.')
    }

    const amountD = d(amount)
    const originalAmount = d(payment.amount.toString())

    if (amountD.gt(originalAmount)) {
      throw new BadRequestException(
        `Refund amount ${amountD.toFixed(4)} exceeds original payment ${originalAmount.toFixed(4)}`,
      )
    }

    const refundDate = new Date()
    const { amountBase } = await this.currency.toBase(
      ctx.companyId,
      amountD,
      payment.currency,
      refundDate,
    )

    const refund = await this.prisma.$transaction(async (tx: any) => {
      const refund = await tx.refund.create({
        data: {
          companyId: ctx.companyId,
          paymentId,
          customerId: payment.customerId,
          currency: payment.currency,
          amount: amountD.toFixed(4) as any,
          amountBase: amountBase.toFixed(4) as any,
          refundDate,
          method: method ?? payment.method,
          reason,
        },
      })

      // Ledger reversal entry
      await tx.financialTransaction.create({
        data: {
          companyId: ctx.companyId,
          type: TransactionType.REFUND,
          referenceId: refund.id,
          referenceType: 'Refund',
          amount: (-amountD.toNumber()).toFixed(4) as any,
          amountBase: (-amountBase.toNumber()).toFixed(4) as any,
          currency: payment.currency,
          exchangeRate: payment.exchangeRate as any,
          transactionDate: refundDate,
          description: `Refund for payment ${paymentId}: ${reason}`,
          customerId: payment.customerId,
        },
      })

      return refund
    })

    await this.audit.log(ctx, {
      action: AuditAction.CREATE,
      entityType: 'Refund',
      entityId: refund.id,
      notes: `Refund of ${amountD.toFixed(4)} ${payment.currency} for payment ${paymentId}: ${reason}`,
    })

    this.logger.log(`Refund ${refund.id} created for payment ${paymentId}`)
    return refund.id
  }

  // ── CUSTOMER OUTSTANDING BALANCE ──────────────────────────────────

  async outstandingBalance(
    companyId: string,
    customerId: string,
  ): Promise<{
    totalOutstanding: Decimal
    overdueAmount: Decimal
    currency: string
    invoiceCount: number
  }> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
        deletedAt: null,
      },
      select: {
        amountDue: true,
        totalAmountBase: true,
        status: true,
      },
    })

    const totalOutstanding = sumAll(...invoices.map((i) => d(i.amountDue.toString())))
    const overdueAmount = sumAll(
      ...invoices
        .filter((i) => i.status === 'OVERDUE')
        .map((i) => d(i.amountDue.toString())),
    )

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { baseCurrency: true },
    })

    return {
      totalOutstanding,
      overdueAmount,
      currency: company?.baseCurrency ?? 'MAD',
      invoiceCount: invoices.length,
    }
  }

  // ── FIND PAYMENT ──────────────────────────────────────────────────

  async findById(companyId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, companyId },
      include: {
        allocations: {
          include: {
            invoice: {
              select: { invoiceNumber: true, totalAmount: true, currency: true },
            },
          },
        },
        refunds: true,
      },
    })

    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`)
    return payment
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────

  private async findPaymentOrFail(companyId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, companyId },
    })
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`)
    return payment
  }
}
