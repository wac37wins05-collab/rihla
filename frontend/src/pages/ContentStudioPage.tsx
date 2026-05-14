import { useState } from 'react'
import {
  Type, Languages, Wand2, Copy, Check,
  RefreshCw, FileText, Globe, Sparkles,
  MessageSquare, Layout, Download, Save,
  Calendar, MapPin, Hotel, Utensils,
  Instagram, Mail, Hash, Newspaper,
  Star, Zap, Eye, ChevronRight, Bot,
  ThumbsUp, ThumbsDown, Send, Image as ImageIcon,
  Clock, Users, TrendingUp,
} from 'lucide-react'
import { aiApi } from '@/lib/api'
import { XLS_DAILY } from '@/data/ys_travel_11d'
import { clsx } from 'clsx'

// ─── Config ──────────────────────────────────────────────────────────────────

const TONES = [
  { id: 'luxury',      label: '💎 Luxe',         desc: 'Élégant, sensoriel, exclusif' },
  { id: 'adventure',   label: '🏔️ Aventure',     desc: 'Dynamique, explorateur, actif' },
  { id: 'romantic',    label: '💑 Romantique',    desc: 'Poétique, intime, magique' },
  { id: 'corporate',   label: '🏢 Corporate',     desc: 'Professionnel, efficace, précis' },
  { id: 'family',      label: '👨‍👩‍👧 Famille',  desc: 'Chaleureux, inclusif, joyeux' },
]

const LANGUAGES = [
  { id: 'french',   label: '🇫🇷 Français' },
  { id: 'english',  label: '🇬🇧 English' },
  { id: 'german',   label: '🇩🇪 Deutsch' },
  { id: 'spanish',  label: '🇪🇸 Español' },
  { id: 'arabic',   label: '🇲🇦 العربية' },
]

const CONTENT_TEMPLATES = [
  { id: 'day_desc',      label: 'Description de journée', icon: Calendar, category: 'writing', example: 'Programme jour J+3, hôtel Riad Fes 5★' },
  { id: 'hotel_desc',    label: 'Présentation hôtel',    icon: Hotel,    category: 'writing', example: 'La Mamounia Marrakech — luxe intemporel' },
  { id: 'destination',   label: 'Fiche destination',      icon: MapPin,   category: 'writing', example: 'Chefchaouen — la ville bleue du Rif' },
  { id: 'activity',      label: 'Description activité',   icon: Star,     category: 'writing', example: 'Atelier de cuisine traditionnelle' },
  { id: 'welcome_msg',   label: 'Message d\'accueil',     icon: Utensils, category: 'writing', example: 'Bienvenue, mot d\'accueil pour groupe 25 pax' },
  { id: 'ig_caption',    label: 'Caption Instagram',      icon: Instagram, category: 'social', example: 'Photo des dunes de Merzouga au coucher de soleil' },
  { id: 'fb_post',       label: 'Publication Facebook',   icon: Globe,    category: 'social', example: 'Lancement nouvelle offre circuit Sud Maroc 2026' },
  { id: 'linkedin',      label: 'Article LinkedIn',       icon: TrendingUp, category: 'social', example: 'Tendances tourisme luxe Maroc 2026' },
  { id: 'hashtags',      label: 'Hashtags optimisés',     icon: Hash,     category: 'social', example: 'Circuit désert sahara, segment luxe' },
  { id: 'newsletter_sub',label: 'Section Newsletter',     icon: Newspaper, category: 'email', example: 'Offre Early Bird circuits automne 2026' },
  { id: 'email_blast',   label: 'Email promotionnel',     icon: Mail,     category: 'email', example: 'Promotion 10% solde de fin de saison' },
  { id: 'whatsapp',      label: 'Message WhatsApp',       icon: MessageSquare, category: 'email', example: 'Relance lead non répondu depuis 3 jours' },
]

const CATEGORY_TABS = [
  { id: 'writing', label: 'Rédaction',    icon: FileText },
  { id: 'social',  label: 'Réseaux',      icon: Instagram },
  { id: 'email',   label: 'Email / WA',   icon: Mail },
]

