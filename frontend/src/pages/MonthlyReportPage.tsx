/**
 * MonthlyReportPage — Rapport Mensuel DMC
 *
 * Dashboard analytique mensuel :
 *  - KPI strip : CA, projets, pax, marge nette
 *  - Revenue bar chart (mensuel sur 12 mois)
 *  - Top 5 destinations
 *  - Top 5 clients
 *  - Répartition par type de circuit
 *  - Taux de conversion pipeline CRM
 *  - Export PDF one-click
 */

import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, BarChart2, Users, MapPin,
  Download, ChevronLeft, ChevronRight, RefreshCw,
  Building2, Star, Briefcase, Globe, Loader2,
  ArrowUpRight, DollarSign, Target, Percent,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────────────────────────────────────

interface MonthData {
  month: string
  revenue: number
  projects: number
  pax: number
  margin: number
}

const ALL_MONTHS: MonthData[] = [
  { month: 'Juin 25',   revenue: 820_000,   projects: 14, pax: 210, margin: 18.2 },
  { month: 'Juil 25',  revenue: 1_050_000,  projects: 18, pax: 295, margin: 19.5 },
  { month: 'Août 25',  revenue: 1_380_000,  projects: 22, pax: 380, margin: 20.1 },
  { month: 'Sept 25',  revenue: 970_000,    projects: 17, pax: 260, margin: 18.8 },
  { month: 'Oct 25',   revenue: 740_000,    projects: 13, pax: 195, margin: 21.3 },
  { month: 'Nov 25',   revenue: 590_000,    projects: 10, pax: 148, margin: 22.0 },
  { month: 'Déc 25',   revenue: 680_000,    projects: 12, pax: 165, margin: 19.7 },
  { month: 'Jan 26',   revenue: 520_000,    projects: 9,  pax: 128, margin: 20.5 },
  { month: 'Févr 26',  revenue: 660_000,    projects: 11, pax: 152, margin: 21.8 },
  { month: 'Mars 26',  revenue: 880_000,    projects: 15, pax: 228, margin: 19.2 },
  { month: 'Avr 26',   revenue: 1_120_000,  projects: 19, pax: 310, margin: 20.8 },
  { month: 'Mai 26',   revenue: 1_240_000,  projects: 21, pax: 355, margin: 22.4 },
]

const TOP_DESTINATIONS = [
  { name: 'Marrakech & Atlas',       revenue: 3_420_000, projects: 48, pax: 890 },
  { name: 'Sahara & Grand Sud',      revenue: 2_180_000, projects: 32, pax: 620 },
  { name: 'Fès & Villes Impériales', revenue: 1_850_000, projects: 28, pax: 510 },
  { name: 'Chefchaouen & Nord',      revenue: 1_120_000, projects: 18, pax: 335 },
  { name: 'Essaouira & Côte',        revenue: 870_000,   projects: 14, pax: 265 },
]

const TOP_CLIENTS = [
  { name: 'Horizon Travels GmbH',  country: '🇩🇪', revenue: 1_850_000, projects: 22, repeat: true },
  { name: 'Wanderlust Reisen AG',  country: '🇨🇭', revenue: 1_420_000, projects: 18, repeat: true },
  { name: 'Desert & Dunes Ltd',    country: '🇬🇧', revenue: 980_000,   projects: 14, repeat: false },
  { name: 'Globetrotter Nordic AS',country: '🇳🇴', revenue: 760_000,   projects: 10, repeat: true },
  { name: 'Sun & Style Voyages',   country: '🇫🇷', revenue: 620_000,   projects: 9,  repeat: false },
]

const CIRCUIT_TYPES = [
  { type: 'Circuit privatif',     pct: 45, color: '#5B1914' },
  { type: 'MICE / Incentive',     pct: 22, color: '#E8734A' },
  { type: 'Voyage de noces',      pct: 13, color: '#D4A574' },
  { type: 'Circuit groupe FIT',   pct: 12, color: '#2C4A7C' },
  { type: 'Aventure & Rando',     pct: 8,  color: '#3A7D5C' },
]

