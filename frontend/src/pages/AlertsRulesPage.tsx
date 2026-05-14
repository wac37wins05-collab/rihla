/**
 * AlertsRulesPage — Alertes & Règles métier
 *
 * Vue complète :
 *  - Bande de KPIs (critique / warning / info / résolues)
 *  - Liste des alertes actives avec résolution one-click
 *  - Panneau de configuration des règles (activer/désactiver, seuil)
 *  - Historique des alertes résolues
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, AlertOctagon, Info, CheckCircle2,
  Settings2, ChevronRight, Bell, BellOff, Clock,
  RotateCcw, Trash2, ArrowUpRight, Shield, Sliders,
  Zap, TrendingDown, CreditCard, FileText, Users, CalendarCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  useAlertsEngine,
  type BusinessAlert,
  type AlertRule,
  type AlertRuleId,
  type AlertSeverity,
} from '@/hooks/useAlertsEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AlertSeverity, {
  bg: string; border: string; text: string; badge: string; dot: string
}> = {
  critical: {
    bg:     'bg-rose-50 dark:bg-rose-900/15',
    border: 'border-l-4 border-l-rose-500',
    text:   'text-rose-700 dark:text-rose-300',
    badge:  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    dot:    'bg-rose-500',
  },
  warning: {
    bg:     'bg-amber-50 dark:bg-amber-900/15',
    border: 'border-l-4 border-l-amber-400',
    text:   'text-amber-700 dark:text-amber-300',
    badge:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    dot:    'bg-amber-400',
  },
  info: {
    bg:     'bg-blue-50 dark:bg-blue-900/15',
    border: 'border-l-4 border-l-blue-400',
    text:   'text-blue-700 dark:text-blue-300',
    badge:  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    dot:    'bg-blue-400',
  },
}

const RULE_ICONS: Record<AlertRuleId, typeof AlertTriangle> = {
  payment_overdue:        CreditCard,
  deal_inactive:          TrendingDown,
  departure_no_programme: CalendarCheck,
  quotation_unsigned:     FileText,
  budget_exceeded:        Sliders,
  group_no_guide:         Users,
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Critique',
  warning:  'Avertissement',
  info:     'Info',
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SeverityIcon({ s, size = 15 }: { s: AlertSeverity; size?: number }) {
  if (s === 'critical') return <AlertOctagon size={size} className="text-rose-500" />
  if (s === 'warning')  return <AlertTriangle size={size} className="text-amber-500" />
  return <Info size={size} className="text-blue-500" />
}

function AlertCard({ alert, onResolve }: { alert: BusinessAlert; onResolve: (id: string) => void }) {
  const s = SEVERITY_STYLES[alert.severity]
  return (
    <div className={clsx('flex items-start gap-4 p-4 rounded-xl border border-transparent', s.bg, s.border)}>
      <div className="mt-0.5 flex-shrink-0">
        <SeverityIcon s={alert.severity} size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={clsx('text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', s.badge)}>
            {SEVERITY_LABELS[alert.severity]}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {alert.entity}
          </span>
        </div>

        <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {alert.title}
        </p>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          {alert.message}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <Link
            to={alert.ctaHref}
            className={clsx(
              'inline-flex items-center gap-1 text-[12px] font-medium',
              s.text,
              'hover:underline'
            )}
          >
            {alert.ctaLabel}
            <ArrowUpRight size={12} />
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock size={11} />
            {alert.daysOverdue > 0
              ? `${alert.daysOverdue}j de retard`
              : 'Dépassement en cours'}
          </span>
        </div>
      </div>

      <button
        onClick={() => onResolve(alert.id)}
        title="Marquer comme résolu"
        className="flex-shrink-0 flex items-center gap-1 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <CheckCircle2 size={16} />
      </button>
    </div>
  )
}

function RuleRow({ rule, onToggle, onThreshold }: {
  rule: AlertRule
  onToggle: (id: AlertRuleId, enabled: boolean) => void
  onThreshold: (id: AlertRuleId, days: number) => void
}) {
  const Icon = RULE_ICONS[rule.id]
  const s = SEVERITY_STYLES[rule.severity]

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 rounded-xl border transition-all',
      rule.enabled
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-60'
    )}>
      {/* Icon */}
      <div className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
        rule.enabled ? s.badge : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
      )}>
        <Icon size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
            {rule.label}
          </span>
          <span className={clsx('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', s.badge)}>
            {SEVERITY_LABELS[rule.severity]}
          </span>
        </div>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
          {rule.description}
        </p>
      </div>

      {/* Threshold */}
      {rule.thresholdDays > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="text-[11px] text-slate-400 whitespace-nowrap">Seuil (j)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={rule.thresholdDays}
            onChange={e => onThreshold(rule.id, Number(e.target.value))}
            disabled={!rule.enabled}
            className={clsx(
              'w-16 text-center text-[13px] font-semibold rounded-lg border px-2 py-1',
              'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600',
              'text-slate-700 dark:text-slate-200',
              'focus:outline-none focus:ring-2 focus:ring-rihla/30',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        title={rule.enabled ? 'Désactiver la règle' : 'Activer la règle'}
        className={clsx(
          'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
          rule.enabled
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
        )}
      >
        {rule.enabled ? <Bell size={13} /> : <BellOff size={13} />}
        {rule.enabled ? 'Active' : 'Inactive'}
      </button>
    </div>
  )
}

function ResolvedCard({ alert, onUnresolve }: { alert: BusinessAlert; onUnresolve: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 opacity-70">
      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 truncate">
          {alert.title} — {alert.entity}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{alert.message}</p>
      </div>
      <button
        onClick={() => onUnresolve(alert.id)}
        title="Rouvrir"
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'active' | 'rules' | 'resolved'

export function AlertsRulesPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')

  const {
    rules, updateRule,
    activeAlerts, resolvedAlerts,
    criticalCount, warningCount, infoCount, totalActive,
    resolveAlert, unresolveAlert, clearAllResolved,
  } = useAlertsEngine()

  const filteredAlerts = severityFilter === 'all'
    ? activeAlerts
    : activeAlerts.filter(a => a.severity === severityFilter)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'active',   label: 'Alertes actives', count: totalActive },
    { id: 'rules',    label: 'Règles',          count: rules.filter(r => r.enabled).length },
    { id: 'resolved', label: 'Résolues',        count: resolvedAlerts.length },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">
              Alertes & Règles métier
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 ml-10">
            Moteur de règles automatiques — surveillance continue de vos opérations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/operations/cockpit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Shield size={13} />
            Cockpit Live
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critiques', count: criticalCount, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/15', icon: AlertOctagon },
          { label: 'Avertissements', count: warningCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/15', icon: AlertTriangle },
          { label: 'Informations', count: infoCount, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/15', icon: Info },
          { label: 'Résolues', count: resolvedAlerts.length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/15', icon: CheckCircle2 },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className={clsx('rounded-xl p-4', bg)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-slate-500 dark:text-slate-400">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={clsx('text-[28px] font-bold leading-none', color)}>{count}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-[#5B1914] text-[#5B1914] dark:border-[#E8734A] dark:text-[#E8734A]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id
                  ? 'bg-[#5B1914]/10 text-[#5B1914] dark:bg-[#E8734A]/10 dark:text-[#E8734A]'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Active Alerts ────────────────────────────────────── */}
      {tab === 'active' && (
        <div className="space-y-4">
          {/* Severity filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">Filtrer :</span>
            {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={clsx(
                  'px-3 py-1 rounded-full text-[12px] font-medium transition-colors',
                  severityFilter === sev
                    ? sev === 'all'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : sev === 'critical'
                        ? 'bg-rose-500 text-white'
                        : sev === 'warning'
                          ? 'bg-amber-400 text-white'
                          : 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                {sev === 'all' ? 'Toutes' : SEVERITY_LABELS[sev]}
                {sev !== 'all' && (
                  <span className="ml-1 opacity-70">
                    {sev === 'critical' ? criticalCount : sev === 'warning' ? warningCount : infoCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-[16px] font-semibold text-slate-700 dark:text-slate-300">
                Aucune alerte active
              </p>
              <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
                {severityFilter !== 'all'
                  ? 'Aucune alerte pour ce niveau de sévérité.'
                  : 'Toutes vos règles métier sont respectées.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Rules Configuration ──────────────────────────────── */}
      {tab === 'rules' && (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
                Configuration des règles
              </p>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                Activez ou désactivez les règles, ajustez les seuils en jours.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Settings2 size={12} />
              {rules.filter(r => r.enabled).length} / {rules.length} actives
            </div>
          </div>

          {rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={(id, enabled) => updateRule(id, { enabled })}
              onThreshold={(id, days) => updateRule(id, { thresholdDays: days })}
            />
          ))}

          {/* Legend */}
          <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Comment fonctionnent les règles ?
            </p>
            <p className="text-[12px] text-slate-500 dark:text-slate-500 leading-relaxed">
              Le moteur évalue les règles actives à chaque chargement de la page.
              Les alertes générées apparaissent automatiquement dans ce tableau de bord
              et dans la cloche de notifications. Résolvez une alerte manuellement
              pour l'archiver — elle réapparaîtra si la condition persiste.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Resolved ─────────────────────────────────────────── */}
      {tab === 'resolved' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {resolvedAlerts.length} alerte{resolvedAlerts.length !== 1 ? 's' : ''} résolue{resolvedAlerts.length !== 1 ? 's' : ''}
            </p>
            {resolvedAlerts.length > 0 && (
              <button
                onClick={clearAllResolved}
                className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={12} />
                Effacer l'historique
              </button>
            )}
          </div>

          {resolvedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-slate-400" />
              </div>
              <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-400">
                Aucune alerte résolue
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                Les alertes résolues apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {resolvedAlerts.map(alert => (
                <ResolvedCard key={alert.id} alert={alert} onUnresolve={unresolveAlert} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
