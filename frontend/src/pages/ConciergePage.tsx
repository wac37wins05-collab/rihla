import { useState } from 'react'
import {
  Gem, Star, MapPin, Clock, Plus, Search, Phone,
  CheckCircle2, Calendar, CreditCard, Utensils,
  ChevronRight, Heart, Coffee, Sparkles, AlertCircle,
  User, ArrowRight, Filter, MoreHorizontal, X, Send,
  Plane, Hotel, Camera, Music, Shield, Timer, Check
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
type RequestPriority = 'urgent' | 'high' | 'normal'
type ExpenseCategory = 'Gastronomie' | 'Aventure' | 'Culture' | 'Transport VIP' | 'Bien-être' | 'Événement'

interface ConciergeRequest {
  id: string
  client: string
  project: string
  type: string
  description: string
  date: string
  time?: string
  pax: number
  budget: number
  status: RequestStatus
  priority: RequestPriority
  assignedTo?: string
  notes?: string
  createdAt: string
}

interface Experience {
  id: string
  name: string
  category: ExpenseCategory
  city: string
  price: number
  rating: number
  badge: string
  img: string
  duration: string
  minPax: number
  supplier: string
  bookingsThisMonth: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const REQUESTS: ConciergeRequest[] = [
  {
    id: 'r1', client: 'Sultan Al-Rashid',
    project: 'MRK-2026-042', type: 'Dîner de Gala',
    description: 'Dîner privé pour 4 personnes sur la terrasse de La Mamounia. Musique oud live. Décoration florale.',
    date: '13 Mai 2026', time: '20:00',
    pax: 4, budget: 12000, status: 'confirmed', priority: 'urgent',
    assignedTo: 'Yassine E.', createdAt: 'Il y a 2h',
    notes: 'Client VIP — budget illimité. Confirmer menu halal avec restaurant.',
  },
  {
    id: 'r2', client: 'Groupe SANOFI',
    project: 'MRK-2026-041', type: 'Transfert Hélicoptère',
    description: 'Transfert héliporté de Marrakech à Merzouga pour 8 pax. Atterrissage au camp.',
    date: '15 Mai 2026', time: '09:00',
    pax: 8, budget: 45000, status: 'pending', priority: 'high',
    assignedTo: undefined, createdAt: 'Il y a 4h',
  },
  {
    id: 'r3', client: 'Marie Lefebvre',
    project: 'MRK-2026-039', type: 'Hammam Privatif',
    description: 'Session hammam royal privé au Riad pour couple. 2h avec massage argan inclus.',
    date: '13 Mai 2026', time: '15:00',
    pax: 2, budget: 3500, status: 'in_progress', priority: 'normal',
    assignedTo: 'Sara B.', createdAt: 'Hier',
  },
  {
    id: 'r4', client: 'Klaus Müller',
    project: 'MRK-2026-040', type: 'Cours de Cuisine',
    description: 'Cours de cuisine marocaine avec chef étoilé. Tajine, bastilla, couscous. 4 pax.',
    date: '14 Mai 2026', time: '11:00',
    pax: 4, budget: 2800, status: 'confirmed', priority: 'normal',
    assignedTo: 'Yassine E.', createdAt: 'Il y a 3j',
  },
  {
    id: 'r5', client: 'Famille Wilson',
    project: 'MRK-2026-037', type: 'Soirée Fantasia',
    description: 'Spectacle fantasia traditionnel avec dîner sous tente berbère. 6 pax.',
    date: '16 Mai 2026', time: '19:30',
    pax: 6, budget: 7200, status: 'pending', priority: 'high',
    assignedTo: undefined, createdAt: 'Il y a 1j',
  },
]

const EXPERIENCES: Experience[] = [
  {
    id: 'E01', name: 'Dîner Privé — Désert d\'Agafay', category: 'Gastronomie',
    city: 'Marrakech', price: 1200, rating: 5.0, badge: 'Best-Seller',
    img: 'https://images.unsplash.com/photo-1533619239233-6280475a633a?auto=format&fit=crop&q=80&w=400',
    duration: '3h', minPax: 2, supplier: 'Agafay Desert Camp',
    bookingsThisMonth: 34,
  },
  {
    id: 'E02', name: 'Montgolfière au Lever du Soleil', category: 'Aventure',
    city: 'Marrakech', price: 2500, rating: 4.9, badge: 'Premium',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
    duration: '1h30', minPax: 1, supplier: 'Marrakech Balloon',
    bookingsThisMonth: 18,
  },
  {
    id: 'E03', name: 'Atelier Artisanat — Maître de Fès', category: 'Culture',
    city: 'Fès', price: 450, rating: 4.8, badge: 'Authentique',
    img: 'https://images.unsplash.com/photo-1590603740183-980e7f6920eb?auto=format&fit=crop&q=80&w=400',
    duration: '2h', minPax: 2, supplier: 'Artisans de Fès',
    bookingsThisMonth: 12,
  },
  {
    id: 'E04', name: 'Transfert Hélicoptère — Merzouga', category: 'Transport VIP',
    city: 'Maroc', price: 15000, rating: 5.0, badge: 'Luxury',
    img: 'https://images.unsplash.com/photo-1583162855813-bc7692290f05?auto=format&fit=crop&q=80&w=400',
    duration: '3h vol', minPax: 4, supplier: 'Heliavion Maroc',
    bookingsThisMonth: 6,
  },
  {
    id: 'E05', name: 'Hammam Royal Privatif', category: 'Bien-être',
    city: 'Marrakech', price: 1800, rating: 4.9, badge: 'Exclusif',
    img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=400',
    duration: '2h', minPax: 1, supplier: 'Hammam de la Rose',
    bookingsThisMonth: 28,
  },
  {
    id: 'E06', name: 'Soirée Fantasia Privée', category: 'Événement',
    city: 'Marrakech', price: 8500, rating: 4.8, badge: 'Signature',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
    duration: '3h', minPax: 10, supplier: 'Fantasia El Borj',
    bookingsThisMonth: 9,
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<RequestStatus, { label: string; cls: string; dot: string }> = {
  pending:     { label: 'En attente',  cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  confirmed:   { label: 'Confirmé',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  in_progress: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', dot: 'bg-blue-500 animate-pulse' },
  completed:   { label: 'Terminé',    cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' },
  cancelled:   { label: 'Annulé',     cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700', dot: 'bg-rose-500' },
}

const PRIORITY_CFG: Record<RequestPriority, { label: string; cls: string }> = {
  urgent: { label: '🔴 Urgent', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  high:   { label: '🟠 Haute',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  normal: { label: '🟢 Normal', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

const CAT_ICON: Record<ExpenseCategory, React.ReactNode> = {
  Gastronomie:      <Utensils size={14} />,
  Aventure:         <Sparkles size={14} />,
  Culture:          <Camera size={14} />,
  'Transport VIP':  <Plane size={14} />,
  'Bien-être':      <Heart size={14} />,
  Événement:        <Music size={14} />,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ConciergePage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'catalogue' | 'suppliers'>('requests')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all')
  const [selectedReq, setSelectedReq] = useState<ConciergeRequest | null>(null)
  const [requests, setRequests] = useState(REQUESTS)

  const filteredRequests = requests.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.client.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.project.includes(q)
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const pending   = requests.filter(r => r.status === 'pending').length
  const confirmed = requests.filter(r => r.status === 'confirmed').length
  const totalBudget = requests.reduce((a, r) => a + r.budget, 0)

  const TABS = [
    { id: 'requests',  label: 'Demandes VIP', icon: <Gem size={13} /> },
    { id: 'catalogue', label: 'Catalogue',    icon: <Star size={13} /> },
    { id: 'suppliers', label: 'Prestataires', icon: <Shield size={13} /> },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-pink-900 via-rose-800 to-pink-900 px-6 py-7 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Gem size={22} className="text-pink-300" />
              </div>
              <div>
                <p className="text-[11px] text-white/50 font-bold uppercase tracking-widest mb-0.5">Conciergerie VIP</p>
                <h1 className="text-[22px] font-black text-white">Services & Expériences</h1>
              </div>
            </div>

            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-[12px] font-bold hover:bg-pink-50 transition-all shadow-lg">
              <Plus size={14} /> Nouvelle demande
            </button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'En attente',    value: pending,                    color: 'text-amber-300' },
              { label: 'Confirmés',     value: confirmed,                  color: 'text-emerald-300' },
              { label: 'Budget total',  value: `${(totalBudget / 1000).toFixed(0)}k MAD`, color: 'text-white' },
              { label: 'Note moy.',     value: '4.9/5',                   color: 'text-pink-300' },
            ].map(k => (
              <div key={k.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                <p className={`text-[20px] font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-white/50">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="max-w-6xl mx-auto px-6 mt-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-700 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-5">

        {/* ══ REQUESTS TAB ══ */}
        {activeTab === 'requests' && (
          <div className="flex gap-5">
            {/* Left: list */}
            <div className={`flex flex-col ${selectedReq ? 'w-[480px] flex-shrink-0' : 'flex-1'} transition-all`}>
              {/* Search & filters */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher client, service, réf..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none"
                >
                  <option value="all">Tous les statuts</option>
                  {(Object.keys(STATUS_CFG) as RequestStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {filteredRequests.map(req => {
                  const statusCfg   = STATUS_CFG[req.status]
                  const priorityCfg = PRIORITY_CFG[req.priority]
                  const isSelected  = selectedReq?.id === req.id

                  return (
                    <button
                      key={req.id}
                      onClick={() => setSelectedReq(isSelected ? null : req)}
                      className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all hover:shadow-md ${
                        isSelected ? 'border-pink-500 shadow-sm' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${priorityCfg.cls}`}>{priorityCfg.label}</span>
                            <span className="text-[10px] text-slate-400 font-bold">#{req.project}</span>
                          </div>
                          <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mt-1">{req.type}</p>
                          <p className="text-[12px] text-slate-400">{req.client}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[10px] font-bold flex-shrink-0 ${statusCfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      <p className="text-[12px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{req.description}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {req.date}{req.time ? ` à ${req.time}` : ''}</span>
                        <span className="flex items-center gap-1"><User size={10} /> {req.pax} pax</span>
                        <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300"><CreditCard size={10} /> {req.budget.toLocaleString()} MAD</span>
                        {req.assignedTo ? (
                          <span className="ml-auto flex items-center gap-1 text-pink-600 dark:text-pink-400 font-bold"><Check size={10} /> {req.assignedTo}</span>
                        ) : (
                          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold"><AlertCircle size={10} /> Non assigné</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right: detail */}
            {selectedReq && (
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-fit sticky top-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-pink-50 dark:from-pink-900/10 to-transparent">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Demande VIP · {selectedReq.project}</p>
                    <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-100">{selectedReq.type}</h3>
                  </div>
                  <button onClick={() => setSelectedReq(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <X size={15} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Client', value: selectedReq.client },
                      { label: 'Priorité', value: PRIORITY_CFG[selectedReq.priority].label },
                      { label: 'Date & Heure', value: `${selectedReq.date}${selectedReq.time ? ' · ' + selectedReq.time : ''}` },
                      { label: 'Passagers', value: `${selectedReq.pax} pax` },
                      { label: 'Budget', value: `${selectedReq.budget.toLocaleString()} MAD` },
                      { label: 'Assigné à', value: selectedReq.assignedTo ?? 'Non assigné' },
                    ].map(f => (
                      <div key={f.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">{f.label}</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-2">Description</p>
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{selectedReq.description}</p>
                  </div>

                  {selectedReq.notes && (
                    <div className="bg-amber-50 dark:bg-amber-900/15 rounded-xl p-4 border border-amber-200 dark:border-amber-700/40">
                      <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1">Note Concierge</p>
                      <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">{selectedReq.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {selectedReq.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setRequests(prev => prev.map(r => r.id === selectedReq.id ? { ...r, status: 'confirmed' } : r))}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all"
                        >
                          <CheckCircle2 size={14} /> Confirmer
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-700 text-white text-[13px] font-bold hover:bg-pink-800 transition-all">
                          <User size={14} /> Assigner
                        </button>
                      </>
                    )}
                    {selectedReq.status === 'confirmed' && (
                      <button
                        onClick={() => setRequests(prev => prev.map(r => r.id === selectedReq.id ? { ...r, status: 'in_progress' } : r))}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all"
                      >
                        <Timer size={14} /> Démarrer la prestation
                      </button>
                    )}
                    {selectedReq.status === 'in_progress' && (
                      <button
                        onClick={() => setRequests(prev => prev.map(r => r.id === selectedReq.id ? { ...r, status: 'completed' } : r))}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[13px] font-bold hover:bg-slate-800 transition-all"
                      >
                        <Check size={14} /> Marquer Terminé
                      </button>
                    )}
                    <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[13px] font-bold hover:border-pink-300 hover:text-pink-700 transition-all">
                      <Send size={14} /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CATALOGUE TAB ══ */}
        {activeTab === 'catalogue' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
              {EXPERIENCES.map(exp => (
                <div key={exp.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all">
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img src={exp.img} alt={exp.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                        {CAT_ICON[exp.category]} {exp.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-pink-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{exp.badge}</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" />
                        <span className="text-[11px] font-black text-white">{exp.rating}</span>
                      </div>
                      <span className="text-[10px] text-white/70">{exp.bookingsThisMonth} réserv. ce mois</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mb-1">{exp.name}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {exp.city}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {exp.duration}</span>
                      <span className="flex items-center gap-1"><User size={10} /> min {exp.minPax} pax</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">Prestataire: {exp.supplier}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">À partir de</p>
                        <p className="text-[17px] font-black text-slate-800 dark:text-slate-100">{exp.price.toLocaleString()} <span className="text-[11px] text-slate-400">MAD</span></p>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-700 text-white text-[12px] font-bold hover:bg-pink-800 transition-all">
                        Réserver <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new */}
              <button className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-4 py-16 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-all group">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 group-hover:text-pink-600 transition-all">
                  <Plus size={22} />
                </div>
                <p className="text-[13px] font-bold text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400">Ajouter une expérience</p>
              </button>
            </div>
          </>
        )}

        {/* ══ SUPPLIERS TAB ══ */}
        {activeTab === 'suppliers' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Réseau Prestataires VIP</h2>
              <p className="text-[12px] text-slate-400">48 prestataires partenaires · 6 catégories</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: 'La Mamounia Restaurant', type: 'Gastronomie', city: 'Marrakech', rating: 5.0, contract: 'Exclusif', phone: '+212 524 888 888' },
                { name: 'Marrakech Balloon',       type: 'Aventure',   city: 'Marrakech', rating: 4.9, contract: 'Préférentiel', phone: '+212 524 123 456' },
                { name: 'Heliavion Maroc',         type: 'Transport',  city: 'National',  rating: 5.0, contract: 'Exclusif', phone: '+212 522 789 012' },
                { name: 'Hammam de la Rose',       type: 'Bien-être',  city: 'Marrakech', rating: 4.9, contract: 'Préférentiel', phone: '+212 524 456 789' },
                { name: 'Artisans de Fès',         type: 'Culture',    city: 'Fès',       rating: 4.8, contract: 'Standard', phone: '+212 535 678 901' },
                { name: 'Fantasia El Borj',        type: 'Événement',  city: 'Marrakech', rating: 4.8, contract: 'Exclusif', phone: '+212 524 234 567' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 flex-shrink-0 text-[13px] font-black">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.type} · {s.city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={11} fill="currentColor" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{s.rating}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.contract === 'Exclusif' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                    s.contract === 'Préférentiel' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>{s.contract}</span>
                  <a href={`tel:${s.phone}`} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-all">
                    <Phone size={13} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
