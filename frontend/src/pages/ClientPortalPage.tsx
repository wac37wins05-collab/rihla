import { useState, useMemo } from 'react'
import {
  Users, FileText, Banknote, MessageSquare, Download, Clock,
  CheckCircle2, ShieldCheck, X, Navigation, Star, MapPin,
  Calendar, Hotel, Utensils, Camera, Bus, Gift, Heart,
  Phone, Mail, Globe, ChevronRight, ChevronDown, Plane,
  Sun, Moon, Loader2, QrCode, CreditCard, AlertCircle,
  Send, Sparkles, Image as ImageIcon, Check, HelpCircle,
  Link2, Eye, Trash2, Plus, Copy, ExternalLink, Wifi, WifiOff
} from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { travelLinksApi, projectsApi } from '@/lib/api'
import { ProjectPicker } from '@/components/projects/ProjectPicker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agency {
  id: string
  name: string
  contact: string
  logo: string
  country: string
}

interface DayProgram {
  id: string
  day: number
  city: string
  date: string
  title: string
  desc: string
  hotel: string
  meals: string[]
  highlights: string[]
  status: 'completed' | 'active' | 'upcoming'
  rating?: number
  photo?: string
}

interface Document {
  id: string
  name: string
  type: 'voucher' | 'programme' | 'invoice' | 'insurance' | 'visa'
  size: string
  date: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AGENCIES: Agency[] = [
  { id: 'ag-1', name: 'Travel Agency XYZ',    contact: 'John Doe',       logo: 'TA', country: '🇺🇸' },
  { id: 'ag-2', name: 'Prestige Tours Paris', contact: 'Marie Lefebvre', logo: 'PT', country: '🇫🇷' },
  { id: 'ag-3', name: 'US Adventure Co.',     contact: 'Sarah Miller',   logo: 'UA', country: '🇬🇧' },
]

const DAYS: DayProgram[] = [
  {
    id: '1', day: 1, city: 'Marrakech', date: '12 Mai',
    title: 'Bienvenue au Maroc',
    desc: 'Transfert VIP depuis l\'aéroport Menara. Installation au Riad et dîner de bienvenue avec musique traditionnelle gnaoua.',
    hotel: 'Riad El Fenn ★★★★★',
    meals: ['🍽️ Dîner'],
    highlights: ['Transfert VIP', 'Hammam privé', 'Dîner de bienvenue'],
    status: 'completed',
    rating: 5,
  },
  {
    id: '2', day: 2, city: 'Marrakech', date: '13 Mai',
    title: 'Secrets de la Médina',
    desc: 'Visite privée de la Médina avec un historien local. Palais Bahia, souks, et déjeuner chez l\'habitant dans un riad centenaire.',
    hotel: 'Riad El Fenn ★★★★★',
    meals: ['☕ Petit-déjeuner', '🍽️ Déjeuner traditionnel'],
    highlights: ['Palais Bahia', 'Souk Semmarine', 'Jardins Majorelle'],
    status: 'active',
  },
  {
    id: '3', day: 3, city: 'Désert d\'Agafay', date: '14 Mai',
    title: 'Nuit sous les Étoiles',
    desc: 'Safari 4×4 au lever du soleil dans le désert de pierres d\'Agafay. Déjeuner nomade et nuit sous tente de luxe avec observation des étoiles guidée.',
    hotel: 'Scarabeo Camp ★★★★★',
    meals: ['☕ Petit-déjeuner', '🍽️ Déjeuner nomade', '🌙 Dîner sous les étoiles'],
    highlights: ['Safari 4×4', 'Observation des étoiles', 'Tente de luxe'],
    status: 'upcoming',
  },
  {
    id: '4', day: 4, city: 'Essaouira', date: '15 Mai',
    title: 'La Cité des Vents',
    desc: 'Route côtière vers Essaouira. Visite de la Médina classée UNESCO, galeries d\'art et pêcheurs au port. Déjeuner de fruits de mer frais.',
    hotel: 'Villa de l\'O ★★★★',
    meals: ['☕ Petit-déjeuner', '🍽️ Fruits de mer'],
    highlights: ['Médina UNESCO', 'Port des pêcheurs', 'Galeries d\'art'],
    status: 'upcoming',
  },
  {
    id: '5', day: 5, city: 'Fès', date: '16 Mai',
    title: 'La Ville Millénaire',
    desc: 'Vol interne vers Fès. Découverte de la plus ancienne médina du monde avec guide expert. Tanneries Chouara et artisanat traditionnel.',
    hotel: 'Palais Amani ★★★★★',
    meals: ['☕ Petit-déjeuner', '🍽️ Déjeuner à la médina', '🍽️ Dîner de gala'],
    highlights: ['Tanneries Chouara', 'Médersa Bou Inania', 'Souk artisanal'],
    status: 'upcoming',
  },
]

const DOCUMENTS: Document[] = [
  { id: 'd1', name: 'Programme détaillé — Grand Tour Maroc', type: 'programme',  size: '2.4 MB', date: '03 Mai 2026' },
  { id: 'd2', name: 'Bon de commande #ST-9921',              type: 'voucher',    size: '180 KB', date: '03 Mai 2026' },
  { id: 'd3', name: 'Facture proforma #INV-2026-0342',        type: 'invoice',    size: '95 KB',  date: '01 Mai 2026' },
  { id: 'd4', name: 'Attestation assurance voyage',          type: 'insurance',  size: '340 KB', date: '28 Avr 2026' },
]

const DOC_CONFIG: Record<Document['type'], { icon: string; color: string }> = {
  programme: { icon: '📋', color: 'bg-violet-100 dark:bg-violet-900/30' },
  voucher:   { icon: '🎫', color: 'bg-blue-100 dark:bg-blue-900/30' },
  invoice:   { icon: '🧾', color: 'bg-amber-100 dark:bg-amber-900/30' },
  insurance: { icon: '🛡️', color: 'bg-emerald-100 dark:bg-emerald-900/30' },
  visa:      { icon: '🪪', color: 'bg-rose-100 dark:bg-rose-900/30' },
}

const STATUS_STEP_CONFIG = {
  completed: { cls: 'border-emerald-500 bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', icon: <Check size={10} className="text-white" /> },
  active:    { cls: 'border-[#5B1914] bg-[#5B1914] ring-4 ring-[#5B1914]/20',  text: 'text-[#5B1914] dark:text-[#E8734A] font-bold', icon: <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> },
  upcoming:  { cls: 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900', text: 'text-slate-400 dark:text-slate-500', icon: null },
}

// ─── Link Manager Panel ────────────────────────────────────────────────────────

function ClientPortalLinkManager() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [expiresDays, setExpiresDays] = useState(30)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['travel-links', projectId],
    queryFn: () => travelLinksApi.listForProject(projectId!).then(r => (r.data as any[]) || []),
    enabled: !!projectId,
  })

  const createMut = useMutation({
    mutationFn: () => travelLinksApi.create({ project_id: projectId!, expires_at: new Date(Date.now() + expiresDays * 86400_000).toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel-links', projectId] }),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => travelLinksApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel-links', projectId] }),
  })

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Link2 size={16} className="text-rihla" /> Gestion des Liens Portail Client
          </h2>
          <p className="text-xs text-slate-400 mt-1">Génère des liens sécurisés pour partager l'espace voyage avec tes clients</p>
        </div>
        <div className="flex items-center gap-2">
          {projectId
            ? <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold"><Wifi size={12}/> Connecté</span>
            : <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><WifiOff size={12}/> Sélectionne un projet</span>
          }
        </div>
      </div>

      <div className="flex items-end gap-3 mb-5">
        <ProjectPicker value={projectId} onChange={setProjectId} label="Projet source" className="w-72" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">Expire dans</label>
          <select
            value={expiresDays}
            onChange={e => setExpiresDays(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
          >
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
          </select>
        </div>
        <button
          disabled={!projectId || createMut.isPending}
          onClick={() => createMut.mutate()}
          className="flex items-center gap-2 px-5 py-2.5 bg-rihla text-white rounded-xl text-sm font-bold hover:bg-rihla/90 transition-all disabled:opacity-40 shadow-lg shadow-rihla/20"
        >
          {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Générer un lien
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={14} className="animate-spin" /> Chargement des liens…
        </div>
      )}

      {!isLoading && links.length === 0 && projectId && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Aucun lien généré pour ce projet. Clique sur "Générer un lien" pour commencer.
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-3">
          {links.map((link: any) => {
            const url = link.access_url || link.url || `${window.location.origin}/travel/${link.token}`
            const isExpired = link.expires_at && new Date(link.expires_at) < new Date()
            const isRevoked = link.is_revoked || link.revoked_at
            return (
              <div key={link.id} className={clsx(
                "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                isRevoked ? "border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 opacity-60"
                : isExpired ? "border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10"
                : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]"
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">{url}</span>
                    {isRevoked && <span className="px-2 py-0.5 text-[9px] font-black bg-red-100 text-red-700 rounded-full uppercase">Révoqué</span>}
                    {!isRevoked && isExpired && <span className="px-2 py-0.5 text-[9px] font-black bg-amber-100 text-amber-700 rounded-full uppercase">Expiré</span>}
                    {!isRevoked && !isExpired && <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-700 rounded-full uppercase">Actif</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 flex gap-3">
                    {link.expires_at && <span>Expire: {new Date(link.expires_at).toLocaleDateString('fr-FR')}</span>}
                    {link.view_count !== undefined && <span><Eye size={9} className="inline" /> {link.view_count} vues</span>}
                    {link.created_at && <span>Créé: {new Date(link.created_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyLink(url, link.id)}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-rihla transition-all"
                    title="Copier"
                  >
                    {copied === link.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-rihla transition-all"
                    title="Ouvrir"
                  >
                    <ExternalLink size={14} />
                  </a>
                  {!isRevoked && (
                    <button
                      onClick={() => revokeMut.mutate(link.id)}
                      disabled={revokeMut.isPending}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                      title="Révoquer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientPortalPage() {
  const [selectedAgency, setSelectedAgency] = useState(AGENCIES[0])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'programme' | 'documents' | 'finance' | 'chat'>('programme')
  const [expandedDay, setExpandedDay] = useState<string | null>('2')
  const [messages, setMessages] = useState([
    { from: 'designer', text: 'Bonjour ! J\'ai ajouté une option pour un déjeuner chez l\'habitant à Chefchaouen. Qu\'en pensez-vous pour vos clients ?', time: '10:45' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [satisfaction, setSatisfaction] = useState<Record<string, string>>({})

  const tripStart = new Date('2026-05-12')
  const today = new Date('2026-05-13') // demo: day 2 active
  const daysUntil = Math.ceil((tripStart.getTime() - new Date().getTime()) / (1000*60*60*24))
  const activeDayIdx = DAYS.findIndex(d => d.status === 'active')

  const sendMessage = () => {
    if (!chatInput.trim()) return
    setMessages(prev => [...prev, { from: 'client', text: chatInput, time: 'Maintenant' }])
    setChatInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        from: 'designer',
        text: 'Merci pour votre message ! Je reviendrai vers vous dans les plus brefs délais. En attendant, tout est prévu pour vous offrir la meilleure expérience possible.',
        time: 'Maintenant'
      }])
    }, 1500)
  }

  const TABS = [
    { id: 'programme',  label: 'Mon Voyage',  icon: <MapPin size={13} /> },
    { id: 'documents',  label: 'Documents',   icon: <FileText size={13} /> },
    { id: 'finance',    label: 'Paiement',    icon: <CreditCard size={13} /> },
    { id: 'chat',       label: 'Assistance',  icon: <MessageSquare size={13} /> },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Live Link Manager ── */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <ClientPortalLinkManager />
        <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          ↓ Aperçu du portail tel que le client le voit ↓
        </div>
      </div>

      {/* ── Agency switcher (demo bar) ── */}
      <div className="bg-slate-900 px-6 py-2 flex justify-between items-center text-white/40 text-[9px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <ShieldCheck size={11} className="text-emerald-500" />
          Accès sécurisé B2B · {selectedAgency.name}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/25">Simuler :</span>
          {AGENCIES.map(ag => (
            <button
              key={ag.id}
              onClick={() => setSelectedAgency(ag)}
              className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${selectedAgency.id === ag.id ? 'bg-white/15 text-white' : 'hover:text-white'}`}
            >
              {ag.logo}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-r from-[#5B1914] via-[#7a2218] to-[#8B2E28] px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] text-white/50 font-bold uppercase tracking-widest mb-1">Portail Voyage</p>
              <h1 className="text-[22px] font-black text-white mb-1">Grand Tour Maroc</h1>
              <p className="text-[13px] text-white/70">{selectedAgency.country} {selectedAgency.name} · {selectedAgency.contact}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="bg-white/10 rounded-2xl px-5 py-3 backdrop-blur-sm border border-white/10">
                <p className="text-[28px] font-black text-white leading-none">{DAYS.length}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase">Jours</p>
              </div>
            </div>
          </div>

          {/* Trip timeline progress */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] text-white/60 mb-2">
              <span className="flex items-center gap-1"><Plane size={10} /> 12 Mai — Départ</span>
              <span className="font-bold text-[#E8734A]">Jour {activeDayIdx + 1} / {DAYS.length}</span>
              <span className="flex items-center gap-1">16 Mai — Retour <Plane size={10} /></span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E8734A] to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${((activeDayIdx + 0.5) / DAYS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Today's snapshot */}
          <div className="flex items-center gap-3 mt-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-[#E8734A]/30 flex items-center justify-center">
              <Sun size={16} className="text-[#E8734A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white">Aujourd'hui — {DAYS[activeDayIdx]?.title}</p>
              <p className="text-[11px] text-white/60">{DAYS[activeDayIdx]?.city} · {DAYS[activeDayIdx]?.hotel}</p>
            </div>
            <ChevronRight size={15} className="text-white/40 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-1.5 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#5B1914] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ══ PROGRAMME ══ */}
        {activeTab === 'programme' && (
          <>
            {/* Programme timeline */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Programme Jour par Jour</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">12–16 Mai 2026 · 5 villes, 8 expériences</p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {DAYS.map((day, i) => {
                  const stepCfg = STATUS_STEP_CONFIG[day.status]
                  const isExpanded = expandedDay === day.id

                  return (
                    <div key={day.id}>
                      <button
                        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                      >
                        {/* Step circle + line */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${stepCfg.cls}`}>
                            {stepCfg.icon ?? <span className="text-[10px] font-black text-slate-400">{day.day}</span>}
                          </div>
                          {i < DAYS.length - 1 && (
                            <div className={`w-0.5 h-5 ${day.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${stepCfg.text}`}>
                              {day.city} · {day.date}
                            </span>
                            {day.status === 'active' && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#E8734A]/15 text-[#E8734A] text-[9px] font-black uppercase">
                                En cours
                              </span>
                            )}
                            {day.status === 'completed' && day.rating && (
                              <div className="flex gap-0.5">
                                {Array.from({ length: day.rating }).map((_, i) => (
                                  <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className={`text-[14px] font-bold ${day.status === 'upcoming' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {day.title}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                            <Hotel size={9} /> {day.hotel}
                          </p>
                        </div>

                        <ChevronDown size={14} className={`text-slate-300 dark:text-slate-600 transition-transform flex-shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="mx-5 mb-5 ml-16 space-y-4">
                          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{day.desc}</p>

                          {/* Highlights */}
                          <div className="flex flex-wrap gap-2">
                            {day.highlights.map(h => (
                              <span key={h} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#5B1914]/8 dark:bg-[#E8734A]/15 text-[#5B1914] dark:text-[#E8734A] text-[11px] font-semibold border border-[#5B1914]/15 dark:border-[#E8734A]/20">
                                <Sparkles size={9} /> {h}
                              </span>
                            ))}
                          </div>

                          {/* Meals */}
                          <div className="flex gap-3 text-[12px] text-slate-500 dark:text-slate-400">
                            {day.meals.map(m => <span key={m}>{m}</span>)}
                          </div>

                          {/* Rating for completed days */}
                          {day.status === 'completed' && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40">
                              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-2">Votre avis sur cette journée :</p>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(r => (
                                  <button
                                    key={r}
                                    onClick={() => setRatings(prev => ({ ...prev, [day.id]: r }))}
                                    className="transition-transform hover:scale-110"
                                  >
                                    <Star
                                      size={20}
                                      className={(ratings[day.id] ?? day.rating ?? 0) >= r
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-300 dark:text-slate-600'
                                      }
                                    />
                                  </button>
                                ))}
                                <input
                                  placeholder="Commentaire rapide..."
                                  className="flex-1 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/40 bg-white dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Active day satisfaction */}
                          {day.status === 'active' && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">Comment se passe votre journée ?</p>
                              <div className="flex gap-2">
                                {[['😞','Déçu'],['😐','Moyen'],['😊','Bien'],['😄','Super'],['🤩','Parfait']].map(([emoji, label]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => setSatisfaction(prev => ({ ...prev, [day.id]: emoji }))}
                                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all text-[9px] font-bold ${
                                      satisfaction[day.id] === emoji
                                        ? 'border-[#5B1914] bg-[#5B1914]/10 text-[#5B1914] dark:border-[#E8734A] dark:bg-[#E8734A]/15 dark:text-[#E8734A]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-400'
                                    }`}
                                  >
                                    <span className="text-xl">{emoji}</span>
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Manager card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Votre gestionnaire S'TOURS</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5B1914] to-[#E8734A] flex items-center justify-center text-white font-black text-lg">
                  YE
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">Yassine El Amrani</p>
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Senior Travel Designer</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><Phone size={10} /> +212 661 234 567</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><Mail size={10} /> y.elamrani@stours.ma</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#5B1914] text-white text-[13px] font-bold hover:bg-[#4a1410] transition-all"
              >
                <MessageSquare size={14} /> Contacter le Designer
              </button>
            </div>
          </>
        )}

        {/* ══ DOCUMENTS ══ */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Mes Documents</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Tous vos documents de voyage en un clic</p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {DOCUMENTS.map(doc => {
                const cfg = DOC_CONFIG[doc.type]
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{doc.size} · {doc.date}</p>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-[#5B1914]/10 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                      <Download size={13} /> PDF
                    </button>
                  </div>
                )
              })}
            </div>

            {/* QR Code Section */}
            <div className="px-5 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                  <QrCode size={32} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Accès Mobile Hors-Ligne</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Scannez pour télécharger tous vos documents en mode avion</p>
                  <button className="mt-2 text-[11px] font-bold text-[#5B1914] dark:text-[#E8734A] hover:underline">
                    Générer le QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FINANCE ══ */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            {/* Balance card */}
            <div className="bg-gradient-to-br from-[#5B1914] to-[#8B2E28] rounded-2xl p-6 text-white">
              <p className="text-[11px] text-white/60 font-bold uppercase tracking-wider mb-1">Dossier #ST-9921</p>
              <p className="text-[32px] font-black mb-1">124 500 <span className="text-[16px] text-white/60">MAD</span></p>
              <p className="text-[13px] text-white/70">Total voyage · 8 voyageurs</p>

              <div className="mt-5 space-y-3">
                {[
                  { label: 'Acompte versé (40%)',     amount: '49 800 MAD',  status: 'paid',    date: '01 Avr 2026' },
                  { label: '2ème tranche (30%)',       amount: '37 350 MAD',  status: 'pending', date: 'Avant le 30 Mai' },
                  { label: 'Solde final (30%)',         amount: '37 350 MAD',  status: 'upcoming',date: 'Sur place' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <div>
                      <p className="text-[12px] font-semibold text-white/80">{row.label}</p>
                      <p className="text-[10px] text-white/40">{row.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black text-white">{row.amount}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        row.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' :
                        row.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {row.status === 'paid' ? 'Payé ✓' : row.status === 'pending' ? 'À payer' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5">
              <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mb-4">Payer la 2ème tranche — 37 350 MAD</h3>

              <div className="space-y-3 mb-5">
                {[
                  { label: 'Carte bancaire',    sub: 'Visa, Mastercard, Amex',   icon: '💳', recommended: true },
                  { label: 'Virement bancaire', sub: 'IBAN fourni sous 24h',      icon: '🏦' },
                  { label: 'PayPal',            sub: 'Frais de 2.9%',            icon: '🅿️' },
                ].map(m => (
                  <button key={m.label} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:border-[#5B1914]/40 dark:hover:border-[#E8734A]/40 text-left ${
                    m.recommended
                      ? 'border-[#5B1914]/30 dark:border-[#E8734A]/30 bg-[#5B1914]/5 dark:bg-[#E8734A]/5'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{m.label}</p>
                      <p className="text-[11px] text-slate-400">{m.sub}</p>
                    </div>
                    {m.recommended && (
                      <span className="px-2 py-0.5 rounded-full bg-[#5B1914] dark:bg-[#E8734A] text-white text-[9px] font-black uppercase">Recommandé</span>
                    )}
                    <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck size={13} className="text-emerald-500" />
                Paiement sécurisé SSL · données cryptées · aucune commission cachée
              </div>
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: 400 }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B1914] to-[#E8734A] flex items-center justify-center text-white font-black text-[13px]">YE</div>
              <div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Yassine El Amrani</p>
                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne · répond en &lt;30 min
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <a href="tel:+212661234567" className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                  <Phone size={14} />
                </a>
                <a href="mailto:y.elamrani@stours.ma" className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all">
                  <Mail size={14} />
                </a>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.from === 'client' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-[11px] flex-shrink-0 ${
                    msg.from === 'designer' ? 'bg-gradient-to-br from-[#5B1914] to-[#E8734A]' : 'bg-slate-700 dark:bg-slate-600'
                  }`}>
                    {msg.from === 'designer' ? 'YE' : 'CL'}
                  </div>
                  <div className={`max-w-[75%] ${msg.from === 'client' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                      msg.from === 'designer'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none'
                        : 'bg-[#5B1914] text-white rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick questions */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['Déjeuner inclus ?', 'Horaires demain ?', 'Valises en chambre ?', 'WiFi à l\'hôtel ?'].map(q => (
                  <button
                    key={q}
                    onClick={() => setChatInput(q)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 hover:border-[#5B1914]/40 hover:text-[#5B1914] dark:hover:text-[#E8734A] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Posez une question..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#5B1914] text-white hover:bg-[#4a1410] transition-all disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-center mt-2 tracking-widest">
                Discussion sécurisée · archivée dans votre dossier
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
