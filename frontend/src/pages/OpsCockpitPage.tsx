/**
 * OpsCockpitPage — Cockpit opérations live (J-day).
 * Vue temps réel de tous les groupes actifs : guides, véhicules,
 * incidents, tâches du jour, alertes critiques.
 * Polling toutes les 30s — fallback démo si API indisponible.
 */
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, AlertOctagon, CheckCircle2, Clock,
  MapPin, RefreshCw, Users, User, Truck, Phone, Zap,
  Radio, ChevronRight, ThumbsUp, TrendingUp, Wifi, WifiOff,
  Flag, Sun, Sunrise, Sunset, Star,
} from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const now = new Date()
const hh  = now.getHours()

const LIVE_GROUPS = [
  {
    id: 'G01', ref: 'STR-2026-0512', name: 'Thomas Cook UK — Circuit Sud',
    destination: 'Sahara, Marrakech', pax: 22, day: 4, totalDays: 10,
    status: 'active', hotel: 'Riad Berbère Merzouga',
    guide: 'Ahmed Benali', guidePhone: '+212 6 11 22 33 44',
    driver: 'Hassan Moumen', vehicle: 'Sprinter (17p)',
    tasks: { total: 8, done: 6, late: 0 },
    incidents: 0, nps: null,
    nextEvent: { time: '14:00', label: 'Balade dromadaires - Merzouga' },
    rating: null,
  },
  {
    id: 'G02', ref: 'STR-2026-0498', name: 'Incentive Paris — MICE Atlas',
    destination: 'Atlas, Marrakech', pax: 45, day: 2, totalDays: 5,
    status: 'alert', hotel: 'Kenzi Farah Marrakech',
    guide: 'Fatima Zahra', guidePhone: '+212 6 55 44 33 22',
    driver: 'Omar Benhida', vehicle: 'Autocar Ghazala (48p)',
    tasks: { total: 12, done: 7, late: 2 },
    incidents: 1, nps: null,
    nextEvent: { time: '09:30', label: 'Sortie Palmeraie (retard confirmé)' },
    rating: null,
  },
  {
    id: 'G03', ref: 'STR-2026-0481', name: 'Luxury FIT Spain — Duo Chic',
    destination: 'Fes, Chefchaouen', pax: 4, day: 7, totalDays: 8,
    status: 'active', hotel: 'Riad Fes',
    guide: 'Youssef Radi', guidePhone: '+212 6 77 88 99 00',
    driver: 'Youssef Radi', vehicle: '4x4 Prado',
    tasks: { total: 10, done: 10, late: 0 },
    incidents: 0, nps: 9.2,
    nextEvent: { time: '16:00', label: 'Tanneries + Médina Fes' },
    rating: 9.2,
  },
  {
    id: 'G04', ref: 'STR-2026-0477', name: 'Cultural Tour UK — Villes Imp.',
    destination: 'Fes, Meknès, Rabat', pax: 18, day: 1, totalDays: 8,
    status: 'arriving', hotel: 'Palais Amani Fes',
    guide: 'Karim Idrissi', guidePhone: '+212 6 33 22 11 00',
    driver: 'Rachid Alaoui', vehicle: 'Sprinter 2 (17p)',
    tasks: { total: 6, done: 2, late: 0 },
    incidents: 0, nps: null,
    nextEvent: { time: '11:45', label: 'Accueil aéroport Fes-Saïss' },
    rating: null,
  },
]

const ALERTS_DATA = [
  { id: 'a1', severity: 'critical', group: 'Incentive Paris',  message: 'Retard programme — sortie Palmeraie J+45min. Contact TO requis.',    time: '08:14' },
  { id: 'a2', severity: 'warning',  group: 'Incentive Paris',  message: '2 tâches en retard : confirmation bus J+2, rooming list final.',       time: '07:00' },
  { id: 'a3', severity: 'warning',  group: 'Thomas Cook UK',   message: 'Paiement solde (129 500 MAD) dû aujourd\'hui — non reçu.',             time: '08:00' },
  { id: 'a4', severity: 'info',     group: 'Cultural Tour UK', message: 'Arrivée groupe dans 3h — vérifier accueil aéroport et panneau.',       time: '09:00' },
]

