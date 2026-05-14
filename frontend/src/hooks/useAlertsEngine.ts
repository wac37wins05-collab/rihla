/**
 * useAlertsEngine — Moteur de règles métier automatiques
 *
 * Évalue en temps réel les règles suivantes :
 *  - Paiement en retard (facture impayée > seuil jours)
 *  - Deal inactif J+14 (aucune activité depuis N jours)
 *  - Départ J-7 sans programme confirmé
 *  - Devis non signé J+5
 *  - Budget dépassé sur un projet actif
 *  - Groupe en cours sans guide assigné
 *
 * Les alertes sont générées à partir de données démo ;
 * en production, remplacer DEMO_* par des appels API.
 */

import { useMemo, useState, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertRuleId =
  | 'payment_overdue'
  | 'deal_inactive'
  | 'departure_no_programme'
  | 'quotation_unsigned'
  | 'budget_exceeded'
  | 'group_no_guide'

export interface BusinessAlert {
  id: string
  ruleId: AlertRuleId
  severity: AlertSeverity
  title: string
  message: string
  entity: string        // e.g. "Facture F-2025-0142"
  entityRef: string     // short reference
  daysOverdue: number   // positive = overdue, negative = upcoming
  ctaLabel: string
  ctaHref: string
  generatedAt: Date
  resolved: boolean
}

export interface AlertRule {
  id: AlertRuleId
  label: string
  description: string
  enabled: boolean
  thresholdDays: number  // configurable trigger threshold
  severity: AlertSeverity
}

// ─────────────────────────────────────────────────────────────────────────────
// Default rules configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'payment_overdue',
    label: 'Paiement en retard',
    description: 'Déclenche une alerte quand une facture dépasse la date d\'échéance.',
    enabled: true,
    thresholdDays: 7,
    severity: 'critical',
  },
  {
    id: 'deal_inactive',
    label: 'Deal inactif',
    description: 'Alerte si aucune activité n\'est enregistrée sur un deal ouvert depuis N jours.',
    enabled: true,
    thresholdDays: 14,
    severity: 'warning',
  },
  {
    id: 'departure_no_programme',
    label: 'Départ sans programme',
    description: 'Alerte si un groupe part dans moins de N jours et n\'a pas de programme confirmé.',
    enabled: true,
    thresholdDays: 7,
    severity: 'critical',
  },
  {
    id: 'quotation_unsigned',
    label: 'Devis non signé',
    description: 'Alerte si un devis envoyé n\'est pas signé après N jours.',
    enabled: true,
    thresholdDays: 5,
    severity: 'warning',
  },
  {
    id: 'budget_exceeded',
    label: 'Budget dépassé',
    description: 'Alerte si le coût réel d\'un projet dépasse le budget prévu.',
    enabled: true,
    thresholdDays: 0,
    severity: 'warning',
  },
  {
    id: 'group_no_guide',
    label: 'Groupe sans guide',
    description: 'Alerte si un groupe actif n\'a pas de guide assigné.',
    enabled: true,
    thresholdDays: 3,
    severity: 'warning',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Demo data — simulates what would come from the API
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000)
const daysFrom = (d: number) => new Date(now.getTime() + d * 86_400_000)

interface DemoInvoice {
  ref: string; client: string; amount: number; currency: string; dueDate: Date; paid: boolean
}
interface DemoDeal {
  ref: string; client: string; value: number; lastActivity: Date; stage: string
}
interface DemoGroup {
  ref: string; name: string; departureDate: Date; programmeConfirmed: boolean; guideAssigned: boolean
}
interface DemoQuotation {
  ref: string; client: string; sentAt: Date; signed: boolean
}
interface DemoProject {
  ref: string; name: string; budgetMAD: number; spentMAD: number; status: string
}

const DEMO_INVOICES: DemoInvoice[] = [
  { ref: 'F-2026-0142', client: 'Acme Tours GmbH',    amount: 48_500, currency: 'MAD', dueDate: daysAgo(12), paid: false },
  { ref: 'F-2026-0158', client: 'Wanderlust Reisen',  amount: 22_000, currency: 'MAD', dueDate: daysAgo(3),  paid: false },
  { ref: 'F-2026-0163', client: 'Globetrotter Ltd',   amount: 95_000, currency: 'MAD', dueDate: daysAgo(1),  paid: false },
  { ref: 'F-2026-0171', client: 'Nordic Travels AS',  amount: 31_200, currency: 'MAD', dueDate: daysFrom(5), paid: false },
]

const DEMO_DEALS: DemoDeal[] = [
  { ref: 'DEAL-2026-041', client: 'Terra Magna Voyages', value: 85_000, lastActivity: daysAgo(16), stage: 'proposition' },
  { ref: 'DEAL-2026-055', client: 'Sun & Sand Tours',    value: 42_000, lastActivity: daysAgo(20), stage: 'negociation' },
  { ref: 'DEAL-2026-062', client: 'Alpine DMC AG',       value: 110_000, lastActivity: daysAgo(9),  stage: 'brief_received' },
]

