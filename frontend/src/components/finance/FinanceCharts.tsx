/**
 * FinanceCharts — pure-SVG financial charts for the Finance Dashboard.
 * No external chart library required.
 *   · MonthlyPLChart — monthly Revenue vs Costs grouped bars + net margin line
 *   · BudgetTracker  — per-project budget utilisation progress bars
 *   · CashFlowChart  — 90-day cash flow forecast (area + actual line)
 *   · MarginWaterfall — waterfall breakdown of margin components
 */
import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
import { clsx } from 'clsx'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// ══════════════════════════════════════════════════════════════════════════
// MONTHLY P&L CHART
// ══════════════════════════════════════════════════════════════════════════
interface PLMonth {
  month: string       // 'Jan'
  revenue: number
  costs: number
}

const MOCK_PL: PLMonth[] = [
  { month: 'Jan', revenue: 420000, costs: 310000 },
  { month: 'Fév', revenue: 380000, costs: 295000 },
  { month: 'Mar', revenue: 510000, costs: 370000 },
  { month: 'Avr', revenue: 620000, costs: 440000 },
  { month: 'Mai', revenue: 580000, costs: 410000 },
  { month: 'Jun', revenue: 710000, costs: 510000 },
  { month: 'Jul', revenue: 820000, costs: 590000 },
  { month: 'Aoû', revenue: 760000, costs: 540000 },
  { month: 'Sep', revenue: 690000, costs: 485000 },
  { month: 'Oct', revenue: 540000, costs: 390000 },
  { month: 'Nov', revenue: 480000, costs: 340000 },
  { month: 'Déc', revenue: 650000, costs: 460000 },
]

