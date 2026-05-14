/**
 * InvoiceNumberingService
 * ─────────────────────────────────────────────────────────────────
 * Generates unique, sequential, gapless invoice numbers using
 * an advisory-lock + atomic UPDATE strategy.
 *
 * Format: {PREFIX}-{YEAR}-{SEQUENCE}
 * Examples:
 *   INV-2026-000001   (Final Invoice)
 *   PRO-2026-000042   (Proforma)
 *   CN-2026-000003    (Credit Note)
 *   SINV-2026-000015  (Supplier Invoice)
 *
 * Concurrency strategy:
 *   SELECT … FOR UPDATE on the InvoiceSequence row ensures
 *   exactly-once increment even under high concurrency.
 *   Wrap in a transaction at the call site.
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common'
import { InvoiceType } from '@prisma/client'
import { PrismaService } from '../../../shared/prisma.service'

@Injectable()
export class InvoiceNumberingService {
  private readonly logger = new Logger(InvoiceNumberingService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate the next invoice number for a given company + type.
   * MUST be called inside an active transaction (tx = prisma client).
   *
   * @example
   *   await prisma.$transaction(async (tx) => {
   *     const number = await numberingService.next(tx, companyId, InvoiceType.FINAL)
   *     // create invoice with number
   *   })
   */
  async next(
    tx: PrismaService,
    companyId: string,
    type: InvoiceType,
    year?: number,
  ): Promise<string> {
    const targetYear = year ?? new Date().getFullYear()

    // 1. Upsert the sequence row (create if first invoice of the year)
    await tx.invoiceSequence.upsert({
      where: {
        companyId_type_year: { companyId, type, year: targetYear },
      },
      create: {
        companyId,
        type,
        year: targetYear,
        prefix: this.defaultPrefix(type),
        lastNumber: 0,
        padding: 6,
      },
      update: {}, // no-op on conflict — just ensure it exists
    })

    // 2. Atomic increment via raw SQL (avoids SELECT + UPDATE race condition)
    const result = await tx.$queryRaw<{ last_number: number; prefix: string; padding: number }[]>`
      UPDATE invoice_sequences
      SET    last_number = last_number + 1,
             updated_at  = NOW()
      WHERE  company_id = ${companyId}
        AND  type       = ${type}::"InvoiceType"
        AND  year       = ${targetYear}
      RETURNING last_number, prefix, padding
    `

    if (!result.length) {
      throw new Error(
        `InvoiceSequence not found for company=${companyId} type=${type} year=${targetYear}`,
      )
    }

    const { last_number, prefix, padding } = result[0]
    const sequence = String(last_number).padStart(padding, '0')
    const number = `${prefix}-${targetYear}-${sequence}`

    this.logger.debug(`Generated invoice number: ${number}`)
    return number
  }

  /**
   * Preview the next number WITHOUT incrementing (read-only).
   * Useful for UI previews before form submission.
   */
  async peek(companyId: string, type: InvoiceType, year?: number): Promise<string> {
    const targetYear = year ?? new Date().getFullYear()
    const seq = await this.prisma.invoiceSequence.findUnique({
      where: { companyId_type_year: { companyId, type, year: targetYear } },
    })

    const lastNumber = seq?.lastNumber ?? 0
    const prefix = seq?.prefix ?? this.defaultPrefix(type)
    const padding = seq?.padding ?? 6
    const next = String(lastNumber + 1).padStart(padding, '0')
    return `${prefix}-${targetYear}-${next}`
  }

  /**
   * Parse a number back into its components.
   */
  parse(number: string): { prefix: string; year: number; sequence: number } | null {
    const match = number.match(/^([A-Z]+)-(\d{4})-(\d+)$/)
    if (!match) return null
    return {
      prefix: match[1],
      year: parseInt(match[2], 10),
      sequence: parseInt(match[3], 10),
    }
  }

  private defaultPrefix(type: InvoiceType): string {
    const map: Record<InvoiceType, string> = {
      FINAL: 'INV',
      PROFORMA: 'PRO',
      CREDIT_NOTE: 'CN',
      SUPPLIER_INVOICE: 'SINV',
      RECEIPT: 'REC',
    }
    return map[type] ?? 'DOC'
  }
}
