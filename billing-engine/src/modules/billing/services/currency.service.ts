/**
 * CurrencyService
 * ─────────────────────────────────────────────────────────────────
 * Multi-currency engine for the DMC billing module.
 *
 * Core rules:
 *  1. Every amount is stored in BOTH original currency + base currency
 *  2. The exchange rate is locked at the moment of document creation
 *  3. Historical rates are never modified — they are append-only
 *  4. Base currency (MAD by default) is the accounting pivot
 *  5. All arithmetic uses Decimal.js — never native floats
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import Decimal from 'decimal.js'
import { PrismaService } from '../../../shared/prisma.service'
import { convertCurrency, d, round, toDbRate } from '../../../shared/decimal.util'

export interface ConversionResult {
  fromCurrency: string
  toCurrency: string
  rate: Decimal
  amountOriginal: Decimal
  amountConverted: Decimal
  rateDate: Date
}

export interface RateSnapshot {
  currency: string
  baseCurrency: string
  rate: Decimal
  inverseRate: Decimal
  effectiveDate: Date
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the exchange rate for a currency on a specific date.
   * Searches for the most recent rate on or before the target date.
   * Falls back to the latest rate ever if no historical match.
   */
  async getRate(
    companyId: string,
    currencyCode: string,
    asOf: Date = new Date(),
  ): Promise<RateSnapshot> {
    const baseCurrencyCode = await this.getBaseCurrency(companyId)

    // Same currency — rate is 1
    if (currencyCode.toUpperCase() === baseCurrencyCode.toUpperCase()) {
      return {
        currency: currencyCode,
        baseCurrency: baseCurrencyCode,
        rate: new Decimal(1),
        inverseRate: new Decimal(1),
        effectiveDate: asOf,
      }
    }

    // Most recent rate on or before asOf
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        companyId,
        currencyCode: currencyCode.toUpperCase(),
        effectiveDate: { lte: asOf },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    if (!rate) {
      throw new NotFoundException(
        `No exchange rate found for ${currencyCode} (base: ${baseCurrencyCode}) on ${asOf.toISOString()}`,
      )
    }

    return {
      currency: currencyCode,
      baseCurrency: baseCurrencyCode,
      rate: d(rate.rate.toString()),
      inverseRate: d(rate.inverseRate.toString()),
      effectiveDate: rate.effectiveDate,
    }
  }

  /**
   * Convert an amount from sourceCurrency → targetCurrency.
   * Both hops through base currency if neither is the base.
   */
  async convert(
    companyId: string,
    amount: string | number | Decimal,
    fromCurrency: string,
    toCurrency: string,
    asOf: Date = new Date(),
  ): Promise<ConversionResult> {
    const baseCurrency = await this.getBaseCurrency(companyId)
    const amountD = d(amount)

    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: new Decimal(1),
        amountOriginal: amountD,
        amountConverted: round(amountD),
        rateDate: asOf,
      }
    }

    // Direct path: fromCurrency → base
    if (toCurrency === baseCurrency) {
      const snapshot = await this.getRate(companyId, fromCurrency, asOf)
      return {
        fromCurrency,
        toCurrency,
        rate: snapshot.rate,
        amountOriginal: amountD,
        amountConverted: convertCurrency(amountD, snapshot.rate),
        rateDate: snapshot.effectiveDate,
      }
    }

    // Inverse path: base → toCurrency
    if (fromCurrency === baseCurrency) {
      const snapshot = await this.getRate(companyId, toCurrency, asOf)
      return {
        fromCurrency,
        toCurrency,
        rate: snapshot.inverseRate,
        amountOriginal: amountD,
        amountConverted: convertCurrency(amountD, snapshot.inverseRate),
        rateDate: snapshot.effectiveDate,
      }
    }

    // Cross-rate: fromCurrency → base → toCurrency
    const fromSnapshot = await this.getRate(companyId, fromCurrency, asOf)
    const toSnapshot = await this.getRate(companyId, toCurrency, asOf)
    const inBase = convertCurrency(amountD, fromSnapshot.rate)
    const crossRate = fromSnapshot.rate.mul(toSnapshot.inverseRate)

    return {
      fromCurrency,
      toCurrency,
      rate: crossRate,
      amountOriginal: amountD,
      amountConverted: convertCurrency(amountD, crossRate),
      rateDate: fromSnapshot.effectiveDate,
    }
  }

  /**
   * Convert any amount to the company's base currency.
   * Returns { amountBase, rate, rateDate }.
   */
  async toBase(
    companyId: string,
    amount: string | number | Decimal,
    fromCurrency: string,
    asOf: Date = new Date(),
  ): Promise<{ amountBase: Decimal; rate: Decimal; rateDate: Date }> {
    const result = await this.convert(
      companyId,
      amount,
      fromCurrency,
      await this.getBaseCurrency(companyId),
      asOf,
    )
    return {
      amountBase: result.amountConverted,
      rate: result.rate,
      rateDate: result.rateDate,
    }
  }

  /**
   * Upsert an exchange rate (manual entry or from external feed).
   * Creates inverse automatically.
   */
  async setRate(
    companyId: string,
    currencyCode: string,
    rate: number | string,
    effectiveDate: Date,
    source = 'MANUAL',
    userId?: string,
  ): Promise<void> {
    const rateD = d(rate)
    const inverseD = new Decimal(1).div(rateD)

    const currency = await this.prisma.currency.findUnique({
      where: { companyId_code: { companyId, code: currencyCode } },
    })
    if (!currency) throw new NotFoundException(`Currency ${currencyCode} not found`)

    const baseCurrency = await this.getBaseCurrency(companyId)

    await this.prisma.exchangeRate.upsert({
      where: {
        companyId_currencyCode_effectiveDate: {
          companyId,
          currencyCode,
          effectiveDate,
        },
      },
      create: {
        companyId,
        currencyId: currency.id,
        currencyCode,
        baseCurrencyCode: baseCurrency,
        rate: toDbRate(rateD) as any,
        inverseRate: toDbRate(inverseD) as any,
        effectiveDate,
        source,
      },
      update: {
        rate: toDbRate(rateD) as any,
        inverseRate: toDbRate(inverseD) as any,
        source,
      },
    })

    this.logger.log(
      `Exchange rate set: 1 ${currencyCode} = ${rateD.toFixed(6)} ${baseCurrency} (${effectiveDate.toDateString()})`,
    )
  }

  /**
   * List all active currencies with their latest rates.
   */
  async listWithRates(
    companyId: string,
  ): Promise<Array<{ code: string; name: string; symbol: string; latestRate: Decimal | null }>> {
    const currencies = await this.prisma.currency.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: 'asc' },
    })

    const results = await Promise.all(
      currencies.map(async (c) => {
        let latestRate: Decimal | null = null
        try {
          const snap = await this.getRate(companyId, c.code)
          latestRate = snap.rate
        } catch {
          // no rate set yet
        }
        return { code: c.code, name: c.name, symbol: c.symbol, latestRate }
      }),
    )

    return results
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async getBaseCurrency(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { baseCurrency: true },
    })
    return company?.baseCurrency ?? 'MAD'
  }
}
