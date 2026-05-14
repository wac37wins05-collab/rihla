/**
 * QuickActions — cross-domain widget for the Dashboard.
 * Groups the most valuable one-click actions across all 4 business pillars:
 *   · Cotation & Propositions
 *   · Opérations terrain
 *   · Finance & Facturation
 *   · CRM & Pipeline ventes
 */
import { Link } from 'react-router-dom'
import {
  Calculator, Send, MapPin, Navigation,
  Users, Car,
  Receipt, TrendingUp, PieChart,
  UserPlus, Inbox, BarChart2,
  Sparkles, ArrowRight,
} from 'lucide-react'
import { clsx } from 'clsx'

interface QuickAction {
  to: string
  icon: React.ElementType
  label: string
  desc?: string
}

interface Domain {
  id: string
  label: string
  color: {
    bg: string
    iconBg: string
    iconText: string
    pill: string
    badge: string
    border: string
    hover: string
  }
  actions: QuickAction[]
}

const DOMAINS: Domain[] = [
  {
    id: 'cotation',
    label: 'Cotation & Propositions',
    color: {
      bg:       'bg-emerald-50/60 dark:bg-emerald-900/10',
      iconBg:   'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      pill:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      badge:    'border-emerald-200 dark:border-emerald-800',
      border:   'border-emerald-200/60 dark:border-emerald-800/30',
      hover:    'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    },
    actions: [
      { to: '/quotations/new',         icon: Calculator, label: 'Nouveau devis',      desc: 'Circuit ou prestation' },
      { to: '/proposals',              icon: Send,       label: 'Propositions',        desc: 'Suivi envois client'   },
      { to: '/circuit-generator',      icon: MapPin,     label: 'Générateur circuit',  desc: 'IA + suggestions'      },
    ],
  },
  {
    id: 'ops',
    label: 'Opérations terrain',
    color: {
      bg:       'bg-blue-50/60 dark:bg-blue-900/10',
      iconBg:   'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      pill:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      badge:    'border-blue-200 dark:border-blue-800',
      border:   'border-blue-200/60 dark:border-blue-800/30',
      hover:    'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    },
    actions: [
      { to: '/operations/cockpit',     icon: Navigation, label: 'Cockpit Ops',         desc: 'Vue temps réel groupes' },
      { to: '/guides',                 icon: Users,      label: 'Guides & agents',      desc: 'Planning, affectation'  },
      { to: '/driver-portal',          icon: Car,        label: 'Portail chauffeurs',   desc: 'Missions, suivi route'  },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Facturation',
    color: {
      bg:       'bg-amber-50/60 dark:bg-amber-900/10',
      iconBg:   'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600 dark:text-amber-400',
      pill:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      badge:    'border-amber-200 dark:border-amber-800',
      border:   'border-amber-200/60 dark:border-amber-800/30',
      hover:    'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    },
    actions: [
      { to: '/invoices/new',           icon: Receipt,    label: 'Nouvelle facture',     desc: 'Facturer un dossier'    },
      { to: '/budget-tracker',         icon: TrendingUp, label: 'Budget tracker',       desc: 'Suivi charges / marges' },
      { to: '/finance',                icon: PieChart,   label: 'Dashboard finance',    desc: 'P&L, trésorerie, KPIs'  },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Pipeline ventes',
    color: {
      bg:       'bg-purple-50/60 dark:bg-purple-900/10',
      iconBg:   'bg-purple-100 dark:bg-purple-900/30',
      iconText: 'text-purple-600 dark:text-purple-400',
      pill:     'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      badge:    'border-purple-200 dark:border-purple-800',
      border:   'border-purple-200/60 dark:border-purple-800/30',
      hover:    'hover:bg-purple-50 dark:hover:bg-purple-900/20',
    },
    actions: [
      { to: '/crm/pipeline',           icon: UserPlus,   label: 'Nouvelle opportunité', desc: 'Ajouter au pipeline'    },
      { to: '/crm/leads',              icon: Inbox,      label: 'Lead inbox',           desc: 'Qualifier les leads'    },
      { to: '/crm/reporting',          icon: BarChart2,  label: 'Reporting CRM',        desc: 'Conversion, RFM, churn' },
    ],
  },
]

export function QuickActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-cream flex items-center gap-2">
          <Sparkles size={14} className="text-rihla" strokeWidth={2} />
          Actions rapides
        </h3>
        <span className="text-[11px] text-slate-400">4 domaines</span>
      </div>

      {/* Domain grid */}
      <div className={clsx(
        'grid divide-slate-100 dark:divide-white/5',
        compact
          ? 'grid-cols-1 divide-y'
          : 'grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x',
      )}>
        {DOMAINS.map(domain => (
          <div
            key={domain.id}
            className={clsx('p-4', domain.color.bg)}
          >
            {/* Domain label */}
            <div className="flex items-center gap-2 mb-3">
              <span className={clsx(
                'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                domain.color.pill,
              )}>
                {domain.label}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              {domain.actions.map(action => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all group',
                    'border border-transparent',
                    domain.color.hover,
                    'hover:border-current hover:border-opacity-10',
                  )}
                  style={{ borderColor: 'transparent' }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = ''
                  }}
                >
                  <div className={clsx(
                    'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                    domain.color.iconBg,
                    domain.color.iconText,
                  )}>
                    <action.icon size={14} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 dark:text-cream truncate leading-tight">
                      {action.label}
                    </p>
                    {action.desc && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {action.desc}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    size={12}
                    className="text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-all group-hover:translate-x-0.5 flex-shrink-0"
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
