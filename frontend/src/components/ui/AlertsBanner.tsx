/**
 * AlertsBanner — Contextual smart-alert strip for the Dashboard.
 *
 * Fetches GET /dashboard/alerts and renders dismissible alert chips.
 * Levels: 'critical' | 'warning' | 'info' | 'success'
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi } from '@/lib/api'
import {
  AlertTriangle, Info, CheckCircle2, X, ChevronRight,
  XCircle, Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info' | 'success'
  type: string
  title: string
  message: string
  cta: string | null
  cta_href: string | null
}

const LEVEL_STYLES: Record<Alert['level'], {
  container: string
  icon: string
  text: string
  dismiss: string
  IconComp: typeof AlertTriangle
}> = {
  critical: {
    container: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-500/20',
    icon:      'text-rose-500',
    text:      'text-rose-800 dark:text-rose-300',
    dismiss:   'text-rose-400 hover:text-rose-600',
    IconComp:  XCircle,
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/20',
    icon:      'text-amber-500',
    text:      'text-amber-800 dark:text-amber-300',
    dismiss:   'text-amber-400 hover:text-amber-600',
    IconComp:  AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/20',
    icon:      'text-blue-500',
    text:      'text-blue-800 dark:text-blue-300',
    dismiss:   'text-blue-400 hover:text-blue-600',
    IconComp:  Info,
  },
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/20',
    icon:      'text-emerald-500',
    text:      'text-emerald-800 dark:text-emerald-300',
    dismiss:   'text-emerald-400 hover:text-emerald-600',
    IconComp:  CheckCircle2,
  },
}

export function AlertsBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardApi.alerts().then((r) => r.data),
    staleTime: 60_000,       // re-fetch after 1 min
    refetchInterval: 120_000, // background refresh every 2 min
  })

  const alerts: Alert[] = (data?.alerts ?? []).filter(
    (a: Alert) => !dismissed.has(a.id),
  )

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set([...prev, id]))

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-[12px] px-1 py-2">
        <Loader2 size={13} className="animate-spin" />
        Chargement des alertes…
      </div>
    )
  }

  if (!alerts.length) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const styles = LEVEL_STYLES[alert.level]
        const { IconComp } = styles

        return (
          <div
            key={alert.id}
            className={clsx(
              'flex items-start gap-3 px-4 py-3 rounded-lg border',
              styles.container,
            )}
          >
            {/* Icon */}
            <IconComp
              size={15}
              className={clsx('flex-shrink-0 mt-0.5', styles.icon)}
              strokeWidth={2}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={clsx('text-[13px] font-semibold leading-tight', styles.text)}>
                {alert.title}
              </p>
              <p className={clsx('text-[12px] mt-0.5 leading-relaxed opacity-80', styles.text)}>
                {alert.message}
              </p>
            </div>

            {/* CTA */}
            {alert.cta && alert.cta_href && (
              <Link
                to={alert.cta_href}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1 text-[12px] font-medium whitespace-nowrap',
                  styles.text,
                  'hover:underline',
                )}
              >
                {alert.cta}
                <ChevronRight size={12} strokeWidth={2.5} />
              </Link>
            )}

            {/* Dismiss */}
            <button
              onClick={() => dismiss(alert.id)}
              className={clsx('flex-shrink-0 transition-colors', styles.dismiss)}
              title="Fermer"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