const CONTEXT_EXAMPLES: Record<string, string> = {
  day_desc:      `Jour 3 — Fès\nHôtel: Riad Fes 5★\nRepas: Dîner traditionnel Dar El Ghalia\nActivités: Médina de Fès, tanneries Chouara`,
  hotel_desc:    `Hôtel: La Mamounia Marrakech\nCatégorie: 5★ Palace\nServices: Spa, Jardins, 7 restaurants\nPrix: à partir de 3500 MAD/nuit`,
  destination:   `Destination: Chefchaouen\nRégion: Rif Nord Maroc\nAtouts: Architectures bleues, randonnées, artisanat, hammams`,
  activity:      `Activité: Cours de cuisine traditionnelle marocaine\nLieu: Riad privé Marrakech\nDurée: 3h\nInclus: Marché local + déjeuner`,
  ig_caption:    `Photo: Dunes de Merzouga, coucher de soleil\nThème: Voyage luxe désert\nCible: Francophones amateurs de voyage haut de gamme`,
  fb_post:       `Nouvelle offre: Circuit Sud Maroc 2026 "Oasis & Dunes"\nDurée: 8 jours\nPublic: Familles et couples\nPrix: à partir de 12 900 MAD/pers`,
  linkedin:      `Thème: Tourisme de luxe au Maroc\nAngle: Comment le Maroc se positionne comme destination MICE premium en 2026\nPublic: Directeurs MICE, TO internationaux`,
  hashtags:      `Contexte: Circuit désert Sahara 4x4, segment luxe\nLangue cible: Anglais et Français\nNombre souhaité: 25 hashtags`,
  newsletter_sub:`Section newsletter: Offre Early Bird automne 2026\nCircuits concernés: Impériales + Désert\nRemise: 15% si réservation avant 30 juin\nPublic: Base B2B agences partenaires`,
  email_blast:   `Objet email: Soldes fin de saison — 10% sur tous circuits\nPublic: Clients fidèles ayant voyagé avec S'TOURS\nTon: Chaleureux, urgent, exclusif`,
  whatsapp:      `Contexte: Lead Youssef A. — demandé devis MICE 40 pax\nDernier contact: il y a 5 jours — pas de réponse\nTon: Professionnel, poli, sans pression`,
  welcome_msg:   `Groupe: Henderson Group (25 pax)\nArrée: Marrakech 15 novembre 2026\nGuide: Hassan Benali\nProgramme J1: Visite médina + dîner Jemaa el Fna`,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ContentStudioPage() {
  const [categoryTab, setCategoryTab] = useState('writing')
  const [selectedTemplate, setSelectedTemplate] = useState('day_desc')
  const [tone, setTone] = useState('luxury')
  const [targetLang, setTargetLang] = useState('french')
  const [context, setContext] = useState(CONTEXT_EXAMPLES['day_desc'])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [resultText, setResultText] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [liked, setLiked] = useState<'up' | 'down' | null>(null)
  const [history, setHistory] = useState<{ template: string; result: string; lang: string; ts: string }[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const currentTemplate = CONTENT_TEMPLATES.find(t => t.id === selectedTemplate)

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id)
    setContext(CONTEXT_EXAMPLES[id] ?? '')
    setResultText('')
    setLiked(null)
  }

  const handleGenerate = async () => {
    if (!context.trim()) return
    setLoading(true)
    setResultText('')
    setLiked(null)
    try {
      const toneObj = TONES.find(t => t.id === tone)
      const langObj = LANGUAGES.find(l => l.id === targetLang)
      const tmpl = CONTENT_TEMPLATES.find(t => t.id === selectedTemplate)

      const systemPrompt = `Tu es un expert en rédaction marketing pour S'TOURS DMC Morocco, agence de tourisme haut de gamme au Maroc.
Ton rôle: Générer du contenu de haute qualité pour ${tmpl?.label ?? 'contenu marketing'}.
Tonalité: ${toneObj?.desc ?? 'Professionnel'}
Langue de sortie: ${langObj?.label ?? 'Français'}
${additionalNotes ? `Notes spécifiques: ${additionalNotes}` : ''}

Règles:
- Ne mentionne JAMAIS de prix sauf si explicitement demandé
- Sois précis, évocateur et fidèle à la marque S'TOURS
- Adapte parfaitement à la langue demandée
- Pour les posts réseaux sociaux, inclus les emojis appropriés
- Pour les hashtags, liste-les ligne par ligne avec #`

      const userPrompt = `Génère ${tmpl?.label ?? 'un contenu'} avec ce contexte:\n\n${context}`

      const res = await aiApi.generate(`${systemPrompt}\n\n---\n\n${userPrompt}`)
      const text = res.data?.content || ''
      setResultText(text)
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length)
      setHistory(prev => [{
        template: tmpl?.label ?? selectedTemplate,
        result: text,
        lang: langObj?.label ?? targetLang,
        ts: new Date().toLocaleTimeString('fr-FR'),
      }, ...prev.slice(0, 9)])
    } catch (err) {
      setResultText('Erreur de génération. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredTemplates = CONTENT_TEMPLATES.filter(t => t.category === categoryTab)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-cream">AI Content Studio</h1>
              <p className="text-slate-400 text-[11px] uppercase tracking-widest font-bold mt-0.5">Génération de contenu marketing · Propulsé par IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:border-violet-400 transition-colors"
            >
              <Clock size={13} /> Historique ({history.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* ── LEFT: Config panel ── */}
          <div className="col-span-3 space-y-4">

            {/* Category tabs */}
            <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5">
              {CATEGORY_TABS.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryTab(cat.id); handleTemplateSelect(filteredTemplates.find(t => t.category === cat.id)?.id ?? selectedTemplate) }}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all',
                      categoryTab === cat.id
                        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white shadow'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                    )}
                  >
                    <Icon size={11} />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Template list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">Choisir un type de contenu</p>
              {filteredTemplates.map(tmpl => {
                const Icon = tmpl.icon
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplateSelect(tmpl.id)}
                    className={clsx(
                      'w-full flex items-start gap-2.5 p-2.5 rounded-xl transition-all text-left',
                      selectedTemplate === tmpl.id
                        ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent',
                    )}
                  >
                    <div className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      selectedTemplate === tmpl.id ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-slate-100 dark:bg-slate-800',
                    )}>
                      <Icon size={13} className={selectedTemplate === tmpl.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-[12px] font-bold', selectedTemplate === tmpl.id ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300')}>{tmpl.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{tmpl.example}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Tone */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Tonalité</p>
              <div className="space-y-1.5">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={clsx(
                      'w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left',
                      tone === t.id
                        ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400',
                    )}
                  >
                    <span className="text-[13px]">{t.label.split(' ')[0]}</span>
                    <div>
                      <p className="text-[11px] font-bold">{t.label.split(' ').slice(1).join(' ')}</p>
                      <p className="text-[9px] opacity-60">{t.desc}</p>
                    </div>
                    {tone === t.id && <Check size={12} className="ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Langue de sortie</p>
              <div className="grid grid-cols-1 gap-1">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setTargetLang(l.id)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all',
                      targetLang === l.id
                        ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5',
                    )}
                  >
                    {l.label}
                    {targetLang === l.id && <Check size={11} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── CENTER: Context + Result ── */}
          <div className="col-span-6 space-y-4">

            {/* Context input */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                  {currentTemplate && (() => {
                    const Icon = currentTemplate.icon
                    return <Icon size={13} className="text-violet-600 dark:text-violet-400" />
                  })()}
                </div>
                <p className="text-[13px] font-bold text-slate-700 dark:text-cream">{currentTemplate?.label}</p>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contexte & informations</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={6}
                placeholder={`Décrivez votre contenu...\nExemple: ${currentTemplate?.example}`}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none font-mono leading-relaxed"
              />
              <div className="mt-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Notes supplémentaires (optionnel)</label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="ex: max 150 mots, insister sur l'exclusivité..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !context.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {loading
                  ? <><Sparkles size={14} className="animate-spin" /> Génération en cours…</>
                  : <><Wand2 size={14} /> Générer avec l'IA</>}
              </button>
            </div>

            {/* Result */}
            {(resultText || loading) && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Result header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-violet-50 dark:bg-violet-500/10">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-violet-600 dark:text-violet-400" />
                    <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">Contenu généré</span>
                    {wordCount && (
                      <span className="text-[10px] text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 rounded-full">
                        {wordCount} mots
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLiked('up')}
                      className={clsx('p-1.5 rounded-lg transition-colors', liked === 'up' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => setLiked('down')}
                      className={clsx('p-1.5 rounded-lg transition-colors', liked === 'down' ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
                    >
                      <ThumbsDown size={12} />
                    </button>
                    <button
                      onClick={handleCopy}
                      className={clsx(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                        copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
                      )}
                    >
                      {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 transition-colors"
                    >
                      <RefreshCw size={11} /> Regénérer
                    </button>
                  </div>
                </div>

                {loading && !resultText && (
                  <div className="p-8 flex items-center justify-center gap-3 text-violet-500">
                    <Sparkles size={18} className="animate-spin" />
                    <span className="text-[13px] font-medium">L'IA rédige votre contenu…</span>
                  </div>
                )}

                {resultText && (
                  <div className="p-5">
                    <pre className="whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                      {resultText}
                    </pre>
                  </div>
                )}

                {resultText && (
                  <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg hover:border-violet-300 transition-colors">
                      <Download size={11} /> Exporter .txt
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg hover:border-violet-300 transition-colors">
                      <Send size={11} /> Envoyer par Email
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                      <MessageSquare size={11} /> WhatsApp
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg hover:border-violet-300 transition-colors">
                      <Save size={11} /> Sauvegarder
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!resultText && !loading && (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
                <Wand2 size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-[13px]">Choisissez un type de contenu, renseignez le contexte et cliquez <strong>Générer</strong></p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Tips + History ── */}
          <div className="col-span-3 space-y-4">

            {/* AI Tips */}
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} />
                <p className="text-[12px] font-bold uppercase tracking-wider opacity-80">Conseils IA</p>
              </div>
              <div className="space-y-3">
                {[
                  'Plus le contexte est détaillé, meilleur est le résultat',
                  'Mentionnez les spécificités du groupe (VIP, famille, MICE)',
                  'Précisez la longueur souhaitée dans les notes',
                  'Pour Instagram, spécifiez le type de photo',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-violet-300 shrink-0 mt-0.5 text-[10px] font-black">{i + 1}.</span>
                    <p className="text-[11px] text-white/80 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Character targets */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Longueurs recommandées</p>
              <div className="space-y-2">
                {[
                  { format: 'Instagram caption', chars: '150-200 car.' },
                  { format: 'Facebook post',     chars: '100-300 car.' },
                  { format: 'Description hôtel', chars: '150-250 mots' },
                  { format: 'Email objet',        chars: '30-50 car.' },
                  { format: 'Newsletter section', chars: '80-120 mots' },
                  { format: 'Hashtags',           chars: '20-30 tags' },
                ].map(item => (
                  <div key={item.format} className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500">{item.format}</span>
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full">{item.chars}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick content ideas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">🎯 Idées rapides</p>
              <div className="space-y-1.5">
                {[
                  'Caption Merzouga au coucher de soleil',
                  'Email relance lead froid MICE',
                  'Description Riad Fes 5★ pour proposition',
                  'Post LinkedIn — tendances luxe 2026',
                  'Message WhatsApp confirmation groupe',
                ].map(idea => (
                  <button
                    key={idea}
                    onClick={() => setContext(idea)}
                    className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors group"
                  >
                    <Zap size={10} className="text-violet-400 shrink-0 group-hover:text-violet-600" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 group-hover:text-violet-700 dark:group-hover:text-violet-300">{idea}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* History panel */}
            {showHistory && history.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">📋 Historique de session</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setResultText(item.result)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.template}</span>
                        <span className="text-[9px] text-slate-400">{item.ts}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{item.result}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
