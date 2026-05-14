import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Zap, ToggleLeft, ToggleRight, CheckCircle2,
  Clock, Users, Play, RefreshCw, ChevronRight, Eye,
  BarChart3, Settings, Plus, X, Send, MousePointer,
  ArrowRight, TrendingUp, Sparkles, Bot, Layers,
  Filter, Tag, AlertTriangle, Flame, Target,
} from 'lucide-react'
import clsx from 'clsx'
import { crmApi, type CrmNurturingSequence } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'

// ─── Config ──────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  account_created:          { label: 'Compte créé',      color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',           icon: Users },
  deposit_received:         { label: 'Acompte reçu',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: CheckCircle2 },
  trip_completed:           { label: 'Voyage terminé',   color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', icon: Flame },
  rfm_segment_hibernating:  { label: 'Segment Dormant',  color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',         icon: AlertTriangle },
}

const STEP_TYPE_ICON: Record<string, typeof Mail> = {
  email: Mail, task: CheckCircle2, delay: Clock,
}

const DEMO_SEQUENCES: CrmNurturingSequence[] = [
  { id: 's1', company_id: 'demo', name: 'Welcome Series', trigger: 'account_created', is_active: true,
    description: '4 emails sur 7 jours pour accueillir les nouveaux comptes.',
    steps: [
      { day: 0,  type: 'email', subject: 'Bienvenue chez S\'TOURS DMC Morocco 🇲🇦', template: 'welcome_1' },
      { day: 2,  type: 'email', subject: 'Nos meilleures destinations au Maroc', template: 'welcome_2' },
      { day: 4,  type: 'email', subject: 'Votre brochure S\'TOURS 2026 en exclusivité', template: 'welcome_3_brochure' },
      { day: 7,  type: 'email', subject: 'Prêt à planifier votre voyage ?', template: 'welcome_4_cta' },
    ], created_at: '2026-01-01' },
  { id: 's2', company_id: 'demo', name: 'Pre-trip Checklist', trigger: 'deposit_received', is_active: true,
    description: '3 emails de préparation à J-30 / J-14 / J-7.',
    steps: [
      { day: -30, type: 'email', subject: 'J-30 : Préparez votre voyage au Maroc 🧳', template: 'pretrip_j30' },
      { day: -14, type: 'email', subject: 'J-14 : Derniers préparatifs voyage', template: 'pretrip_j14' },
      { day: -7,  type: 'email', subject: 'J-7 : Votre guide pratique Maroc est prêt !', template: 'pretrip_j7' },
    ], created_at: '2026-01-01' },
  { id: 's3', company_id: 'demo', name: 'Post-trip Thank You', trigger: 'trip_completed', is_active: true,
    description: 'Email de remerciement J+1 après le voyage.',
    steps: [
      { day: 1, type: 'email', subject: 'Merci pour votre confiance ! 🌟', template: 'posttrip_thankyou' },
    ], created_at: '2026-01-01' },
  { id: 's4', company_id: 'demo', name: 'Cross-sell J+90', trigger: 'trip_completed', is_active: true,
    description: 'Offre d\'une autre destination 90 jours après le voyage.',
    steps: [
      { day: 90, type: 'email', subject: 'Et si vous (re)découvriez le Maroc ? ✨', template: 'crosssell_j90' },
    ], created_at: '2026-01-01' },
  { id: 's5', company_id: 'demo', name: 'Anniversary J+365', trigger: 'trip_completed', is_active: true,
    description: 'Email anniversaire 1 an du voyage.',
    steps: [
      { day: 365, type: 'email', subject: 'Il y a 1 an, vous étiez au Maroc… 🌙', template: 'anniversary_j365' },
    ], created_at: '2026-01-01' },
  { id: 's6', company_id: 'demo', name: 'Re-engagement Hibernating', trigger: 'rfm_segment_hibernating', is_active: false,
    description: 'Offre trimestrielle pour les comptes dormants.',
    steps: [
      { day: 0, type: 'email', subject: 'Vous nous manquez ! Une offre exclusive vous attend 💫', template: 'reengagement_hibernating' },
    ], created_at: '2026-01-01' },
]

const MOCK_STATS: Record<string, { total: number; running: number; open_rate: number; click_rate: number; unsub_rate: number; conversions: number }> = {
  s1: { total: 48, running: 12, open_rate: 72, click_rate: 28, unsub_rate: 1.2, conversions: 8 },
  s2: { total: 31, running: 8,  open_rate: 85, click_rate: 42, unsub_rate: 0.5, conversions: 14 },
  s3: { total: 29, running: 0,  open_rate: 91, click_rate: 35, unsub_rate: 0.3, conversions: 6 },
  s4: { total: 21, running: 0,  open_rate: 68, click_rate: 18, unsub_rate: 2.1, conversions: 3 },
  s5: { total: 14, running: 0,  open_rate: 74, click_rate: 22, unsub_rate: 0.8, conversions: 2 },
  s6: { total: 19, running: 4,  open_rate: 55, click_rate: 12, unsub_rate: 3.4, conversions: 1 },
}

// ─── Segments ────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { id: 'seg1', name: 'Nouveaux comptes', count: 23, color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', criteria: 'Créé < 30 jours', icon: Users },
  { id: 'seg2', name: 'Clients fidèles',  count: 41, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', criteria: 'Voyages ≥ 3', icon: Flame },
  { id: 'seg3', name: 'Leads chauds',     count: 12, color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', criteria: 'Score ≥ 70 · Statut qualifié', icon: Target },
  { id: 'seg4', name: 'Comptes dormants', count: 18, color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', criteria: 'Inactifs > 90 jours', icon: AlertTriangle },
  { id: 'seg5', name: 'MICE / Corporate', count: 9,  color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', criteria: 'Type = Corporate', icon: Layers },
]

// ─── Email Preview Templates ──────────────────────────────────────────────────

const EMAIL_PREVIEWS: Record<string, { subject: string; preview: string; cta: string }> = {
  welcome_1:    { subject: 'Bienvenue chez S\'TOURS DMC Morocco 🇲🇦', preview: 'Nous sommes ravis de vous accueillir parmi nos partenaires. Découvrez notre gamme complète de circuits au Maroc, de l\'Atlas au désert du Sahara, en passant par les médinas impériales.', cta: 'Voir nos circuits' },
  welcome_2:    { subject: 'Nos meilleures destinations au Maroc', preview: 'Marrakech, Fès, Chefchaouen, Merzouga… Chaque destination a sa magie. Notre équipe Travel Designer vous prépare des itinéraires sur-mesure.', cta: 'Explorer les destinations' },
  pretrip_j30:  { subject: 'J-30 : Préparez votre voyage au Maroc 🧳', preview: 'Plus qu\'un mois avant votre départ ! Voici notre checklist complète pour un voyage serein : documents, santé, monnaie, tenue vestimentaire…', cta: 'Télécharger la checklist' },
  posttrip_thankyou: { subject: 'Merci pour votre confiance ! 🌟', preview: 'Nous espérons que votre voyage au Maroc a été inoubliable. Votre avis nous est précieux — aidez-nous à améliorer nos services.', cta: 'Laisser un avis' },
  crosssell_j90:{ subject: 'Et si vous (re)découvriez le Maroc ? ✨', preview: 'Il y a 3 mois, vous avez vécu une expérience unique au Maroc. Nos nouvelles offres 2026 sont disponibles — découvrez des circuits encore plus exclusifs.', cta: 'Voir les offres 2026' },
  reengagement_hibernating: { subject: 'Vous nous manquez ! Une offre exclusive vous attend 💫', preview: 'Cela fait longtemps que nous n\'avons pas eu de vos nouvelles. Pour vous accueillir de nouveau, profitez de 10% de réduction sur votre prochain circuit.', cta: 'Profiter de l\'offre' },
}

type TabId = 'sequences' | 'segments' | 'analytics'

// ─── Main Page ───────────────────────────────────────────────────────────────

export function CrmNurturingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('sequences')
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)
  const [showNewSeqForm, setShowNewSeqForm] = useState(false)

  const { data: sequences } = useQuery({
    queryKey: ['crm', 'nurturing', 'sequences'],
    queryFn: () => crmApi.nurturingSequences().then(r => r.data),
  })

  const seedMut = useMutation({
    mutationFn: () => crmApi.nurturingSeedSequences().then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'nurturing'] }),
  })
  const toggleMut = useMutation({
    mutationFn: (id: string) => crmApi.nurturingToggle(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'nurturing'] }),
  })

  const seqs: CrmNurturingSequence[] = sequences ?? DEMO_SEQUENCES
  const activeCount = seqs.filter(s => s.is_active).length
  const totalRuns = Object.values(MOCK_STATS).reduce((s, r) => s + r.running, 0)
  const avgOpen = Math.round(Object.values(MOCK_STATS).reduce((s, r) => s + r.open_rate, 0) / Object.keys(MOCK_STATS).length)
  const totalConversions = Object.values(MOCK_STATS).reduce((s, r) => s + r.conversions, 0)

  const TABS: { id: TabId; label: string; icon: typeof Mail }[] = [
    { id: 'sequences', label: 'Séquences', icon: Mail },
    { id: 'segments',  label: 'Segments',  icon: Filter },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-12">
      <PageHeader
        eyebrow="CRM · Nurturing"
        title="Automatisation & Séquences"
        subtitle={`${activeCount} séquences actives · ${totalRuns} runs en cours · ${totalConversions} conversions ce mois`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowNewSeqForm(v => !v)} className="btn btn-primary btn-sm gap-2">
              <Plus size={13} /> Nouvelle séquence
            </button>
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="btn btn-secondary btn-sm gap-2">
              <Zap size={13} /> {seedMut.isPending ? 'Initialisation…' : 'Initialiser'}
            </button>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['crm', 'nurturing'] })} className="btn btn-secondary btn-sm">
              <RefreshCw size={13} />
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-[1400px] mx-auto space-y-4">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Séquences actives', value: activeCount, icon: Play, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400' },
            { label: 'Runs en cours',     value: totalRuns,   icon: Users, cls: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400' },
            { label: 'Open rate moyen',   value: `${avgOpen}%`, icon: Mail, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
            { label: 'Conversions mois',  value: totalConversions, icon: TrendingUp, cls: 'text-rihla bg-rihla/10' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', kpi.cls)}>
                <kpi.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-cream">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-1.5">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-bold transition-all',
                  tab === t.id ? 'bg-rihla text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* New Sequence Form */}
        {showNewSeqForm && (
          <NewSequenceForm onClose={() => setShowNewSeqForm(false)} />
        )}

        {/* ── TAB: SEQUENCES ── */}
        {tab === 'sequences' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seqs.map((seq, idx) => {
              const stats = MOCK_STATS[seq.id] ?? MOCK_STATS[`s${idx + 1}`] ?? { total: 0, running: 0, open_rate: 0, click_rate: 0, unsub_rate: 0, conversions: 0 }
              const trigger = TRIGGER_LABELS[seq.trigger] ?? { label: seq.trigger, color: 'bg-slate-100 text-slate-500', icon: Zap }
              const TriggerIcon = trigger.icon
              const isExpanded = expandedSeq === seq.id

              return (
                <div key={seq.id} className={clsx(
                  'bg-white dark:bg-slate-900 border rounded-[20px] overflow-hidden transition-all',
                  seq.is_active ? 'border-slate-200 dark:border-slate-800 hover:border-rihla/30' : 'border-dashed border-slate-200 dark:border-slate-700 opacity-75',
                )}>
                  {/* Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-extrabold text-slate-800 dark:text-cream">{seq.name}</h3>
                          <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', trigger.color)}>
                            <TriggerIcon size={10} />
                            {trigger.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500">{seq.description}</p>
                      </div>
                      <button
                        onClick={() => toggleMut.mutate(seq.id)}
                        disabled={toggleMut.isPending}
                        className={clsx('shrink-0 transition-colors', seq.is_active ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-400')}
                        title={seq.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {seq.is_active ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                      </button>
                    </div>

                    {/* Steps visual timeline */}
                    {seq.steps && seq.steps.length > 0 && (
                      <div className="flex gap-2 items-center overflow-x-auto pb-1">
                        {seq.steps.map((step: any, i: number) => {
                          const StepIcon = STEP_TYPE_ICON[step.type] ?? Mail
                          return (
                            <div key={i} className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setPreviewTemplate(step.template || null)}
                                className="flex flex-col items-center group"
                                title={step.subject}
                              >
                                <div className="w-8 h-8 rounded-full bg-rihla/10 text-rihla flex items-center justify-center group-hover:bg-rihla group-hover:text-white transition-all">
                                  <StepIcon size={13} />
                                </div>
                                <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                                  {step.day === 0 ? 'J0' : step.day > 0 ? `J+${step.day}` : `J${step.day}`}
                                </span>
                              </button>
                              {i < seq.steps!.length - 1 && (
                                <div className="flex flex-col items-center">
                                  <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                        <button
                          onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}
                          className="ml-1 text-[10px] text-rihla hover:underline font-bold shrink-0"
                        >
                          {isExpanded ? 'Réduire' : 'Voir détails'}
                        </button>
                      </div>
                    )}

                    {/* Expanded step list */}
                    {isExpanded && seq.steps && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                        {seq.steps.map((step: any, i: number) => {
                          const StepIcon = STEP_TYPE_ICON[step.type] ?? Mail
                          const preview = EMAIL_PREVIEWS[step.template]
                          return (
                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                              <div className="w-7 h-7 rounded-full bg-rihla/10 text-rihla flex items-center justify-center shrink-0 mt-0.5">
                                <StepIcon size={12} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-rihla">
                                    {step.day === 0 ? 'Immédiat' : step.day > 0 ? `J+${step.day}` : `J${step.day}`}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-cream truncate">{step.subject}</span>
                                </div>
                                {preview && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preview.preview}</p>
                                )}
                              </div>
                              {step.template && EMAIL_PREVIEWS[step.template] && (
                                <button
                                  onClick={() => setPreviewTemplate(step.template)}
                                  className="shrink-0 text-slate-400 hover:text-rihla transition-colors"
                                  title="Aperçu email"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">
                    {[
                      { label: 'Envoyés', value: stats.total, icon: Send },
                      { label: 'Open rate', value: `${stats.open_rate}%`, icon: Eye },
                      { label: 'Click rate', value: `${stats.click_rate}%`, icon: MousePointer },
                      { label: 'Conversions', value: stats.conversions, icon: TrendingUp },
                    ].map(s => {
                      const Icon = s.icon
                      return (
                        <div key={s.label} className="p-3 text-center">
                          <p className="text-[14px] font-extrabold text-slate-700 dark:text-cream">{s.value}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* A/B test badge */}
                  {(seq.id === 's1' || seq.id === 's2') && (
                    <div className="px-5 py-2 bg-violet-50 dark:bg-violet-500/10 border-t border-violet-200 dark:border-violet-500/20 flex items-center gap-2">
                      <Sparkles size={11} className="text-violet-600 dark:text-violet-400" />
                      <p className="text-[10px] text-violet-700 dark:text-violet-300 font-bold">Test A/B actif · Variante B en cours d'évaluation</p>
                    </div>
                  )}

                  {!seq.is_active && (
                    <div className="px-5 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-white/5">
                      <p className="text-[11px] text-slate-400 text-center">⏸ Séquence désactivée · Cliquez le toggle pour activer</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: SEGMENTS ── */}
        {tab === 'segments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SEGMENTS.map(seg => {
                const Icon = seg.icon
                const linkedSeqs = seqs.filter(s => {
                  if (seg.id === 'seg4') return s.trigger === 'rfm_segment_hibernating'
                  if (seg.id === 'seg1') return s.trigger === 'account_created'
                  return false
                })
                return (
                  <div key={seg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5 hover:border-rihla/30 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', seg.color)}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-cream">{seg.name}</p>
                          <p className="text-[10px] text-slate-400">{seg.criteria}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-cream">{seg.count}</p>
                        <p className="text-[9px] text-slate-400">contacts</p>
                      </div>
                    </div>

                    {linkedSeqs.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Séquences liées</p>
                        <div className="space-y-1">
                          {linkedSeqs.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                              <div className={clsx('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-emerald-400' : 'bg-slate-300')} />
                              <span className="text-[11px] text-slate-500">{s.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button className="mt-3 flex items-center gap-1.5 text-[11px] text-rihla font-bold hover:underline">
                      <Send size={11} />
                      Envoyer une campagne
                    </button>
                  </div>
                )
              })}

              {/* Add new segment */}
              <button className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-[20px] p-5 flex flex-col items-center justify-center gap-3 hover:border-rihla/40 transition-all text-slate-400 hover:text-rihla group min-h-[160px]">
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:border-rihla group-hover:bg-rihla/5 transition-all">
                  <Plus size={18} />
                </div>
                <span className="text-[12px] font-bold">Créer un segment</span>
              </button>
            </div>

            {/* Segment builder hint */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-white/10 rounded-[20px] p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rihla/20 flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-rihla" />
                </div>
                <div>
                  <p className="text-white font-bold mb-1">IA Segmentation — Suggestions automatiques</p>
                  <p className="text-slate-400 text-[12px] mb-3">Notre IA analyse votre base de contacts et identifie les segments à fort potentiel à cibler en priorité.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '🔥 12 leads qualifiés sans réponse depuis 5j',
                      '💎 8 clients VIP sans voyage depuis 6 mois',
                      '🏢 5 comptes corporate avec budget > 50k MAD',
                    ].map(suggestion => (
                      <div key={suggestion} className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-[11px] px-3 py-1.5 rounded-full hover:bg-white/10 cursor-pointer transition-colors">
                        {suggestion}
                        <ArrowRight size={10} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            {/* Per-sequence stats table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Performance par séquence</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      {['Séquence', 'Trigger', 'Envoyés', 'En cours', 'Open rate', 'Click rate', 'Désabon.', 'Conversions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {seqs.map((seq, idx) => {
                      const stats = MOCK_STATS[seq.id] ?? MOCK_STATS[`s${idx + 1}`] ?? { total: 0, running: 0, open_rate: 0, click_rate: 0, unsub_rate: 0, conversions: 0 }
                      const trigger = TRIGGER_LABELS[seq.trigger]
                      return (
                        <tr key={seq.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={clsx('w-1.5 h-1.5 rounded-full', seq.is_active ? 'bg-emerald-400' : 'bg-slate-300')} />
                              <span className="font-bold text-slate-800 dark:text-cream">{seq.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', trigger?.color ?? 'bg-slate-100 text-slate-500')}>
                              {trigger?.label ?? seq.trigger}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{stats.total}</td>
                          <td className="px-4 py-3">
                            {stats.running > 0
                              ? <span className="flex items-center gap-1 text-sky-600 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />{stats.running}</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${stats.open_rate}%` }} />
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{stats.open_rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-rihla h-1.5 rounded-full" style={{ width: `${stats.click_rate}%` }} />
                              </div>
                              <span className="font-bold text-rihla">{stats.click_rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('font-bold', stats.unsub_rate > 2 ? 'text-rose-500' : 'text-slate-500')}>
                              {stats.unsub_rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{stats.conversions}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Best performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">🏆 Meilleur Open Rate</p>
                {seqs.sort((a, b) => (MOCK_STATS[b.id]?.open_rate ?? 0) - (MOCK_STATS[a.id]?.open_rate ?? 0)).slice(0, 3).map((seq, i) => (
                  <div key={seq.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-4">#{i + 1}</span>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{seq.name}</span>
                    </div>
                    <span className="text-[12px] font-black text-amber-500">{MOCK_STATS[seq.id]?.open_rate}%</span>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">🎯 Meilleur Click Rate</p>
                {seqs.sort((a, b) => (MOCK_STATS[b.id]?.click_rate ?? 0) - (MOCK_STATS[a.id]?.click_rate ?? 0)).slice(0, 3).map((seq, i) => (
                  <div key={seq.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-4">#{i + 1}</span>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{seq.name}</span>
                    </div>
                    <span className="text-[12px] font-black text-rihla">{MOCK_STATS[seq.id]?.click_rate}%</span>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">✅ Meilleures Conversions</p>
                {seqs.sort((a, b) => (MOCK_STATS[b.id]?.conversions ?? 0) - (MOCK_STATS[a.id]?.conversions ?? 0)).slice(0, 3).map((seq, i) => (
                  <div key={seq.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-4">#{i + 1}</span>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{seq.name}</span>
                    </div>
                    <span className="text-[12px] font-black text-emerald-500">{MOCK_STATS[seq.id]?.conversions}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {previewTemplate && EMAIL_PREVIEWS[previewTemplate] && (
        <EmailPreviewModal
          template={EMAIL_PREVIEWS[previewTemplate]}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  )
}

// ─── New Sequence Form ────────────────────────────────────────────────────────

function NewSequenceForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('account_created')

  return (
    <div className="bg-white dark:bg-slate-900 border border-rihla/30 rounded-[20px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-rihla" />
          <p className="font-bold text-slate-800 dark:text-cream">Nouvelle séquence de nurturing</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nom de la séquence</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex: VIP Onboarding 2026"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-rihla/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Déclencheur</label>
          <select
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-rihla/50"
          >
            {Object.entries(TRIGGER_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn btn-secondary btn-sm">Annuler</button>
        <button className="btn btn-primary btn-sm gap-2" disabled={!name}>
          <Sparkles size={12} />
          Créer avec l'IA
        </button>
      </div>
    </div>
  )
}

// ─── Email Preview Modal ─────────────────────────────────────────────────────

function EmailPreviewModal({ template, onClose }: {
  template: { subject: string; preview: string; cta: string }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Email header bar */}
        <div className="bg-slate-100 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aperçu Email</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        {/* Email content */}
        <div className="p-6">
          <div className="mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Objet</p>
            <p className="text-[14px] font-bold text-slate-800 dark:text-cream">{template.subject}</p>
          </div>
          {/* Mock email body */}
          <div className="space-y-4">
            <div className="w-32 h-8 bg-rihla/20 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-[10px] font-black text-rihla uppercase tracking-widest">S'TOURS</span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{template.preview}</p>
            <div className="text-center">
              <button className="px-6 py-2.5 bg-rihla text-white text-[13px] font-bold rounded-xl hover:bg-rihla/90 transition-colors">
                {template.cta} →
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[10px] text-slate-400">S'TOURS DMC Morocco · Marrakech, Maroc</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                <a href="#" className="hover:underline">Se désabonner</a> · <a href="#" className="hover:underline">Voir en ligne</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
