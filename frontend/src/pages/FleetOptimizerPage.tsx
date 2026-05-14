import { useState, useMemo } from 'react'
import {
  Bus, Users, TrendingDown, AlertCircle, CheckCircle2, ChevronRight,
  Zap, Truck, Car, Wrench, Calendar, MapPin, Fuel, Shield,
  Clock, User, Plus, AlertTriangle, CheckCircle, BarChart2,
  Settings, Star, Activity, Navigation, Phone
} from 'lucide-react'

// ─── Fleet Database ───────────────────────────────────────────────────────────

const FLEET_DATABASE = [
  { id: 'sedan',      label: 'Mercedes Classe S — VIP',            capacity: 3,  daily_rate: 2500, type: 'sedan' },
  { id: 'sedan_e',    label: 'Mercedes Classe E',                  capacity: 3,  daily_rate: 1800, type: 'sedan' },
  { id: '4x4_lc',     label: '4×4 Toyota Land Cruiser — Sahara',   capacity: 4,  daily_rate: 1800, type: '4wd' },
  { id: '4x4_hilux',  label: '4×4 Toyota Hilux — Désert',          capacity: 3,  daily_rate: 1200, type: '4wd' },
  { id: '4x4_pajero', label: '4×4 Mitsubishi Pajero — Atlas',      capacity: 4,  daily_rate: 1400, type: '4wd' },
  { id: '4x4_g',      label: '4×4 Mercedes Classe G — VIP',        capacity: 4,  daily_rate: 3500, type: '4wd' },
  { id: 'vito',       label: 'Mercedes Vito Tourer',               capacity: 8,  daily_rate: 1500, type: 'mini-van' },
  { id: 'man_tge',    label: 'MAN TGE 5.180 — Minibus',            capacity: 19, daily_rate: 2200, type: 'minibus' },
  { id: 'king_long',  label: 'King Long — Autocar 49 PAX',         capacity: 49, daily_rate: 3200, type: 'coach' },
  { id: 'irizar',     label: 'Irizar i6 — Autocar Premium 48 PAX', capacity: 48, daily_rate: 3500, type: 'coach' },
  { id: '54_seat',    label: 'MAN — Autocar 54 PAX',               capacity: 54, daily_rate: 4000, type: 'coach' },
]

// ─── Live Fleet ───────────────────────────────────────────────────────────────

type VehicleStatus = 'disponible' | 'en_mission' | 'maintenance' | 'hors_service'

interface Vehicle {
  id: string
  plate: string
  label: string
  type: string
  capacity: number
  status: VehicleStatus
  driver?: string
  driverPhone?: string
  project?: string
  location?: string
  fuel: number        // 0-100%
  mileage: number
  nextMaintenance: string
  lastRevision: string
  score: number       // fiabilité 0-5
}

