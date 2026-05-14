/**
 * AuditService — Immutable audit trail for all financial operations.
 */

import { Injectable } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import { PrismaService } from '../../shared/prisma.service'

export interface AuditContext {
  companyId: string
  userId?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditEntry {
  action: AuditAction
  entityType: string
  entityId: string
  entityRef?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changedFields?: string[]
  notes?: string
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(ctx: AuditContext, entry: AuditEntry): Promise<void> {
    const changedFields =
      entry.changedFields ??
      (entry.before && entry.after
        ? this.diffKeys(entry.before, entry.after)
        : undefined)

    await this.prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityRef: entry.entityRef,
        before: entry.before as any,
        after: entry.after as any,
        changedFields: changedFields ? { fields: changedFields } : undefined,
        notes: entry.notes,
      },
    })
  }

  async logInvoiceTransition(
    ctx: AuditContext,
    invoiceId: string,
    invoiceNumber: string,
    fromStatus: string,
    toStatus: string,
    notes?: string,
  ): Promise<void> {
    await this.prisma.invoiceAuditLog.create({
      data: {
        invoiceId,
        userId: ctx.userId,
        action: `STATUS_CHANGE`,
        fromStatus,
        toStatus,
        changes: { from: fromStatus, to: toStatus } as any,
        notes,
      },
    })

    await this.log(ctx, {
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      entityRef: invoiceNumber,
      changedFields: ['status'],
      notes: `${fromStatus} → ${toStatus}${notes ? ': ' + notes : ''}`,
    })
  }

  async getHistory(companyId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  private diffKeys(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): string[] {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    return Array.from(allKeys).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
    )
  }
}
