import { useState } from 'react'
import {
  FileText, Share2, Download, Eye, Layout, Palette,
  Image as ImageIcon, Globe, Lock, ChevronRight, Sparkles,
  MapPin, Calendar, Hotel, CheckCircle2, TrendingUp,
  Edit3, Type, ToggleLeft, ToggleRight, Copy, ExternalLink,
  Users, Star, Utensils, Bus, Mail, Phone, Settings,
  Check, EyeOff, Globe2, Sun,
} from 'lucide-react'
import { XLS_DAILY, XLS_MARGIN_PCT } from '@/data/ys_travel_11d'
import { useSimulation } from '@/hooks/useSimulation'
import { clsx } from 'clsx'

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'luxury',
    name: 'Majestic Gold',
    color: '#C5A059',
    font: 'font-serif',
    img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&q=80&w=400',
    cover: 'bg-[#140800]',
    accent: '#C5A059',
    headColor: 'bg-[#140800]',
  },
  {
    id: 'modern',
    name: 'Nomad Spirit',
    color: '#D97706',
    font: 'font-sans',
    img: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&q=80&w=400',
    cover: 'bg-[#2d1a10]',
    accent: '#D97706',
    headColor: 'bg-[#D97706]',
  },
  {
    id: 'business',
    name: "STOURS Elite",
    color: '#1628A9',
    font: 'font-sans',
    img: 'https://images.unsplash.com/photo-1553508913-264739567433?auto=format&fit=crop&q=80&w=400',
    cover: 'bg-[#0A0F1D]',
    accent: '#1628A9',
    headColor: 'bg-[#1628A9]',
  },
  {
    id: 'rose',
    name: 'Desert Rose',
    color: '#BE185D',
    font: 'font-sans',
    img: 'https://images.unsplash.com/photo-1548013146-72479768bbaa?auto=format&fit=crop&q=80&w=400',
    cover: 'bg-[#3D0020]',
    accent: '#BE185D',
    headColor: 'bg-[#BE185D]',
  },
]

// ─── Section Config ────────────────────────────────────────────────────────

const DEFAULT_SECTIONS = [
  { id: 'cover',     label: 'Page de couverture', icon: ImageIcon, enabled: true },
  { id: 'intro',     label: 'Message de bienvenue', icon: Type, enabled: true },
  { id: 'itinerary', label: 'Programme jour / jour', icon: Calendar, enabled: true },
  { id: 'hotels',    label: 'Hôtels inclus', icon: Hotel, enabled: true },
  { id: 'meals',     label: 'Repas & gastronomie', icon: Utensils, enabled: false },
  { id: 'transport', label: 'Transport & transferts', icon: Bus, enabled: true },
  { id: 'pricing',   label: 'Grille tarifaire', icon: TrendingUp, enabled: true },
  { id: 'contact',   label: 'Contact & signature', icon: Mail, enabled: true },
]

type SectionId = typeof DEFAULT_SECTIONS[number]['id']

// ─── Proposal Metadata ────────────────────────────────────────────────────────

interface ProposalMeta {
  title: string
  subtitle: string
  duration: string
  paxMin: number
  paxMax: number
  departure: string
  category: string
  agentName: string
  agentEmail: string
  agentPhone: string
  language: 'fr' | 'en' | 'de' | 'es'
  accentColor: string
}

const DEFAULT_META: ProposalMeta = {
  title: 'Magical Morocco',
  subtitle: 'Private Expedition · 2026',
  duration: '11 Days / 10 Nights',
  paxMin: 20,
  paxMax: 30,
  departure: 'November 2026',
  category: '4★ Premium',
  agentName: 'Sarah Mansouri',
  agentEmail: 'sarah@stours.ma',
  agentPhone: '+212 6 00 11 22 33',
  language: 'fr',
  accentColor: '#8B1A14',
}

const LANG_LABELS: Record<string, string> = { fr: '🇫🇷 Français', en: '🇬🇧 English', de: '🇩🇪 Deutsch', es: '🇪🇸 Español' }

