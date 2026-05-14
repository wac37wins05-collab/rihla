import { useState } from 'react'
import {
  Car, Clock, MapPin, Phone, CheckCircle, AlertCircle, Navigation,
  Fuel, Wifi, WifiOff, Star, ChevronRight, Users, Route,
  MessageSquare, Camera, AlertTriangle, Gauge, Package, ArrowRight,
  Flag, Circle, Shield
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string
  heure: string
  client: string
  pax: number
  depart: string
  arriveeAddr: string
  vehicule: string
  vehiculeIcon: string
  statut: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  contact?: string
  distance?: string
  duree?: string
  notes?: string
  rating?: number
  luggage?: boolean
  vip?: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    heure: '08:30',
    client: 'Groupe YS Travel',
    pax: 18,
    depart: 'Hôtel Sofitel Casablanca Tour Blanche',
    arriveeAddr: 'Aéroport Mohammed V (CMN)',
    vehicule: 'Mercedes Sprinter 20 places',
    vehiculeIcon: '🚐',
    statut: 'termine',
    contact: '+212 6 12 34 56 78',
    distance: '34 km',
    duree: '45 min',
    notes: 'Vol AT203 — Départ 11h00. Arriver au Terminal 1.',
    rating: 5,
    luggage: true,
    vip: false,
  },
  {
    id: '2',
    heure: '14:00',
    client: 'Famille Dubois — Paris',
    pax: 4,
    depart: 'Aéroport Mohammed V (CMN)',
    arriveeAddr: 'Riad Laarousse, Médina de Fès',
    vehicule: 'Toyota Land Cruiser 200',
    vehiculeIcon: '🚙',
    statut: 'en_cours',
    contact: '+33 6 98 76 54 32',
    distance: '310 km',
    duree: '3h15',
    notes: 'Vol Air France AF562 — Atterrissage 13h40. Panneau avec nom.',
    luggage: true,
    vip: true,
  },
  {
    id: '3',
    heure: '18:00',
    client: 'Incentive SANOFI — 35 pax',
    pax: 35,
    depart: 'Palais des Congrès de Marrakech',
    arriveeAddr: 'Hôtel La Mamounia',
    vehicule: 'Autocar Setra 48 places',
    vehiculeIcon: '🚌',
    statut: 'en_attente',
    distance: '4 km',
    duree: '12 min',
    notes: 'Soirée de gala. Tenue correcte exigée pour le chauffeur.',
    luggage: false,
    vip: true,
  },
  {
    id: '4',
    heure: '20:30',
    client: 'M. & Mme. Al-Rashid',
    pax: 2,
    depart: 'Hôtel La Mamounia',
    arriveeAddr: 'Restaurant Dar Moha, Marrakech',
    vehicule: 'Mercedes Classe S',
    vehiculeIcon: '🚘',
    statut: 'en_attente',
    contact: '+971 50 123 4567',
    distance: '2 km',
    duree: '8 min',
    notes: 'Clients VIP — Préparation véhicule soignée. Eau fraîche obligatoire.',
    luggage: false,
    vip: true,
  },
]

