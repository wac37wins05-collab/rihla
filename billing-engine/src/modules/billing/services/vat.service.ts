/**
 * VatService — Multi-jurisdiction tax engine
 * ─────────────────────────────────────────────────────────────────
 * Supports:
 *  - Multiple tax types (VAT, GST, withholding)
 *  - Tax-inclusive and tax-exclusive modes
 *  - Compound taxes (tax on tax)
 *  - Zero-rate and exempt categories
 *  - Historical rate snapshots (rate locked at document creation)
 *  - Morocco TVA rules (7%, 10%, 14%, 20%)
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, NotFoundException } from '@nestjs/common'
import Decimal from 'decimal.js'
import { TaxType } from '@prisma/client'
import { PrismaService } from '../../../shared/prisma.service'
import { applyPct, d, round } from '../../../shared/decimal.util'

export interface TaxLineInput {
  description: string
  subtotal: Decimal    // line amount before tax
  taxRateId?: string   // explicit rate override
  taxRatePct?: Decimal // direct percentage (when no DB rate needed)
  taxType?: TaxType
  isTaxInclusive?: boolean
}

export interface TaxLineResult {
  description: string
  taxableAmount: Decimal    // net (tax-exclusive)
  taxRate: Decimal          // as percentage e.g. 20.00
  taxAmount: Decimal        // actual tax collected
  grossAmount: Decimal      // taxableAmount + taxAmount
  taxType: TaxType
  taxRateId?: string
}

export interface InvoiceTaxBreakdown {
  lines: TaxLineResult[]
  subtotalExcl: Decimal     // total before tax
  totalTaxAmount: Decimal
  grandTotal: Decimal
  // Grouped by rate for invoice display
  byRate: Array<{ rate: Decimal; taxType: TaxType; taxableAmount: Decimal; taxAmount: Decimal }>
}

@Injectable()
export class VatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up a tax rate from the database.
   * Returns a snapshot (rate is a Decimal, not the DB record directly).
   */
  async getTaxRate(
    companyId: string,
    taxRateId: string,
  ): Promise<{ id: string; rate: Decimal; type: TaxType; name: string; code: string }> {
    const tr = await this.prisma.taxRate.findFirst({
      where: { id: taxRateId, companyId, isActive: true },
    })
    if (!tr) throw new NotFoundException(`Tax rate ${taxRateId} not found or inactive`)
    return {
      id: tr.id,
      rate: d(tr.rate.toString()),
      type: tr.type,
      name: tr.name,
      code: tr.code,
    }
  }

  /**
   * Get the default (company-level) tax rate.
   */
  async getDefault(
    companyId: string,
  ): Promise<{ id: string; rate: Decimal; type: TaxType } | null> {
    const tr = await this.prisma.taxRate.findFirst({
      where: { companyId, isDefault: true, isActive: true },
    })
    if (!tr) return null
    return { id: tr.id, rate: d(tr.rate.toString()), type: tr.type }
  }

  /**
   * Compute tax for a single line item.
   *
   * Two modes:
   *  - Tax-exclusive: subtotal is net, tax is added on top
   *  - Tax-inclusive: subtotal already includes tax (back-calculation)
   */
  computeLine(input: TaxLineInput): TaxLineResult {
    const rate = input.taxRatePct ?? d(0)
    const isTaxInclusive = input.isTaxInclusive ?? false

    if (isTaxInclusive) {
      // Back-calculate: net = gross / (1 + rate/100)
      const divisor = d(1).plus(rate.div(100))
      const taxableAmount = round(input.subtotal.div(divisor))
      const taxAmount = round(input.subtotal.minus(taxableAmount))

      return {
        description: input.description,
        taxableAmount,
        taxRate: rate,
        taxAmount,
        grossAmount: round(input.subtotal),
        taxType: input.taxType ?? TaxType.VAT,
        taxRateId: input.taxRateId,
      }
    }

    // Tax-exclusive (standard)
    const taxAmount = round(applyPct(input.subtotal, rate))

    return {
      description: input.description,
      taxableAmount: round(input.subtotal),
      taxRate: rate,
      taxAmount,
      grossAmount: round(input.subtotal.plus(taxAmount)),
      taxType: input.taxType ?? TaxType.VAT,
      taxRateId: input.taxRateId,
    }
  }

  /**
   * Compute the full tax breakdown for a set of invoice lines.
   * Groups tax by rate for the invoice summary section.
   */
  computeBreakdown(lines: TaxLineInput[]): InvoiceTaxBreakdown {
    const computed = lines.map((l) => this.computeLine(l))

    const subtotalExcl = computed.reduce(
      (acc, l) => acc.plus(l.taxableAmount),
      new Decimal(0),
    )
    const totalTaxAmount = computed.reduce(
      (acc, l) => acc.plus(l.taxAmount),
      new Decimal(0),
    )
    const grandTotal = subtotalExcl.plus(totalTaxAmount)

    // Group by rate
    const rateMap = new Map<
      string,
      { rate: Decimal; taxType: TaxType; taxableAmount: Decimal; taxAmount: Decimal }
    >()

    for (const l of computed) {
      const key = `${l.taxRate.toFixed(4)}-${l.taxType}`
      const existing = rateMap.get(key)
      if (existing) {
        rateMap.set(key, {
          ...existing,
          taxableAmount: existing.taxableAmount.plus(l.taxableAmount),
          taxAmount: existing.taxAmount.plus(l.taxAmount),
        })
      } else {
        rateMap.set(key, {
          rate: l.taxRate,
          taxType: l.taxType,
          taxableAmount: l.taxableAmount,
          taxAmount: l.taxAmount,
        })
      }
    }

    return {
      lines: computed,
      subtotalExcl: round(subtotalExcl),
      totalTaxAmount: round(totalTaxAmount),
      grandTotal: round(grandTotal),
      byRate: Array.from(rateMap.values()).sort((a, b) => a.rate.cmp(b.rate)),
    }
  }

  /**
   * List all active tax rates for a company (for form selectors).
   */
  async listRates(companyId: string): Promise<
    Array<{
      id: string
      name: string
      code: string
      rate: Decimal
      type: TaxType
      isDefault: boolean
    }>
  > {
    const rates = await this.prisma.taxRate.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { rate: 'asc' }],
    })
    return rates.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      rate: d(r.rate.toString()),
      type: r.type,
      isDefault: r.isDefault,
    }))
  }

  /**
   * Pre-seed standard Morocco TVA rates.
   * Run once during company onboarding.
   */
  async seedMoroccoRates(companyId: string): Promise<void> {
    const MA_RATES = [
      { code: 'TVA0', name: 'Exonéré (0%)', rate: '0', isDefault: false },
      { code: 'TVA7', name: 'TVA 7%', rate: '7', isDefault: false },
      { code: 'TVA10', name: 'TVA 10%', rate: '10', isDefault: false },
      { code: 'TVA14', name: 'TVA 14%', rate: '14', isDefault: false },
      { code: 'TVA20', name: 'TVA 20%', rate: '20', isDefault: true },
    ]

    for (const r of MA_RATES) {
      await this.prisma.taxRate.upsert({
        where: { companyId_code: { companyId, code: r.code } },
        create: {
          companyId,
          code: r.code,
          name: r.name,
          type: TaxType.VAT,
          rate: r.rate as any,
          country: 'MA',
          isDefault: r.isDefault,
          isActive: true,
        },
        update: { name: r.name, rate: r.rate as any, isDefault: r.isDefault },
      })
    }
  }
}
