/**
 * Decimal Utility — wraps Decimal.js for all financial arithmetic.
 * All monetary calculations MUST go through these helpers.
 * Never use native JS arithmetic for financial values.
 */

import Decimal from 'decimal.js'

// Configure Decimal.js globally for financial precision
Decimal.set({
  precision: 28,       // 28 significant digits
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
})

export type MoneyInput = string | number | Decimal

/**
 * Create a Decimal from any input, coercing null/undefined to zero.
 */
export function d(value: MoneyInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  return new Decimal(String(value))
}

/**
 * Round a Decimal to the given decimal places (default: 4 for storage, 2 for display).
 */
export function round(value: MoneyInput, dp = 4): Decimal {
  return d(value).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP)
}

/**
 * Round to 2 decimal places for display / invoice totals.
 */
export function roundMoney(value: MoneyInput): Decimal {
  return round(value, 2)
}

/**
 * Calculate percentage: (value * pct) / 100
 */
export function applyPct(value: MoneyInput, pct: MoneyInput): Decimal {
  return d(value).mul(d(pct)).div(100)
}

/**
 * Compute tax amount from a subtotal.
 * taxRate is expressed as a percentage (e.g., 20 for 20%).
 */
export function calcTax(subtotal: MoneyInput, taxRate: MoneyInput): Decimal {
  return applyPct(subtotal, taxRate)
}

/**
 * Compute line total: (qty * unitPrice) * (1 - discountPct/100)
 */
export function calcLineSubtotal(
  quantity: MoneyInput,
  unitPrice: MoneyInput,
  discountPct: MoneyInput = 0,
): Decimal {
  const gross = d(quantity).mul(d(unitPrice))
  const discount = applyPct(gross, discountPct)
  return gross.minus(discount)
}

/**
 * Convert an amount from one currency to another using the given rate.
 * rate = units of target per 1 unit of source.
 */
export function convertCurrency(
  amount: MoneyInput,
  rate: MoneyInput,
  dp = 4,
): Decimal {
  return round(d(amount).mul(d(rate)), dp)
}

/**
 * Sum an array of Decimal-compatible values.
 */
export function sumAll(...values: (MoneyInput | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(d(v)), new Decimal(0))
}

/**
 * Serialize a Decimal for Prisma (Prisma accepts string Decimals via @db.Decimal).
 */
export function toDbDecimal(value: Decimal): string {
  return value.toFixed(4)
}

/**
 * Serialize a rate (8 decimal places).
 */
export function toDbRate(value: Decimal): string {
  return value.toFixed(8)
}

/**
 * Format for human display (2dp with comma separator).
 */
export function formatMoney(value: MoneyInput, currency = 'MAD'): string {
  const n = d(value).toFixed(2)
  return `${n} ${currency}`
}

/**
 * Safely compare two Decimal values.
 */
export const decEq = (a: MoneyInput, b: MoneyInput) => d(a).eq(d(b))
export const decGt = (a: MoneyInput, b: MoneyInput) => d(a).gt(d(b))
export const decGte = (a: MoneyInput, b: MoneyInput) => d(a).gte(d(b))
export const decLt = (a: MoneyInput, b: MoneyInput) => d(a).lt(d(b))
export const decLte = (a: MoneyInput, b: MoneyInput) => d(a).lte(d(b))
export const isZero = (a: MoneyInput) => d(a).isZero()
export const isPositive = (a: MoneyInput) => d(a).isPositive() && !d(a).isZero()
