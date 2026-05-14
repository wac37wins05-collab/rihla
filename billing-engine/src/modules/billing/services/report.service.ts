/**
 * ReportService — Financial reporting and analytics
 * ─────────────────────────────────────────────────────────────────
 * Reports:
 *  - Revenue summary (by period, by currency, by customer)
 *  - Accounts receivable aging (30/60/90/90+ days)
 *  - VAT report (by rate, by period — for DGI declaration)
 *  - Profitability report (revenue vs supplier costs vs commission)
 *  - Outstanding invoices dashboard
 *  - Payment collection report
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common'
import Decimal from 'decimal.js'
import { PrismaService } from '../../../shared/prisma.service'
import { d, round, sumAll } from '../../../shared/decimal.util'

export interface RevenueSummary {
  period: string
  invoiceCount: number
  totalRevenue: Decimal       // grand total incl. VAT (base currency)
  totalTax: Decimal
  totalRevenueExcl: Decimal   // excl. VAT
  collected: Decimal          // actually paid
  outstanding: Decimal
  currency: string
}

export interface AgingBucket {
  customerId: string
  customerName: string
  current: Decimal      // not yet due
  days30: Decimal       // 1–30 days overdue
  days60: Decimal       // 31–60 days overdue
  days90: Decimal       // 61–90 days overdue
  days90Plus: Decimal   // 90+ days overdue
  total: Decimal
  currency: string
}

export interface VatLineReport {
  taxRatePct: Decimal
  taxableAmount: Decimal
  taxAmount: Decimal
  invoiceCount: number
}

export interface ProfitabilityRow {
  bookingId: string
  bookingRef: string
  revenue: Decimal          // sum of final invoice totals
  supplierCost: Decimal     // sum of supplier invoice totals
  grossProfit: Decimal
  grossMarginPct: Decimal
  commission: Decimal
  netProfit: Decimal
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ── REVENUE SUMMARY ───────────────────────────────────────────────

  async revenueSummary(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<RevenueSummary> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        type: { in: ['FINAL', 'PROFORMA'] as any },
        status: { notIn: ['DRAFT', 'VOID'] as any },
        issueDate: { gte: from, lte: to },
        deletedAt: null,
      },
      select: {
        totalAmount: true,
        totalAmountBase: true,
        taxAmount: true,
        subtotalAmount: true,
        amountPaid: true,
        amountDue: true,
      },
    })

    const baseCurrency = await this.getBaseCurrency(companyId)

    const totalRevenue = sumAll(...invoices.map((i) => d(i.totalAmountBase.toString())))
    const totalTax = sumAll(...invoices.map((i) => d(i.taxAmount.toString())))
    const totalRevenueExcl = sumAll(...invoices.map((i) => d(i.subtotalAmount.toString())))
    const collected = sumAll(...invoices.map((i) => d(i.amountPaid.toString())))
    const outstanding = sumAll(...invoices.map((i) => d(i.amountDue.toString())))

    return {
      period: `${from.toISOString().slice(0, 10)} – ${to.toISOString().slice(0, 10)}`,
      invoiceCount: invoices.length,
      totalRevenue,
      totalTax,
      totalRevenueExcl,
      collected,
      outstanding,
      currency: baseCurrency,
    }
  }

  // ── ACCOUNTS RECEIVABLE AGING ─────────────────────────────────────

  async agingReport(companyId: string): Promise<AgingBucket[]> {
    const now = new Date()
    const baseCurrency = await this.getBaseCurrency(companyId)

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
        deletedAt: null,
      },
      select: {
        customerId: true,
        amountDue: true,
        dueDate: true,
        customer: { select: { name: true } },
      },
    })

    const buckets = new Map<
      string,
      {
        customerName: string
        current: Decimal
        days30: Decimal
        days60: Decimal
        days90: Decimal
        days90Plus: Decimal
      }
    >()

    for (const inv of invoices) {
      const due = d(inv.amountDue.toString())
      if (due.lte(0)) continue

      const existing = buckets.get(inv.customerId) ?? {
        customerName: (inv as any).customer?.name ?? '',
        current: new Decimal(0),
        days30: new Decimal(0),
        days60: new Decimal(0),
        days90: new Decimal(0),
        days90Plus: new Decimal(0),
      }

      if (!inv.dueDate || inv.dueDate > now) {
        existing.current = existing.current.plus(due)
      } else {
        const daysLate = Math.floor(
          (now.getTime() - inv.dueDate.getTime()) / 86_400_000,
        )
        if (daysLate <= 30) existing.days30 = existing.days30.plus(due)
        else if (daysLate <= 60) existing.days60 = existing.days60.plus(due)
        else if (daysLate <= 90) existing.days90 = existing.days90.plus(due)
        else existing.days90Plus = existing.days90Plus.plus(due)
      }

      buckets.set(inv.customerId, existing)
    }

    return Array.from(buckets.entries()).map(([customerId, b]) => ({
      customerId,
      customerName: b.customerName,
      current: round(b.current),
      days30: round(b.days30),
      days60: round(b.days60),
      days90: round(b.days90),
      days90Plus: round(b.days90Plus),
      total: round(b.current.plus(b.days30).plus(b.days60).plus(b.days90).plus(b.days90Plus)),
      currency: baseCurrency,
    }))
  }

  // ── VAT REPORT ────────────────────────────────────────────────────

  async vatReport(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<VatLineReport[]> {
    const items = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          status: { notIn: ['DRAFT', 'VOID'] as any },
          issueDate: { gte: from, lte: to },
          deletedAt: null,
        },
      },
      select: {
        taxRatePct: true,
        taxAmount: true,
        subtotalExcl: true,
        invoiceId: true,
      },
    })

    const rateMap = new Map<
      string,
      { taxableAmount: Decimal; taxAmount: Decimal; invoiceIds: Set<string> }
    >()

    for (const item of items) {
      const pct = item.taxRatePct?.toString() ?? '0'
      const existing = rateMap.get(pct) ?? {
        taxableAmount: new Decimal(0),
        taxAmount: new Decimal(0),
        invoiceIds: new Set<string>(),
      }
      existing.taxableAmount = existing.taxableAmount.plus(d(item.subtotalExcl.toString()))
      existing.taxAmount = existing.taxAmount.plus(d(item.taxAmount.toString()))
      existing.invoiceIds.add(item.invoiceId)
      rateMap.set(pct, existing)
    }

    return Array.from(rateMap.entries())
      .map(([pct, data]) => ({
        taxRatePct: d(pct),
        taxableAmount: round(data.taxableAmount),
        taxAmount: round(data.taxAmount),
        invoiceCount: data.invoiceIds.size,
      }))
      .sort((a, b) => a.taxRatePct.cmp(b.taxRatePct))
  }

  // ── PROFITABILITY ─────────────────────────────────────────────────

  async profitabilityReport(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<ProfitabilityRow[]> {
    // Revenue: FINAL invoices linked to bookings
    const revenueRows = await this.prisma.invoice.findMany({
      where: {
        companyId,
        type: 'FINAL' as any,
        status: { notIn: ['DRAFT', 'VOID'] as any },
        issueDate: { gte: from, lte: to },
        bookingId: { not: null },
        deletedAt: null,
      },
      select: {
        bookingId: true,
        totalAmountBase: true,
        booking: { select: { bookingRef: true } },
      },
    })

    // Supplier costs: SUPPLIER_INVOICE linked to bookings
    const costRows = await this.prisma.supplierInvoice.findMany({
      where: {
        companyId,
        status: { notIn: ['DRAFT', 'VOID'] as any },
        invoiceDate: { gte: from, lte: to },
        bookingId: { not: null },
        deletedAt: null,
      },
      select: { bookingId: true, totalAmountBase: true },
    })

    // Commission rows
    const commissions = await this.prisma.commission.findMany({
      where: {
        companyId,
        invoiceDate: { gte: from, lte: to },
      },
      select: { bookingId: true, amountBase: true },
    })

    // Group by bookingId
    const bookingMap = new Map<
      string,
      {
        bookingRef: string
        revenue: Decimal
        cost: Decimal
        commission: Decimal
      }
    >()

    for (const r of revenueRows) {
      if (!r.bookingId) continue
      const existing = bookingMap.get(r.bookingId) ?? {
        bookingRef: (r as any).booking?.bookingRef ?? '',
        revenue: new Decimal(0),
        cost: new Decimal(0),
        commission: new Decimal(0),
      }
      existing.revenue = existing.revenue.plus(d(r.totalAmountBase.toString()))
      bookingMap.set(r.bookingId, existing)
    }

    for (const c of costRows) {
      if (!c.bookingId) continue
      const existing = bookingMap.get(c.bookingId)
      if (existing) {
        existing.cost = existing.cost.plus(d(c.totalAmountBase.toString()))
      }
    }

    for (const cm of commissions) {
      if (!cm.bookingId) continue
      const existing = bookingMap.get(cm.bookingId)
      if (existing) {
        existing.commission = existing.commission.plus(d(cm.amountBase.toString()))
      }
    }

    return Array.from(bookingMap.entries()).map(([bookingId, data]) => {
      const grossProfit = data.revenue.minus(data.cost)
      const grossMarginPct = data.revenue.gt(0)
        ? round(grossProfit.div(data.revenue).mul(100))
        : new Decimal(0)
      const netProfit = grossProfit.minus(data.commission)

      return {
        bookingId,
        bookingRef: data.bookingRef,
        revenue: round(data.revenue),
        supplierCost: round(data.cost),
        grossProfit: round(grossProfit),
        grossMarginPct,
        commission: round(data.commission),
        netProfit: round(netProfit),
      }
    })
  }

  // ── HELPERS ───────────────────────────────────────────────────────

  private async getBaseCurrency(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { baseCurrency: true },
    })
    return company?.baseCurrency ?? 'MAD'
  }
}