const FUNNEL = [
  { stage: 'Leads reçus',        count: 142, color: '#5B1914' },
  { stage: 'Devis envoyés',      count: 98,  color: '#7A2219' },
  { stage: 'Relances effectuées',count: 72,  color: '#D4A574' },
  { stage: 'Confirmations',      count: 43,  color: '#3A7D5C' },
  { stage: 'Voyages réalisés',   count: 39,  color: '#2C4A7C' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtMAD = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M MAD`
    : `${(n / 1_000).toFixed(0)}k MAD`

const fmtNum = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, icon: Icon, color }: {
  label: string; value: string; sub?: string; trend?: number; icon: typeof TrendingUp; color: string
}) {
  const up = (trend ?? 0) >= 0
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={clsx(
            'flex items-center gap-0.5 text-[12px] font-semibold px-2 py-0.5 rounded-full',
            up
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
          )}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold text-slate-800 dark:text-slate-100 leading-none mb-1">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarChartSimple({ data }: { data: MonthData[] }) {
  const max = Math.max(...data.map(d => d.revenue))
  return (
    <div className="flex items-end gap-1 h-40 w-full">
      {data.map((d, i) => {
        const pct = d.revenue / max
        const isLast = i === data.length - 1
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none">
              {d.month}<br />{fmtMAD(d.revenue)}<br />{d.projects} projets · {d.pax} pax
            </div>
            <div
              className={clsx(
                'w-full rounded-t-md transition-all',
                isLast ? 'bg-[#5B1914]' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-[#E8734A]'
              )}
              style={{ height: `${pct * 100}%` }}
            />
            <span className="text-[8px] text-slate-400 dark:text-slate-500 text-center leading-tight truncate w-full text-center">
              {d.month.split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data }: { data: typeof CIRCUIT_TYPES }) {
  const size = 120
  const cx = size / 2, cy = size / 2, r = 44, stroke = 20
  let cumPct = 0
  const circumference = 2 * Math.PI * r
  const segments = data.map(d => {
    const start = cumPct
    cumPct += d.pct
    return { ...d, start, end: cumPct }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const startAngle = (seg.start / 100) * 360 - 90
          const endAngle   = (seg.end   / 100) * 360 - 90
          const startRad   = (startAngle * Math.PI) / 180
          const endRad     = (endAngle   * Math.PI) / 180
          const largeArc   = seg.pct > 50 ? 1 : 0
          const x1 = cx + r * Math.cos(startRad)
          const y1 = cy + r * Math.sin(startRad)
          const x2 = cx + r * Math.cos(endRad)
          const y2 = cy + r * Math.sin(endRad)
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" className="text-slate-700 dark:text-slate-200">
          {data.length}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="currentColor" className="text-slate-400">
          types
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">{d.type}</span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-auto">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelBar({ data }: { data: typeof FUNNEL }) {
  const max = data[0]?.count ?? 1
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] text-slate-500 dark:text-slate-400 w-40 flex-shrink-0 truncate">{d.stage}</span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
            </div>
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{d.count}</span>
          </div>
        )
      })}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-100 dark:border-slate-700">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Taux de conversion</span>
        <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
          {((FUNNEL[FUNNEL.length - 1].count / FUNNEL[0].count) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function MonthlyReportPage() {
  const [monthIdx, setMonthIdx] = useState(ALL_MONTHS.length - 1)
  const [exporting, setExporting] = useState(false)

  const current = ALL_MONTHS[monthIdx]
  const prev    = ALL_MONTHS[monthIdx - 1]

  const revTrend   = prev ? Math.round(((current.revenue - prev.revenue) / prev.revenue) * 100) : undefined
  const projTrend  = prev ? Math.round(((current.projects - prev.projects) / prev.projects) * 100) : undefined
  const paxTrend   = prev ? Math.round(((current.pax - prev.pax) / prev.pax) * 100) : undefined
  const marTrend   = prev ? Math.round(((current.margin - prev.margin) / prev.margin) * 100) : undefined

  const totalRevenue  = ALL_MONTHS.reduce((s, m) => s + m.revenue, 0)
  const totalProjects = ALL_MONTHS.reduce((s, m) => s + m.projects, 0)
  const totalPax      = ALL_MONTHS.reduce((s, m) => s + m.pax, 0)
  const avgMargin     = ALL_MONTHS.reduce((s, m) => s + m.margin, 0) / ALL_MONTHS.length

  const handleExportPDF = async () => {
    setExporting(true)
    // Dynamic PDF export using jsPDF
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()

      // Header
      doc.setFillColor(91, 25, 20)
      doc.rect(0, 0, W, 28, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255,255,255)
      doc.text('STOURS — Rihla Suite', 14, 12)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(242,210,161)
      doc.text(`Rapport Mensuel — ${current.month}`, 14, 19)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255,255,255)
      doc.text(new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }), W - 14, 12, { align: 'right' })

      let y = 36

      // KPIs
      ;(doc as any).autoTable({
        startY: y,
        head: [['Indicateur', current.month, 'Mois précédent', 'Variation']],
        body: [
          ['Chiffre d\'affaires', fmtMAD(current.revenue), prev ? fmtMAD(prev.revenue) : '—', revTrend !== undefined ? `${revTrend >= 0 ? '+' : ''}${revTrend}%` : '—'],
          ['Projets réalisés', current.projects.toString(), prev ? prev.projects.toString() : '—', projTrend !== undefined ? `${projTrend >= 0 ? '+' : ''}${projTrend}%` : '—'],
          ['Participants (pax)', fmtNum(current.pax), prev ? fmtNum(prev.pax) : '—', paxTrend !== undefined ? `${paxTrend >= 0 ? '+' : ''}${paxTrend}%` : '—'],
          ['Marge nette', `${current.margin}%`, prev ? `${prev.margin}%` : '—', marTrend !== undefined ? `${marTrend >= 0 ? '+' : ''}${marTrend}%` : '—'],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [91, 25, 20], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Top Destinations
      ;(doc as any).autoTable({
        startY: y,
        head: [['Top Destinations', 'CA (MAD)', 'Projets', 'Pax']],
        body: TOP_DESTINATIONS.map(d => [d.name, fmtMAD(d.revenue), d.projects, d.pax]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [91, 25, 20], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Top Clients
      ;(doc as any).autoTable({
        startY: y,
        head: [['Top Clients', 'Pays', 'CA (MAD)', 'Projets']],
        body: TOP_CLIENTS.map(c => [c.name, c.country, fmtMAD(c.revenue), c.projects]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [91, 25, 20], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const H = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184)
      doc.text('STOURS — Confidentiel', 14, H - 8)
      doc.text('Page 1 / 1', W - 14, H - 8, { align: 'right' })

      doc.save(`rapport_${current.month.replace(' ', '_').toLowerCase()}.pdf`)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B1914] to-[#E8734A] flex items-center justify-center">
              <BarChart2 size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">
              Rapport Mensuel
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 ml-10">
            Analyse de performance — DMC STOURS / Rihla Suite
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setMonthIdx(i => Math.max(0, i - 1))}
              disabled={monthIdx === 0}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 py-1.5 text-[13px] font-bold text-slate-700 dark:text-slate-300 min-w-[80px] text-center">
              {current.month}
            </span>
            <button
              onClick={() => setMonthIdx(i => Math.min(ALL_MONTHS.length - 1, i + 1))}
              disabled={monthIdx === ALL_MONTHS.length - 1}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#5B1914] text-white hover:bg-[#7A2219] transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exporter PDF
          </button>
        </div>
      </div>

      {/* ── Month KPIs ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest mb-3">
          {current.month} — Ce mois
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Chiffre d'affaires" value={fmtMAD(current.revenue)} sub={`vs. ${prev ? fmtMAD(prev.revenue) : '—'} le mois dernier`} trend={revTrend} icon={DollarSign} color="bg-gradient-to-br from-[#5B1914] to-[#E8734A]" />
          <KpiCard label="Projets réalisés"   value={current.projects.toString()} sub={`${Math.round(current.revenue / current.projects / 1000)}k MAD / projet`} trend={projTrend} icon={Briefcase}    color="bg-gradient-to-br from-slate-600 to-slate-700" />
          <KpiCard label="Participants"        value={fmtNum(current.pax)}  sub={`${Math.round(current.pax / current.projects)} pax / projet`} trend={paxTrend}  icon={Users}        color="bg-gradient-to-br from-[#2C4A7C] to-[#4A6FA8]" />
          <KpiCard label="Marge nette"         value={`${current.margin}%`} sub={`Objectif : 20% · Moy. 12m : ${avgMargin.toFixed(1)}%`} trend={marTrend}  icon={Percent}      color="bg-gradient-to-br from-[#3A7D5C] to-[#5BA67E]" />
        </div>
      </div>

      {/* ── Annual KPIs strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CA 12 derniers mois',  value: fmtMAD(totalRevenue),         sub: 'cumulé',             color: 'bg-[#5B1914]/10 text-[#5B1914] dark:bg-[#E8734A]/15 dark:text-[#E8734A]' },
          { label: 'Projets 12m',          value: totalProjects.toString(),      sub: 'dossiers traités',   color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
          { label: 'Pax 12m',              value: fmtNum(totalPax),             sub: 'voyageurs',          color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
          { label: 'Marge moy. 12m',       value: `${avgMargin.toFixed(1)}%`,   sub: 'sur tous projets',   color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={clsx('rounded-xl px-4 py-3', color)}>
            <p className="text-[22px] font-bold leading-none mb-0.5">{value}</p>
            <p className="text-[12px] font-semibold opacity-80">{label}</p>
            <p className="text-[10px] opacity-60">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Revenue chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Chiffre d'affaires mensuel</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">12 derniers mois (MAD)</p>
            </div>
            <BarChart2 size={16} className="text-slate-400" />
          </div>
          <BarChartSimple data={ALL_MONTHS} />
        </div>

        {/* Donut types */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Répartition par type</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Types de circuits (% projets)</p>
            </div>
            <Globe size={16} className="text-slate-400" />
          </div>
          <DonutChart data={CIRCUIT_TYPES} />
        </div>
      </div>

      {/* ── Tables row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top destinations */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-[#E8734A]" />
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Top Destinations</p>
          </div>
          <div className="space-y-2">
            {TOP_DESTINATIONS.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">{d.name}</p>
                  <p className="text-[11px] text-slate-400">{d.projects} projets · {d.pax} pax</p>
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">{fmtMAD(d.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top clients */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-[#2C4A7C]" />
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Top Clients</p>
          </div>
          <div className="space-y-2">
            {TOP_CLIENTS.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">{c.name}</p>
                    <span className="text-base leading-none">{c.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-slate-400">{c.projects} projets</p>
                    {c.repeat && <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Fidèle</span>}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">{fmtMAD(c.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[#3A7D5C]" />
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Funnel CRM</p>
          </div>
          <FunnelBar data={FUNNEL} />
        </div>
      </div>
    </div>
  )
}