export function MonthlyPLChart({ data = MOCK_PL }: { data?: PLMonth[] }) {
  const W = 760, H = 220, PAD = { top: 20, right: 20, bottom: 36, left: 60 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.costs])) * 1.1
  const barW   = (chartW / data.length) * 0.35
  const gap    = (chartW / data.length) * 0.08

  const scaleY = (v: number) => chartH - (v / maxVal) * chartH

  const fmt = (v: number) => v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : `${(v / 1000).toFixed(0)}k`

  // Net margin line points
  const linePoints = data.map((d, i) => {
    const x = PAD.left + (i + 0.5) * (chartW / data.length)
    const y = PAD.top + scaleY(d.revenue - d.costs)
    return `${x},${y}`
  }).join(' ')

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(maxVal * t))

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {ticks.map(t => {
          const y = PAD.top + scaleY(t)
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.8} strokeDasharray="4 4" />
              <text x={PAD.left - 8} y={y + 4} fontSize={9} fill="#94a3b8" textAnchor="end">{fmt(t)}</text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const xCenter = PAD.left + (i + 0.5) * (chartW / data.length)
          const xRev  = xCenter - barW - gap / 2
          const xCost = xCenter + gap / 2
          const hRev  = chartH - scaleY(d.revenue)
          const hCost = chartH - scaleY(d.costs)
          const yRev  = PAD.top + scaleY(d.revenue)
          const yCost = PAD.top + scaleY(d.costs)

          return (
            <g key={i}>
              {/* Revenue bar */}
              <rect x={xRev} y={yRev} width={barW} height={hRev} rx={2} fill="#3b82f6" opacity={0.85} />
              {/* Costs bar */}
              <rect x={xCost} y={yCost} width={barW} height={hCost} rx={2} fill="#f59e0b" opacity={0.75} />
              {/* X label */}
              <text x={xCenter} y={H - PAD.bottom + 14} fontSize={9} fill="#64748b" textAnchor="middle" fontWeight={600}>{d.month}</text>
            </g>
          )
        })}

        {/* Net margin line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Margin dots */}
        {data.map((d, i) => {
          const x = PAD.left + (i + 0.5) * (chartW / data.length)
          const y = PAD.top + scaleY(d.revenue - d.costs)
          return <circle key={i} cx={x} cy={y} r={3} fill="#10b981" />
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 justify-end pr-5">
        {[
          { color: 'bg-blue-500', label: 'Chiffre d\'affaires' },
          { color: 'bg-amber-400', label: 'Coûts' },
          { color: 'bg-emerald-500', label: 'Marge nette' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', l.color)} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// BUDGET TRACKER PER PROJECT
// ══════════════════════════════════════════════════════════════════════════
interface BudgetProject {
  name: string
  budgetTotal: number
  budgetUsed: number
  currency?: string
}

const MOCK_BUDGETS: BudgetProject[] = [
  { name: 'Maroc Impérial 8J — Globetrotter Ltd', budgetTotal: 185_000, budgetUsed: 148_000 },
  { name: 'Sahara Express 5J — Desert Dream',     budgetTotal: 92_000,  budgetUsed: 96_600 },
  { name: 'Circuit Atlas 7J — Travel Co',         budgetTotal: 210_000, budgetUsed: 138_000 },
  { name: 'Côte Atlantique 4J — Wanderlust',      budgetTotal: 75_000,  budgetUsed: 68_000 },
  { name: 'Marrakech Premium 3J — Luxury Tours',  budgetTotal: 55_000,  budgetUsed: 18_000 },
]

export function BudgetTracker({ projects = MOCK_BUDGETS }: { projects?: BudgetProject[] }) {
  const fmt = (v: number, currency = 'MAD') =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} ${currency}`

  return (
    <div className="space-y-3">
      {projects.map((p, i) => {
        const pct     = Math.min((p.budgetUsed / p.budgetTotal) * 100, 120)
        const over    = p.budgetUsed > p.budgetTotal
        const warn    = pct >= 80 && !over
        const safe    = pct < 80
        const barColor = over ? 'bg-rose-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'
        const IconComp = over ? AlertTriangle : warn ? AlertTriangle : CheckCircle
        const iconColor = over ? 'text-rose-500' : warn ? 'text-amber-500' : 'text-emerald-500'

        return (
          <div key={i} className="bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/8 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-cream truncate flex-1 leading-tight">
                {p.name}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <IconComp size={13} className={iconColor} />
                <span className={clsx(
                  'text-[12px] font-black tabular-nums',
                  over ? 'text-rose-600' : warn ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className={clsx('h-full rounded-full transition-all duration-700', barColor)}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Consommé : <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(p.budgetUsed, p.currency)}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Budget : {fmt(p.budgetTotal, p.currency)}
              </span>
            </div>

            {over && (
              <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={11} />
                Dépassement de {fmt(p.budgetUsed - p.budgetTotal, p.currency)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// CASH FLOW FORECAST (90 days)
// ══════════════════════════════════════════════════════════════════════════
function generateCashFlow(days = 90, startBalance = 320_000) {
  const today = new Date()
  const points: { date: string; balance: number; projected: boolean }[] = []
  let bal = startBalance
  for (let i = 0; i <= days; i++) {
    const d = addDays(today, i - 30) // show 30 days past + 60 future
    const isProjected = i > 30
    // Simulate inflows/outflows
    const daily = isProjected
      ? (Math.random() - 0.42) * 18_000
      : (Math.random() - 0.45) * 15_000
    bal = Math.max(0, bal + daily)
    points.push({ date: format(d, 'd MMM', { locale: fr }), balance: Math.round(bal), projected: isProjected })
  }
  return points
}

export function CashFlowChart() {
  const data = useMemo(() => generateCashFlow(), [])
  const W = 760, H = 200, PAD = { top: 16, right: 20, bottom: 32, left: 68 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const minVal = Math.min(...data.map(d => d.balance))
  const maxVal = Math.max(...data.map(d => d.balance)) * 1.05
  const range  = maxVal - minVal || 1

  const scaleX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW
  const scaleY = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH

  // Build path for actual + projected
  const actualPts  = data.filter(d => !d.projected)
  const projPts    = data.filter(d => d.projected)
  const pivotIdx   = actualPts.length - 1

  const pathActual = actualPts.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.balance)}`).join(' ')
  const pathProj   = [`M${scaleX(pivotIdx)},${scaleY(actualPts[pivotIdx]?.balance ?? 0)}`,
    ...projPts.map((d, i) => `L${scaleX(pivotIdx + 1 + i)},${scaleY(d.balance)}`)
  ].join(' ')

  // Area fill (projected)
  const areaProj = [
    `M${scaleX(pivotIdx)},${H - PAD.bottom}`,
    `L${scaleX(pivotIdx)},${scaleY(actualPts[pivotIdx]?.balance ?? 0)}`,
    ...projPts.map((d, i) => `L${scaleX(pivotIdx + 1 + i)},${scaleY(d.balance)}`),
    `L${scaleX(data.length - 1)},${H - PAD.bottom} Z`,
  ].join(' ')

  const fmt = (v: number) => `${(v / 1000).toFixed(0)}k`

  // Ticks
  const ticks = [minVal, (minVal + maxVal) / 2, maxVal].map(v => Math.round(v))
  const xLabels = [0, 15, 30, 45, 60, 75, 90].filter(i => i < data.length)

  // Today marker
  const todayX = scaleX(30)

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {ticks.map(t => {
          const y = scaleY(t)
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.8} strokeDasharray="3 3" />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#94a3b8" textAnchor="end">{fmt(t)} MAD</text>
            </g>
          )
        })}

        {/* Zero line */}
        {minVal <= 0 && (
          <line x1={PAD.left} x2={W - PAD.right} y1={scaleY(0)} y2={scaleY(0)} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
        )}

        {/* Projected area */}
        <path d={areaProj} fill="rgba(16,185,129,0.06)" />

        {/* Projected forecast band */}
        <rect x={scaleX(pivotIdx)} y={PAD.top} width={chartW - scaleX(pivotIdx) + PAD.left} height={chartH} fill="rgba(16,185,129,0.03)" />

        {/* Today vertical */}
        <line x1={todayX} x2={todayX} y1={PAD.top} y2={H - PAD.bottom} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={todayX} y={PAD.top - 4} fontSize={9} fill="#6366f1" textAnchor="middle" fontWeight={700}>Aujourd'hui</text>

        {/* Actual line */}
        <path d={pathActual} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Projected line */}
        <path d={pathProj} fill="none" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />

        {/* X labels */}
        {xLabels.map(i => (
          <text key={i} x={scaleX(i)} y={H - PAD.bottom + 14} fontSize={9} fill="#94a3b8" textAnchor="middle">
            {data[i]?.date}
          </text>
        ))}
      </svg>

      <div className="flex items-center gap-5 mt-1 justify-end pr-5">
        {[
          { color: 'bg-blue-500', label: 'Trésorerie réelle' },
          { color: 'bg-emerald-500', label: 'Prévision 60j' },
          { color: 'bg-indigo-500', label: 'Aujourd\'hui' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', l.color)} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// MARGIN WATERFALL CHART
// ══════════════════════════════════════════════════════════════════════════
interface WaterfallStep {
  label: string
  value: number      // positive = inflow, negative = outflow
  isTotal?: boolean
}

const MOCK_WATERFALL: WaterfallStep[] = [
  { label: 'CA Total',           value:  950_000 },
  { label: 'Hôtels',            value: -380_000 },
  { label: 'Transport',         value: -145_000 },
  { label: 'Guides & Équipe',   value:  -85_000 },
  { label: 'Activités',         value:  -62_000 },
  { label: 'Frais généraux',    value:  -38_000 },
  { label: 'Marge nette',        value:  240_000, isTotal: true },
]

export function MarginWaterfall({ steps = MOCK_WATERFALL }: { steps?: WaterfallStep[] }) {
  const W = 760, H = 220, PAD = { top: 16, right: 20, bottom: 40, left: 72 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  // Running totals
  let running = 0
  const bars = steps.map(s => {
    const start = s.isTotal ? 0 : running
    running = s.isTotal ? s.value : running + s.value
    return { ...s, start, end: s.isTotal ? s.value : running }
  })

  const maxVal = Math.max(...bars.map(b => Math.max(b.start, b.end))) * 1.08
  const barW   = (chartW / steps.length) * 0.55
  const scaleY = (v: number) => (v / maxVal) * chartH
  const fmt    = (v: number) => `${v >= 0 ? '' : '-'}${(Math.abs(v) / 1000).toFixed(0)}k`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(maxVal * t))

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {ticks.map(t => {
          const y = PAD.top + chartH - scaleY(t)
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.8} strokeDasharray="3 3" />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#94a3b8" textAnchor="end">{fmt(t)}</text>
            </g>
          )
        })}

        {bars.map((b, i) => {
          const x     = PAD.left + i * (chartW / steps.length) + (chartW / steps.length - barW) / 2
          const top   = PAD.top + chartH - scaleY(Math.max(b.start, b.end))
          const bh    = scaleY(Math.abs(b.end - b.start))
          const color = b.isTotal  ? '#b43e20'
                      : b.value > 0 ? '#10b981'
                      : '#f59e0b'

          // Connector line to next bar
          const nextBar = bars[i + 1]
          const connY   = PAD.top + chartH - scaleY(b.end)

          return (
            <g key={i}>
              {/* Bar */}
              <rect x={x} y={top} width={barW} height={Math.max(bh, 2)} rx={3} fill={color} opacity={b.isTotal ? 1 : 0.82} />
              {/* Connector */}
              {!b.isTotal && nextBar && (
                <line
                  x1={x + barW} x2={x + (chartW / steps.length)}
                  y1={connY} y2={connY}
                  stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="3 2"
                />
              )}
              {/* Value label */}
              <text x={x + barW / 2} y={top - 4} fontSize={9} fill={color} textAnchor="middle" fontWeight={700}>
                {fmt(b.value)}
              </text>
              {/* X label */}
              <text x={x + barW / 2} y={H - PAD.bottom + 14} fontSize={9} fill="#64748b" textAnchor="middle" fontWeight={600}>
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// KPI TREND CARDS (for the Finance summary row)
// ══════════════════════════════════════════════════════════════════════════
export function FinanceKPIRow({ summary }: { summary?: Record<string, number> }) {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')

  const kpis = [
    {
      label: 'Chiffre d\'affaires',
      value: summary?.total_revenue
        ? new Intl.NumberFormat('fr-FR').format(summary.total_revenue)
        : '1 245 800',
      unit: 'MAD',
      trend: 12.5,
      spark: [55, 62, 48, 71, 68, 82, 77, 90, 85, 95, 88, 100],
      domain: 'finance' as const,
    },
    {
      label: 'Marge brute',
      value: `${summary?.margin_percentage?.toFixed(1) ?? '26.8'}`,
      unit: '%',
      trend: 2.1,
      spark: [22, 24, 21, 25, 26, 27, 25, 28, 27, 29, 27, 30],
      domain: 'finance' as const,
    },
    {
      label: 'Factures en attente',
      value: '3',
      unit: 'factures',
      trend: -8.0,
      spark: [8, 7, 6, 9, 5, 7, 6, 4, 5, 3, 4, 3],
      domain: 'finance' as const,
    },
    {
      label: 'Trésorerie nette',
      value: '320',
      unit: 'k MAD',
      trend: 5.3,
      spark: [280, 295, 310, 302, 318, 312, 320, 308, 315, 322, 318, 320],
      domain: 'finance' as const,
    },
  ]

  return (
    <div className="space-y-3">
      {/* Period switcher */}
      <div className="flex items-center justify-end gap-1">
        {(['7', '30', '90'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clsx(
              'px-3 py-1 rounded-lg text-[11px] font-bold transition-all',
              period === p
                ? 'bg-rihla text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
            )}
          >
            {p}j
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const upward = k.trend > 0
          const TrendIcon = upward ? TrendingUp : TrendingDown
          return (
            <div key={k.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/8 rounded-xl p-4 border-l-2 border-l-amber-400">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-3 leading-tight">{k.label}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-cream leading-none">
                  {k.value} <span className="text-[13px] font-normal text-slate-400">{k.unit}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className={clsx(
                  'inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                  upward
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                )}>
                  <TrendIcon size={10} strokeWidth={2.5} />
                  {Math.abs(k.trend)}%
                </span>
                <span className="text-[11px] text-slate-400">vs {period}j préc.</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
