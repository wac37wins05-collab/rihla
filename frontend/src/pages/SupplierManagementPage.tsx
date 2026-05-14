/**
 * SupplierManagementPage — Gestion des Fournisseurs DMC
 *
 * DataTable complète avec :
 *  - Catégories : hôtel, transport, restaurant, guide, activité
 *  - Scoring (1-5 étoiles) + note globale
 *  - Statut contrat (actif / expiré / en négociation)
 *  - Filtres multi-critères
 *  - Vue détail fournisseur en panneau latéral
 *  - Export CSV
 */

import { useState, useMemo } from 'react'
import {
  Hotel, Bus, Utensils, Compass, Sparkles, Star, StarHalf,
  MapPin, Phone, Mail, Globe, FileText, CheckCircle2,
  AlertTriangle, Clock, Search, SlidersHorizontal,
  X, ChevronRight, Download, Plus, MoreHorizontal,
  Building2, TrendingUp, Users, Calendar,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SupplierCategory = 'hotel' | 'transport' | 'restaurant' | 'guide' | 'activite'
type ContractStatus = 'actif' | 'expire' | 'negociation' | 'suspendu'

interface Supplier {
  id: string
  name: string
  category: SupplierCategory
  city: string
  region: string
  rating: number          // 0-5
  totalProjects: number
  totalRevenue: number
  contractStatus: ContractStatus
  contractEnd: string
  email: string
  phone: string
  website?: string
  notes?: string
  tags: string[]
  preferredPartner: boolean
  lastUsed: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: 's1', name: 'Palais Faraj Suites & Spa', category: 'hotel', city: 'Fès', region: 'Fès-Meknès',
    rating: 4.8, totalProjects: 48, totalRevenue: 1_250_000, contractStatus: 'actif', contractEnd: '2027-03-31',
    email: 'contracts@palaisfaraj.com', phone: '+212 5 35 63 73 73', website: 'www.palaisfaraj.com',
    notes: 'Partenaire premium — tarifs négociés -15% sur rack rate. Contact : Mme Amina Benali.',
    tags: ['5★', 'Luxe', 'SPA', 'Incentive'], preferredPartner: true, lastUsed: '2026-04-28',
  },
  {
    id: 's2', name: 'Kasbah Tamadot Virgin Limited', category: 'hotel', city: 'Asni', region: 'Marrakech-Safi',
    rating: 5.0, totalProjects: 22, totalRevenue: 890_000, contractStatus: 'actif', contractEnd: '2026-12-31',
    email: 'reservations@kasbah-tamadot.com', phone: '+212 5 24 36 82 00',
    notes: 'Établissement Richard Branson. Clientèle VIP uniquement. Tarif minimum 8 nuits.',
    tags: ['5★', 'Ultra-Luxe', 'Éco', 'VIP'], preferredPartner: true, lastUsed: '2026-03-15',
  },
  {
    id: 's3', name: 'Auberge Aït Ben Haddou', category: 'hotel', city: 'Aït Benhaddou', region: 'Souss-Massa',
    rating: 4.2, totalProjects: 65, totalRevenue: 680_000, contractStatus: 'actif', contractEnd: '2026-09-30',
    email: 'aitbenhaddou@auberge.ma', phone: '+212 5 24 89 03 25',
    tags: ['4★', 'Authentique', 'UNESCO'], preferredPartner: false, lastUsed: '2026-05-01',
  },
  {
    id: 's4', name: 'Atlas Royal Transport', category: 'transport', city: 'Marrakech', region: 'Marrakech-Safi',
    rating: 4.6, totalProjects: 120, totalRevenue: 950_000, contractStatus: 'actif', contractEnd: '2026-12-31',
    email: 'ops@atlasroyal.ma', phone: '+212 6 61 23 45 67',
    notes: 'Flotte de 12 minibus et 4 bus grand confort. Contact opérationnel : Rachid Oulad.',
    tags: ['Bus', 'Minibus', 'VIP Transfer'], preferredPartner: true, lastUsed: '2026-05-08',
  },
  {
    id: 's5', name: 'Sahara Express 4x4', category: 'transport', city: 'Merzouga', region: 'Drâa-Tafilalet',
    rating: 4.4, totalProjects: 38, totalRevenue: 420_000, contractStatus: 'actif', contractEnd: '2027-01-31',
    email: 'booking@saharaexpress.ma', phone: '+212 5 35 57 69 12',
    tags: ['4x4', 'Sahara', 'Aventure'], preferredPartner: false, lastUsed: '2026-04-22',
  },
  {
    id: 's6', name: 'Restaurant Dar Moha', category: 'restaurant', city: 'Marrakech', region: 'Marrakech-Safi',
    rating: 4.7, totalProjects: 85, totalRevenue: 320_000, contractStatus: 'actif', contractEnd: '2026-06-30',
    email: 'group@darmoha.ma', phone: '+212 5 24 38 64 00',
    notes: 'Chef étoilé Mohamed Fedal. Groupes max 80 couverts. Menu groupe à partir de 650 MAD/pers.',
    tags: ['Gastronomique', 'Groupes', 'Végétarien'], preferredPartner: true, lastUsed: '2026-05-05',
  },
  {
    id: 's7', name: 'Chez Hassan Terrace Fès', category: 'restaurant', city: 'Fès', region: 'Fès-Meknès',
    rating: 4.1, totalProjects: 92, totalRevenue: 185_000, contractStatus: 'expire', contractEnd: '2026-03-31',
    email: 'hassan.terrace@fes.ma', phone: '+212 5 35 63 41 91',
    tags: ['Traditionnel', 'Vue Médina'], preferredPartner: false, lastUsed: '2026-02-18',
  },
  {
    id: 's8', name: 'Hassan Guide Expert Marrakech', category: 'guide', city: 'Marrakech', region: 'Marrakech-Safi',
    rating: 4.9, totalProjects: 145, totalRevenue: 580_000, contractStatus: 'actif', contractEnd: '2026-12-31',
    email: 'hassan.guide@gmail.com', phone: '+212 6 62 14 88 35',
    notes: 'Guide officiel 15 ans d\'expérience. Langues : FR/EN/ES/DE. Spécialité histoire islamique.',
    tags: ['FR/EN/ES', 'Médina', 'Histoire'], preferredPartner: true, lastUsed: '2026-05-07',
  },
  {
    id: 's9', name: 'Youssef Guide Sahara', category: 'guide', city: 'Merzouga', region: 'Drâa-Tafilalet',
    rating: 4.7, totalProjects: 78, totalRevenue: 310_000, contractStatus: 'actif', contractEnd: '2027-03-31',
    email: 'youssef.desert@hotmail.com', phone: '+212 6 64 88 12 09',
    tags: ['FR/EN', 'Désert', 'Dromadaires'], preferredPartner: false, lastUsed: '2026-04-23',
  },
  {
    id: 's10', name: 'Cooking Academy Marrakech', category: 'activite', city: 'Marrakech', region: 'Marrakech-Safi',
    rating: 4.8, totalProjects: 55, totalRevenue: 220_000, contractStatus: 'negociation', contractEnd: '2026-09-30',
    email: 'booking@cookingacademy.ma', phone: '+212 5 24 39 19 33',
    notes: 'Cours de cuisine et visite souk matin. Groupes 8-25 pers. En cours de négociation tarif groupe.',
    tags: ['Cuisine', 'Artisanat', 'Culturel'], preferredPartner: false, lastUsed: '2026-03-12',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<SupplierCategory, { label: string; icon: typeof Hotel; bg: string; text: string }> = {
  hotel:     { label: 'Hôtel',      icon: Hotel,    bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-400' },
  transport: { label: 'Transport',  icon: Bus,      bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
  restaurant:{ label: 'Restaurant', icon: Utensils, bg: 'bg-rose-50 dark:bg-rose-900/20',   text: 'text-rose-700 dark:text-rose-400' },
  guide:     { label: 'Guide',      icon: Compass,  bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
  activite:  { label: 'Activité',   icon: Sparkles, bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400' },
}

const CONTRACT_CONFIG: Record<ContractStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  actif:       { label: 'Actif',        bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  expire:      { label: 'Expiré',       bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-700 dark:text-rose-400',       icon: AlertTriangle },
  negociation: { label: 'Négociation',  bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-700 dark:text-amber-400',     icon: Clock },
  suspendu:    { label: 'Suspendu',     bg: 'bg-slate-100 dark:bg-slate-700',        text: 'text-slate-600 dark:text-slate-400',     icon: X },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={11}
          className={clsx(
            'flex-shrink-0',
            s <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
          )}
        />
      ))}
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

function CategoryBadge({ cat }: { cat: SupplierCategory }) {
  const cfg = CATEGORY_CONFIG[cat]
  const Icon = cfg.icon
  return (
    <span className={clsx('flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full', cfg.bg, cfg.text)}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

function ContractBadge({ status }: { status: ContractStatus }) {
  const cfg = CONTRACT_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={clsx('flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.text)}>
      <Icon size={9} /> {cfg.label}
    </span>
  )
}

function SupplierDetail({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const cfg = CATEGORY_CONFIG[supplier.category]
  const Icon = cfg.icon

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={clsx('px-5 py-4 flex items-start gap-3', cfg.bg, 'border-b border-slate-200 dark:border-slate-700')}>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg, cfg.text)}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{supplier.name}</p>
            {supplier.preferredPartner && (
              <Star size={13} className="fill-amber-400 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CategoryBadge cat={supplier.category} />
            <ContractBadge status={supplier.contractStatus} />
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Rating & Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[18px] font-bold text-slate-700 dark:text-slate-300">{supplier.rating.toFixed(1)}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Note</p>
            <StarRating rating={supplier.rating} />
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[18px] font-bold text-slate-700 dark:text-slate-300">{supplier.totalProjects}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Projets</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{(supplier.totalRevenue / 1000).toFixed(0)}k</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">CA (MAD)</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Localisation</p>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-700 dark:text-slate-300">
            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
            {supplier.city} · {supplier.region}
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Contact</p>
          <div className="space-y-1.5">
            <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-[12px] text-blue-600 dark:text-blue-400 hover:underline">
              <Mail size={12} className="flex-shrink-0" /> {supplier.email}
            </a>
            <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
              <Phone size={12} className="flex-shrink-0" /> {supplier.phone}
            </div>
            {supplier.website && (
              <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                <Globe size={12} className="flex-shrink-0" /> {supplier.website}
              </div>
            )}
          </div>
        </div>

        {/* Contract */}
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Contrat</p>
          <div className="flex items-center justify-between">
            <ContractBadge status={supplier.contractStatus} />
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              Expiration : {new Date(supplier.contractEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {supplier.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Notes</p>
            <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              {supplier.notes}
            </p>
          </div>
        )}

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Dernière utilisation : {new Date(supplier.lastUsed).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function SupplierManagementPage() {
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState<SupplierCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all')
  const [selected, setSelected]       = useState<Supplier | null>(null)
  const [sort, setSort]               = useState<'rating' | 'projects' | 'revenue'>('rating')

  const filtered = useMemo(() => {
    return DEMO_SUPPLIERS
      .filter(s => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
        const matchCat    = catFilter === 'all' || s.category === catFilter
        const matchStatus = statusFilter === 'all' || s.contractStatus === statusFilter
        return matchSearch && matchCat && matchStatus
      })
      .sort((a, b) => {
        if (sort === 'rating')   return b.rating - a.rating
        if (sort === 'projects') return b.totalProjects - a.totalProjects
        return b.totalRevenue - a.totalRevenue
      })
  }, [search, catFilter, statusFilter, sort])

  const exportCSV = () => {
    const header = 'Nom,Catégorie,Ville,Note,Projets,CA (MAD),Statut Contrat,Expiration\n'
    const rows = filtered.map(s =>
      `"${s.name}",${CATEGORY_CONFIG[s.category].label},${s.city},${s.rating},${s.totalProjects},${s.totalRevenue},${CONTRACT_CONFIG[s.contractStatus].label},${s.contractEnd}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'fournisseurs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // KPIs
  const totalSuppliers  = DEMO_SUPPLIERS.length
  const activeContracts = DEMO_SUPPLIERS.filter(s => s.contractStatus === 'actif').length
  const preferred       = DEMO_SUPPLIERS.filter(s => s.preferredPartner).length
  const avgRating       = DEMO_SUPPLIERS.reduce((s, v) => s + v.rating, 0) / totalSuppliers

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      {/* ── Main panel ──────────────────────────────────────────────── */}
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', selected ? 'mr-[360px]' : '')}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B1914] to-[#E8734A] flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">Fournisseurs</h1>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 ml-10">
                Gérez vos partenaires hôteliers, transporteurs, guides et prestataires
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Download size={13} /> CSV
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-[#5B1914] text-white hover:bg-[#7A2219] transition-colors">
                <Plus size={13} /> Ajouter
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Fournisseurs',    value: totalSuppliers.toString(),  icon: Building2, color: 'bg-[#5B1914]/10 text-[#5B1914] dark:bg-[#E8734A]/15 dark:text-[#E8734A]' },
              { label: 'Contrats actifs', value: activeContracts.toString(), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
              { label: 'Partenaires clés',value: preferred.toString(),        icon: Star, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
              { label: 'Note moyenne',    value: avgRating.toFixed(1) + ' ★', icon: TrendingUp, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={clsx('rounded-xl px-4 py-3', color)}>
                <div className="flex items-center gap-1.5">
                  <Icon size={13} />
                  <span className="text-[11px] font-semibold opacity-70">{label}</span>
                </div>
                <p className="text-[20px] font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher fournisseur ou ville…"
                className="w-full pl-9 pr-4 py-2 text-[13px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B1914]/20"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setCatFilter('all')}
                className={clsx('px-2 py-1 rounded text-[11px] font-semibold transition-colors', catFilter === 'all' ? 'bg-[#5B1914] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')}
              >Tous</button>
              {(Object.keys(CATEGORY_CONFIG) as SupplierCategory[]).map(cat => {
                const cfg = CATEGORY_CONFIG[cat]
                const Icon = cfg.icon
                return (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={clsx('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors', catFilter === cat ? 'bg-[#5B1914] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')}
                  >
                    <Icon size={10} /> {cfg.label}
                  </button>
                )
              })}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Tous statuts</option>
              {(Object.keys(CONTRACT_CONFIG) as ContractStatus[]).map(s => (
                <option key={s} value={s}>{CONTRACT_CONFIG[s].label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="text-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              <option value="rating">Par note</option>
              <option value="projects">Par projets</option>
              <option value="revenue">Par CA</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Fournisseur', 'Catégorie', 'Localisation', 'Note', 'Projets', 'CA (MAD)', 'Contrat', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s.id === selected?.id ? null : s)}
                    className={clsx(
                      'border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors',
                      s.id === selected?.id
                        ? 'bg-[#5B1914]/5 dark:bg-[#E8734A]/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.preferredPartner && <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />}
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><CategoryBadge cat={s.category} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
                        <MapPin size={11} className="flex-shrink-0" />
                        {s.city}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StarRating rating={s.rating} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-400">
                        <Briefcase size={11} className="flex-shrink-0 opacity-50" />
                        {s.totalProjects}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                        {(s.totalRevenue / 1000).toFixed(0)}k
                      </span>
                    </td>
                    <td className="px-4 py-3"><ContractBadge status={s.contractStatus} /></td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className={clsx('text-slate-300 dark:text-slate-600 transition-transform', s.id === selected?.id && 'rotate-90 text-[#5B1914] dark:text-[#E8734A]')} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-[13px] text-slate-400 dark:text-slate-500">
                      Aucun fournisseur ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 ml-1">
            {filtered.length} fournisseur{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed right-0 top-0 h-full w-[360px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-40 flex flex-col">
          <SupplierDetail supplier={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}

// Missing import fix
function Briefcase({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  )
}
