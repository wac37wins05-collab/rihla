import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { guidePortalApi, AvailabilityStatus, RemarkType } from '@/lib/api'
import {
  Calendar, MessageSquare, CheckCircle, AlertTriangle, Lightbulb, Send, DollarSign,
  Mic, AlertCircle, Info, Star, ShieldAlert, BookOpen, CheckSquare, MapPin,
  Users, Phone, Clock, Coffee, Utensils, Hotel, Camera, Bus, FileText,
  Navigation, Wifi, WifiOff, ChevronRight, Download, Loader2, Heart,
  AlertOctagon, User, Baby, Leaf, Pill, Flag
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ExpenseCapture } from '@/components/finance/ExpenseCapture'
import { exportDayProgrammePDF } from '@/lib/pdfExport'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgrammeStop {
  time: string
  type: 'depart' | 'visit' | 'meal' | 'hotel' | 'activity' | 'break' | 'arrival'
  place: string
  duration: string
  notes?: string
  address?: string
}

interface Passenger {
  id: string
  name: string
  nationality: string
  dietary: string[]
  medical: string[]
  room: string
  phone?: string
  age?: number
  isVip?: boolean
}

interface EmergencyContact {
  name: string
  role: string
  phone: string
  available: string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const TODAY_PROGRAMME: ProgrammeStop[] = [
  { time: '07:30', type: 'depart',   place: 'Hôtel Kenzi Farah',         duration: '—',      notes: 'Départ en bus depuis l\'entrée principale', address: 'Ave Hassan II, Marrakech' },
  { time: '08:15', type: 'visit',    place: 'Palais Bahia',              duration: '1h30',   notes: 'Visite guidée avec entrée incluse. Groupes de 12 max.', address: 'Rue Riad Zitoun el Jdid' },
  { time: '10:00', type: 'activity', place: 'Souk Semmarine',            duration: '1h',     notes: 'Temps libre shopping. RDV au point A (fontaine bleue).' },
  { time: '11:00', type: 'break',    place: 'Café Arabe',                duration: '45min',  notes: 'Pause thé à la menthe. Budget: 5€/pers inclus.', address: '184 Rue Mouassine' },
  { time: '12:30', type: 'meal',     place: 'Restaurant Dar Moha',       duration: '1h30',   notes: 'Déjeuner traditionnel. Menu pré-commandé. Prévenez végétariens.', address: 'Rue Dar El Bacha' },
  { time: '14:30', type: 'visit',    place: 'Jardins Majorelle',         duration: '1h30',   notes: 'Billet inclus. Attention: photos interdites à l\'intérieur.', address: 'Rue Yves Saint Laurent' },
  { time: '16:30', type: 'activity', place: 'Cours de poterie Fes-style', duration: '1h',   notes: 'Atelier avec maître artisan Hassan. Tenue confort recommandée.' },
  { time: '18:00', type: 'arrival',  place: 'Hôtel Kenzi Farah',         duration: '—',      notes: 'Retour hôtel. Dîner libre ce soir.' },
]

const PASSENGERS: Passenger[] = [
  { id: 'p1', name: 'Sophie Martin',     nationality: '🇫🇷 France',   dietary: ['végétarien'],       medical: [],                    room: '302', phone: '+33 6 12 34 56 78', age: 42, isVip: true },
  { id: 'p2', name: 'Jean-Pierre Dubois',nationality: '🇫🇷 France',   dietary: [],                   medical: ['diabète type 2'],     room: '303', phone: '+33 6 98 76 54 32', age: 68 },
  { id: 'p3', name: 'Emma & Tom Wilson', nationality: '🇬🇧 UK',       dietary: ['vegan'],            medical: [],                    room: '210', phone: '+44 7700 123456', age: 35 },
  { id: 'p4', name: 'Klaus Müller',      nationality: '🇩🇪 Germany',  dietary: ['sans gluten'],      medical: ['allergie arachides'], room: '215', phone: '+49 151 234567', age: 55, isVip: true },
  { id: 'p5', name: 'Fatima Al-Rashid',  nationality: '🇦🇪 UAE',      dietary: ['halal'],            medical: [],                    room: '301', phone: '+971 50 1234567', age: 31 },
  { id: 'p6', name: 'Lucia Romano',      nationality: '🇮🇹 Italy',    dietary: [],                   medical: [],                    room: '204', age: 48 },
  { id: 'p7', name: 'Yuki Tanaka',       nationality: '🇯🇵 Japan',    dietary: ['sans porc'],        medical: [],                    room: '308', age: 28 },
  { id: 'p8', name: 'Carlos & Ana Ruiz', nationality: '🇪🇸 Spain',   dietary: [],                   medical: ['asthme (Yuki)'],     room: '218', age: 52 },
]

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'Ahmed Bennani',     role: 'Chef d\'agence STOURS',   phone: '+212 661 234 567', available: '24h/24' },
  { name: 'Dr. Karim Alaoui',  role: 'Médecin partenaire',      phone: '+212 522 345 678', available: '8h–20h' },
  { name: 'Hassan (chauffeur)',role: 'Chauffeur bus',            phone: '+212 670 456 789', available: 'En service' },
  { name: 'Police Tourisme',   role: 'Brigade Touristique',     phone: '19',               available: '24h/24' },
  { name: 'SAMU Marrakech',    role: 'Urgences médicales',      phone: '150',              available: '24h/24' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

const STOP_CONFIG: Record<ProgrammeStop['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  depart:   { icon: <Bus size={14} />,        color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  visit:    { icon: <Camera size={14} />,     color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  meal:     { icon: <Utensils size={14} />,   color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/40' },
  hotel:    { icon: <Hotel size={14} />,      color: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-100 dark:bg-teal-900/40' },
  activity: { icon: <Star size={14} />,       color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-100 dark:bg-rose-900/40' },
  break:    { icon: <Coffee size={14} />,     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  arrival:  { icon: <Flag size={14} />,       color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
}

const DIETARY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'végétarien':  { label: 'Végétarien',    icon: <Leaf size={10} />,   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  'vegan':       { label: 'Vegan',         icon: <Leaf size={10} />,   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  'halal':       { label: 'Halal',         icon: <Star size={10} />,   color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  'sans gluten': { label: 'Sans gluten',   icon: <Pill size={10} />,   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  'sans porc':   { label: 'Sans porc',     icon: <AlertOctagon size={10} />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#5B1914]/10 dark:bg-[#E8734A]/20 flex items-center justify-center text-[#5B1914] dark:text-[#E8734A] flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string; cls: string }> = {
  available: { label: 'Disponible', color: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600' },
  busy:      { label: 'Occupé',     color: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-600' },
  tentative: { label: 'Incertain',  color: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600' },
}

const REMARK_ICONS: Record<RemarkType, React.ReactNode> = {
  observation: <CheckCircle size={13} />,
  issue:       <AlertTriangle size={13} />,
  suggestion:  <Lightbulb size={13} />,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function GuidePortalPage() {
  const { user } = useAuthStore()
  const [logbookContent, setLogbookContent] = useState('')
  const qc = useQueryClient()
  const today = new Date()
  const todayStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [projectId, setProjectId] = useState('')
  const [remarkType, setRemarkType] = useState<RemarkType>('observation')
  const [remarkContent, setRemarkContent] = useState('')
  const [dayNum, setDayNum] = useState<number | ''>('')
  const [insightContent, setInsightContent] = useState('')
  const [insightTarget, setInsightTarget] = useState('')
  const [activeTab, setActiveTab] = useState<'programme' | 'passagers' | 'agenda' | 'logbook'>('programme')
  const [exporting, setExporting] = useState(false)
  const [expandedStop, setExpandedStop] = useState<number | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [paxFilter, setPaxFilter] = useState<'all' | 'dietary' | 'medical' | 'vip'>('all')

  const { data: agenda = [] } = useQuery({
    queryKey: ['guide-agenda', month],
    queryFn: () => guidePortalApi.getAgenda(month).then(r => r.data),
  })

  const setAvail = useMutation({
    mutationFn: ({ date, status }: { date: string; status: AvailabilityStatus }) =>
      guidePortalApi.setAvailability(date, { date, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guide-agenda'] }),
  })

  const addRemark = useMutation({
    mutationFn: () => guidePortalApi.addRemark({
      project_id: projectId,
      remark_type: remarkType,
      day_number: dayNum !== '' ? Number(dayNum) : undefined,
      content: remarkContent,
    }),
    onSuccess: () => {
      setRemarkContent('')
      setDayNum('')
      qc.invalidateQueries({ queryKey: ['guide-remarks'] })
    },
  })

  // Calendar grid
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, '0')
    return `${month}-${d}`
  })
  const agendaMap = Object.fromEntries(agenda.map((a: any) => [a.date, a]))

  // PDF Export
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportDayProgrammePDF({
        projectRef: 'MRK-2026-0042',
        groupName: 'Groupe Découverte Marrakech',
        guideeName: user?.full_name ?? 'Guide',
        date: today.toISOString().split('T')[0],
        day: 3,
        totalDays: 7,
        hotel: 'Hôtel Kenzi Farah, Ave Hassan II',
        paxCount: PASSENGERS.length,
        programme: TODAY_PROGRAMME.map(s => ({
          time: s.time,
          place: s.place,
          duration: s.duration,
          notes: s.notes ?? '',
          type: s.type,
        })),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // Filtered passengers
  const filteredPax = PASSENGERS.filter(p => {
    if (paxFilter === 'dietary') return p.dietary.length > 0
    if (paxFilter === 'medical') return p.medical.length > 0
    if (paxFilter === 'vip') return p.isVip
    return true
  })

  // Current programme stop (mock: based on current time)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()
  const currentStopIdx = TODAY_PROGRAMME.findIndex((s, i) => {
    const [h, m] = s.time.split(':').map(Number)
    const startMin = h * 60 + m
    const next = TODAY_PROGRAMME[i + 1]
    if (!next) return true
    const [nh, nm] = next.time.split(':').map(Number)
    return nowMinutes >= startMin && nowMinutes < nh * 60 + nm
  })

  const TABS = [
    { id: 'programme', label: 'Programme du Jour', icon: <MapPin size={14} /> },
    { id: 'passagers', label: `Passagers (${PASSENGERS.length})`, icon: <Users size={14} /> },
    { id: 'agenda',    label: 'Mon Agenda',  icon: <Calendar size={14} /> },
    { id: 'logbook',   label: 'Logbook',     icon: <BookOpen size={14} /> },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#5B1914] to-[#8B2E28] px-6 pt-8 pb-10">
        <div className="max-w-3xl mx-auto">
          {/* Alert strip */}
          <div className="flex items-start gap-3 bg-rose-800/50 border border-rose-600/60 rounded-xl px-4 py-3 mb-6 backdrop-blur-sm">
            <AlertCircle size={16} className="text-rose-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold text-rose-200">ALERTE SATISFACTION — Projet #CAS-9982</p>
              <p className="text-[11px] text-rose-300 mt-0.5">Un client a signalé une humeur "Déçu" il y a 10 min. Merci de vérifier.</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-1">Portail Guide</p>
              <h1 className="text-[22px] font-bold text-white">Bonjour, {user?.full_name?.split(' ')[0] ?? 'Guide'} 👋</h1>
              <p className="text-[13px] text-white/70 mt-1 capitalize">{todayStr} — Jour 3/7 · Marrakech</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* GPS Toggle */}
              <button
                onClick={() => setGpsActive(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${
                  gpsActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
              >
                {gpsActive ? <Wifi size={13} /> : <WifiOff size={13} />}
                GPS {gpsActive ? 'Actif' : 'Inactif'}
                {gpsActive && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>
              {/* PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold bg-[#E8734A] text-white hover:bg-[#d4623b] transition-all disabled:opacity-60"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export PDF
              </button>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Passagers', value: PASSENGERS.length, icon: <Users size={14} />, color: 'text-blue-300' },
              { label: 'Étapes',    value: TODAY_PROGRAMME.length, icon: <MapPin size={14} />, color: 'text-violet-300' },
              { label: 'Régimes',   value: PASSENGERS.filter(p => p.dietary.length > 0).length, icon: <Leaf size={14} />, color: 'text-emerald-300' },
              { label: 'VIP',       value: PASSENGERS.filter(p => p.isVip).length, icon: <Star size={14} />, color: 'text-amber-300' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className={`flex justify-center mb-1 ${kpi.color}`}>{kpi.icon}</div>
                <p className="text-[18px] font-black text-white">{kpi.value}</p>
                <p className="text-[10px] text-white/60">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="max-w-3xl mx-auto px-4 -mt-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-1.5 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#5B1914] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 mt-5 space-y-5">

        {/* ══ PROGRAMME DU JOUR ══ */}
        {activeTab === 'programme' && (
          <>
            {/* Current position banner */}
            {gpsActive && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                <Navigation size={16} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">Position GPS active</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-500 truncate">
                    Lat: 31.6295° N, Lng: 7.9811° W · Médina de Marrakech
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                  MAJ 12s
                </span>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <SectionHeader icon={<MapPin size={16} />} title="Programme du Jour" subtitle="Groupe Découverte Marrakech · MRK-2026-0042" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {TODAY_PROGRAMME.map((stop, i) => {
                  const cfg = STOP_CONFIG[stop.type]
                  const isCurrent = i === currentStopIdx
                  const isPast = i < currentStopIdx
                  const isExpanded = expandedStop === i

                  return (
                    <div
                      key={i}
                      className={`transition-colors ${isCurrent ? 'bg-amber-50 dark:bg-amber-900/10' : isPast ? 'opacity-55' : ''}`}
                    >
                      <button
                        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpandedStop(isExpanded ? null : i)}
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.color} ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                            {cfg.icon}
                          </div>
                          {i < TODAY_PROGRAMME.length - 1 && (
                            <div className={`w-0.5 h-6 ${isPast ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 tabular-nums">{stop.time}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide">
                                En cours
                              </span>
                            )}
                          </div>
                          <p className={`text-[14px] font-bold ${isPast ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100'}`}>
                            {stop.place}
                          </p>
                          {stop.address && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} /> {stop.address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock size={11} />{stop.duration}
                          </span>
                          <ChevronRight size={14} className={`text-slate-300 dark:text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && stop.notes && (
                        <div className="mx-5 mb-4 ml-16 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{stop.notes}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <SectionHeader icon={<Phone size={16} />} title="Contacts d'Urgence" subtitle="Accessibles même hors réseau (mémorisés)" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {EMERGENCY_CONTACTS.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      i === 0 ? 'bg-[#5B1914]/10 text-[#5B1914] dark:bg-[#E8734A]/20 dark:text-[#E8734A]' :
                      i === 1 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      <User size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{c.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <a
                        href={`tel:${c.phone}`}
                        className="block text-[13px] font-black text-[#5B1914] dark:text-[#E8734A] hover:underline"
                      >
                        {c.phone}
                      </a>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.available}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <SectionHeader icon={<MessageSquare size={16} />} title="Remarque sur un circuit" subtitle="Envoyée directement au Travel Designer" />

              <div className="flex flex-wrap gap-2 mb-4">
                {(['observation', 'issue', 'suggestion'] as RemarkType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRemarkType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all ${
                      remarkType === t
                        ? 'bg-[#5B1914] border-[#5B1914] text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    {REMARK_ICONS[t]}
                    {{ observation: 'Observation', issue: 'Problème', suggestion: 'Suggestion' }[t]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  placeholder="ID ou réf. projet"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-[2] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
                />
                <input
                  type="number"
                  placeholder="Jour n°"
                  value={dayNum}
                  onChange={(e) => setDayNum(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Décrivez votre remarque..."
                value={remarkContent}
                onChange={(e) => setRemarkContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30 resize-vertical mb-3"
              />
              <button
                onClick={() => addRemark.mutate()}
                disabled={!projectId || !remarkContent || addRemark.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B1914] text-white text-[13px] font-bold hover:bg-[#4a1410] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                {addRemark.isPending ? 'Envoi…' : 'Envoyer au Travel Designer'}
              </button>
              {addRemark.isSuccess && (
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle size={12} /> Remarque envoyée — le Travel Designer a été notifié
                </p>
              )}
            </div>
          </>
        )}

        {/* ══ PASSAGERS ══ */}
        {activeTab === 'passagers' && (
          <>
            {/* Dietary summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <SectionHeader icon={<Users size={16} />} title="Liste des Passagers" subtitle={`${PASSENGERS.length} voyageurs · Groupe MRK-2026-0042`} />

              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(
                  PASSENGERS.flatMap(p => p.dietary).reduce<Record<string, number>>((acc, d) => {
                    acc[d] = (acc[d] ?? 0) + 1; return acc
                  }, {})
                ).map(([diet, count]) => {
                  const cfg = DIETARY_CONFIG[diet]
                  return (
                    <span key={diet} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${cfg?.color ?? 'bg-slate-100 text-slate-600'}`}>
                      {cfg?.icon} {diet} ×{count}
                    </span>
                  )
                })}
                {PASSENGERS.filter(p => p.medical.length > 0).length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    <Heart size={10} /> {PASSENGERS.filter(p => p.medical.length > 0).length} alertes médicales
                  </span>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {([
                  { id: 'all', label: 'Tous' },
                  { id: 'dietary', label: 'Régimes' },
                  { id: 'medical', label: 'Médical' },
                  { id: 'vip', label: 'VIP' },
                ] as const).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setPaxFilter(f.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                      paxFilter === f.id
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredPax.map(pax => (
                  <div key={pax.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-black ${
                      pax.isVip
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {pax.isVip ? '★' : pax.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{pax.name}</p>
                        {pax.isVip && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-black uppercase">VIP</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{pax.nationality} · Chambre {pax.room}</p>

                      {/* Dietary */}
                      {pax.dietary.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pax.dietary.map(d => {
                            const cfg = DIETARY_CONFIG[d]
                            return (
                              <span key={d} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cfg?.color ?? 'bg-slate-100 text-slate-500'}`}>
                                {cfg?.icon} {d}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Medical */}
                      {pax.medical.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pax.medical.map(m => (
                            <span key={m} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                              <Heart size={9} /> {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {pax.phone && (
                      <a
                        href={`tel:${pax.phone}`}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-[#5B1914] hover:text-white transition-all"
                        title={`Appeler ${pax.name}`}
                      >
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                ))}

                {filteredPax.length === 0 && (
                  <p className="text-center text-[13px] text-slate-400 dark:text-slate-500 py-6">
                    Aucun passager dans ce filtre
                  </p>
                )}
              </div>
            </div>

            {/* Designer Intent card */}
            <div className="bg-amber-50 dark:bg-amber-900/15 rounded-2xl border border-amber-200 dark:border-amber-700/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={15} className="text-amber-600 dark:text-amber-400" />
                <p className="text-[12px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wide">Designer Intent</p>
              </div>
              <p className="text-[13px] text-amber-700 dark:text-amber-300 leading-relaxed">
                "Sophie Martin (302) est photographe professionnelle — proposez-lui le coucher de soleil sur les remparts à 18h15 depuis Bab Agnaou."
              </p>
              <p className="text-[11px] text-amber-500 dark:text-amber-500 mt-2">Note privée du Travel Designer · Non visible client</p>
            </div>
          </>
        )}

        {/* ══ AGENDA ══ */}
        {activeTab === 'agenda' && (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <SectionHeader icon={<Calendar size={16} />} title="Mon Agenda" subtitle="Cliquer sur un jour pour changer la disponibilité" />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none"
                />
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {['L','M','M','J','V','S','D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {days.map((date) => {
                  const entry = agendaMap[date]
                  const status: AvailabilityStatus = entry?.status ?? 'available'
                  const cfg = STATUS_CONFIG[status]
                  const d = parseInt(date.split('-')[2])
                  const isToday = date === today.toISOString().split('T')[0]
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        const next: AvailabilityStatus = status === 'available' ? 'busy' : status === 'busy' ? 'tentative' : 'available'
                        setAvail.mutate({ date, status: next })
                      }}
                      className={`aspect-square flex items-center justify-center rounded-xl border text-[12px] font-bold transition-all hover:opacity-80 ${cfg.cls} ${
                        isToday ? 'ring-2 ring-offset-2 ring-[#5B1914] dark:ring-offset-slate-900' : ''
                      }`}
                      title={`${date} — ${cfg.label}`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-4 mt-4">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Expense Capture */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <SectionHeader icon={<DollarSign size={16} />} title="Gestion des Frais (OCR)" subtitle="Prenez une photo de votre reçu" />
              <div className="max-w-sm">
                <ExpenseCapture />
              </div>
            </div>
          </>
        )}

        {/* ══ LOGBOOK ══ */}
        {activeTab === 'logbook' && (
          <>
            {/* Daily logbook */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <SectionHeader icon={<BookOpen size={16} />} title="Logbook Digital" subtitle="Rapport journalier — envoyé automatiquement au dossier" />

              <div className="space-y-4">
                {[
                  { label: 'Satisfaction globale', type: 'rating' },
                  { label: 'Incidents signalés', type: 'select' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{field.label}</label>
                    {field.type === 'rating' ? (
                      <div className="flex gap-2">
                        {['😞', '😐', '😊', '😄', '🤩'].map((emoji, i) => (
                          <button key={i} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xl transition-all">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] focus:outline-none">
                        <option>Aucun incident</option>
                        <option>Retard transport</option>
                        <option>Problème médical mineur</option>
                        <option>Mécontentement client</option>
                        <option>Annulation prestation</option>
                        <option>Autre (préciser)</option>
                      </select>
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Résumé de la journée *</label>
                  <textarea
                    placeholder="Déroulement de la journée, satisfaction globale du groupe, imprévus, suggestions pour améliorer le circuit..."
                    value={logbookContent}
                    onChange={(e) => setLogbookContent(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30 resize-none"
                  />
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all">
                  <CheckSquare size={15} /> Clôturer la Journée & Envoyer le Rapport
                </button>
              </div>
            </div>

            {/* Designer Insights */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <SectionHeader icon={<Star size={16} />} title="Designer Insights" subtitle="Retours produit envoyés au Travel Designer" />

              <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40">
                <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase mb-1">Note entrante du Designer</p>
                <p className="text-[12px] text-amber-700 dark:text-amber-300">
                  "Le client adore la photographie. Suggérez-lui un détour par le jardin secret à 17h pour la lumière dorée."
                </p>
              </div>

              <div className="space-y-3">
                <input
                  placeholder="Cible (ex: Hôtel Movenpick, Activité poterie...)"
                  value={insightTarget}
                  onChange={(e) => setInsightTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
                />
                <textarea
                  placeholder="Note technique pour le Travel Designer (horaires, qualité, retours clients)..."
                  value={insightContent}
                  onChange={(e) => setInsightContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30 resize-none"
                />
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B1914] text-white text-[13px] font-bold hover:bg-[#4a1410] transition-all">
                  <Send size={13} /> Envoyer l'Insight
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