const LIVE_FLEET: Vehicle[] = [
  {
    id: 'v1', plate: 'W-12345-A',
    label: 'Mercedes Classe S 350d', type: 'sedan', capacity: 3,
    status: 'en_mission', driver: 'Hassan Bennani', driverPhone: '+212 670 123 456',
    project: 'Al-Rashid — MRK-2026-042', location: 'Palais Bahia, Marrakech',
    fuel: 72, mileage: 84_230, nextMaintenance: '15 Juin 2026', lastRevision: '15 Mar 2026',
    score: 4.9,
  },
  {
    id: 'v2', plate: 'W-23456-B',
    label: 'Toyota Land Cruiser 200', type: '4wd', capacity: 4,
    status: 'en_mission', driver: 'Khalid Amrani', driverPhone: '+212 661 234 567',
    project: 'Famille Dubois — MRK-2026-039', location: 'Route Agafay',
    fuel: 45, mileage: 156_800, nextMaintenance: '01 Juin 2026', lastRevision: '01 Mar 2026',
    score: 4.7,
  },
  {
    id: 'v3', plate: 'W-34567-C',
    label: 'Mercedes Vito Tourer', type: 'mini-van', capacity: 8,
    status: 'disponible', driver: undefined,
    fuel: 90, mileage: 62_100, nextMaintenance: '30 Jul 2026', lastRevision: '10 Avr 2026',
    score: 4.8,
  },
  {
    id: 'v4', plate: 'W-45678-D',
    label: 'MAN TGE Minibus 19 pax', type: 'minibus', capacity: 19,
    status: 'disponible', driver: 'Youssef Tazi', driverPhone: '+212 662 345 678',
    fuel: 60, mileage: 43_500, nextMaintenance: '20 Jun 2026', lastRevision: '20 Jan 2026',
    score: 4.6,
  },
  {
    id: 'v5', plate: 'W-56789-E',
    label: 'King Long Autocar 49 pax', type: 'coach', capacity: 49,
    status: 'en_mission', driver: 'Rachid Oukhouya', driverPhone: '+212 670 456 789',
    project: 'SANOFI Incentive — MRK-2026-041', location: 'Aéroport CMN',
    fuel: 30, mileage: 312_000, nextMaintenance: '10 Mai 2026', lastRevision: '10 Nov 2025',
    score: 4.4,
  },
  {
    id: 'v6', plate: 'W-67890-F',
    label: 'Irizar i6 Premium 48 pax', type: 'coach', capacity: 48,
    status: 'maintenance',
    fuel: 0, mileage: 198_500, nextMaintenance: 'En cours', lastRevision: 'En cours',
    score: 4.2,
  },
  {
    id: 'v7', plate: 'W-78901-G',
    label: 'Mercedes Classe G AMG', type: '4wd', capacity: 4,
    status: 'disponible', driver: undefined,
    fuel: 85, mileage: 28_000, nextMaintenance: '01 Sep 2026', lastRevision: '01 Jan 2026',
    score: 5.0,
  },
  {
    id: 'v8', plate: 'W-89012-H',
    label: 'MAN Autocar 54 pax', type: 'coach', capacity: 54,
    status: 'hors_service',
    fuel: 0, mileage: 520_000, nextMaintenance: '—', lastRevision: 'Jan 2025',
    score: 3.1,
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<VehicleStatus, { label: string; cls: string; dot: string; bg: string }> = {
  disponible:   { label: 'Disponible',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500', bg: 'border-emerald-200 dark:border-emerald-800' },
  en_mission:   { label: 'En mission',   cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',       dot: 'bg-blue-500 animate-pulse', bg: 'border-blue-200 dark:border-blue-800' },
  maintenance:  { label: 'Maintenance',  cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',  dot: 'bg-amber-500', bg: 'border-amber-200 dark:border-amber-800' },
  hors_service: { label: 'Hors service', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',        dot: 'bg-rose-500', bg: 'border-rose-200 dark:border-rose-800' },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  sedan:    <Car size={18} />,
  '4wd':    <Truck size={18} />,
  'mini-van': <Bus size={18} />,
  minibus:  <Bus size={18} />,
  coach:    <Bus size={18} />,
}

function FuelBar({ fuel, status }: { fuel: number; status: VehicleStatus }) {
  const color = fuel < 25 ? 'bg-rose-500' : fuel < 50 ? 'bg-amber-500' : 'bg-emerald-500'
  if (status === 'maintenance' || status === 'hors_service') return <span className="text-[11px] text-slate-400">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${fuel}%` }} />
      </div>
      <span className={`text-[11px] font-bold ${fuel < 25 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{fuel}%</span>
    </div>
  )
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= Math.round(score) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'} />
      ))}
      <span className="text-[10px] text-slate-400 ml-1">{score.toFixed(1)}</span>
    </div>
  )
}

interface Solution {
  vehicleId: string; label: string; count: number; capacity: number
  totalCapacity: number; totalCost: number; fillRate: number; costPerPax: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FleetOptimizerPage() {
  const [activeTab, setActiveTab] = useState<'optimizer' | 'fleet' | 'maintenance'>('fleet')
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all')
  const [pax, setPax]   = useState<number>(20)
  const [days, setDays] = useState<number>(7)

  const solutions = useMemo(() => {
    if (!pax || pax <= 0) return []
    return FLEET_DATABASE.map(v => {
      const count = Math.ceil(pax / v.capacity)
      const totalCost = count * v.daily_rate * days
      const totalCapacity = count * v.capacity
      const fillRate = (pax / totalCapacity) * 100
      const costPerPax = totalCost / pax
      return { vehicleId: v.id, label: v.label, count, capacity: v.capacity, totalCapacity, totalCost, fillRate, costPerPax } as Solution
    }).sort((a, b) => a.totalCost - b.totalCost)
  }, [pax, days])

  const filteredFleet = LIVE_FLEET.filter(v => filterStatus === 'all' || v.status === filterStatus)

  // Fleet KPIs
  const disponibles = LIVE_FLEET.filter(v => v.status === 'disponible').length
  const enMission   = LIVE_FLEET.filter(v => v.status === 'en_mission').length
  const maintenance = LIVE_FLEET.filter(v => v.status === 'maintenance').length
  const horsSvc     = LIVE_FLEET.filter(v => v.status === 'hors_service').length
  const totalCapacity = LIVE_FLEET.filter(v => v.status !== 'hors_service').reduce((a, v) => a + v.capacity, 0)

  const TABS = [
    { id: 'fleet',      label: 'Parc Véhicules', icon: <Bus size={13} /> },
    { id: 'optimizer',  label: 'Optimisateur',   icon: <BarChart2 size={13} /> },
    { id: 'maintenance',label: 'Maintenance',     icon: <Wrench size={13} /> },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-6 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Truck size={13} className="text-emerald-400" />
            <span className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest">HORIZON DMC · Flotte Transport</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-black text-white">Fleet Command Center</h1>
              <p className="text-slate-400 text-[13px] mt-0.5">Gestion en temps réel de la flotte STOURS</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Disponibles', value: disponibles, color: 'text-emerald-400' },
                { label: 'En mission',  value: enMission,   color: 'text-blue-400' },
                { label: 'Maintenance', value: maintenance, color: 'text-amber-400' },
                { label: 'Capacité',    value: `${totalCapacity} pax`, color: 'text-white' },
              ].map(k => (
                <div key={k.label} className="bg-white/8 rounded-xl px-4 py-2.5 text-center border border-white/5">
                  <p className={`text-[18px] font-black ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] text-slate-500">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="max-w-6xl mx-auto w-full px-6 mt-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-5 flex-1">

        {/* ══ FLEET TAB ══ */}
        {activeTab === 'fleet' && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {(['all', 'disponible', 'en_mission', 'maintenance', 'hors_service'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    filterStatus === s
                      ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 bg-white dark:bg-slate-900'
                  }`}
                >
                  {s !== 'all' && <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s]?.dot.replace(' animate-pulse', '')}`} />}
                  {s === 'all' ? `Tous (${LIVE_FLEET.length})` : STATUS_CFG[s].label}
                </button>
              ))}
              <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[#5B1914]/40 text-[#5B1914] dark:text-[#E8734A] dark:border-[#E8734A]/40 bg-white dark:bg-slate-900 hover:bg-[#5B1914]/5 transition-all">
                <Plus size={12} /> Ajouter un véhicule
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFleet.map(v => {
                const cfg = STATUS_CFG[v.status]
                return (
                  <div key={v.id} className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${cfg.bg} overflow-hidden transition-all hover:shadow-md`}>
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        v.status === 'disponible' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                        v.status === 'en_mission' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        v.status === 'maintenance' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {TYPE_ICON[v.type] ?? <Bus size={18} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{v.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{v.plate} · {v.capacity} places</p>
                          </div>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${cfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>

                        <ScoreStars score={v.score} />
                      </div>
                    </div>

                    <div className="px-5 py-3 space-y-2.5">
                      {/* Driver */}
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-slate-400 flex-shrink-0" />
                        {v.driver ? (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[12px] text-slate-700 dark:text-slate-300 font-medium">{v.driver}</span>
                            {v.driverPhone && (
                              <a href={`tel:${v.driverPhone}`} className="ml-auto text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
                                <Phone size={10} /> Appeler
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">Aucun chauffeur assigné</span>
                        )}
                      </div>

                      {/* Project / Location */}
                      {v.project && (
                        <div className="flex items-center gap-2">
                          <Navigation size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">{v.location ?? v.project}</span>
                        </div>
                      )}

                      {/* Fuel */}
                      <div className="flex items-center gap-2">
                        <Fuel size={12} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <FuelBar fuel={v.fuel} status={v.status} />
                        </div>
                      </div>

                      {/* Maintenance */}
                      <div className="flex items-center gap-2">
                        <Wrench size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Prochaine révision: <span className={`font-bold ${v.nextMaintenance === 'En cours' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{v.nextMaintenance}</span>
                        </span>
                      </div>

                      {/* Mileage */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{v.mileage.toLocaleString()} km au compteur</span>
                        <span>Dernière révision: {v.lastRevision}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {v.status === 'disponible' && (
                      <div className="px-5 pb-4">
                        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-all">
                          <Navigation size={13} /> Assigner à un projet
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══ OPTIMIZER TAB ══ */}
        {activeTab === 'optimizer' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Inputs */}
            <div className="col-span-4 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                  <Users size={15} className="text-[#5B1914] dark:text-[#E8734A]" />
                  Paramètres du groupe
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-2">Nombre de PAX</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1" max="100" value={pax} onChange={e => setPax(+e.target.value)} className="flex-1 accent-red-800" />
                      <span className="text-[22px] font-black text-slate-900 dark:text-slate-100 w-12">{pax}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-2">Durée (jours)</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1" max="21" value={days} onChange={e => setDays(+e.target.value)} className="flex-1 accent-slate-500" />
                      <span className="text-[22px] font-black text-slate-900 dark:text-slate-100 w-12">{days}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex gap-3">
                    <TrendingDown size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">Conseil Optimisation</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1">
                        {pax % 17 === 0 ? 'Configuration parfaite pour Minibus 17.' : 'Visez un multiple de capacité pour réduire le coût/pax.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate card */}
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-4">Tarifs de référence (MAD/jour)</h3>
                <div className="space-y-2">
                  {FLEET_DATABASE.map(v => (
                    <div key={v.id} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">{v.label}</span>
                      <span className="font-black text-white">{v.daily_rate.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-600 mt-4 italic border-t border-slate-800 pt-3">
                  * Chauffeur + carburant inclus. Hors nuitée chauffeur.
                </p>
              </div>
            </div>

            {/* Solutions */}
            <div className="col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Configurations Comparées</h2>
                <span className="text-[11px] text-slate-400">{solutions.length} options · triées par coût</span>
              </div>

              {solutions.map((sol, idx) => {
                const isBest = idx === 0
                return (
                  <div key={sol.vehicleId} className={`relative bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 flex items-center justify-between transition-all hover:shadow-md ${
                    isBest ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    {isBest && (
                      <div className="absolute -top-3 left-5 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <CheckCircle2 size={10} /> RECOMMANDÉ
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isBest ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Bus size={24} />
                      </div>
                      <div>
                        <p className="text-[14px] font-black text-slate-800 dark:text-slate-100">{sol.count} × {sol.label}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-slate-400">Capacité: {sol.totalCapacity} pax</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full ${sol.fillRate > 90 ? 'bg-emerald-500' : sol.fillRate > 70 ? 'bg-blue-500' : 'bg-amber-500'} rounded-full`} style={{ width: `${sol.fillRate}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{Math.round(sol.fillRate)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Coût/PAX total</p>
                      <p className={`text-[22px] font-black ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {Math.round(sol.costPerPax).toLocaleString('fr-FR')} <span className="text-[12px] text-slate-400">MAD</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Total: {sol.totalCost.toLocaleString('fr-FR')} MAD</p>
                    </div>
                  </div>
                )
              })}

              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 rounded-xl mt-4">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>Réglementation marocaine :</strong> Pour les groupes de +15 personnes, un autocar de tourisme agréé est obligatoire pour les longs trajets inter-villes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ MAINTENANCE TAB ══ */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            {/* Alerts */}
            <div className="bg-rose-50 dark:bg-rose-900/15 border border-rose-200 dark:border-rose-700/40 rounded-2xl p-4 flex items-center gap-4">
              <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-rose-800 dark:text-rose-300">Alerte — 2 véhicules à réviser ce mois</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">King Long (W-56789-E) — révision dépassée · MAN Autocar (W-89012-H) — hors service</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Calendrier de Maintenance</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {LIVE_FLEET.map(v => {
                  const isOverdue = v.status === 'hors_service' || v.nextMaintenance === 'En cours'
                  const isUrgent = v.nextMaintenance.includes('Mai') || v.nextMaintenance.includes('Juin')
                  return (
                    <div key={v.id} className="flex items-center gap-4 px-5 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOverdue ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                        isUrgent  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isOverdue ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{v.label}</p>
                        <p className="text-[11px] text-slate-400">{v.plate} · {v.mileage.toLocaleString()} km</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[12px] font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {v.nextMaintenance}
                        </p>
                        <p className="text-[10px] text-slate-400">Dernière: {v.lastRevision}</p>
                      </div>
                      <button className="ml-4 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:border-[#5B1914]/40 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                        Planifier
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
