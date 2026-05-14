import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, MessageSquare, Globe2, Instagram, Building2, Star, Zap,
  CheckCircle2, XCircle, TrendingUp, Clock, Filter, RefreshCw,
  ChevronRight, AlertTriangle, User, MapPin, Calendar, Banknote,
  Bot, Send, Bell, BarChart3, Kanban, Inbox, Copy, Phone,
  ArrowRight, Target, Flame, Award, ChevronDown, ChevronUp,
  MessageCircle, ThumbsUp, ThumbsDown, AlarmClock, CheckCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { crmApi, type CrmLead, type CrmLeadSource, type CrmLeadStatus } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'

// ─── Config ────────────────────────────────────────────────────────────────

const SOURCE_META: Record<CrmLeadSource, { label: string; icon: typeof Mail; color: string }> = {
  email:      { label: 'Email',       icon: Mail,          color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  webform:    { label: 'Webform',     icon: Globe2,        color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  whatsapp:   { label: 'WhatsApp',    icon: MessageSquare, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  instagram:  { label: 'Instagram',   icon: Instagram,     color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300' },
  portal_b2b: { label: 'Portail B2B', icon: Building2,     color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  salon:      { label: 'Salon',       icon: Star,          color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  referral:   { label: 'Référencement', icon: Zap,         color: 'bg-rihla/10 text-rihla' },
}

const STATUS_META: Record<CrmLeadStatus, { label: string; cls: string; pipelineColor: string }> = {
  new:       { label: 'Nouveau',   cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',         pipelineColor: 'border-t-sky-400' },
  qualified: { label: 'Qualifié',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', pipelineColor: 'border-t-amber-400' },
  converted: { label: 'Converti',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', pipelineColor: 'border-t-emerald-400' },
  spam:      { label: 'Spam',      cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',    pipelineColor: 'border-t-slate-400' },
  rejected:  { label: 'Rejeté',    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',    pipelineColor: 'border-t-rose-400' },
}

const NICHE_LABELS: Record<string, string> = {
  luxury: '💎 Luxe', mice: '🏢 MICE', honeymoon: '💑 Lune de miel',
  adventure: '🏔️ Aventure', family: '👨‍👩‍👧 Famille', cultural: '🏛️ Culturel',
}

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', ar: '🇲🇦',
}

const BREAKDOWN_LABELS: Record<string, string> = {
  base: 'Base', country: 'Pays', budget: 'Budget', season: 'Saison',
  niche: 'Niche', repeat_customer: 'Fidèle', source: 'Canal', lead_time: 'Délai départ',
}

// ─── AI Reply Templates ─────────────────────────────────────────────────────

const AI_REPLIES: Record<string, { label: string; icon: typeof Bot; body: string; tone: string }[]> = {
  luxury: [
    {
      label: 'Réponse Luxe Premium',
      icon: Star,
      tone: 'Raffiné',
      body: `Bonjour,\n\nNous avons bien reçu votre demande et sommes honorés de votre intérêt pour nos circuits haut de gamme au Maroc.\n\nNotre équipe Travel Designer dédiée au segment luxury prend en charge votre dossier. Vous recevrez une proposition personnalisée sous 24h, incluant hébergements 5★, transferts privés et expériences exclusives.\n\nÀ très bientôt,\nL'équipe S'TOURS`,
    },
    {
      label: 'Suivi rapide',
      icon: Zap,
      tone: 'Direct',
      body: `Bonjour,\n\nMerci pour votre demande ! Pourriez-vous confirmer :\n• Dates souhaitées ?\n• Nombre de personnes ?\n• Budget estimé ?\n\nCela nous permettra de vous préparer une offre sur-mesure.\n\nCordialement,\nL'équipe S'TOURS`,
    },
  ],
  mice: [
    {
      label: 'Réponse MICE Corporate',
      icon: Building2,
      tone: 'Professionnel',
      body: `Bonjour,\n\nMerci de nous contacter pour votre événement corporate au Maroc.\n\nNous disposons d'une expertise reconnue dans l'organisation de séminaires, incentives et team buildings. Notre devis MICE inclut : venue, hébergement, restauration, animations et logistique complète.\n\nNotre responsable MICE vous contacte sous 2h.\n\nCordialement,\nS'TOURS MICE Division`,
    },
  ],
  default: [
    {
      label: 'Accusé réception',
      icon: CheckCheck,
      tone: 'Neutre',
      body: `Bonjour,\n\nNous avons bien reçu votre demande concernant un voyage au Maroc.\n\nNous reviendrons vers vous très prochainement avec une proposition adaptée à vos souhaits.\n\nCordialement,\nL'équipe S'TOURS`,
    },
    {
      label: 'Qualification',
      icon: Target,
      tone: 'Consultif',
      body: `Bonjour,\n\nAfin de vous préparer la meilleure offre possible, nous aurions besoin de quelques informations complémentaires :\n\n1. Dates envisagées pour votre voyage ?\n2. Composition du groupe ?\n3. Vos centres d'intérêt principaux ?\n4. Budget approximatif par personne ?\n\nMerci de votre retour !\n\nL'équipe S'TOURS`,
    },
  ],
}

// ─── Follow-up reminders mock ────────────────────────────────────────────────

const MOCK_FOLLOWUPS = [
  { id: 'f1', leadId: 'mock', label: 'Relancer Youssef Alami', due: '2026-05-12', priority: 'high', done: false },
  { id: 'f2', leadId: 'mock', label: 'Envoyer devis MICE Safran Group', due: '2026-05-11', priority: 'urgent', done: false },
  { id: 'f3', leadId: 'mock', label: 'Confirmer dates Sarah K.', due: '2026-05-14', priority: 'normal', done: true },
]

const PRIORITY_FOLLOWUP: Record<string, { cls: string; dot: string }> = {
  urgent: { cls: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20', dot: 'bg-rose-500 animate-pulse' },
  high:   { cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
  normal: { cls: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (s: number) =>
  s >= 80 ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400'
  : s >= 60 ? 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400'
  : s >= 40 ? 'text-orange-600 bg-orange-100 dark:bg-orange-500/15 dark:text-orange-400'
  : 'text-rose-600 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400'

const fmtBudget = (b?: number | null) =>
  b ? `${new Intl.NumberFormat('fr-FR').format(Math.round(b))} €` : '—'

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'

const fmtDateFull = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Main Page ───────────────────────────────────────────────────────────────

type TabId = 'inbox' | 'pipeline' | 'analytics'

export function LeadInboxPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<CrmLeadStatus | ''>('')
  const [filterSource, setFilterSource] = useState<CrmLeadSource | ''>('')
  const [filterScoreMin, setFilterScoreMin] = useState(0)
  const [followups, setFollowups] = useState(MOCK_FOLLOWUPS)

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['crm', 'leads', filterStatus, filterSource, filterScoreMin],
    queryFn: () => crmApi.listLeads({
      status: filterStatus || undefined,
      source: filterSource || undefined,
      score_min: filterScoreMin > 0 ? filterScoreMin : undefined,
    }).then(r => r.data),
    refetchInterval: 30_000,
  })

  const seedMut = useMutation({
    mutationFn: () => crmApi.seedLeads().then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  })
  const qualifyMut = useMutation({
    mutationFn: (id: string) => crmApi.qualifyLead(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  })
  const convertMut = useMutation({
    mutationFn: (id: string) => crmApi.convertLead(id).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'leads'] }); qc.invalidateQueries({ queryKey: ['crm', 'accounts'] }) },
  })
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => crmApi.rejectLead(id, reason).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  })

  const selected = leads.find(l => l.id === selectedId)
  const sorted = useMemo(() => [...leads].sort((a, b) => b.score - a.score), [leads])

  const counts = useMemo(() => {
    const c = { new: 0, qualified: 0, converted: 0, rejected: 0, spam: 0 }
    leads.forEach(l => { if (l.status in c) (c as any)[l.status]++ })
    return c
  }, [leads])

  const conversionRate = leads.length > 0
    ? Math.round((counts.converted / leads.length) * 100)
    : 0

  const totalBudget = leads
    .filter(l => l.extracted_budget)
    .reduce((sum, l) => sum + (l.extracted_budget || 0), 0)

  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
    : 0

  const hotLeads = leads.filter(l => l.score >= 70 && l.status === 'new').length

  const TABS: { id: TabId; label: string; icon: typeof Inbox }[] = [
    { id: 'inbox',    label: 'Boîte de réception', icon: Inbox },
    { id: 'pipeline', label: 'Pipeline',            icon: Kanban },
    { id: 'analytics', label: 'Analytics',           icon: BarChart3 },
  ]

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-12">
      <PageHeader
        eyebrow="CRM · Leads"
        title="Lead Inbox"
        subtitle={`${leads.length} leads · ${counts.new} nouveaux · ${hotLeads} 🔥 chauds`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} className="btn btn-secondary btn-sm gap-2">
              <RefreshCw size={13} /> Actualiser
            </button>
            <button
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              className="btn btn-primary btn-sm gap-2"
            >
              <Zap size={13} /> {seedMut.isPending ? 'Chargement…' : 'Seed 12 leads démo'}
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-[1700px] mx-auto space-y-4">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(STATUS_META) as [CrmLeadStatus, any][]).map(([status, meta]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              className={clsx(
                'rounded-[16px] p-4 text-left border transition-all',
                filterStatus === status
                  ? 'ring-2 ring-rihla border-transparent bg-white dark:bg-slate-900'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rihla/40',
              )}
            >
              <p className="text-2xl font-extrabold text-slate-800 dark:text-cream">{counts[status]}</p>
              <p className={clsx('mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block', meta.cls)}>{meta.label}</p>
            </button>
          ))}
        </div>

        {/* Follow-up reminders bar */}
        {followups.filter(f => !f.done).length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-[16px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlarmClock size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {followups.filter(f => !f.done).length} Relances en attente
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {followups.filter(f => !f.done).map(f => (
                <div key={f.id} className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium',
                  PRIORITY_FOLLOWUP[f.priority].cls,
                )}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_FOLLOWUP[f.priority].dot)} />
                  <span>{f.label}</span>
                  <span className="opacity-60">· {fmtDate(f.due)}</span>
                  <button
                    onClick={() => setFollowups(prev => prev.map(x => x.id === f.id ? { ...x, done: true } : x))}
                    className="ml-1 hover:opacity-100 opacity-50"
                  >
                    <CheckCircle2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-1.5">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all',
                  tab === t.id
                    ? 'bg-rihla text-white shadow'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB: INBOX ── */}
        {tab === 'inbox' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] px-4 py-3">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[12px]"
              >
                <option value="">Toutes sources</option>
                {(Object.entries(SOURCE_META) as [CrmLeadSource, any][]).map(([s, m]) => (
                  <option key={s} value={s}>{m.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-500">Score min:</span>
                <input
                  type="range" min={0} max={90} step={10} value={filterScoreMin}
                  onChange={e => setFilterScoreMin(Number(e.target.value))}
                  className="w-24 accent-rihla"
                />
                <span className="text-[12px] font-bold text-rihla w-6">{filterScoreMin}</span>
              </div>
              {(filterStatus || filterSource || filterScoreMin > 0) && (
                <button onClick={() => { setFilterStatus(''); setFilterSource(''); setFilterScoreMin(0) }}
                  className="text-[11px] text-rose-500 hover:underline">
                  Réinitialiser
                </button>
              )}
              <span className="ml-auto text-[11px] text-slate-400">{sorted.length} résultats</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* LEFT: lead list */}
              <div className="lg:col-span-2 space-y-2">
                {isLoading && <div className="text-center py-12 text-slate-400">Chargement…</div>}
                {!isLoading && sorted.length === 0 && (
                  <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800">
                    <Mail size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">Aucun lead · Cliquez "Seed 12 leads démo"</p>
                  </div>
                )}
                {sorted.map(lead => {
                  const src = SOURCE_META[lead.source] ?? SOURCE_META.email
                  const SrcIcon = src.icon
                  const isHot = lead.score >= 70 && lead.status === 'new'
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedId(lead.id)}
                      className={clsx(
                        'w-full text-left rounded-[16px] border p-4 transition-all',
                        selectedId === lead.id
                          ? 'bg-rihla/5 border-rihla shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rihla/40',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', src.color)}>
                          <SrcIcon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[13px] text-slate-800 dark:text-cream truncate">
                              {isHot && <span className="mr-1">🔥</span>}
                              {lead.subject || '—'}
                            </p>
                            <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[11px] font-extrabold', scoreColor(lead.score))}>
                              {lead.score}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_META[lead.status].cls)}>
                              {STATUS_META[lead.status].label}
                            </span>
                            {lead.extracted_language && (
                              <span className="text-[12px]">{LANG_FLAGS[lead.extracted_language] || lead.extracted_language}</span>
                            )}
                            {lead.extracted_country && (
                              <span className="text-[10px] text-slate-400">{lead.extracted_country}</span>
                            )}
                            {lead.extracted_pax && (
                              <span className="text-[10px] text-slate-400">{lead.extracted_pax} pax</span>
                            )}
                            {lead.extracted_budget && (
                              <span className="text-[10px] font-bold text-rihla">{fmtBudget(lead.extracted_budget)}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* RIGHT: lead detail */}
              <div className="lg:col-span-3">
                {!selected ? (
                  <div className="h-full min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 border-dashed">
                    <div className="text-center">
                      <Mail size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 text-sm">Sélectionnez un lead</p>
                    </div>
                  </div>
                ) : (
                  <LeadDetail
                    lead={selected}
                    onQualify={() => qualifyMut.mutate(selected.id)}
                    onConvert={() => convertMut.mutate(selected.id)}
                    onReject={(reason) => rejectMut.mutate({ id: selected.id, reason })}
                    onAddFollowup={(label) => setFollowups(prev => [...prev, {
                      id: `f${Date.now()}`, leadId: selected.id, label, due: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], priority: 'high', done: false,
                    }])}
                    qualifying={qualifyMut.isPending}
                    converting={convertMut.isPending}
                    rejecting={rejectMut.isPending}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: PIPELINE ── */}
        {tab === 'pipeline' && (
          <PipelineView leads={leads} isLoading={isLoading} onSelect={(id) => { setSelectedId(id); setTab('inbox') }} />
        )}

        {/* ── TAB: ANALYTICS ── */}
        {tab === 'analytics' && (
          <AnalyticsView
            leads={leads}
            counts={counts}
            conversionRate={conversionRate}
            totalBudget={totalBudget}
            avgScore={avgScore}
          />
        )}
      </div>
    </div>
  )
}

// ─── Pipeline (Kanban columns) ───────────────────────────────────────────────

function PipelineView({ leads, isLoading, onSelect }: {
  leads: CrmLead[]
  isLoading: boolean
  onSelect: (id: string) => void
}) {
  const columns: CrmLeadStatus[] = ['new', 'qualified', 'converted', 'rejected']

  const byStatus = useMemo(() => {
    const map: Record<string, CrmLead[]> = {}
    columns.forEach(s => { map[s] = [] })
    leads.forEach(l => { if (map[l.status]) map[l.status].push(l) })
    return map
  }, [leads])

  const budgetByStatus = (status: CrmLeadStatus) =>
    byStatus[status].reduce((sum, l) => sum + (l.extracted_budget || 0), 0)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map(status => {
          const meta = STATUS_META[status]
          const col = byStatus[status]
          const budget = budgetByStatus(status)
          return (
            <div key={status} className={clsx(
              'w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] border-t-4 overflow-hidden',
              meta.pipelineColor,
            )}>
              {/* Column header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', meta.cls)}>{meta.label}</span>
                    <span className="text-[12px] font-bold text-slate-500">{col.length}</span>
                  </div>
                  {budget > 0 && (
                    <span className="text-[10px] font-bold text-rihla">{fmtBudget(budget)}</span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading && <div className="text-center py-8 text-slate-400 text-[12px]">Chargement…</div>}
                {!isLoading && col.length === 0 && (
                  <div className="text-center py-8 text-slate-300 dark:text-slate-600 text-[12px]">
                    Aucun lead
                  </div>
                )}
                {col.sort((a, b) => b.score - a.score).map(lead => {
                  const src = SOURCE_META[lead.source] ?? SOURCE_META.email
                  const SrcIcon = src.icon
                  return (
                    <button
                      key={lead.id}
                      onClick={() => onSelect(lead.id)}
                      className="w-full text-left bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-rihla/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[12px] font-bold text-slate-800 dark:text-cream leading-tight line-clamp-2">
                          {lead.score >= 70 && lead.status === 'new' ? '🔥 ' : ''}
                          {lead.subject || '—'}
                        </p>
                        <span className={clsx('shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold', scoreColor(lead.score))}>
                          {lead.score}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={clsx('w-5 h-5 rounded-lg flex items-center justify-center shrink-0', src.color)}>
                          <SrcIcon size={10} />
                        </div>
                        {lead.extracted_country && (
                          <span className="text-[10px] text-slate-400">{lead.extracted_country}</span>
                        )}
                        {lead.extracted_pax && (
                          <span className="text-[10px] text-slate-400">{lead.extracted_pax} pax</span>
                        )}
                        {lead.extracted_budget && (
                          <span className="text-[10px] font-bold text-rihla ml-auto">{fmtBudget(lead.extracted_budget)}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Analytics View ──────────────────────────────────────────────────────────

function AnalyticsView({ leads, counts, conversionRate, totalBudget, avgScore }: {
  leads: CrmLead[]
  counts: Record<CrmLeadStatus, number>
  conversionRate: number
  totalBudget: number
  avgScore: number
}) {
  // Source breakdown
  const bySource = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [leads])

  // Niche breakdown
  const byNiche = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach(l => { if (l.extracted_niche) map[l.extracted_niche] = (map[l.extracted_niche] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [leads])

  // Score distribution
  const scoreBands = useMemo(() => [
    { label: '80-100 🔥 Hot', min: 80, max: 100, color: 'bg-emerald-500' },
    { label: '60-79 ✅ Bon', min: 60, max: 79, color: 'bg-amber-500' },
    { label: '40-59 ⚠️ Moyen', min: 40, max: 59, color: 'bg-orange-400' },
    { label: '0-39 ❌ Froid', min: 0, max: 39, color: 'bg-rose-400' },
  ].map(b => ({ ...b, count: leads.filter(l => l.score >= b.min && l.score <= b.max).length })), [leads])

  const maxSource = bySource[0]?.[1] || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* KPI cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Taux de Conversion</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-cream">{conversionRate}%</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">{counts.converted} convertis / {leads.length} total</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rihla/10 flex items-center justify-center">
            <Banknote size={18} className="text-rihla" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Pipeline Budget</p>
            <p className="text-xl font-extrabold text-slate-800 dark:text-cream">{fmtBudget(totalBudget)}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Budget total déclaré par les leads</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
            <Target size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Score Moyen</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-cream">{avgScore}</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
          <div className={clsx('h-2 rounded-full transition-all', avgScore >= 60 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${avgScore}%` }} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
            <Flame size={18} className="text-rose-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Leads Chauds</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-cream">
              {leads.filter(l => l.score >= 70 && l.status === 'new').length}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Score ≥ 70 · Statut Nouveau</p>
      </div>

      {/* Funnel */}
      <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Entonnoir de Conversion</p>
        <div className="space-y-3">
          {(['new', 'qualified', 'converted'] as CrmLeadStatus[]).map((status, i) => {
            const total = leads.length || 1
            const pct = Math.round((counts[status] / total) * 100)
            const meta = STATUS_META[status]
            const widths = ['100%', `${Math.round((counts.qualified / (counts.new || 1)) * 100)}%`, `${Math.round((counts.converted / (counts.new || 1)) * 100)}%`]
            return (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', meta.cls)}>{meta.label}</span>
                  <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{counts[status]} leads ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={clsx('h-3 rounded-full transition-all', i === 0 ? 'bg-sky-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-400')}
                    style={{ width: widths[i] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Score distribution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Distribution des Scores</p>
        <div className="space-y-3">
          {scoreBands.map(band => {
            const pct = leads.length > 0 ? Math.round((band.count / leads.length) * 100) : 0
            return (
              <div key={band.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-slate-500">{band.label}</span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{band.count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className={clsx('h-2 rounded-full transition-all', band.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Source breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Leads par Source</p>
        <div className="space-y-3">
          {bySource.map(([source, count]) => {
            const meta = SOURCE_META[source as CrmLeadSource] ?? SOURCE_META.email
            const SrcIcon = meta.icon
            const pct = Math.round((count / maxSource) * 100)
            return (
              <div key={source} className="flex items-center gap-3">
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', meta.color)}>
                  <SrcIcon size={12} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{meta.label}</span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-cream">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="bg-rihla h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
          {bySource.length === 0 && <p className="text-[12px] text-slate-400 text-center py-4">Aucune donnée</p>}
        </div>
      </div>

      {/* Niche breakdown */}
      {byNiche.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Niches Populaires</p>
          <div className="space-y-3">
            {byNiche.map(([niche, count]) => (
              <div key={niche} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-600 dark:text-slate-300">{NICHE_LABELS[niche] || niche}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="bg-rihla h-1.5 rounded-full" style={{ width: `${Math.round((count / leads.length) * 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Lead Detail Panel ───────────────────────────────────────────────────────

function LeadDetail({
  lead, onQualify, onConvert, onReject, onAddFollowup,
  qualifying, converting, rejecting,
}: {
  lead: CrmLead
  onQualify: () => void
  onConvert: () => void
  onReject: (reason: string) => void
  onAddFollowup: (label: string) => void
  qualifying: boolean; converting: boolean; rejecting: boolean
}) {
  const [detailTab, setDetailTab] = useState<'info' | 'reply' | 'notes'>('info')
  const [selectedReply, setSelectedReply] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(true)
  const src = SOURCE_META[lead.source] ?? SOURCE_META.email
  const SrcIcon = src.icon
  const breakdown = lead.score_breakdown ?? {}
  const replies = AI_REPLIES[lead.extracted_niche || ''] ?? AI_REPLIES.default

  const handleSelectReply = (body: string) => {
    setSelectedReply(body)
    setReplyText(body)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(replyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const DETAIL_TABS = [
    { id: 'info' as const, label: 'Infos', icon: User },
    { id: 'reply' as const, label: 'Réponse IA', icon: Bot },
    { id: 'notes' as const, label: 'Relance', icon: Bell },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', src.color)}>
              <SrcIcon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{src.label}</p>
                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_META[lead.status].cls)}>
                  {STATUS_META[lead.status].label}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-cream mt-0.5 text-[15px]">{lead.subject || 'Lead sans sujet'}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Reçu le {fmtDate(lead.received_at || lead.created_at)}</p>
            </div>
          </div>
          <div className={clsx('w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-extrabold shrink-0', scoreColor(lead.score))}>
            <span className="text-xl">{lead.score}</span>
            <span className="text-[8px] uppercase tracking-wider opacity-70">Score</span>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-100 dark:border-white/5">
        {DETAIL_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setDetailTab(t.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold transition-all border-b-2',
                detailTab === t.id
                  ? 'border-rihla text-rihla'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
              )}
            >
              <Icon size={12} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── SUB-TAB: INFO ── */}
      {detailTab === 'info' && (
        <>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-100 dark:border-white/5">
            <Info icon={User} label="Contact" value={lead.extracted_email || lead.extracted_phone || '—'} />
            <Info icon={MapPin} label="Pays" value={lead.extracted_country ? `${LANG_FLAGS[lead.extracted_language || ''] || ''} ${lead.extracted_country}` : '—'} />
            <Info icon={TrendingUp} label="Pax" value={lead.extracted_pax ? `${lead.extracted_pax} pax` : '—'} />
            <Info icon={Banknote} label="Budget" value={fmtBudget(lead.extracted_budget)} />
            <Info icon={Calendar} label="Départ" value={lead.extracted_dates?.[0] ? fmtDate(lead.extracted_dates[0]) : '—'} />
            <Info icon={Star} label="Niche" value={NICHE_LABELS[lead.extracted_niche || ''] || '—'} />
            <Info icon={MapPin} label="Destinations" value={(lead.extracted_destinations || []).join(', ') || '—'} />
            <Info icon={Globe2} label="Langue" value={lead.extracted_language ? `${LANG_FLAGS[lead.extracted_language]} ${lead.extracted_language.toUpperCase()}` : '—'} />
          </div>

          {/* Score breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 hover:text-slate-600"
              >
                Détail du scoring
                {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showBreakdown && (
                <div className="space-y-2">
                  {Object.entries(breakdown).map(([key, val]) => {
                    const pct = Math.round(((val as number) / 20) * 100)
                    const isNeg = (val as number) < 0
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 w-28 shrink-0">{BREAKDOWN_LABELS[key] || key}</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', isNeg ? 'bg-rose-400' : 'bg-rihla')}
                            style={{ width: `${Math.abs(Math.min(pct, 100))}%` }}
                          />
                        </div>
                        <span className={clsx('text-[11px] font-bold w-8 text-right', isNeg ? 'text-rose-500' : 'text-rihla')}>
                          {(val as number) > 0 ? '+' : ''}{val}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {lead.body && (
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Message original</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-5">{lead.body}</p>
            </div>
          )}

          {/* Actions */}
          {(lead.status === 'new' || lead.status === 'qualified') ? (
            <div className="p-5 flex flex-wrap gap-2">
              {lead.status === 'new' && (
                <button onClick={onQualify} disabled={qualifying} className="btn btn-secondary btn-sm gap-2">
                  <CheckCircle2 size={13} className="text-amber-500" />
                  {qualifying ? 'Qualification…' : 'Qualifier'}
                </button>
              )}
              <button onClick={onConvert} disabled={converting} className="btn btn-primary btn-sm gap-2 flex-1">
                <TrendingUp size={13} />
                {converting ? 'Conversion…' : 'Convertir → Account + Deal'}
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Raison du rejet :') ?? 'Qualité insuffisante'
                  onReject(reason)
                }}
                disabled={rejecting}
                className="btn btn-sm gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
              >
                <XCircle size={13} />
                {rejecting ? 'Rejet…' : 'Rejeter'}
              </button>
            </div>
          ) : lead.status === 'converted' ? (
            <div className="p-5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} />
                <p className="text-[13px] font-bold">Lead converti en Account + Deal</p>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-center gap-2 text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
                <AlertTriangle size={16} />
                <p className="text-[13px]">{STATUS_META[lead.status].label}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SUB-TAB: AI REPLY ── */}
      {detailTab === 'reply' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl">
            <Bot size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
            <p className="text-[12px] text-violet-700 dark:text-violet-300">
              Réponses suggérées par l'IA selon le profil du lead
              {lead.extracted_niche && ` (niche: ${NICHE_LABELS[lead.extracted_niche] || lead.extracted_niche})`}
            </p>
          </div>

          {/* Reply templates */}
          <div className="space-y-2">
            {replies.map((reply, i) => {
              const Icon = reply.icon
              return (
                <button
                  key={i}
                  onClick={() => handleSelectReply(reply.body)}
                  className={clsx(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selectedReply === reply.body
                      ? 'border-rihla bg-rihla/5 ring-1 ring-rihla'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rihla/40 bg-slate-50 dark:bg-slate-800/50',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className="text-rihla" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{reply.label}</span>
                    <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{reply.tone}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{reply.body.split('\n')[2]}</p>
                </button>
              )
            })}
          </div>

          {/* Editable reply area */}
          {replyText && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Éditez avant d'envoyer</p>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rihla/50 resize-none font-mono leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={clsx(
                    'btn btn-sm gap-2 flex-1 transition-all',
                    copied ? 'bg-emerald-500 text-white' : 'btn-secondary',
                  )}
                >
                  {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button className="btn btn-primary btn-sm gap-2 flex-1">
                  <Send size={13} />
                  Envoyer par Email
                </button>
                {lead.source === 'whatsapp' && (
                  <button className="btn btn-sm gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Rate suggestions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-[11px] text-slate-400">Ces suggestions sont-elles utiles ?</span>
            <button className="flex items-center gap-1 text-[11px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">
              <ThumbsUp size={12} /> Oui
            </button>
            <button className="flex items-center gap-1 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors">
              <ThumbsDown size={12} /> Non
            </button>
          </div>
        </div>
      )}

      {/* ── SUB-TAB: FOLLOW-UP ── */}
      {detailTab === 'notes' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <AlarmClock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[12px] text-amber-700 dark:text-amber-300">
              Planifiez des relances pour ne jamais manquer un lead chaud
            </p>
          </div>

          {/* Quick follow-up chips */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Relances rapides</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Confirmer les dates',
                'Envoyer proposition',
                'Appel de qualification',
                'Relancer après devis',
                'Confirmer disponibilité guide',
                'Suivi paiement acompte',
              ].map(label => (
                <button
                  key={label}
                  onClick={() => onAddFollowup(label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-rihla/10 hover:text-rihla transition-all border border-transparent hover:border-rihla/20"
                >
                  <Bell size={10} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom follow-up */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Relance personnalisée</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Décrivez la relance…"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-rihla/50"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    onAddFollowup((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = ''
                  }
                }}
              />
              <button className="btn btn-primary btn-sm gap-1.5">
                <Bell size={13} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Lead contact info */}
          {(lead.extracted_email || lead.extracted_phone) && (
            <div className="border-t border-slate-100 dark:border-white/5 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Contacts</p>
              <div className="space-y-2">
                {lead.extracted_email && (
                  <a href={`mailto:${lead.extracted_email}`}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rihla/5 transition-colors group">
                    <Mail size={13} className="text-slate-400 group-hover:text-rihla" />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">{lead.extracted_email}</span>
                    <ArrowRight size={12} className="ml-auto text-slate-300 group-hover:text-rihla" />
                  </a>
                )}
                {lead.extracted_phone && (
                  <a href={`tel:${lead.extracted_phone}`}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rihla/5 transition-colors group">
                    <Phone size={13} className="text-slate-400 group-hover:text-rihla" />
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">{lead.extracted_phone}</span>
                    <ArrowRight size={12} className="ml-auto text-slate-300 group-hover:text-rihla" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[12px] font-bold text-slate-700 dark:text-cream">{value}</p>
      </div>
    </div>
  )
}