const STATUT_CONFIG = {
  en_attente: {
    label: 'En attente',
    cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600',
    dot: 'bg-amber-400',
  },
  en_cours: {
    label: 'En cours',
    cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600',
    dot: 'bg-blue-500 animate-pulse',
  },
  termine: {
    label: 'Terminé',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600',
    dot: 'bg-emerald-500',
  },
  annule: {
    label: 'Annulé',
    cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-600',
    dot: 'bg-rose-500',
  },
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'} />
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DriverPortalPage() {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES)
  const [gpsActive, setGpsActive] = useState(true)
  const [reportOpen, setReportOpen] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const today = new Date()
  const todayStr = today.toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })

  function updateStatut(id: string, statut: Course['statut']) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, statut } : c))
  }

  const termine   = courses.filter(c => c.statut === 'termine').length
  const enCours   = courses.find(c => c.statut === 'en_cours')
  const enAttente = courses.filter(c => c.statut === 'en_attente').length
  const total     = courses.length
  const progressPct = Math.round((termine / total) * 100)

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">

      {/* ── Header Gradient ── */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto">

          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Car size={20} />
              </div>
              <div>
                <p className="text-[15px] font-bold">{user?.full_name ?? 'Chauffeur'}</p>
                <p className="text-[11px] text-slate-400 capitalize">{todayStr}</p>
              </div>
            </div>

            <button
              onClick={() => setGpsActive(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                gpsActive
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {gpsActive ? <Wifi size={12} /> : <WifiOff size={12} />}
              GPS {gpsActive ? 'On' : 'Off'}
              {gpsActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'Total',     value: total,     color: 'text-white' },
              { label: 'Terminées', value: termine,   color: 'text-emerald-400' },
              { label: 'En cours',  value: enCours ? 1 : 0, color: 'text-blue-400' },
              { label: 'Restantes', value: enAttente, color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <p className={`text-[20px] font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-500">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Progression de la journée</span>
              <span className="font-bold text-white">{progressPct}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-4 -mt-2">

        {/* ── Course en cours highlight ── */}
        {enCours && (
          <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[11px] font-black text-blue-400 uppercase tracking-wider">Course en cours</p>
            </div>

            {/* Mini map placeholder */}
            <div className="relative h-20 rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden mb-3 flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500/30 to-transparent" />
              {/* Grid lines */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
              <div className="flex items-center gap-3 z-10">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                <div className="flex-1 h-0.5 w-20 bg-gradient-to-r from-emerald-400 to-blue-400" />
                <Navigation size={14} className="text-blue-400 animate-pulse" />
                <div className="flex-1 h-0.5 w-20 bg-gradient-to-r from-blue-400 to-rose-400" />
                <div className="w-3 h-3 rounded-full bg-rose-400 shadow-lg shadow-rose-400/50" />
              </div>
              {gpsActive && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/80 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] text-white font-bold">LIVE</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="text-slate-400 text-[10px] mb-0.5">Client</p>
                <p className="font-bold text-white">{enCours.client}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] mb-0.5">Distance · Durée</p>
                <p className="font-bold text-white">{enCours.distance} · {enCours.duree}</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Circle size={8} className="text-emerald-400 fill-emerald-400" />
                <span className="text-[11px]">{enCours.depart}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 justify-end">
                <span className="text-[11px] text-right">{enCours.arriveeAddr}</span>
                <Flag size={8} className="text-rose-400 fill-rose-400" />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateStatut(enCours.id, 'termine')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-all"
              >
                <CheckCircle size={14} /> Arrivé — Terminer
              </button>
              <button
                onClick={() => { setReportOpen(enCours.id); setReportText('') }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 text-[12px] font-bold hover:bg-rose-600/30 transition-all"
              >
                <AlertTriangle size={14} /> Incident
              </button>
            </div>
          </div>
        )}

        {/* ── Liste des courses ── */}
        <div className="space-y-3">
          {courses.map((course) => {
            const cfg = STATUT_CONFIG[course.statut]
            const isActive = course.statut === 'en_cours'
            const isDone = course.statut === 'termine'

            return (
              <div
                key={course.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-950/20'
                    : isDone
                    ? 'border-slate-800/50 bg-slate-900/30 opacity-70'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {/* Card header */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{course.vehiculeIcon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black text-white">{course.heure}</span>
                          <span className="text-[11px] text-slate-500">·</span>
                          <span className="text-[12px] text-slate-300 flex items-center gap-1">
                            <Users size={11} className="text-slate-500" /> {course.pax} pax
                          </span>
                          {course.vip && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-900/40 text-amber-400 text-[9px] font-black">
                              <Star size={8} className="fill-amber-400" /> VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-bold text-slate-200 mt-0.5">{course.client}</p>
                      </div>
                    </div>

                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold flex-shrink-0 ${cfg.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="relative pl-4 space-y-1.5 border-l-2 border-slate-700 ml-2 mb-3">
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[12px] text-slate-300">{course.depart}</p>
                    <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-rose-500" />
                    <p className="text-[12px] text-slate-300">{course.arriveeAddr}</p>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      {course.vehiculeIcon} {course.vehicule}
                    </span>
                    {course.distance && (
                      <span className="flex items-center gap-1">
                        <Route size={10} /> {course.distance}
                      </span>
                    )}
                    {course.duree && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {course.duree}
                      </span>
                    )}
                    {course.luggage && (
                      <span className="flex items-center gap-1">
                        <Package size={10} /> Bagages
                      </span>
                    )}
                    {course.contact && (
                      <a
                        href={`tel:${course.contact}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 ml-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone size={10} /> Appeler
                      </a>
                    )}
                  </div>

                  {/* Notes */}
                  {course.notes && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[11px] text-slate-400 leading-relaxed">{course.notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="px-4 pb-4">
                  {course.statut === 'en_attente' && (
                    <button
                      onClick={() => updateStatut(course.id, 'en_cours')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 transition-all"
                    >
                      <Navigation size={13} /> Démarrer la course
                    </button>
                  )}

                  {course.statut === 'en_cours' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatut(course.id, 'termine')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-all"
                      >
                        <CheckCircle size={13} /> Arrivé
                      </button>
                      <button
                        onClick={() => { setReportOpen(course.id); setReportText('') }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 text-[12px] font-bold hover:bg-rose-900/20 transition-all"
                      >
                        <AlertTriangle size={13} /> Incident
                      </button>
                    </div>
                  )}

                  {course.statut === 'termine' && (
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-emerald-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle size={13} /> Course complétée
                      </p>
                      {course.rating && <StarRating value={course.rating} />}
                    </div>
                  )}

                  {course.statut === 'annule' && (
                    <p className="text-[12px] text-rose-400 flex items-center gap-1.5 font-bold">
                      <AlertCircle size={13} /> Annulée — incident signalé
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Rapport Incident ── */}
        {reportOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
            <div className="w-full max-w-lg mx-auto bg-slate-900 rounded-t-3xl p-6 border-t border-rose-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-900/50 border border-rose-500/40 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Signaler un Incident</p>
                  <p className="text-[11px] text-slate-400">Ce rapport sera envoyé au chef d'agence</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {['Retard', 'Panne', 'Accident', 'Client absent', 'Route bloquée', 'Autre'].map(t => (
                  <button
                    key={t}
                    className="py-2 rounded-xl border border-slate-700 text-slate-400 text-[11px] font-semibold hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-900/10 transition-all"
                    onClick={() => setReportText(prev => prev ? `${prev}, ${t}` : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Détails de l'incident..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 resize-none mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setReportOpen(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-[13px] font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    updateStatut(reportOpen, 'annule')
                    setReportOpen(null)
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-[13px] font-bold hover:bg-rose-700 transition-all"
                >
                  Envoyer le rapport
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats journée ── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-4">Récapitulatif de la journée</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[22px] font-black text-white">{courses.reduce((a, c) => a + (c.distance ? parseFloat(c.distance) : 0), 0).toFixed(0)} km</p>
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1"><Gauge size={10} /> Distance totale</p>
            </div>
            <div>
              <p className="text-[22px] font-black text-emerald-400">{courses.reduce((a, c) => a + c.pax, 0)}</p>
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1"><Users size={10} /> Passagers transportés</p>
            </div>
            <div>
              <p className="text-[22px] font-black text-amber-400">{courses.filter(c => c.rating).reduce((a, c) => a + (c.rating ?? 0), 0) / Math.max(1, courses.filter(c => c.rating).length) || 0}/5</p>
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1"><Star size={10} /> Note moyenne</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