type TabId = 'editor' | 'preview' | 'share'

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProposalStudioPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('luxury')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tab, setTab] = useState<TabId>('editor')
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [meta, setMeta] = useState<ProposalMeta>(DEFAULT_META)
  const [copied, setCopied] = useState(false)
  const [shareMode, setShareMode] = useState<'private' | 'public'>('private')

  const sim = useSimulation(XLS_MARGIN_PCT)
  const template = TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0]

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      window.print()
    }, 1500)
  }

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://rihla.ma/p/82x_4k_stours_2026')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const enabledSections = sections.filter(s => s.enabled).map(s => s.id)

  const TABS: { id: TabId; label: string; icon: typeof Eye }[] = [
    { id: 'editor',  label: 'Éditeur',  icon: Settings },
    { id: 'preview', label: 'Aperçu',   icon: Eye },
    { id: 'share',   label: 'Partager', icon: Share2 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">

      {/* ── Top Bar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rihla flex items-center justify-center text-white shadow-lg shadow-rihla/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="text-[14px] font-black text-slate-800 dark:text-cream">Proposal Studio</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Design & Export Engine</p>
          </div>
        </div>

        {/* Center tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                  tab === t.id
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-cream shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                <Icon size={12} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-bold rounded-xl shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isGenerating
              ? <><Download size={13} className="animate-bounce" /> Génération…</>
              : <><Download size={13} /> Exporter PDF</>}
          </button>
          <button
            onClick={() => setTab('share')}
            className="flex items-center gap-2 px-4 py-2 bg-rihla text-white text-[12px] font-bold rounded-xl shadow-lg hover:shadow-rihla/30 transition-all"
          >
            <Share2 size={13} /> Partager
          </button>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <div className="col-span-3 space-y-4">

          {/* Template Picker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layout size={11} /> Templates
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={clsx(
                    'relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/3]',
                    selectedTemplate === t.id ? 'border-rihla ring-2 ring-rihla/20' : 'border-transparent',
                  )}
                >
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5">
                    <p className="text-white font-bold text-[9px] leading-tight">{t.name}</p>
                  </div>
                  {selectedTemplate === t.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-rihla rounded-full flex items-center justify-center">
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata Editor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-4 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Edit3 size={11} /> Données de la proposition
            </h3>
            {[
              { key: 'title', label: 'Titre', type: 'text' },
              { key: 'subtitle', label: 'Sous-titre', type: 'text' },
              { key: 'duration', label: 'Durée', type: 'text' },
              { key: 'departure', label: 'Départ', type: 'text' },
              { key: 'category', label: 'Catégorie', type: 'text' },
              { key: 'agentName', label: 'Nom agent', type: 'text' },
              { key: 'agentEmail', label: 'Email agent', type: 'email' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{field.label}</label>
                <input
                  type={field.type}
                  value={(meta as any)[field.key]}
                  onChange={e => setMeta(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-rihla/50"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Pax min</label>
                <input type="number" value={meta.paxMin} onChange={e => setMeta(prev => ({ ...prev, paxMin: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-rihla/50" />
              </div>
              <div className="flex-1">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Pax max</label>
                <input type="number" value={meta.paxMax} onChange={e => setMeta(prev => ({ ...prev, paxMax: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-rihla/50" />
              </div>
            </div>
          </div>

          {/* Section Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Palette size={11} /> Sections incluses
            </h3>
            <div className="space-y-2">
              {sections.map(sec => {
                const Icon = sec.icon
                return (
                  <div key={sec.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={sec.enabled ? 'text-rihla' : 'text-slate-300 dark:text-slate-600'} />
                      <span className={clsx('text-[11px]', sec.enabled ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400')}>{sec.label}</span>
                    </div>
                    <button onClick={() => toggleSection(sec.id)} className="shrink-0">
                      {sec.enabled
                        ? <ToggleRight size={20} className="text-rihla" />
                        : <ToggleLeft size={20} className="text-slate-300 dark:text-slate-600" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Colors & Language */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-4 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sun size={11} /> Apparence
            </h3>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Couleur d'accentuation</label>
              <div className="flex gap-2 flex-wrap">
                {['#8B1A14', '#C5A059', '#D97706', '#059669', '#1628A9', '#BE185D'].map(c => (
                  <button
                    key={c}
                    onClick={() => setMeta(prev => ({ ...prev, accentColor: c }))}
                    className={clsx(
                      'w-7 h-7 rounded-full border-2 transition-all',
                      meta.accentColor === c ? 'border-white ring-2 ring-offset-1 ring-current scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input type="color" value={meta.accentColor} onChange={e => setMeta(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-7 h-7 rounded-full cursor-pointer border border-slate-200" title="Couleur personnalisée" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Langue d'export</label>
              <select
                value={meta.language}
                onChange={e => setMeta(prev => ({ ...prev, language: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-rihla/50"
              >
                {Object.entries(LANG_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── MAIN CANVAS / CONTENT ── */}
        <div className="col-span-9">

          {/* ── TAB: EDITOR (live preview canvas) ── */}
          {(tab === 'editor' || tab === 'preview') && (
            <div className={clsx(
              'bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 min-h-[1100px] relative',
              template.font,
            )}>

              {/* ── Cover ── */}
              {enabledSections.includes('cover') && (
                <div className="relative h-[600px] flex items-center justify-center overflow-hidden">
                  <img src={template.img} className="absolute inset-0 w-full h-full object-cover scale-105" alt="cover" />
                  <div className={clsx('absolute inset-0 opacity-65', template.cover)} />
                  {selectedTemplate === 'luxury' && (
                    <div className="absolute inset-6 border border-[#C5A059]/30 pointer-events-none" />
                  )}
                  <div className="relative text-center px-10">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mx-auto mb-8 flex items-center justify-center shadow-2xl">
                      <img src="/rihla_logo_profile.png" className="w-14 h-14 grayscale brightness-200" alt="Logo" />
                    </div>
                    <h2 className={clsx(
                      'text-white text-6xl font-black mb-4 tracking-tighter',
                      selectedTemplate === 'luxury' ? 'font-serif italic' : 'uppercase',
                    )} style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                      {meta.title}
                    </h2>
                    <div className="flex items-center justify-center gap-3 mb-8">
                      <div className="h-px w-10 bg-white/30" />
                      <p className="text-white text-[11px] font-bold tracking-[0.4em] uppercase opacity-80">{meta.subtitle}</p>
                      <div className="h-px w-10 bg-white/30" />
                    </div>
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                      {[
                        { label: 'Durée', value: meta.duration },
                        { label: 'Participants', value: `${meta.paxMin} - ${meta.paxMax} Pax` },
                        { label: 'Départ', value: meta.departure },
                        { label: 'Catégorie', value: meta.category },
                      ].map(info => (
                        <div key={info.label} className="text-white/70 text-center">
                          <p className="text-[9px] uppercase font-bold tracking-widest mb-0.5">{info.label}</p>
                          <p className="text-[13px] font-bold text-white">{info.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Welcome message ── */}
              {enabledSections.includes('intro') && (
                <div className="px-12 py-8 border-b border-slate-100">
                  <div className="max-w-2xl mx-auto text-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: meta.accentColor }}>Message de bienvenue</p>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Bienvenue dans votre voyage de rêve</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">
                      Chez S'TOURS DMC Morocco, nous avons conçu pour vous une expérience inédite au cœur du Maroc authentique.
                      Des riad de luxe aux bivouacs sous les étoiles du Sahara, chaque étape est soigneusement sélectionnée pour vous offrir des souvenirs inoubliables.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Itinerary ── */}
              {enabledSections.includes('itinerary') && (
                <div className="p-10">
                  <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: meta.accentColor }}>Programme</p>
                      <h3 className="text-2xl font-black text-slate-900">Le Voyage Jour par Jour</h3>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[11px] font-bold text-slate-600">
                        <Calendar size={12} style={{ color: meta.accentColor }} /> Nov 01 - Nov 11
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[11px] font-bold text-slate-600">
                        <Hotel size={12} style={{ color: meta.accentColor }} /> {meta.category}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {XLS_DAILY.filter(d => d.halfDbl > 0).slice(0, 6).map((item) => (
                      <div key={item.day} className="group cursor-pointer">
                        <div className="relative h-40 rounded-2xl overflow-hidden mb-3">
                          <img
                            src={`https://images.unsplash.com/photo-1548013146-72479768bbaa?auto=format&fit=crop&q=80&w=400&v=${item.day}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            alt={item.cities}
                          />
                          <div className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur-md rounded-lg flex flex-col items-center justify-center shadow-lg">
                            <span className="text-[8px] font-black text-slate-400 leading-none">DAY</span>
                            <span className="text-[14px] font-black leading-none" style={{ color: meta.accentColor }}>{item.day}</span>
                          </div>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: meta.accentColor }}>
                          <MapPin size={10} /> {item.cities}
                        </p>
                        <div className="text-[12px] text-slate-500 leading-relaxed">
                          <span className="font-bold text-slate-700">Hôtel:</span> {item.hotel} ({item.formula})<br />
                          <span className="font-bold text-slate-700">Repas:</span> {item.rest}
                        </div>
                      </div>
                    ))}
                  </div>
                  {XLS_DAILY.filter(d => d.halfDbl > 0).length > 6 && (
                    <p className="text-[11px] text-center text-slate-400 mt-4">+ {XLS_DAILY.filter(d => d.halfDbl > 0).length - 6} autres jours dans l'export PDF complet</p>
                  )}
                </div>
              )}

              {/* ── Pricing ── */}
              {enabledSections.includes('pricing') && (
                <div className="mx-10 mb-10 p-8 bg-slate-50 rounded-[32px] border border-slate-200">
                  <div className="text-center mb-6">
                    <TrendingUp size={24} className="mx-auto mb-3" style={{ color: meta.accentColor }} />
                    <h4 className="text-2xl font-black text-slate-900 mb-1">Investissement</h4>
                    <p className="text-slate-500 text-[12px]">Tarifs estimatifs par personne selon la taille du groupe.</p>
                  </div>
                  <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-[12px]">
                      <thead style={{ backgroundColor: meta.accentColor }}>
                        <tr>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-white">Groupe (Pax)</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-white text-right">Prix / Pers (MAD)</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-white/80 text-right">Prix / Pers (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sim.grid.map((row) => (
                          <tr key={row.pax} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 font-black text-slate-800">{row.pax} Pax</td>
                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{Math.round(row.sell).toLocaleString('fr-FR')} MAD</td>
                            <td className="px-6 py-3 text-right font-mono font-bold text-emerald-600">${Math.round(row.usd).toLocaleString('en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    * Supplément chambre single: {Math.round(sim.singleSupplement).toLocaleString('fr-FR')} MAD · Tarifs valables pour les dates sélectionnées uniquement.
                  </p>
                </div>
              )}

              {/* ── Contact ── */}
              {enabledSections.includes('contact') && (
                <div className="mx-10 mb-10 p-6 rounded-[24px] border" style={{ borderColor: meta.accentColor + '30', backgroundColor: meta.accentColor + '08' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0"
                      style={{ backgroundColor: meta.accentColor }}>
                      {meta.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{meta.agentName}</p>
                      <p className="text-[11px] text-slate-500">Votre Travel Designer S'TOURS</p>
                    </div>
                    <div className="flex gap-3">
                      <a href={`mailto:${meta.agentEmail}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold text-slate-600 hover:border-current transition-colors" style={{ borderColor: meta.accentColor + '40' }}>
                        <Mail size={12} /> {meta.agentEmail}
                      </a>
                      <a href={`tel:${meta.agentPhone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold" style={{ backgroundColor: meta.accentColor }}>
                        <Phone size={12} /> {meta.agentPhone}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SHARE ── */}
          {tab === 'share' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[30px] p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rihla/10 flex items-center justify-center">
                  <Share2 size={20} className="text-rihla" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-cream text-lg">Partager la Proposition</h3>
                  <p className="text-[12px] text-slate-500">Envoyez un lien sécurisé à votre client ou partenaire</p>
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="flex gap-3">
                {[
                  { id: 'private', label: 'Lien privé (mot de passe)', icon: Lock, desc: 'Seuls les personnes avec le mot de passe peuvent accéder' },
                  { id: 'public', label: 'Lien public', icon: Globe2, desc: 'Accessible à toute personne ayant le lien' },
                ].map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setShareMode(opt.id as any)}
                      className={clsx(
                        'flex-1 text-left p-4 rounded-2xl border transition-all',
                        shareMode === opt.id
                          ? 'border-rihla bg-rihla/5 ring-1 ring-rihla'
                          : 'border-slate-200 dark:border-slate-700 hover:border-rihla/30',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} className={shareMode === opt.id ? 'text-rihla' : 'text-slate-400'} />
                        <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Link display */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Lien de partage</p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  <span className="flex-1 text-[12px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                    https://rihla.ma/p/82x_4k_stours_2026
                  </span>
                  <button onClick={handleCopyLink} className={clsx(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
                  )}>
                    {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                  </button>
                  <a href="#" target="_blank" className="shrink-0 text-slate-400 hover:text-slate-600 p-1">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Send by email */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Envoyer par email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="email@client.com"
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-rihla/50"
                  />
                  <button className="px-4 py-2.5 bg-rihla text-white text-[12px] font-bold rounded-xl hover:bg-rihla/90 transition-colors flex items-center gap-2">
                    <Mail size={13} /> Envoyer
                  </button>
                </div>
              </div>

              {/* Stats preview */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Statistiques de la proposition</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Vues', value: '0', icon: Eye },
                    { label: 'Durée moyenne', value: '—', icon: Calendar },
                    { label: 'Téléchargements', value: '0', icon: Download },
                  ].map(stat => {
                    const Icon = stat.icon
                    return (
                      <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                        <Icon size={16} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-xl font-black text-slate-800 dark:text-cream">{stat.value}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{stat.label}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-3">Les statistiques s'afficheront dès le premier partage</p>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[12px] font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                  <MessageSquareIcon size={13} /> Envoyer via WhatsApp
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-bold rounded-xl hover:border-rihla/40 transition-colors">
                  <Download size={13} /> Télécharger PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tiny inline icon to avoid import issues
function MessageSquareIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
