import { useState, useMemo } from 'react'
import {
  Users, Search, Filter, Star, MapPin, Phone, Mail, Globe,
  TrendingUp, TrendingDown, Calendar, FileText, Receipt,
  MessageSquare, ChevronRight, X, Plus, Tag, Building2,
  Clock, CheckCircle, AlertCircle, Briefcase, BarChart2,
  Edit, MoreHorizontal, ArrowUpRight, Heart, Zap, Target,
  DollarSign, Package, Activity, Hash
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountStatus = 'active' | 'prospect' | 'inactive' | 'vip'
type AccountType   = 'agency' | 'corporate' | 'individual' | 'operator'

interface TimelineEntry {
  id: string
  date: string
  type: 'note' | 'call' | 'email' | 'project' | 'invoice' | 'meeting'
  content: string
  author: string
}

interface Account {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  country: string
  flag: string
  type: AccountType
  status: AccountStatus
  tags: string[]
  score: number        // 0-100 NPS-style
  totalRevenue: number
  projectsCount: number
  lastActivity: string
  nextFollowup?: string
  notes: string
  timeline: TimelineEntry[]
  invoicesPending: number
  conversionRate: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ACCOUNTS: Account[] = [
  {
    id: 'a1',
    name: 'Prestige Tours Paris',
    contact: 'Marie Lefebvre',
    email: 'marie@prestige-tours.fr',
    phone: '+33 1 44 56 78 90',
    country: 'France', flag: '🇫🇷',
    type: 'agency', status: 'vip',
    tags: ['Luxe', 'Récurrent', 'Francophone'],
    score: 94, totalRevenue: 1_240_000, projectsCount: 28, lastActivity: 'Il y a 2j',
    nextFollowup: '15 Mai', notes: 'Client fidèle depuis 2019. Spécialisé groupes haut de gamme 15-30 pax. Préfère circuits Marrakech + désert.',
    invoicesPending: 2, conversionRate: 87,
    timeline: [
      { id: 't1', date: '10 Mai 2026',  type: 'call',    content: 'Appel devis groupe LVMH — 45 pax Septembre', author: 'Yassine E.' },
      { id: 't2', date: '8 Mai 2026',   type: 'email',   content: 'Programme Grand Tour personnalisé envoyé', author: 'Système' },
      { id: 't3', date: '5 Mai 2026',   type: 'project', content: 'Dossier MRK-2026-042 créé — Groupe Découverte', author: 'Yassine E.' },
      { id: 't4', date: '2 Mai 2026',   type: 'invoice', content: 'Facture #INV-0341 émise — 87 500 MAD', author: 'Système' },
      { id: 't5', date: '28 Avr 2026',  type: 'meeting', content: 'Réunion commerciale à Paris — revue annuelle', author: 'Karim D.' },
    ],
  },
  {
    id: 'a2',
    name: 'Wanderlust Adventures',
    contact: 'James Mitchell',
    email: 'j.mitchell@wanderlust.co.uk',
    phone: '+44 20 7946 0832',
    country: 'UK', flag: '🇬🇧',
    type: 'agency', status: 'active',
    tags: ['Aventure', 'Backpacker', 'Anglophone'],
    score: 78, totalRevenue: 680_000, projectsCount: 15, lastActivity: 'Il y a 5j',
    nextFollowup: '20 Mai', notes: 'Focus sur les circuits d\'aventure et trekking. Budget intermédiaire.',
    invoicesPending: 1, conversionRate: 71,
    timeline: [
      { id: 't1', date: '5 Mai 2026', type: 'email',   content: 'Demande programme désert 10j reçue', author: 'Système' },
      { id: 't2', date: '1 Mai 2026', type: 'project', content: 'Dossier MRK-2026-039 — Trek Atlas', author: 'Sara B.' },
    ],
  },
  {
    id: 'a3',
    name: 'SANOFI — MICE',
    contact: 'Claire Moreau',
    email: 'c.moreau@sanofi.com',
    phone: '+33 1 55 44 33 22',
    country: 'France', flag: '🇫🇷',
    type: 'corporate', status: 'active',
    tags: ['Corporate', 'Incentive', 'MICE'],
    score: 82, totalRevenue: 920_000, projectsCount: 7, lastActivity: 'Il y a 1j',
    nextFollowup: '13 Mai', notes: 'Grand compte pharmaceutique. Incentives annuels 30-50 pax. Budget illimité pour le confort.',
    invoicesPending: 3, conversionRate: 95,
    timeline: [
      { id: 't1', date: '9 Mai 2026', type: 'meeting', content: 'Kick-off programme Incentive Automne 2026', author: 'Yassine E.' },
      { id: 't2', date: '7 Mai 2026', type: 'email',   content: 'Contrat cadre 2026-2027 signé', author: 'Direction' },
    ],
  },
  {
    id: 'a4',
    name: 'Al-Rashid Famille',
    contact: 'Sultan Al-Rashid',
    email: 's.alrashid@gmail.com',
    phone: '+971 50 123 4567',
    country: 'Émirats', flag: '🇦🇪',
    type: 'individual', status: 'vip',
    tags: ['Ultra-Luxe', 'Famille', 'Gulf'],
    score: 98, totalRevenue: 340_000, projectsCount: 6, lastActivity: 'Aujourd\'hui',
    notes: 'Client HNWI. Séjours sur-mesure ultra-luxe. Chaque détail compte. Villa privée + chef personnel.',
    invoicesPending: 0, conversionRate: 100,
    timeline: [
      { id: 't1', date: '10 Mai 2026', type: 'call',    content: 'Confirmation séjour 16-21 Mai — Famille (4 pax)', author: 'Yassine E.' },
      { id: 't2', date: '8 Mai 2026',  type: 'note',    content: 'Préférence culinaire: halal strict, sans porc', author: 'Yassine E.' },
    ],
  },
  {
    id: 'a5',
    name: 'TourConnect Germany',
    contact: 'Klaus Bauer',
    email: 'k.bauer@tourconnect.de',
    phone: '+49 89 1234 5678',
    country: 'Allemagne', flag: '🇩🇪',
    type: 'operator', status: 'prospect',
    tags: ['Nouveau', 'Culturel', 'DACH'],
    score: 55, totalRevenue: 0, projectsCount: 1, lastActivity: 'Il y a 12j',
    nextFollowup: '18 Mai', notes: 'Prospect chaud depuis le salon World Travel Market. Intéressé par circuits culturels Fès+Marrakech.',
    invoicesPending: 0, conversionRate: 0,
    timeline: [
      { id: 't1', date: '28 Avr 2026', type: 'meeting', content: 'Rencontre WTM Berlin — présentation catalogue 2026', author: 'Karim D.' },
      { id: 't2', date: '30 Avr 2026', type: 'email',   content: 'Catalogue et tarifs 2026 envoyés par email', author: 'Système' },
    ],
  },
  {
    id: 'a6',
    name: 'Global Journeys Canada',
    contact: 'Emily Thompson',
    email: 'emily@globaljourneys.ca',
    phone: '+1 514 867 5309',
    country: 'Canada', flag: '🇨🇦',
    type: 'agency', status: 'inactive',
    tags: ['Inactif', 'Récupération', 'Amérique'],
    score: 42, totalRevenue: 210_000, projectsCount: 4, lastActivity: 'Il y a 8 mois',
    nextFollowup: 'En attente',
    notes: 'Ancien client actif. Perte après changement de direction. Campagne de réactivation prévue Q3 2026.',
    invoicesPending: 0, conversionRate: 60,
    timeline: [
      { id: 't1', date: 'Sep 2025', type: 'note', content: 'Dernier projet — Grand Tour Maroc 12 pax', author: 'Archive' },
    ],
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AccountStatus, { label: string; cls: string; dot: string }> = {
  vip:      { label: 'VIP',      cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600', dot: 'bg-amber-500' },
  active:   { label: 'Actif',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600', dot: 'bg-emerald-500' },
  prospect: { label: 'Prospect',cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600', dot: 'bg-blue-500' },
  inactive: { label: 'Inactif', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700', dot: 'bg-slate-400' },
}

const TYPE_CONFIG: Record<AccountType, { label: string; icon: string }> = {
  agency:     { label: 'Agence',     icon: '🏢' },
  corporate:  { label: 'Corporate',  icon: '🏭' },
  individual: { label: 'Particulier',icon: '👤' },
  operator:   { label: 'Opérateur',  icon: '🌍' },
}

const TIMELINE_CONFIG: Record<TimelineEntry['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  note:    { icon: <Edit size={12} />,        color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700' },
  call:    { icon: <Phone size={12} />,       color: 'text-blue-600 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40' },
  email:   { icon: <Mail size={12} />,        color: 'text-violet-600 dark:text-violet-300',bg: 'bg-violet-100 dark:bg-violet-900/40' },
  project: { icon: <Briefcase size={12} />,   color: 'text-[#5B1914] dark:text-[#E8734A]', bg: 'bg-[#5B1914]/10 dark:bg-[#E8734A]/15' },
  invoice: { icon: <Receipt size={12} />,     color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  meeting: { icon: <Calendar size={12} />,    color: 'text-emerald-600 dark:text-emerald-300',bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
}

function ScoreRing({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const pct = (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${pct} ${circ - pct}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CrmAccountsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'timeline' | 'projects' | 'finance'>('overview')
  const [newNote, setNewNote] = useState('')

  const filtered = useMemo(() => {
    return ACCOUNTS.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.contact.toLowerCase().includes(search.toLowerCase()) ||
        a.country.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || a.status === filterStatus
      const matchType   = filterType === 'all' || a.type === filterType
      return matchSearch && matchStatus && matchType
    })
  }, [search, filterStatus, filterType])

  const totalRevenue = ACCOUNTS.reduce((a, c) => a + c.totalRevenue, 0)
  const vipCount     = ACCOUNTS.filter(a => a.status === 'vip').length
  const prospectCount= ACCOUNTS.filter(a => a.status === 'prospect').length

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ── LEFT PANEL — List ── */}
      <div className={`flex flex-col ${selectedAccount ? 'w-[420px] flex-shrink-0' : 'flex-1'} border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300`}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[18px] font-black text-slate-900 dark:text-slate-100">Comptes CRM</h1>
              <p className="text-[12px] text-slate-400 mt-0.5">Vue 360° clients & agences partenaires</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5B1914] text-white text-[12px] font-bold hover:bg-[#4a1410] transition-all">
              <Plus size={14} /> Nouveau compte
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'CA Total',   value: `${(totalRevenue / 1_000_000).toFixed(1)}M MAD`, icon: <DollarSign size={14} />, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'VIP',        value: vipCount, icon: <Star size={14} />, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Prospects',  value: prospectCount, icon: <Target size={14} />, color: 'text-blue-600 dark:text-blue-400' },
            ].map(k => (
              <div key={k.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className={`flex justify-center mb-1 ${k.color}`}>{k.icon}</div>
                <p className={`text-[16px] font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un compte, contact, pays..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'vip', 'active', 'prospect', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  filterStatus === s
                    ? 'bg-[#5B1914] border-[#5B1914] text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                {s === 'all' ? 'Tous' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map(account => {
            const statusCfg = STATUS_CONFIG[account.status]
            const typeCfg   = TYPE_CONFIG[account.type]
            const isSelected = selectedAccount?.id === account.id

            return (
              <button
                key={account.id}
                onClick={() => { setSelectedAccount(account); setActiveDetailTab('overview') }}
                className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  isSelected ? 'bg-[#5B1914]/5 dark:bg-[#E8734A]/5 border-r-2 border-[#5B1914] dark:border-[#E8734A]' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-black flex-shrink-0 ${
                  account.status === 'vip' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                  account.status === 'inactive' ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' :
                  'bg-[#5B1914]/10 text-[#5B1914] dark:bg-[#E8734A]/15 dark:text-[#E8734A]'
                }`}>
                  {account.flag}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{account.name}</p>
                        {account.status === 'vip' && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-black">VIP ★</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{account.contact} · {typeCfg.icon} {typeCfg.label}</p>
                    </div>
                    <ScoreRing score={account.score} />
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Briefcase size={10} /> {account.projectsCount} projets</span>
                    <span className="flex items-center gap-1"><DollarSign size={10} /> {(account.totalRevenue / 1000).toFixed(0)}k MAD</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {account.lastActivity}</span>
                    {account.invoicesPending > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertCircle size={10} /> {account.invoicesPending} factures
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {account.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
              <Users size={32} className="mb-3 opacity-40" />
              <p className="text-[13px] font-semibold">Aucun compte trouvé</p>
              <p className="text-[11px] mt-1">Modifiez vos filtres ou la recherche</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Detail ── */}
      {selectedAccount && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

          {/* Detail Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-5 pb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  selectedAccount.status === 'vip' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-[#5B1914]/10 dark:bg-[#E8734A]/15'
                }`}>
                  {selectedAccount.flag}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] font-black text-slate-900 dark:text-slate-100">{selectedAccount.name}</h2>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_CONFIG[selectedAccount.status].cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedAccount.status].dot}`} />
                      {STATUS_CONFIG[selectedAccount.status].label}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">{selectedAccount.contact} · {TYPE_CONFIG[selectedAccount.type].label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`mailto:${selectedAccount.email}`} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                  <Mail size={15} />
                </a>
                <a href={`tel:${selectedAccount.phone}`} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                  <Phone size={15} />
                </a>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'CA Total',   value: `${(selectedAccount.totalRevenue / 1000).toFixed(0)}k MAD`, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Projets',    value: selectedAccount.projectsCount, color: 'text-[#5B1914] dark:text-[#E8734A]' },
                { label: 'Score',      value: `${selectedAccount.score}/100`, color: selectedAccount.score >= 80 ? 'text-emerald-600' : selectedAccount.score >= 60 ? 'text-amber-600' : 'text-rose-600' },
                { label: 'Conversion', value: `${selectedAccount.conversionRate}%`, color: 'text-blue-600 dark:text-blue-400' },
              ].map(k => (
                <div key={k.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                  <p className={`text-[15px] font-black ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] text-slate-400">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-3 text-[12px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Mail size={11} /> {selectedAccount.email}</span>
              <span className="flex items-center gap-1"><Phone size={11} /> {selectedAccount.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={11} /> {selectedAccount.country}</span>
              {selectedAccount.nextFollowup && (
                <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Calendar size={11} /> Suivi: {selectedAccount.nextFollowup}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedAccount.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#5B1914]/8 dark:bg-[#E8734A]/10 text-[#5B1914] dark:text-[#E8734A] text-[11px] font-semibold border border-[#5B1914]/15 dark:border-[#E8734A]/20">
                  <Tag size={9} /> {tag}
                </span>
              ))}
              <button className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 text-[11px] hover:border-slate-500 transition-all">
                <Plus size={9} /> Tag
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mt-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {([
                { id: 'overview',  label: 'Aperçu' },
                { id: 'timeline',  label: 'Activité' },
                { id: 'projects',  label: 'Projets' },
                { id: 'finance',   label: 'Finance' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                    activeDetailTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* ── OVERVIEW ── */}
            {activeDetailTab === 'overview' && (
              <>
                {/* Notes */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Edit size={14} /> Notes du compte
                  </h3>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{selectedAccount.notes}</p>
                </div>

                {/* Score breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Activity size={14} /> Score & Santé du Compte
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Fidélité',         value: Math.min(100, selectedAccount.projectsCount * 4) },
                      { label: 'Satisfaction',      value: selectedAccount.score },
                      { label: 'Potentiel CA',      value: selectedAccount.conversionRate },
                      { label: 'Réactivité',        value: selectedAccount.status === 'inactive' ? 20 : 75 },
                    ].map(metric => (
                      <div key={metric.label}>
                        <div className="flex justify-between text-[12px] mb-1">
                          <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{metric.value}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              metric.value >= 70 ? 'bg-emerald-500' : metric.value >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add note */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-3">Ajouter une note</h3>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Note, action suivante, remarque..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30 resize-none mb-3"
                  />
                  <button
                    disabled={!newNote.trim()}
                    onClick={() => setNewNote('')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B1914] text-white text-[12px] font-bold hover:bg-[#4a1410] transition-all disabled:opacity-50"
                  >
                    <Plus size={13} /> Enregistrer la note
                  </button>
                </div>
              </>
            )}

            {/* ── TIMELINE ── */}
            {activeDetailTab === 'timeline' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Historique d'Activité</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedAccount.timeline.map((entry, i) => {
                    const cfg = TIMELINE_CONFIG[entry.type]
                    return (
                      <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-slate-700 dark:text-slate-300">{entry.content}</p>
                          <div className="flex gap-3 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1"><Clock size={10} /> {entry.date}</span>
                            <span>par {entry.author}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── PROJECTS ── */}
            {activeDetailTab === 'projects' && (
              <div className="space-y-3">
                {Array.from({ length: Math.min(selectedAccount.projectsCount, 4) }, (_, i) => ({
                  ref: `MRK-2026-0${42 - i}`,
                  name: ['Découverte Marrakech', 'Grand Tour Maroc', 'Désert & Oasis', 'Fès Impériale'][i] ?? 'Projet',
                  date: ['12-16 Mai', '20-27 Avr', '1-8 Mar', '15-20 Fév'][i],
                  pax: [18, 12, 8, 24][i],
                  status: ['active', 'completed', 'completed', 'completed'][i],
                  budget: [87500, 124000, 48000, 210000][i],
                })).map(proj => (
                  <div key={proj.ref} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                    <div className={`w-2 h-full min-h-[40px] rounded-full flex-shrink-0 ${proj.status === 'active' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400">#{proj.ref}</span>
                        {proj.status === 'active' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px] font-black">En cours</span>
                        )}
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{proj.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{proj.date} · {proj.pax} pax · {proj.budget.toLocaleString()} MAD</p>
                    </div>
                    <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />
                  </div>
                ))}
              </div>
            )}

            {/* ── FINANCE ── */}
            {activeDetailTab === 'finance' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#5B1914] to-[#8B2E28] rounded-2xl p-5 text-white">
                  <p className="text-[11px] text-white/60 uppercase font-bold tracking-wider mb-1">Chiffre d'affaires total</p>
                  <p className="text-[32px] font-black">{selectedAccount.totalRevenue.toLocaleString()} <span className="text-[14px] text-white/60">MAD</span></p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-[12px] text-emerald-300 font-bold">+18% vs an dernier</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4">Factures en cours</h3>
                  {selectedAccount.invoicesPending > 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: selectedAccount.invoicesPending }, (_, i) => ({
                        ref: `INV-2026-0${341 + i}`,
                        amount: [87500, 42000][i] ?? 30000,
                        due: ['30 Mai', '15 Juin'][i] ?? '---',
                        status: ['pending', 'overdue'][i] ?? 'pending',
                      })).map(inv => (
                        <div key={inv.ref} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                          <div>
                            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">#{inv.ref}</p>
                            <p className="text-[11px] text-slate-400">Échéance: {inv.due}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-black text-slate-800 dark:text-slate-100">{inv.amount.toLocaleString()} MAD</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'overdue'
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {inv.status === 'overdue' ? 'En retard ⚠️' : 'En attente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-400 flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-500" /> Aucune facture impayée
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no account selected */}
      {!selectedAccount && (
        <div className="hidden" /> // full-width list mode
      )}
    </div>
  )
}
