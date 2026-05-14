/**
 * OperationsCalendarPage — Calendrier des opérations DMC
 * Vues : Mois · Semaine · Liste
 * Événements : voyages multi-jours, arrivées, départs, paiements, alertes
 */
import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, List, Grid3X3,
  Users, MapPin, User, Truck, CreditCard, AlertTriangle,
  Plus, Filter, RefreshCw, Clock, CheckCircle2, X,
  Plane, Flag, Eye,
} from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type EventType = 'trip' | 'arrival' | 'departure' | 'payment' | 'alert' | 'task'
type ViewMode  = 'month' | 'week' | 'list'

interface OpsEvent {
  id:          string
  type:        EventType
  title:       string
  start:       Date
  end:         Date
  pax?:        number
  guide?:      string
  vehicle?:    string
  destination?: string
  amount?:     number
  status?:     'confirmed' | 'pending' | 'alert' | 'done'
  color:       string
}

/* ─── Event palette ──────────────────────────────────────────────────────── */
const EVENT_STYLES: Record<EventType, { bg: string; text: string; dot: string; label: string; icon: any }> = {
  trip:      { bg: 'bg-blue-500',    text: 'text-white',           dot: 'bg-blue-500',    label: 'Voyage',    icon: MapPin     },
  arrival:   { bg: 'bg-emerald-500', text: 'text-white',           dot: 'bg-emerald-500', label: 'Arrivée',   icon: Plane      },
  departure: { bg: 'bg-violet-500',  text: 'text-white',           dot: 'bg-violet-500',  label: 'Départ',    icon: Flag       },
  payment:   { bg: 'bg-amber-500',   text: 'text-white',           dot: 'bg-amber-500',   label: 'Paiement',  icon: CreditCard },
  alert:     { bg: 'bg-rose-500',    text: 'text-white',           dot: 'bg-rose-500',    label: 'Alerte',    icon: AlertTriangle },
  task:      { bg: 'bg-slate-500',   text: 'text-white',           dot: 'bg-slate-500',   label: 'Tâche',     icon: CheckCircle2  },
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const now = new Date()
const y = now.getFullYear()
const m = now.getMonth()

function d(day: number, month = m, year = y) {
  return new Date(year, month, day)
}

const DEMO_EVENTS: OpsEvent[] = [
  { id: 'e1',  type: 'trip',      title: 'Thomas Cook UK — Circuit Sud',    start: d(2),  end: d(11), pax: 22, guide: 'Ahmed Benali',   vehicle: 'Sprinter 1',    destination: 'Marrakech → Sahara',   status: 'confirmed', color: 'bg-blue-500'    },
  { id: 'e2',  type: 'trip',      title: 'Incentive Paris — MICE Atlas',    start: d(6),  end: d(10), pax: 45, guide: 'Fatima Zahra',   vehicle: 'Autocar 48p',   destination: 'Atlas, Marrakech',     status: 'confirmed', color: 'bg-indigo-500'  },
  { id: 'e3',  type: 'trip',      title: 'Luxury FIT Spain — Duo Chic',     start: d(15), end: d(22), pax: 4,  guide: 'Youssef Radi',   vehicle: '4x4 Prado',     destination: 'Fes, Chefchaouen',     status: 'confirmed', color: 'bg-emerald-500' },
  { id: 'e4',  type: 'trip',      title: 'Cultural Tour UK — Villes Imp.',  start: d(12), end: d(19), pax: 18, guide: 'Karim Idrissi',  vehicle: 'Sprinter 2',    destination: 'Fes, Meknès, Rabat',   status: 'pending',   color: 'bg-violet-500'  },
  { id: 'e5',  type: 'trip',      title: 'Nordic Travel — Sahara 4j',       start: d(20), end: d(24), pax: 12, guide: 'Ahmed Benali',   vehicle: 'Sprinter 1',    destination: 'Zagora, Merzouga',     status: 'confirmed', color: 'bg-teal-500'    },
  { id: 'e6',  type: 'arrival',   title: 'Arrivée · Thomas Cook UK',        start: d(2),  end: d(2),  pax: 22,                                                    destination: 'Aéroport Marrakech',   status: 'confirmed', color: 'bg-emerald-500' },
  { id: 'e7',  type: 'departure', title: 'Départ · Thomas Cook UK',         start: d(11), end: d(11), pax: 22,                                                    destination: 'Aéroport Marrakech',   status: 'confirmed', color: 'bg-violet-500'  },
  { id: 'e8',  type: 'arrival',   title: 'Arrivée · Incentive Paris',       start: d(6),  end: d(6),  pax: 45,                                                    destination: 'Aéroport Casablanca',  status: 'confirmed', color: 'bg-emerald-500' },
  { id: 'e9',  type: 'payment',   title: 'Acompte 30% · Wanderlust DE',     start: d(5),  end: d(5),  amount: 162000,                                                                                  status: 'pending',   color: 'bg-amber-500'   },
  { id: 'e10', type: 'payment',   title: 'Solde · Thomas Cook UK',          start: d(9),  end: d(9),  amount: 129500,                                                                                  status: 'alert',     color: 'bg-rose-500'    },
  { id: 'e11', type: 'alert',     title: 'Programme non envoyé · Nordic',   start: d(18), end: d(18),                                                                                                  status: 'alert',     color: 'bg-rose-500'    },
  { id: 'e12', type: 'task',      title: 'Confirmer hôtels Riad Fes',       start: d(8),  end: d(8),                                                                                                   status: 'pending',   color: 'bg-slate-500'   },
  { id: 'e13', type: 'departure', title: 'Départ · Luxury FIT Spain',       start: d(22), end: d(22), pax: 4,                                                     destination: 'Aéroport Fes',        status: 'confirmed', color: 'bg-violet-500'  },
  { id: 'e14', type: 'payment',   title: 'Solde · Cultural Tour UK',        start: d(25), end: d(25), amount: 87400,                                                                                   status: 'confirmed', color: 'bg-amber-500'   },
]

/* ─── Calendar helpers ───────────────────────────────────────────────────── */
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function startOfMonth(y: number, m: number) { return new Date(y, m, 1) }
function endOfMonth(y: number, m: number)   { return new Date(y, m + 1, 0) }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isToday(d: Date) { return isSameDay(d, new Date()) }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }

