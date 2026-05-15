/**
 * CrmPipelineDmcPage — 10-stage DMC Kanban with @dnd-kit drag-and-drop.
 * Stages: brief_received → brief_qualified → quote_v1 → follow_up_j2 →
 *         follow_up_j5 → quote_v2 → decision_pending → deposit_received →
 *         ops_in_progress → completed_nps_sent
 */
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  TrendingUp, Clock, CheckCircle2, ArrowRight, RefreshCw,
  GripVertical, X, Plane, Users, Plus, Banknote, BarChart2,
  Star, Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { crmApi, type CrmDeal } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'

/* ─── Stage config ───────────────────────────────────────────────────────── */

const DMC_STAGES = [
  { id: 'brief_received',     label: 'Brief reçu',          dot: 'bg-slate-400',    border: 'border-t-slate-400',    pill: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',   col: 'bg-slate-50 dark:bg-slate-900/60',     prob: 10  },
  { id: 'brief_qualified',    label: 'Brief qualifié',      dot: 'bg-sky-400',      border: 'border-t-sky-400',      pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',         col: 'bg-sky-50/60 dark:bg-sky-950/30',      prob: 20  },
  { id: 'quote_v1_sent',      label: 'Cotation V1',         dot: 'bg-violet-400',   border: 'border-t-violet-400',   pill: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400', col: 'bg-violet-50/60 dark:bg-violet-950/30', prob: 35 },
  { id: 'follow_up_j2',       label: 'Relance J+2',         dot: 'bg-indigo-400',   border: 'border-t-indigo-400',   pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400', col: 'bg-indigo-50/60 dark:bg-indigo-950/30', prob: 40 },
  { id: 'follow_up_j5',       label: 'Relance J+5',         dot: 'bg-amber-400',    border: 'border-t-amber-400',    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',   col: 'bg-amber-50/60 dark:bg-amber-950/30',  prob: 50  },
  { id: 'quote_v2_sent',      label: 'Cotation V2',         dot: 'bg-orange-400',   border: 'border-t-orange-400',   pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', col: 'bg-orange-50/60 dark:bg-orange-950/30', prob: 60 },
  { id: 'decision_pending',   label: 'Décision / Acompte',  dot: 'bg-rose-400',     border: 'border-t-rose-400',     pill: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',       col: 'bg-rose-50/60 dark:bg-rose-950/30',    prob: 75  },
  { id: 'deposit_received',   label: 'Acompte reçu ✓',     dot: 'bg-emerald-400',  border: 'border-t-emerald-400',  pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', col: 'bg-emerald-50/60 dark:bg-emerald-950/30', prob: 90 },
  { id: 'ops_in_progress',    label: 'Opérations live',     dot: 'bg-teal-400',     border: 'border-t-teal-400',     pill: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',       col: 'bg-teal-50/60 dark:bg-teal-950/30',    prob: 95  },
  { id: 'completed_nps_sent', label: 'Voyage réalisé 🌟',   dot: 'bg-rihla',        border: 'border-t-rihla',        pill: 'bg-rihla/10 text-rihla',                                                  col: 'bg-rihla/5 dark:bg-rihla/10',          prob: 100 },
] as const

type DmcStageId = typeof DMC_STAGES[number]['id']

/* ─── Demo data ──────────────────────────────────────────────────────────── */

const DEMO_DEALS: Partial<CrmDeal>[] = [
  { id: 'd1',  title: 'Thomas Cook UK — Circuit Sud 10j',    dmc_stage: 'brief_received',     amount_mad: 185000, pax: 22, destination: 'Marrakech → Sahara',     probability: 10  },
  { id: 'd2',  title: 'Voyages Lumière — Luxe Maroc 12j',   dmc_stage: 'quote_v1_sent',      amount_mad: 320000, pax: 4,  destination: 'Fes, Rabat, Marrakech',  probability: 35  },
  { id: 'd3',  title: 'Wanderlust DE — MICE Atlas 5j',       dmc_stage: 'decision_pending',   amount_mad: 540000, pax: 35, destination: 'Atlas, Marrakech',       probability: 75  },
  { id: 'd4',  title: 'Sarah J. — Honeymoon 8j',             dmc_stage: 'deposit_received',   amount_mad: 95000,  pax: 2,  destination: 'Chefchaouen, Essaouira', probability: 90  },
  { id: 'd5',  title: 'Horizon CA — Aventure 7j',            dmc_stage: 'quote_v2_sent',      amount_mad: 210000, pax: 20, destination: 'Sahara, Atlas, Agadir',  probability: 60  },
  { id: 'd6',  title: 'Family Mueller — Circuit Nord 9j',    dmc_stage: 'brief_qualified',    amount_mad: 72000,  pax: 6,  destination: 'Fes, Meknès, Chefchaouen', probability: 20 },
  { id: 'd7',  title: 'Grupo España — Culturel 6j',          dmc_stage: 'follow_up_j2',       amount_mad: 58000,  pax: 8,  destination: 'Fes, Rabat, Casablanca', probability: 40  },
  { id: 'd8',  title: 'Bianchi IT — Cultural 5j',            dmc_stage: 'completed_nps_sent', amount_mad: 43000,  pax: 3,  destination: 'Fes, Rabat',             probability: 100 },
  { id: 'd9',  title: 'Horizon AU — Découverte 8j',          dmc_stage: 'ops_in_progress',    amount_mad: 88000,  pax: 2,  destination: 'Marrakech, Ouarzazate',  probability: 95  },
  { id: 'd10', title: 'Nordic Travel — Aventure 4j',         dmc_stage: 'follow_up_j5',       amount_mad: 134000, pax: 12, destination: 'Zagora, Sahara',         probability: 50  },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtMad  = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'

function stageOf(deal: Partial<CrmDeal>): string {
  return (deal.dmc_stage as string) || (deal as any).stage || 'brief_received'
}

/* ─── ProbBadge ──────────────────────────────────────────────────────────── */

function ProbBadge({ prob }: { prob: number }) {
  const cls =
    prob >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : prob >= 60 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
    : prob >= 35 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
  return (
    <span className={clsx('text-[9px] font-black px-1.5 py-0.5 rounded-full', cls)}>
      {prob}%
    </span>
  )
}

/* ─── DealCard (sortable) ────────────────────────────────────────────────── */

function DealCard({
  deal, onClick, overlay = false,
}: {
  deal: Partial<CrmDeal>
  onClick?: () => void
  overlay?: boolean
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: deal.id! })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const ageInStage = (deal as any).entered_stage_at
    ? Math.floor((Date.now() - new Date((deal as any).entered_stage_at).getTime()) / 86400000)
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={clsx(
        'bg-white dark:bg-slate-900 rounded-[12px] p-3 border border-slate-100',
        'dark:border-slate-800 select-none transition-all',
        isDragging && !overlay ? 'opacity-40 scale-95' : '',
        overlay ? 'shadow-2xl rotate-2 scale-105 cursor-grabbing' : 'shadow-sm hover:shadow-md hover:border-rihla/40',
        !overlay ? 'cursor-grab' : '',
      )}
      onClick={!overlay ? onClick : undefined}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <span
          {...listeners}
          className="text-slate-300 hover:text-slate-400 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={12} />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-slate-800 dark:text-cream leading-tight line-clamp-2">
            {deal.title}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
            {deal.destination && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Plane size={9} /> {deal.destination}
              </span>
            )}
            {deal.pax && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Users size={9} /> {deal.pax}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] font-extrabold text-rihla">
              {fmtMad(deal.amount_mad || 0)}
            </p>
            <div className="flex items-center gap-1">
              <ProbBadge prob={deal.probability || 0} />
              {ageInStage !== null && (
                <span className={clsx(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                  ageInStage > 7
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                )}>
                  <Clock size={8} /> {ageInStage}j
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── KanbanColumn ───────────────────────────────────────────────────────── */

function KanbanColumn({
  stage,
  deals,
  onDealClick,
  isOver,
}: {
  stage: typeof DMC_STAGES[number]
  deals: Partial<CrmDeal>[]
  onDealClick: (deal: Partial<CrmDeal>) => void
  isOver: boolean
}) {
  const stageValue = deals.reduce((s, d) => s + (d.amount_mad || 0), 0)
  const dealIds = deals.map(d => d.id!)

  return (
    <div
      className={clsx(
        'w-[260px] flex-shrink-0 rounded-[18px] border-t-4 border border-slate-200',
        'dark:border-slate-800 overflow-hidden flex flex-col transition-colors',
        stage.border,
        stage.col,
        isOver && 'ring-2 ring-rihla/40 ring-offset-0',
      )}
    >
      {/* Column header */}
      <div className="px-3 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={clsx('w-2 h-2 rounded-full', stage.dot)} />
            <p className="text-[11px] font-bold text-slate-700 dark:text-cream leading-tight">
              {stage.label}
            </p>
          </div>
          <span className={clsx('text-[10px] font-extrabold rounded-full px-1.5 py-0.5', stage.pill)}>
            {deals.length}
          </span>
        </div>
        {stageValue > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            {fmtMad(stageValue)} MAD
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="px-2 pb-3 flex-1 min-h-[100px] space-y-2">
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className={clsx(
            'border-2 border-dashed rounded-xl text-center py-6 text-[11px] font-medium transition-colors',
            isOver
              ? 'border-rihla/40 text-rihla bg-rihla/5'
              : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600',
          )}>
            {isOver ? 'Déposer ici' : 'Vide'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── AddDealModal ───────────────────────────────────────────────────────── */

function AddDealModal({
  accounts,
  creating,
  onClose,
  onAdd,
}: {
  accounts: { id: string; name: string }[]
  creating?: boolean
  onClose: () => void
  onAdd: (accountId: string, d: Partial<CrmDeal>) => void
}) {
  const [title, setTitle]       = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [amount, setAmount]     = useState('')
  const [pax, setPax]           = useState('')
  const [dest, setDest]         = useState('')
  const [stage, setStage]       = useState<DmcStageId>('brief_received')
  const [prob, setProb]         = useState(10)

  const submit = () => {
    if (!title.trim() || !accountId) return
    onAdd(accountId, {
      title: title.trim(),
      amount_mad: parseFloat(amount) || 0,
      pax: parseInt(pax) || undefined,
      destination: dest || undefined,
      stage: 'qualification',
      dmc_stage: stage,
      probability: prob,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-cream flex items-center gap-2">
              <Plus size={18} className="text-rihla" /> Nouveau deal
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre du deal *"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
          />

          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
          >
            <option value="">Compte CRM *</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>

          {/* Amount + PAX */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Montant MAD"
              type="number"
              className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
            />
            <input
              value={pax}
              onChange={e => setPax(e.target.value)}
              placeholder="Pax"
              type="number"
              className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
            />
          </div>

          {/* Destination */}
          <input
            value={dest}
            onChange={e => setDest(e.target.value)}
            placeholder="Destination"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
          />

          {/* Stage */}
          <select
            value={stage}
            onChange={e => setStage(e.target.value as DmcStageId)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rihla/40"
          >
            {DMC_STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          {/* Probability slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500">Probabilité</span>
              <ProbBadge prob={prob} />
            </div>
            <input
              type="range"
              min={0} max={100} step={5}
              value={prob}
              onChange={e => setProb(parseInt(e.target.value))}
              className="w-full accent-rihla"
            />
          </div>

          <button
            onClick={submit}
            disabled={!title.trim() || !accountId || creating}
            className="w-full py-3 bg-rihla text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {creating ? 'Création…' : 'Créer le deal'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── DealModal ──────────────────────────────────────────────────────────── */

function DealModal({
  deal, onClose, onMove, moving,
}: {
  deal: Partial<CrmDeal>
  onClose: () => void
  onMove: (stage: string) => void
  moving: boolean
}) {
  const [targetStage, setTargetStage] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deal DMC</p>
              <h3 className="font-extrabold text-slate-800 dark:text-cream mt-0.5">{deal.title}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Montant',        value: `${fmtMad(deal.amount_mad || 0)} MAD`, accent: 'text-rihla' },
              { label: 'Pax',            value: String(deal.pax || '—'),                accent: '' },
              { label: 'Destination',    value: deal.destination || '—',               accent: '' },
              { label: 'Probabilité',    value: `${deal.probability || 0}%`,            accent: '' },
              { label: 'Départ prévu',   value: fmtDate((deal as any).expected_departure_at), accent: '' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">{label}</p>
                <p className={clsx('font-extrabold text-[13px] mt-0.5', accent || 'text-slate-700 dark:text-cream')}>{value}</p>
              </div>
            ))}
          </div>

          {/* Move stage */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Déplacer vers</p>
            <div className="flex gap-2">
              <select
                value={targetStage}
                onChange={e => setTargetStage(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] font-medium"
              >
                <option value="">— Choisir —</option>
                {DMC_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <button
                disabled={!targetStage || moving}
                onClick={() => onMove(targetStage)}
                className="btn btn-primary btn-sm gap-2 px-4"
              >
                <ArrowRight size={14} />
                {moving ? '…' : 'OK'}
              </button>
            </div>
          </div>

          {/* Stage history */}
          {(deal as any).stage_history?.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Historique</p>
              <ol className="space-y-1">
                {(deal as any).stage_history.slice(-5).map((h: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                    <span>{h.stage}</span>
                    <span className="text-slate-300 text-[10px]">{fmtDate(h.entered_at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export function CrmPipelineDmcPage() {
  const qc = useQueryClient()

  // State
  const [deals, setDeals] = useState<Partial<CrmDeal>[]>(DEMO_DEALS)
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [overId,        setOverId]        = useState<string | null>(null)
  const [selectedDeal,  setSelectedDeal]  = useState<Partial<CrmDeal> | null>(null)
  const [showFunnel,    setShowFunnel]    = useState(false)
  const [showAddModal,  setShowAddModal]  = useState(false)

  // Sensors: pointer with 8px activation distance (prevents accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const loadPipelineDeals = (data: any) => {
    const serverDeals = data?.columns?.flatMap((column: { deals?: CrmDeal[] }) => column.deals ?? []) ?? []
    setDeals(serverDeals)
  }

  // Server query (falls back to demo until the API returns)
  const { data: pipeline } = useQuery({
    queryKey: ['crm', 'pipeline-dmc'],
    queryFn: () => crmApi.pipelineDmc().then(r => r.data),
    onSuccess: loadPipelineDeals,
  } as any)

  const { data: accounts = [] } = useQuery({
    queryKey: ['crm', 'accounts', 'pipeline-create'],
    queryFn: () => crmApi.listAccounts().then(r => r.data),
  })

  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      crmApi.moveStage(id, { stage }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'pipeline-dmc'] }),
  })

  const createMut = useMutation({
    mutationFn: ({ accountId, deal }: { accountId: string; deal: Partial<CrmDeal> }) =>
      crmApi.createDeal(accountId, deal).then(r => r.data),
    onSuccess: async () => {
      const refreshed = await crmApi.pipelineDmc().then(r => r.data)
      loadPipelineDeals(refreshed)
      qc.invalidateQueries({ queryKey: ['crm', 'pipeline-dmc'] })
      setShowAddModal(false)
    },
  })

  // Derived
  const activeCard   = activeId ? deals.find(d => d.id === activeId) : null
  const totalValue   = deals.reduce((s, d) => s + (d.amount_mad || 0), 0)
  const weightedVal  = deals.reduce((s, d) => s + (d.amount_mad || 0) * (d.probability || 0) / 100, 0)
  const activeDeals  = deals.filter(d => !['completed_nps_sent'].includes(stageOf(d))).length
  const wonDeals     = deals.filter(d => stageOf(d) === 'completed_nps_sent').length

  const dealsByStage = useCallback((stageId: string) =>
    deals.filter(d => stageOf(d) === stageId), [deals])

  /* ─── DnD handlers ─────────────────────────────────────────────────────── */

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over?.id as string ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setOverId(null)
    if (!over) return

    const draggedDealId = active.id as string
    const overId        = over.id as string

    // Determine target stage: if over a stage column id → that stage; else find the deal's stage
    const isStageTarget = DMC_STAGES.some(s => s.id === overId)
    let targetStage: string

    if (isStageTarget) {
      targetStage = overId
    } else {
      // over is a deal id — find its stage
      const overDeal = deals.find(d => d.id === overId)
      if (!overDeal) return
      targetStage = stageOf(overDeal)
    }

    const draggedDeal = deals.find(d => d.id === draggedDealId)
    if (!draggedDeal || stageOf(draggedDeal) === targetStage) return

    // Optimistic update
    setDeals(prev =>
      prev.map(d => d.id === draggedDealId
        ? { ...d, dmc_stage: targetStage as DmcStageId }
        : d,
      ),
    )

    // Server sync
    moveMut.mutate({ id: draggedDealId, stage: targetStage })
  }

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-12">
      <PageHeader
        eyebrow="CRM · Pipeline"
        title="Pipeline DMC — 10 étapes"
        subtitle={`${deals.length} deals · ${fmtMad(totalValue)} MAD pipeline · ${fmtMad(weightedVal)} MAD pondéré`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus size={13} /> Nouveau deal
            </button>
            <button
              onClick={() => setShowFunnel(v => !v)}
              className={clsx('btn btn-sm gap-2', showFunnel ? 'btn-primary' : 'btn-secondary')}
            >
              <BarChart2 size={13} /> Funnel
            </button>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['crm'] })}
              className="btn btn-secondary btn-sm"
              title="Actualiser"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 max-w-[1900px] mx-auto space-y-4">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Deals actifs',       value: activeDeals,                  icon: Zap,      color: 'text-rihla'       },
            { label: 'Pipeline total',     value: `${fmtMad(totalValue)} MAD`,  icon: Banknote, color: 'text-emerald-500' },
            { label: 'Pipeline pondéré',   value: `${fmtMad(weightedVal)} MAD`, icon: TrendingUp, color: 'text-amber-500' },
            { label: 'Voyages réalisés',   value: wonDeals,                     icon: Star,     color: 'text-violet-500'  },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Icon size={16} className={kpi.color} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                  <p className={clsx('text-xl font-extrabold', kpi.color)}>{kpi.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Funnel */}
        {showFunnel && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-[13px] text-slate-700 dark:text-cream mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-rihla" /> Funnel de conversion par étape
            </h3>
            {/* Pipeline value bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-3">
              {DMC_STAGES.map(stage => {
                const val = dealsByStage(stage.id).reduce((s, d) => s + (d.amount_mad || 0), 0)
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                if (pct < 0.5) return null
                return (
                  <div
                    key={stage.id}
                    className={clsx('h-full transition-all', stage.dot)}
                    style={{ width: `${pct}%` }}
                    title={`${stage.label}: ${fmtMad(val)} MAD`}
                  />
                )
              })}
            </div>
            {/* Deal count bars */}
            <div className="flex items-end gap-1.5 h-20">
              {DMC_STAGES.map(stage => {
                const count = dealsByStage(stage.id).length
                const maxC  = Math.max(...DMC_STAGES.map(s => dealsByStage(s.id).length), 1)
                const pct   = Math.round(count / maxC * 100)
                return (
                  <div key={stage.id} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold text-slate-500">{count || ''}</span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t relative" style={{ height: '60px' }}>
                      <div
                        className={clsx('absolute bottom-0 left-0 right-0 rounded-t transition-all', stage.dot)}
                        style={{ height: `${pct}%`, opacity: 0.8 }}
                      />
                    </div>
                    <p className="text-[8px] text-slate-400 text-center leading-tight mt-0.5 truncate w-full px-0.5">
                      {stage.label.split(' ')[0]}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Kanban board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4 -mx-1 px-1">
            <div className="flex gap-3 min-w-max">
              {DMC_STAGES.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  deals={dealsByStage(stage.id)}
                  onDealClick={setSelectedDeal}
                  isOver={overId === stage.id}
                />
              ))}
            </div>
          </div>

          {/* Floating drag preview */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeCard && (
              <DealCard deal={activeCard} overlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddDealModal
          accounts={accounts.map(account => ({ id: account.id, name: account.name }))}
          creating={createMut.isPending}
          onClose={() => setShowAddModal(false)}
          onAdd={(accountId, deal) => createMut.mutate({ accountId, deal })}
        />
      )}

      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onMove={(stage) => {
            if (selectedDeal.id) {
              setDeals(prev =>
                prev.map(d => d.id === selectedDeal.id
                  ? { ...d, dmc_stage: stage as DmcStageId }
                  : d,
                ),
              )
              moveMut.mutate({ id: selectedDeal.id, stage })
              setSelectedDeal(null)
            }
          }}
          moving={moveMut.isPending}
        />
      )}
    </div>
  )
}