const DEMO_GROUPS: DemoGroup[] = [
  { ref: 'GRP-2026-018', name: 'Maroc Impérial 8J — Espagnols', departureDate: daysFrom(5),  programmeConfirmed: false, guideAssigned: true },
  { ref: 'GRP-2026-021', name: 'Désert & Kasbahs 6J — Belges',  departureDate: daysFrom(3),  programmeConfirmed: false, guideAssigned: false },
  { ref: 'GRP-2026-024', name: 'Circuit Grand Sud 10J — Allemands', departureDate: daysFrom(12), programmeConfirmed: true, guideAssigned: false },
]

const DEMO_QUOTATIONS: DemoQuotation[] = [
  { ref: 'DEV-2026-089', client: 'Horizon Travels',   sentAt: daysAgo(8),  signed: false },
  { ref: 'DEV-2026-093', client: 'Orient Express DMC', sentAt: daysAgo(6),  signed: false },
  { ref: 'DEV-2026-097', client: 'Silk Road Partners', sentAt: daysAgo(3),  signed: false },
]

const DEMO_PROJECTS: DemoProject[] = [
  { ref: 'PROJ-2026-032', name: 'Sahara Express 5J', budgetMAD: 120_000, spentMAD: 131_500, status: 'active' },
  { ref: 'PROJ-2026-038', name: 'Imperial Cities 7J', budgetMAD: 95_000, spentMAD: 98_200, status: 'active' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Alert generators (one per rule)
// ─────────────────────────────────────────────────────────────────────────────

function genPaymentOverdue(rule: AlertRule): BusinessAlert[] {
  return DEMO_INVOICES
    .filter(inv => !inv.paid && inv.dueDate < now)
    .map(inv => {
      const overdueDays = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000)
      return {
        id: `payment_${inv.ref}`,
        ruleId: 'payment_overdue' as AlertRuleId,
        severity: overdueDays >= rule.thresholdDays ? rule.severity : 'info',
        title: 'Paiement en retard',
        message: `${inv.client} — ${inv.amount.toLocaleString('fr-MA')} ${inv.currency}, échéance dépassée de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}.`,
        entity: `Facture ${inv.ref}`,
        entityRef: inv.ref,
        daysOverdue: overdueDays,
        ctaLabel: 'Voir la facture',
        ctaHref: '/invoices',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

function genDealInactive(rule: AlertRule): BusinessAlert[] {
  return DEMO_DEALS
    .filter(deal => {
      const inactiveDays = Math.floor((now.getTime() - deal.lastActivity.getTime()) / 86_400_000)
      return inactiveDays >= rule.thresholdDays
    })
    .map(deal => {
      const inactiveDays = Math.floor((now.getTime() - deal.lastActivity.getTime()) / 86_400_000)
      return {
        id: `deal_${deal.ref}`,
        ruleId: 'deal_inactive' as AlertRuleId,
        severity: rule.severity,
        title: 'Deal inactif',
        message: `${deal.client} (${(deal.value / 1000).toFixed(0)}k MAD) — aucune activité depuis ${inactiveDays} jours. Étape : ${deal.stage}.`,
        entity: `Deal ${deal.ref}`,
        entityRef: deal.ref,
        daysOverdue: inactiveDays,
        ctaLabel: 'Ouvrir le CRM',
        ctaHref: '/crm/pipeline',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

function genDepartureNoProgramme(rule: AlertRule): BusinessAlert[] {
  return DEMO_GROUPS
    .filter(g => {
      const daysUntil = Math.floor((g.departureDate.getTime() - now.getTime()) / 86_400_000)
      return daysUntil <= rule.thresholdDays && !g.programmeConfirmed
    })
    .map(g => {
      const daysUntil = Math.floor((g.departureDate.getTime() - now.getTime()) / 86_400_000)
      return {
        id: `departure_${g.ref}`,
        ruleId: 'departure_no_programme' as AlertRuleId,
        severity: daysUntil <= 3 ? 'critical' : rule.severity,
        title: 'Départ sans programme confirmé',
        message: `${g.name} — départ dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}, programme non confirmé.`,
        entity: `Groupe ${g.ref}`,
        entityRef: g.ref,
        daysOverdue: rule.thresholdDays - daysUntil,
        ctaLabel: 'Ouvrir le cockpit',
        ctaHref: '/operations/cockpit',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

function genQuotationUnsigned(rule: AlertRule): BusinessAlert[] {
  return DEMO_QUOTATIONS
    .filter(q => {
      const waitDays = Math.floor((now.getTime() - q.sentAt.getTime()) / 86_400_000)
      return !q.signed && waitDays >= rule.thresholdDays
    })
    .map(q => {
      const waitDays = Math.floor((now.getTime() - q.sentAt.getTime()) / 86_400_000)
      return {
        id: `quotation_${q.ref}`,
        ruleId: 'quotation_unsigned' as AlertRuleId,
        severity: rule.severity,
        title: 'Devis en attente de signature',
        message: `${q.client} n'a pas signé le devis depuis ${waitDays} jours. Relance recommandée.`,
        entity: `Devis ${q.ref}`,
        entityRef: q.ref,
        daysOverdue: waitDays,
        ctaLabel: 'Voir le devis',
        ctaHref: '/quotations',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

function genBudgetExceeded(rule: AlertRule): BusinessAlert[] {
  return DEMO_PROJECTS
    .filter(p => p.status === 'active' && p.spentMAD > p.budgetMAD)
    .map(p => {
      const overrun = p.spentMAD - p.budgetMAD
      const pct = ((overrun / p.budgetMAD) * 100).toFixed(1)
      return {
        id: `budget_${p.ref}`,
        ruleId: 'budget_exceeded' as AlertRuleId,
        severity: rule.severity,
        title: 'Budget dépassé',
        message: `${p.name} — coût réel dépasse le budget de ${(overrun).toLocaleString('fr-MA')} MAD (+${pct}%).`,
        entity: `Projet ${p.ref}`,
        entityRef: p.ref,
        daysOverdue: 0,
        ctaLabel: 'Voir le budget',
        ctaHref: '/budget-tracker',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

function genGroupNoGuide(rule: AlertRule): BusinessAlert[] {
  return DEMO_GROUPS
    .filter(g => {
      const daysUntil = Math.floor((g.departureDate.getTime() - now.getTime()) / 86_400_000)
      return !g.guideAssigned && daysUntil <= rule.thresholdDays * 3 // wider window
    })
    .map(g => {
      const daysUntil = Math.floor((g.departureDate.getTime() - now.getTime()) / 86_400_000)
      return {
        id: `guide_${g.ref}`,
        ruleId: 'group_no_guide' as AlertRuleId,
        severity: daysUntil <= rule.thresholdDays ? 'critical' : rule.severity,
        title: 'Groupe sans guide assigné',
        message: `${g.name} — départ dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}, aucun guide affecté.`,
        entity: `Groupe ${g.ref}`,
        entityRef: g.ref,
        daysOverdue: 0,
        ctaLabel: 'Gérer les guides',
        ctaHref: '/guides',
        generatedAt: new Date(),
        resolved: false,
      }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────

const RULES_STORAGE_KEY = 'rihla_alert_rules_v1'
const RESOLVED_KEY      = 'rihla_alert_resolved_v1'

function loadRules(): AlertRule[] {
  try {
    const stored = localStorage.getItem(RULES_STORAGE_KEY)
    if (stored) {
      const parsed: AlertRule[] = JSON.parse(stored)
      // Merge stored with defaults (handles new rules added in code)
      return DEFAULT_RULES.map(def => {
        const found = parsed.find(r => r.id === def.id)
        return found ?? def
      })
    }
  } catch {}
  return DEFAULT_RULES
}

function loadResolved(): Set<string> {
  try {
    const stored = localStorage.getItem(RESOLVED_KEY)
    if (stored) return new Set<string>(JSON.parse(stored))
  } catch {}
  return new Set()
}

export function useAlertsEngine() {
  const [rules, setRules] = useState<AlertRule[]>(loadRules)
  const [resolved, setResolved] = useState<Set<string>>(loadResolved)

  // Persist rules
  const updateRule = useCallback((id: AlertRuleId, patch: Partial<AlertRule>) => {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      try { localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // Resolve / unresolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    setResolved(prev => {
      const next = new Set(prev)
      next.add(alertId)
      try { localStorage.setItem(RESOLVED_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const unresolveAlert = useCallback((alertId: string) => {
    setResolved(prev => {
      const next = new Set(prev)
      next.delete(alertId)
      try { localStorage.setItem(RESOLVED_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const clearAllResolved = useCallback(() => {
    setResolved(new Set())
    try { localStorage.removeItem(RESOLVED_KEY) } catch {}
  }, [])

  // Generate alerts from active rules
  const allAlerts = useMemo<BusinessAlert[]>(() => {
    const alerts: BusinessAlert[] = []
    for (const rule of rules) {
      if (!rule.enabled) continue
      switch (rule.id) {
        case 'payment_overdue':        alerts.push(...genPaymentOverdue(rule)); break
        case 'deal_inactive':          alerts.push(...genDealInactive(rule)); break
        case 'departure_no_programme': alerts.push(...genDepartureNoProgramme(rule)); break
        case 'quotation_unsigned':     alerts.push(...genQuotationUnsigned(rule)); break
        case 'budget_exceeded':        alerts.push(...genBudgetExceeded(rule)); break
        case 'group_no_guide':         alerts.push(...genGroupNoGuide(rule)); break
      }
    }
    // Severity sort: critical first
    return alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })
  }, [rules])

  const activeAlerts  = useMemo(() => allAlerts.filter(a => !resolved.has(a.id)), [allAlerts, resolved])
  const resolvedAlerts = useMemo(() => allAlerts.filter(a => resolved.has(a.id)), [allAlerts, resolved])

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length
  const warningCount  = activeAlerts.filter(a => a.severity === 'warning').length
  const infoCount     = activeAlerts.filter(a => a.severity === 'info').length

  return {
    rules,
    updateRule,
    activeAlerts,
    resolvedAlerts,
    allAlerts,
    criticalCount,
    warningCount,
    infoCount,
    totalActive: activeAlerts.length,
    resolveAlert,
    unresolveAlert,
    clearAllResolved,
  }
}