/* ─── MonthGrid ──────────────────────────────────────────────────────────── */
function MonthGrid({
  year, month, events, onDayClick, onEventClick,
}: {
  year: number; month: number
  events: OpsEvent[]
  onDayClick: (d: Date) => void
  onEventClick: (e: OpsEvent) => void
}) {
  const firstDay = startOfMonth(year, month)
  // Monday-first: getDay() returns 0=Sun..6=Sat → convert to 0=Mon..6=Sun
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const lastDay  = endOfMonth(year, month)
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7

  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) cells.push(null)
    else cells.push(new Date(year, month, dayNum))
  }

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      const start = new Date(e.start); start.setHours(0,0,0,0)
      const end   = new Date(e.end);   end.setHours(23,59,59,999)
      return day >= start && day <= end
    }).slice(0, 3)  // max 3 per cell

  return (
    <div className="flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(90px, 1fr)' }}>
        {cells.map((day, idx) => {
          const dayEvents = day ? getEventsForDay(day) : []
          const today     = day ? isToday(day) : false
          const isWeekend = idx % 7 >= 5

          return (
            <div
              key={idx}
              onClick={() => day && onDayClick(day)}
              className={clsx(
                'border-b border-r border-slate-100 dark:border-slate-800/60 p-1.5 min-h-[90px]',
                'relative transition-colors',
                day ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/3' : 'bg-slate-50/50 dark:bg-slate-900/30',
                isWeekend && day ? 'bg-slate-50/70 dark:bg-slate-900/50' : '',
              )}
            >
              {day && (
                <>
                  <span className={clsx(
                    'inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-bold mb-1',
                    today
                      ? 'bg-rihla text-white'
                      : 'text-slate-700 dark:text-slate-300',
                  )}>
                    {day.getDate()}
                  </span>

                  <div className="space-y-0.5">
                    {dayEvents.map(ev => {
                      const style = EVENT_STYLES[ev.type]
                      const isStart = isSameDay(day, ev.start)
                      return (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                          className={clsx(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer truncate',
                            'hover:opacity-80 transition-opacity',
                            ev.color, 'text-white',
                          )}
                          title={ev.title}
                        >
                          {isStart && '▸ '}{ev.title}
                        </div>
                      )
                    })}
                    {day && getEventsForDay(day).length >= 3 && events.filter(e => {
                      const s = new Date(e.start); s.setHours(0,0,0,0)
                      const en = new Date(e.end); en.setHours(23,59,59,999)
                      return day >= s && day <= en
                    }).length > 3 && (
                      <p className="text-[9px] text-slate-400 px-1">
                        +{events.filter(e => {
                          const s = new Date(e.start); s.setHours(0,0,0,0)
                          const en = new Date(e.end); en.setHours(23,59,59,999)
                          return day >= s && day <= en
                        }).length - 3} autres
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── WeekView ───────────────────────────────────────────────────────────── */
function WeekView({
  weekStart, events, onEventClick,
}: {
  weekStart: Date; events: OpsEvent[]; onEventClick: (e: OpsEvent) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[700px]">
        {/* Headers */}
        {days.map((day, i) => (
          <div
            key={i}
            className={clsx(
              'py-3 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center',
              isToday(day) && 'bg-rihla/5',
            )}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase">{WEEKDAYS_SHORT[i]}</p>
            <p className={clsx(
              'text-[20px] font-extrabold mt-0.5',
              isToday(day) ? 'text-rihla' : 'text-slate-700 dark:text-slate-300',
            )}>
              {day.getDate()}
            </p>
          </div>
        ))}

        {/* Event rows */}
        {days.map((day, i) => {
          const dayEvs = events.filter(e => {
            const s = new Date(e.start); s.setHours(0,0,0,0)
            const en = new Date(e.end); en.setHours(23,59,59,999)
            return day >= s && day <= en
          })
          return (
            <div
              key={i}
              className={clsx(
                'border-r border-slate-100 dark:border-slate-800 p-2 min-h-[300px] space-y-1.5',
                isToday(day) && 'bg-rihla/3',
              )}
            >
              {dayEvs.map(ev => {
                const Icon = EVENT_STYLES[ev.type].icon
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={clsx(
                      'rounded-xl p-2.5 cursor-pointer hover:opacity-90 transition-opacity',
                      ev.color, 'text-white',
                    )}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Icon size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
                        {EVENT_STYLES[ev.type].label}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold leading-tight line-clamp-2">{ev.title}</p>
                    {ev.pax && (
                      <p className="text-[10px] opacity-70 mt-1 flex items-center gap-0.5">
                        <Users size={9} /> {ev.pax} pax
                      </p>
                    )}
                    {ev.guide && (
                      <p className="text-[10px] opacity-70 flex items-center gap-0.5">
                        <User size={9} /> {ev.guide}
                      </p>
                    )}
                  </div>
                )
              })}
              {dayEvs.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-20">
                  <Calendar size={16} className="text-slate-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── ListView ───────────────────────────────────────────────────────────── */
function ListView({ events, onEventClick }: { events: OpsEvent[]; onEventClick: (e: OpsEvent) => void }) {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const fmtMad  = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' MAD'

  // Group by date
  const groups: Record<string, OpsEvent[]> = {}
  sorted.forEach(ev => {
    const key = ev.start.toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {Object.entries(groups).map(([dateStr, evs]) => {
        const date = new Date(dateStr)
        const today = isToday(date)
        return (
          <div key={dateStr}>
            <div className="flex items-center gap-3 mb-3">
              <div className={clsx(
                'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide',
                today ? 'bg-rihla text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
              )}>
                {today ? "Aujourd'hui" : fmtDate(date)}
              </div>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="space-y-2 ml-2">
              {evs.map(ev => {
                const Icon  = EVENT_STYLES[ev.type].icon
                const style = EVENT_STYLES[ev.type]
                const span  = Math.round((ev.end.getTime() - ev.start.getTime()) / 86400000) + 1

                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="flex items-start gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ev.color)}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 dark:text-cream group-hover:text-rihla transition-colors">
                            {ev.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            {ev.destination && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <MapPin size={10} /> {ev.destination}
                              </span>
                            )}
                            {ev.pax && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Users size={10} /> {ev.pax} pax
                              </span>
                            )}
                            {ev.guide && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <User size={10} /> {ev.guide}
                              </span>
                            )}
                            {ev.vehicle && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Truck size={10} /> {ev.vehicle}
                              </span>
                            )}
                            {ev.amount && (
                              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                                <CreditCard size={10} /> {fmtMad(ev.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {span > 1 && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> {span}j
                            </span>
                          )}
                          <span className={clsx(
                            'text-[10px] font-black px-2 py-0.5 rounded-full',
                            ev.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : ev.status === 'alert'   ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                            : ev.status === 'done'    ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                          )}>
                            {ev.status === 'confirmed' ? 'Confirmé' : ev.status === 'alert' ? '⚠ Alerte' : ev.status === 'done' ? 'Fait' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="text-center py-16">
          <Calendar size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[14px] font-semibold text-slate-400">Aucun événement</p>
          <p className="text-[12px] text-slate-300 mt-1">Aucun événement ne correspond aux filtres actifs.</p>
        </div>
      )}
    </div>
  )
}

/* ─── Event Modal ────────────────────────────────────────────────────────── */
function EventModal({ event, onClose }: { event: OpsEvent; onClose: () => void }) {
  const Icon  = EVENT_STYLES[event.type].icon
  const fmtD  = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const fmtMad = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' MAD'
  const span  = Math.round((event.end.getTime() - event.start.getTime()) / 86400000) + 1

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className={clsx('rounded-t-3xl p-5 text-white', event.color)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={16} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                {EVENT_STYLES[event.type].label}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X size={15} />
            </button>
          </div>
          <h3 className="text-[16px] font-extrabold mt-3 leading-tight">{event.title}</h3>
          <p className="text-[12px] opacity-70 mt-1">
            {fmtD(event.start)}
            {span > 1 && ` → ${fmtD(event.end)} · ${span} jours`}
          </p>
        </div>

        {/* Details */}
        <div className="p-5 grid grid-cols-2 gap-3">
          {[
            event.pax        && { icon: Users,      label: 'Pax',        value: `${event.pax} pax`          },
            event.guide      && { icon: User,        label: 'Guide',      value: event.guide                  },
            event.vehicle    && { icon: Truck,       label: 'Véhicule',   value: event.vehicle                },
            event.destination&& { icon: MapPin,      label: 'Destination',value: event.destination            },
            event.amount     && { icon: CreditCard,  label: 'Montant',    value: fmtMad(event.amount)         },
            event.status     && { icon: CheckCircle2,label: 'Statut',     value: event.status === 'confirmed' ? 'Confirmé' : event.status === 'alert' ? 'Alerte' : 'En attente' },
          ].filter(Boolean).map((item: any, i) => {
            const ItemIcon = item.icon
            return (
              <div key={i} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ItemIcon size={11} className="text-slate-400" />
                  <p className="text-[10px] text-slate-400">{item.label}</p>
                </div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-cream">{item.value}</p>
              </div>
            )
          })}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 py-2.5 bg-rihla text-white rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity">
            Voir le dossier
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export function OperationsCalendarPage() {
  const [viewMode,      setViewMode]      = useState<ViewMode>('month')
  const [currentDate,   setCurrentDate]   = useState(new Date())
  const [filterTypes,   setFilterTypes]   = useState<EventType[]>([])
  const [selectedEvent, setSelectedEvent] = useState<OpsEvent | null>(null)
  const [events]                          = useState<OpsEvent[]>(DEMO_EVENTS)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Week start (Monday)
  const weekStart = useMemo(() => {
    const d = new Date(currentDate)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    d.setDate(d.getDate() + diff)
    d.setHours(0,0,0,0)
    return d
  }, [currentDate])

  const filteredEvents = useMemo(() =>
    filterTypes.length > 0
      ? events.filter(e => filterTypes.includes(e.type))
      : events,
    [events, filterTypes],
  )

  const navigate = useCallback((dir: number) => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, dir))
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, dir * 7))
    else setCurrentDate(addMonths(currentDate, dir))
  }, [viewMode, currentDate])

  const toggleFilter = (type: EventType) => {
    setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  // KPIs
  const today = new Date(); today.setHours(0,0,0,0)
  const activeTrips   = events.filter(e => e.type === 'trip' && e.start <= today && e.end >= today).length
  const pendingPayments = events.filter(e => e.type === 'payment' && e.status !== 'done').length
  const alerts        = events.filter(e => e.type === 'alert' || e.status === 'alert').length
  const thisMonthTrips = events.filter(e => e.type === 'trip' && e.start.getMonth() === today.getMonth()).length

  const headerTitle = viewMode === 'month'
    ? `${MONTHS_FR[month]} ${year}`
    : viewMode === 'week'
    ? `Sem. du ${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()]}`
    : `${MONTHS_FR[month]} ${year} — Liste`

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex flex-col">
      <PageHeader
        eyebrow="Opérations · Calendrier"
        title="Calendrier des opérations"
        subtitle={`${activeTrips} voyage${activeTrips !== 1 ? 's' : ''} actif${activeTrips !== 1 ? 's' : ''} · ${pendingPayments} paiement${pendingPayments !== 1 ? 's' : ''} en attente · ${alerts} alerte${alerts !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm gap-2">
              <Plus size={13} /> Ajouter
            </button>
            <button className="btn btn-secondary btn-sm">
              <RefreshCw size={13} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-3 max-w-[1600px] mx-auto w-full space-y-4">

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Voyages actifs',      value: activeTrips,     color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: MapPin      },
            { label: 'Ce mois',             value: thisMonthTrips,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: Calendar  },
            { label: 'Paiements en attente',value: pendingPayments, color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: CreditCard  },
            { label: 'Alertes actives',     value: alerts,          color: 'text-rose-600',    bg: 'bg-rose-50 dark:bg-rose-900/20',    icon: AlertTriangle },
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

        {/* Calendar card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col"
          style={{ minHeight: '60vh' }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-white/5 flex-wrap gap-y-2">
            {/* Nav */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Aujourd'hui
              </button>
              <button onClick={() => navigate(1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            <h2 className="text-[15px] font-extrabold text-slate-800 dark:text-cream flex-1">{headerTitle}</h2>

            {/* Type filters */}
            <div className="flex items-center gap-1 flex-wrap">
              {(Object.entries(EVENT_STYLES) as [EventType, any][]).map(([type, style]) => {
                const Icon = style.icon
                const active = filterTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
                      active
                        ? `${style.bg} text-white`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                    )}
                  >
                    <Icon size={10} /> {style.label}
                  </button>
                )
              })}
              {filterTypes.length > 0 && (
                <button onClick={() => setFilterTypes([])} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                  <X size={10} /> Reset
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl">
              {([
                { mode: 'month', icon: Grid3X3, label: 'Mois'   },
                { mode: 'week',  icon: Calendar, label: 'Semaine' },
                { mode: 'list',  icon: List,     label: 'Liste'  },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5',
                    viewMode === mode
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cream shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar content */}
          {viewMode === 'month' && (
            <MonthGrid
              year={year}
              month={month}
              events={filteredEvents}
              onDayClick={d => setCurrentDate(d)}
              onEventClick={setSelectedEvent}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              weekStart={weekStart}
              events={filteredEvents}
              onEventClick={setSelectedEvent}
            />
          )}
          {viewMode === 'list' && (
            <ListView
              events={filteredEvents}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap px-1">
          {(Object.entries(EVENT_STYLES) as [EventType, any][]).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className={clsx('w-2.5 h-2.5 rounded-full', style.dot)} />
              {style.label}
            </div>
          ))}
        </div>
      </div>

      {/* Event modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