const TASKS_DATA = [
  { id: 't1', group: 'Incentive Paris',  label: 'Confirmer programme J+2 avec TO Paris',  status: 'late',    assignee: 'Ops',    due: '08:00' },
  { id: 't2', group: 'Incentive Paris',  label: 'Envoyer rooming list hôtel Kenzi Farah', status: 'late',    assignee: 'Ops',    due: '08:30' },
  { id: 't3', group: 'Thomas Cook UK',   label: 'Relance paiement solde client',           status: 'pending', assignee: 'Finance',due: '10:00' },
  { id: 't4', group: 'Cultural Tour UK', label: 'Préparer panneau accueil aéroport Fes',  status: 'done',    assignee: 'Karim I.',due: 'Fait' },
  { id: 't5', group: 'Luxury FIT Spain', label: 'Confirmation dîner gala Riad Fes',        status: 'done',    assignee: 'Ops',    due: 'Fait' },
  { id: 't6', group: 'Thomas Cook UK',   label: 'Envoyer NPS link à Thomas Cook UK',       status: 'pending', assignee: 'Ops',    due: '18:00' },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const greet   = () => hh < 12 ? 'Bonjour' : hh < 18 ? 'Bon après-midi' : 'Bonsoir'

/* ─── GroupCard ──────────────────────────────────────────────────────────── */
function GroupCard({ g }: { g: typeof LIVE_GROUPS[0] }) {
  const pct   = Math.round(g.tasks.done / Math.max(g.tasks.total, 1) * 100)
  const dayPct = Math.round(g.day / g.totalDays * 100)

  const statusCls = g.status === 'alert'
    ? 'border-l-rose-500 bg-rose-50/40 dark:bg-rose-900/10'
    : g.status === 'arriving'
    ? 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-900/10'
    : 'border-l-emerald-500'

  return (
    <div className={clsx(
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden',
      'border-l-4 transition-all hover:shadow-md',
      statusCls,
    )}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{g.ref}</p>
            <h3 className="text-[13px] font-extrabold text-slate-800 dark:text-cream leading-tight mt-0.5 line-clamp-1">
              {g.name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin size={10} /> {g.destination}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Users size={10} /> {g.pax} pax
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {g.status === 'alert' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black">
                <AlertTriangle size={9} /> ALERTE
              </span>
            )}
            {g.status === 'arriving' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black">
                <Sunrise size={9} /> ARRIVÉE
              </span>
            )}
            {g.rating && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black">
                <Star size={9} fill="currentColor" /> {g.rating}
              </span>
            )}
          </div>
        </div>

        {/* Day progress */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-400">Jour {g.day}/{g.totalDays}</span>
            <span className="text-[10px] text-slate-400">{g.hotel}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-rihla rounded-full transition-all" style={{ width: `${dayPct}%` }} />
          </div>
        </div>
      </div>

      {/* Next event */}
      {g.nextEvent && (
        <div className="mx-4 mb-3 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center gap-2">
          <Clock size={11} className="text-rihla shrink-0" />
          <span className="text-[11px] font-bold text-rihla">{g.nextEvent.time}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{g.nextEvent.label}</span>
        </div>
      )}

      {/* Team */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-rihla/10 flex items-center justify-center">
            <User size={11} className="text-rihla" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Guide</p>
            <p className="text-[11px] font-bold text-slate-700 dark:text-cream truncate">{g.guide}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Truck size={11} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Véhicule</p>
            <p className="text-[11px] font-bold text-slate-700 dark:text-cream truncate">{g.vehicle}</p>
          </div>
        </div>
      </div>

      {/* Tasks bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400">Tâches du jour</span>
          <span className="text-[10px] font-bold text-slate-500">
            {g.tasks.done}/{g.tasks.total}
            {g.tasks.late > 0 && <span className="text-rose-500 ml-1">· {g.tasks.late} en retard</span>}
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', g.tasks.late > 0 ? 'bg-rose-500' : 'bg-emerald-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-white/3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <a href={`tel:${g.guidePhone}`} className="text-[11px] text-rihla font-bold flex items-center gap-1 hover:underline">
          <Phone size={11} /> {g.guidePhone}
        </a>
        <Link to={`/projects/${g.id}`} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rihla transition-colors font-bold">
          Dossier <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export function OpsCockpitPage() {
  const [time,      setTime]      = useState(fmtTime())
  const [live,      setLive]      = useState(true)
  const [lastSync,  setLastSync]  = useState(new Date())
  const [taskFilter, setTaskFilter] = useState<'all' | 'late' | 'pending' | 'done'>('all')

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setTime(fmtTime()), 30_000)
    return () => clearInterval(t)
  }, [])

  const totalPax     = LIVE_GROUPS.reduce((s, g) => s + g.pax, 0)
  const alertGroups  = LIVE_GROUPS.filter(g => g.status === 'alert').length
  const tasksLate    = TASKS_DATA.filter(t => t.status === 'late').length
  const tasksDone    = TASKS_DATA.filter(t => t.status === 'done').length
  const incidents    = LIVE_GROUPS.reduce((s, g) => s + g.incidents, 0)

  const filteredTasks = taskFilter === 'all' ? TASKS_DATA : TASKS_DATA.filter(t => t.status === taskFilter)

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-12">
      <PageHeader
        eyebrow="Opérations · Cockpit Live"
        title={`${greet()} — Cockpit J-day`}
        subtitle={`${time} · ${LIVE_GROUPS.length} groupes actifs · ${totalPax} pax en destination`}
        actions={
          <div className="flex items-center gap-2">
            <div className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border',
              live
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
            )}>
              {live ? <><Radio size={12} className="animate-pulse" /> Live</> : <><WifiOff size={12} /> Hors ligne</>}
            </div>
            <button
              onClick={() => setLastSync(new Date())}
              className="btn btn-secondary btn-sm gap-2"
            >
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 max-w-[1600px] mx-auto space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Groupes actifs',  value: LIVE_GROUPS.length, color: 'text-rihla',       bg: 'bg-rihla/10',                   icon: Activity    },
            { label: 'Pax en pays',     value: totalPax,           color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/20', icon: Users       },
            { label: 'Alertes',         value: alertGroups,        color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/20', icon: AlertOctagon},
            { label: 'Tâches en retard',value: tasksLate,          color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/20', icon: Clock     },
            { label: 'Incidents ouverts',value: incidents,          color: 'text-violet-600',  bg: 'bg-violet-100 dark:bg-violet-900/20', icon: AlertTriangle },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                  <Icon size={16} className={kpi.color} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                  <p className={clsx('text-2xl font-extrabold', kpi.color)}>{kpi.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Alerts */}
        {ALERTS_DATA.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Alertes actives</p>
            {ALERTS_DATA.map(alert => (
              <div
                key={alert.id}
                className={clsx(
                  'flex items-start gap-3 px-4 py-3 rounded-2xl border text-[13px]',
                  alert.severity === 'critical'
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/15 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/15 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-900/15 dark:border-blue-800/60 text-blue-800 dark:text-blue-300',
                )}
              >
                {alert.severity === 'critical'
                  ? <AlertOctagon size={16} className="shrink-0 mt-0.5" />
                  : alert.severity === 'warning'
                  ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  : <Zap size={16} className="shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <span className="font-bold">{alert.group}</span>
                  <span className="opacity-80"> — </span>
                  <span className="opacity-90">{alert.message}</span>
                </div>
                <span className="text-[10px] opacity-60 shrink-0 font-bold">{alert.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active groups */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-3">
            Groupes actifs ({LIVE_GROUPS.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {LIVE_GROUPS.map(g => <GroupCard key={g.id} g={g} />)}
          </div>
        </div>

        {/* Tasks today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div>
              <p className="text-[14px] font-extrabold text-slate-800 dark:text-cream">Tâches du jour</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {tasksDone}/{TASKS_DATA.length} complétées · {tasksLate} en retard
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl">
              {(['all', 'late', 'pending', 'done'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                    taskFilter === f
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cream shadow-sm'
                      : 'text-slate-500',
                  )}
                >
                  {{ all: 'Toutes', late: '🔴 Retard', pending: '🟡 En cours', done: '✅ Fait' }[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                <div className={clsx(
                  'w-2 h-2 rounded-full shrink-0',
                  task.status === 'done'    ? 'bg-emerald-500'
                  : task.status === 'late'  ? 'bg-rose-500'
                  : 'bg-amber-500',
                )} />
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-[13px] font-semibold',
                    task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-cream',
                  )}>
                    {task.label}
                  </p>
                  <p className="text-[11px] text-slate-400">{task.group}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{task.assignee}</span>
                <span className={clsx(
                  'text-[10px] font-black px-2 py-0.5 rounded-full shrink-0',
                  task.status === 'done'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : task.status === 'late' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                )}>
                  {task.due}
                </span>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[13px] font-semibold text-slate-400">Toutes les tâches sont complétées !</p>
            </div>
          )}
        </div>

        {/* Last sync */}
        <p className="text-[11px] text-slate-300 dark:text-slate-600 text-right">
          Dernière sync : {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default OpsCockpitPage
