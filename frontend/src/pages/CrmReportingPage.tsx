import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Users, Globe2, Star, BarChart3, AlertTriangle,
  Trophy, Target, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { crmApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'

type Tab = 'executive' | 'team' | 'markets' | 'nps'

const PERIODS = ['last30', 'last90', 'ytd', 'Q1-2026', 'Q2-2026']

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_REVENUE = [
  { owner_user_id: 'Amine Chakir',    deals_won: 14, revenue_mad: 1_240_000 },
  { owner_user_id: 'Sara Alaoui',     deals_won: 11, revenue_mad: 980_000 },
  { owner_user_id: 'Karim Benali',    deals_won:  8, revenue_mad: 720_000 },
  { owner_user_id: 'Nadia Fassi',     deals_won:  5, revenue_mad: 430_000 },
  { owner_user_id: 'Hassan Idrissi',  deals_won:  3, revenue_mad: 210_000 },
]
const DEMO_MARKETS = [
  { country: 'UK',  total: 24, won: 14, lost: 5,  revenue_mad: 1_200_000, conversion_rate: 58.3 },
  { country: 'US',  total: 18, won: 11, lost: 4,  revenue_mad: 950_000,   conversion_rate: 61.1 },
  { country: 'DE',  total: 15, won:  9, lost: 3,  revenue_mad: 820_000,   conversion_rate: 60.0 },
  { country: 'FR',  total: 22, won: 12, lost: 6,  revenue_mad: 740_000,   conversion_rate: 54.5 },
  { country: 'AU',  total:  8, won:  5, lost: 2,  revenue_mad: 480_000,   conversion_rate: 62.5 },
  { country: 'ES',  total: 10, won:  4, lost: 4,  revenue_mad: 320_000,   conversion_rate: 40.0 },
  { country: 'MA',  total: 35, won: 12, lost: 15, revenue_mad: 280_000,   conversion_rate: 34.3 },
  { country: 'IT',  total:  6, won:  3, lost: 2,  revenue_mad: 220_000,   conversion_rate: 50.0 },
]
const DEMO_WINLOSS = {
  total_closed: 88, won_count: 55, lost_count: 33, win_rate: 62.5,
  revenue_won_mad: 5_120_000,
  lost_reasons: [
    { reason: 'price',         count: 12 },
    { reason: 'competitor',    count: 8 },
    { reason: 'timing',        count: 6 },
    { reason: 'no_response',   count: 5 },
    { reason: 'other',         count: 2 },
  ],
}
const DEMO_NPS = [
  { destination: 'Marrakech',    trips: 28, nps_avg: 72 },
  { destination: 'Sahara',       trips: 14, nps_avg: 89 },
  { destination: 'Fes',          trips: 11, nps_avg: 68 },
  { destination: 'Chefchaouen',  trips:  8, nps_avg: 85 },
  { destination: 'Essaouira',    trips:  6, nps_avg: 78 },
  { destination: 'Atlas',        trips:  9, nps_avg: 81 },
]
const DEMO_FORECAST = {
  quarter: 'Q2-2026', open_deals_count: 34,
  total_pipeline_mad: 4_800_000, weighted_forecast_mad: 2_880_000,
  actual_won_mad: 1_240_000, confidence_pct: 60,
}
const DEMO_CHURN = {
  total_accounts: 148, hibernating_count: 22, at_risk_count: 18,
  churn_rate_pct: 14.9, at_risk_pct: 12.2,
}

const fmtMad = (n: number) => `${(n / 1000).toFixed(0)}K`
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const REASON_LABELS: Record<string, string> = {
  price: 'Trop cher', competitor: 'Concurrent', timing: 'Délai', no_response: 'Sans réponse', other: 'Autre',
}
const COUNTRY_FLAGS: Record<string, string> = {
  UK: '🇬🇧', US: '🇺🇸', DE: '🇩🇪', FR: '🇫🇷', AU: '🇦🇺', ES: '🇪🇸', MA: '🇲🇦', IT: '🇮🇹',
}

export function CrmReportingPage() {
  const [tab, setTab] = useState<Tab>('executive')
  const [period, setPeriod] = useState('ytd')

  const { data: revenue }  = useQuery({ queryKey: ['crm', 'reporting', 'revenue', period], queryFn: () => crmApi.reportingRevenue(period).then(r => r.data) })
  const { data: markets }  = useQuery({ queryKey: ['crm', 'reporting', 'markets'], queryFn: () => crmApi.reportingMarkets().then(r => r.data) })
  const { data: winloss }  = useQuery({ queryKey: ['crm', 'reporting', 'winloss', period], queryFn: () => crmApi.reportingWinLoss(period).then(r => r.data) })
  const { data: npsData }  = useQuery({ queryKey: ['crm', 'reporting', 'nps', period], queryFn: () => crmApi.reportingNps(period).then(r => r.data) })
  const { data: forecast } = useQuery({ queryKey: ['crm', 'reporting', 'forecast', period], queryFn: () => crmApi.reportingForecast(period).then(r => r.data) })
  const { data: churn }    = useQuery({ queryKey: ['crm', 'reporting', 'churn'], queryFn: () => crmApi.reportingChurn().then(r => r.data) })

  // Merge live with demo
  const revData   = revenue  ?? DEMO_REVENUE
  const mktData   = markets  ?? DEMO_MARKETS
  const wlData    = winloss  ?? DEMO_WINLOSS
  const nps       = npsData  ?? DEMO_NPS
  const fc        = forecast ?? DEMO_FORECAST
  const churnData = churn    ?? DEMO_CHURN

  const totalRevenue = (revData as any[]).reduce((s: number, a: any) => s + (a.revenue_mad || 0), 0)

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-12">
      <PageHeader
        eyebrow="CRM · Reporting"
        title="Reporting Commercial"
        subtitle="Performance équipe, marchés, NPS et prévisions"
        actions={
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px]">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        }
      />

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-1">
          {([
            ['executive', 'Vue exécutive',    BarChart3],
            ['team',      'Performance équipe', Users],
            ['markets',   'Marchés & Win/Loss', Globe2],
            ['nps',       'NPS & Qualité',      Star],
          ] as [Tab, string, typeof BarChart3][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all',
                tab === key
                  ? 'bg-rihla text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-cream',
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Tab: Executive */}
        {tab === 'executive' && (
          <div className="space-y-6">
            {/* 6 KPI heroes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'CA Gagné', value: `${fmtMad(totalRevenue)} MAD`, icon: TrendingUp, cls: 'text-rihla bg-rihla/10' },
                { label: 'Win Rate', value: fmtPct(wlData.win_rate || 0), icon: Target, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400' },
                { label: 'NPS Moyen', value: nps.length ? Math.round(nps.reduce((s: number, n: any) => s + n.nps_avg, 0) / nps.length) : '—', icon: Star, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
                { label: 'Forecast Q', value: `${fmtMad(fc.weighted_forecast_mad)} MAD`, icon: BarChart3, cls: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400' },
                { label: 'Churn', value: fmtPct(churnData.churn_rate_pct || 0), icon: AlertTriangle, cls: 'text-rose-600 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400' },
                { label: 'Deals fermés', value: wlData.total_closed || 0, icon: Trophy, cls: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-400' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-4">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', kpi.cls)}>
                    <kpi.icon size={18} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-cream mt-0.5">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Forecast pipeline */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-6">
              <h3 className="font-bold text-slate-700 dark:text-cream mb-4">Forecast {fc.quarter}</h3>
              <div className="space-y-3">
                {[
                  { label: 'Pipeline total', val: fc.total_pipeline_mad, max: fc.total_pipeline_mad, cls: 'bg-slate-300 dark:bg-slate-700' },
                  { label: 'Pipeline pondéré', val: fc.weighted_forecast_mad, max: fc.total_pipeline_mad, cls: 'bg-rihla' },
                  { label: 'CA réalisé', val: fc.actual_won_mad, max: fc.total_pipeline_mad, cls: 'bg-emerald-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="text-[12px] text-slate-500 w-32 shrink-0">{row.label}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className={clsx('h-full rounded-full', row.cls)} style={{ width: `${Math.min((row.val / (row.max || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-cream w-24 text-right">{fmtMad(row.val)} MAD</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Churn / At Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-6">
                <h3 className="font-bold text-slate-700 dark:text-cream mb-3">Risque portefeuille</h3>
                <div className="space-y-3">
                  <Gauge label="Taux churn" pct={churnData.churn_rate_pct} color="text-rose-500" />
                  <Gauge label="Comptes à risque" pct={churnData.at_risk_pct} color="text-amber-500" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-extrabold text-slate-800 dark:text-cream">{churnData.total_accounts}</p><p className="text-[10px] text-slate-400">Total</p></div>
                  <div><p className="text-lg font-extrabold text-amber-500">{churnData.at_risk_count}</p><p className="text-[10px] text-slate-400">À risque</p></div>
                  <div><p className="text-lg font-extrabold text-rose-500">{churnData.hibernating_count}</p><p className="text-[10px] text-slate-400">Dormants</p></div>
                </div>
              </div>

              {/* Win/Loss reasons */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-6">
                <h3 className="font-bold text-slate-700 dark:text-cream mb-3">Raisons des pertes</h3>
                <div className="space-y-2">
                  {(wlData.lost_reasons || []).map((r: any) => {
                    const total = wlData.lost_count || 1
                    const pct = Math.round(r.count / total * 100)
                    return (
                      <div key={r.reason} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 w-28">{REASON_LABELS[r.reason] || r.reason}</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-rose-500 w-6">{r.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Team */}
        {tab === 'team' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-bold text-slate-700 dark:text-cream flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> Leaderboard Commercial
              </h3>
            </div>
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-3 text-left">Rang</th>
                  <th className="px-6 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">Deals gagnés</th>
                  <th className="px-4 py-3 text-right">CA (MAD)</th>
                  <th className="px-4 py-3 text-right">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {(revData as any[]).map((agent: any, i: number) => {
                  const share = Math.round((agent.revenue_mad / totalRevenue) * 100)
                  return (
                    <tr key={agent.owner_user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold',
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500',
                        )}>{i + 1}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-cream">{agent.owner_user_id}</td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600">{agent.deals_won}</td>
                      <td className="px-4 py-4 text-right font-extrabold text-rihla">{fmtMad(agent.revenue_mad)} K</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-rihla rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500 w-8">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Markets */}
        {tab === 'markets' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-700 dark:text-cream">Conversion par marché</h3>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-3 text-left">Pays</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Gagnés</th>
                    <th className="px-4 py-3 text-center">Perdus</th>
                    <th className="px-4 py-3 text-center">Taux conv.</th>
                    <th className="px-4 py-3 text-right">CA (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {(mktData as any[]).map((m: any) => (
                    <tr key={m.country} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-cream">
                        {COUNTRY_FLAGS[m.country] || '🌍'} {m.country}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-500">{m.total}</td>
                      <td className="px-4 py-4 text-center text-emerald-600 font-bold">{m.won}</td>
                      <td className="px-4 py-4 text-center text-rose-500 font-bold">{m.lost}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          m.conversion_rate >= 60 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : m.conversion_rate >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                        )}>{fmtPct(m.conversion_rate)}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-extrabold text-rihla">{fmtMad(m.revenue_mad)} K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Win/loss summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard label="Win Rate global" value={fmtPct(wlData.win_rate)} accent="emerald" />
              <KpiCard label="Deals gagnés" value={`${wlData.won_count} deals`} accent="rihla" />
              <KpiCard label="CA gagné" value={`${fmtMad(wlData.revenue_won_mad || 0)} MAD`} accent="amber" />
            </div>
          </div>
        )}

        {/* Tab: NPS */}
        {tab === 'nps' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(nps as any[]).map((d: any) => (
                <div key={d.destination} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-4 flex items-center gap-4">
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-extrabold shrink-0',
                    (d.nps_avg || 0) >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : (d.nps_avg || 0) >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                  )}>
                    <span className="text-lg">{d.nps_avg ?? '—'}</span>
                    <span className="text-[8px] uppercase">NPS</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-cream">{d.destination}</p>
                    <p className="text-[11px] text-slate-400">{d.trips} voyage{d.trips > 1 ? 's' : ''}</p>
                    <div className="mt-2 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          (d.nps_avg || 0) >= 80 ? 'bg-emerald-500' : (d.nps_avg || 0) >= 60 ? 'bg-amber-500' : 'bg-rose-500',
                        )}
                        style={{ width: `${Math.min(((d.nps_avg || 0) + 100) / 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Gauge({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-slate-500 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div className={clsx('h-full rounded-full', color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx('text-[12px] font-bold w-12 text-right', color)}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className={clsx('text-2xl font-extrabold', `text-${accent}-600 dark:text-${accent}-400`)}>{value}</p>
    </div>
  )
}
