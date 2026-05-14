import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from './Sparkline'

// ═══════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════
interface BadgeProps {
  children: ReactNode
  variant?: 'rihla' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  const variants = {
    rihla:   'bg-rihla-50 text-rihla-dark border-rihla-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger:  'bg-red-50 text-red-700 border-red-200',
    info:    'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-parchment text-slate border-line-soft',
  }

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 font-semibold rounded-pill border',
      'uppercase tracking-wider',
      size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════
const STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  draft:       { label: 'Brouillon',   variant: 'neutral' },
  in_progress: { label: 'En cours',    variant: 'info' },
  validated:   { label: 'Validé',      variant: 'success' },
  sent:        { label: 'Envoyé',      variant: 'warning' },
  won:         { label: 'Confirmé',    variant: 'success' },
  lost:        { label: 'Perdu',       variant: 'danger' },
  calculated:  { label: 'Calculé',     variant: 'info' },
  approved:    { label: 'Approuvé',    variant: 'success' },
  exported:    { label: 'Exporté',     variant: 'warning' },
  issued:      { label: 'Émise',       variant: 'info' },
  paid:        { label: 'Réglée',      variant: 'success' },
  cancelled:   { label: 'Annulée',     variant: 'danger' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'neutral' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

// ═══════════════════════════════════════════════════════════════════
// PILL (status with dot)
// ═══════════════════════════════════════════════════════════════════
const PILL_COLORS: Record<string, string> = {
  draft:       'bg-parchment text-slate',
  in_progress: 'bg-blue-50 text-blue-700',
  validated:   'bg-emerald-50 text-emerald-700',
  sent:        'bg-amber-50 text-amber-700',
  won:         'bg-emerald-50 text-emerald-700',
  lost:        'bg-red-50 text-red-700',
  paid:        'bg-emerald-50 text-emerald-700',
  issued:      'bg-blue-50 text-blue-700',
  cancelled:   'bg-red-50 text-red-700',
}

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'neutral' as const }
  const color = PILL_COLORS[status] ?? 'bg-parchment text-slate'
  return (
    <span className={clsx('pill', color)}>
      {cfg.label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className={clsx('animate-spin text-rihla', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
              strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════
type EmptyStateVariant = 'default' | 'search' | 'error' | 'permission' | 'creation'

const EMPTY_STATE_ICONS: Record<EmptyStateVariant, string> = {
  default:    '📂',
  search:     '🔍',
  error:      '⚠️',
  permission: '🔒',
  creation:   '✨',
}

export function EmptyState({
  icon, title, description, action, variant = 'default', size = 'md', compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: EmptyStateVariant
  size?: 'sm' | 'md' | 'lg'
  compact?: boolean
}) {
  const paddings = { sm: 'py-8', md: 'py-16', lg: 'py-24' }
  const iconSizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' }
  const titleSizes = { sm: 'text-[14px]', md: 'text-[18px]', lg: 'text-[22px]' }

  const defaultIcon = EMPTY_STATE_ICONS[variant]

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center px-6 text-center animate-fade-up',
      compact ? 'py-8' : paddings[size],
    )}>
      <div className={clsx(
        'mb-5 rounded-2xl bg-gradient-to-br from-rihla-50 to-parchment',
        'border border-rihla-100 flex items-center justify-center',
        iconSizes[size],
      )}>
        {icon
          ? <span className="text-rihla">{icon}</span>
          : <span className="text-2xl select-none">{defaultIcon}</span>
        }
      </div>
      <p className={clsx('font-serif font-semibold text-ink mb-1.5', titleSizes[size])}>{title}</p>
      {description && (
        <p className="text-[13px] text-slate max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION TITLE
// ═══════════════════════════════════════════════════════════════════
export function SectionTitle({ children, className, action }: {
  children: ReactNode; className?: string; action?: ReactNode
}) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      <p className="text-label text-slate uppercase tracking-wider">{children}</p>
      {action}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════
export function Divider({ className, ornate }: { className?: string; ornate?: boolean }) {
  if (ornate) {
    return (
      <div className={clsx('divider-ornate my-6', className)}>
        <span className="text-[11px] font-mono tracking-[0.15em] text-fog uppercase">
          ◆
        </span>
      </div>
    )
  }
  return <hr className={clsx('border-line-soft my-4', className)} />
}

// ═══════════════════════════════════════════════════════════════════
// PRICE DISPLAY
// ═══════════════════════════════════════════════════════════════════
export function PriceDisplay({
  value, currency = 'EUR', size = 'lg', label, trend,
}: {
  value: number | string
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  label?: string
  trend?: number
}) {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' }
  const sym = symbols[currency] ?? currency
  const num = typeof value === 'string' ? parseFloat(value) : value
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num)

  const sizes = {
    sm:   'text-[13px] font-mono text-ink font-medium',
    md:   'text-[18px] font-mono text-ink font-semibold',
    lg:   'text-[28px] font-serif text-ink font-bold tracking-tight',
    hero: 'text-[42px] font-serif text-rihla font-bold tracking-tight',
  }

  return (
    <div className="flex flex-col">
      {label && <span className="text-label text-slate mb-1.5">{label}</span>}
      <span className={clsx(sizes[size], 'tabular-nums leading-none')}>
        <span className="text-[0.7em] mr-1 text-fog font-sans font-medium">{sym}</span>
        {formatted}
      </span>
      {trend !== undefined && (
        <span className={clsx(
          'text-[11px] mt-1 font-medium tabular-nums',
          trend >= 0 ? 'text-emerald-700' : 'text-red-600'
        )}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════
type StatCardDomain = 'default' | 'cotation' | 'ops' | 'finance' | 'crm'

const DOMAIN_STYLES: Record<StatCardDomain, {
  icon: string
  sparkline: string
  sparklineFill: string
  accent: string
}> = {
  default:  { icon: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', sparkline: 'rgb(180,62,32)',    sparklineFill: 'rgba(180,62,32,0.12)',   accent: '' },
  cotation: { icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',           sparkline: 'rgb(16,185,129)',   sparklineFill: 'rgba(16,185,129,0.12)',  accent: 'border-l-2 border-l-emerald-400' },
  ops:      { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',                   sparkline: 'rgb(59,130,246)',   sparklineFill: 'rgba(59,130,246,0.12)',  accent: 'border-l-2 border-l-blue-400' },
  finance:  { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20',                sparkline: 'rgb(245,158,11)',   sparklineFill: 'rgba(245,158,11,0.12)', accent: 'border-l-2 border-l-amber-400' },
  crm:      { icon: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20',             sparkline: 'rgb(168,85,247)',   sparklineFill: 'rgba(168,85,247,0.12)', accent: 'border-l-2 border-l-purple-400' },
}

export function StatCard({
  label, value, sub, icon: Icon, trend, sparkline, sparklineColor,
  domain = 'default', loading = false, onClick,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ElementType
  trend?: number
  sparkline?: number[]
  sparklineColor?: string
  domain?: StatCardDomain
  /** @deprecated use domain instead */
  variant?: 'default' | 'primary' | 'dark'
  loading?: boolean
  onClick?: () => void
}) {
  const ds = DOMAIN_STYLES[domain]
  const strokeColor  = sparklineColor ?? ds.sparkline
  const fillColor    = sparklineColor
    ? strokeColor.replace('rgb(', 'rgba(').replace(')', ',0.12)')
    : ds.sparklineFill

  const TrendIcon = trend === undefined ? null
    : trend > 0.5  ? TrendingUp
    : trend < -0.5 ? TrendingDown
    : Minus

  if (loading) {
    return (
      <div className={clsx(
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-5',
        ds.accent,
      )}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-7 w-20 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5',
        'rounded-lg p-5 transition-all',
        ds.accent,
        onClick && 'cursor-pointer hover:border-slate-300 dark:hover:border-white/15 hover:shadow-sm',
        !onClick && 'hover:border-slate-300/60 dark:hover:border-white/10',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
          {label}
        </p>
        {Icon && (
          <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', ds.icon)}>
            <Icon size={14} strokeWidth={1.75} />
          </div>
        )}
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-slate-900 dark:text-cream">
          {value}
        </p>
        {sparkline && sparkline.length > 1 && (
          <Sparkline
            data={sparkline}
            stroke={strokeColor}
            fill={fillColor}
            width={64} height={22}
          />
        )}
      </div>

      {/* Footer: sub label + trend badge */}
      <div className="flex items-center gap-2 mt-2.5">
        {sub && (
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 flex-1 min-w-0 truncate">
            {sub}
          </p>
        )}
        {trend !== undefined && TrendIcon && (
          <span className={clsx(
            'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full',
            trend > 0.5  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : trend < -0.5 ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
          )}>
            <TrendIcon size={10} strokeWidth={2.5} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADERS
// ═══════════════════════════════════════════════════════════════════
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════════════
export function Avatar({ name, size = 36, className }: {
  name?: string; size?: number; className?: string
}) {
  const initials = (name || '?')
    .split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div
      className={clsx(
        'rounded-full bg-gradient-to-br from-rihla to-rihla-dark',
        'flex items-center justify-center text-cream font-semibold flex-shrink-0',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TOOLTIP TRIGGER (CSS-only)
// ═══════════════════════════════════════════════════════════════════
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                       bg-ink text-cream text-[11px] rounded whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                       shadow-lg z-50">
        {content}
      </span>
    </span>
  )
}
