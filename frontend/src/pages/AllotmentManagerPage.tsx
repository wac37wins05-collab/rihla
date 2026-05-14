import { useState, useMemo } from 'react'
import {
  Hotel, ChevronRight, Lock, Unlock, Calendar,
  CheckCircle2, AlertTriangle, Clock,
  Bell, ChevronDown, ChevronUp, Wifi, WifiOff,
  Plus, Pencil, Trash2, X, Save, Loader2, Search,
  Filter, SlidersHorizontal, Building2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { allotmentsApi, type AllotmentRow } from '../lib/api'
import { ProjectPicker } from '@/components/projects/ProjectPicker'

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, {
  label: string; color: string; bgColor: string; borderColor: string; icon: any
}> = {
  blocked:   { label: 'Bloqué',   color: 'text-blue-600',    bgColor: 'bg-blue-50 dark:bg-blue-900/30',    borderColor: 'border-blue-200 dark:border-blue-800',    icon: Lock },
  confirmed: { label: 'Confirmé', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', borderColor: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  partial:   { label: 'Partiel',  color: 'text-amber-600',   bgColor: 'bg-amber-50 dark:bg-amber-900/30',   borderColor: 'border-amber-200 dark:border-amber-800',   icon: AlertTriangle },
  released:  { label: 'Libéré',  color: 'text-slate-500',   bgColor: 'bg-slate-50 dark:bg-white/10',       borderColor: 'border-slate-200 dark:border-white/10',    icon: Unlock },
  expired:   { label: 'Expiré',  color: 'text-red-600',     bgColor: 'bg-red-50 dark:bg-red-900/30',       borderColor: 'border-red-200 dark:border-red-800',       icon: Clock },
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK_DATA: AllotmentRow[] = [
  { id: 'a1', hotel_name: 'Riad Fes', city: 'Fès', category: '5★', check_in: '2026-06-10', check_out: '2026-06-13', rooms_blocked: 12, rooms_confirmed: 10, rooms_released: 0, deadline: '2026-05-25', status: 'confirmed', contract_id: 'CTR-2026-001', price_per_night: 1950, notes: 'Contrat saison haute', project_id: null },
  { id: 'a2', hotel_name: 'Movenpick Mansour Eddahbi', city: 'Marrakech', category: '5★', check_in: '2026-06-13', check_out: '2026-06-16', rooms_blocked: 12, rooms_confirmed: 8, rooms_released: 0, deadline: '2026-05-28', status: 'partial', contract_id: 'CTR-2026-002', price_per_night: 1800, notes: '', project_id: null },
  { id: 'a3', hotel_name: 'Bivouac de Luxe Merzouga', city: 'Merzouga', category: 'Luxe', check_in: '2026-06-16', check_out: '2026-06-17', rooms_blocked: 10, rooms_confirmed: 10, rooms_released: 0, deadline: '2026-06-01', status: 'confirmed', contract_id: 'CTR-2026-003', price_per_night: 2800, notes: 'Tentes privatives', project_id: null },
  { id: 'a4', hotel_name: 'Le Casablanca Hotel', city: 'Casablanca', category: '4★', check_in: '2026-06-10', check_out: '2026-06-11', rooms_blocked: 12, rooms_confirmed: 0, rooms_released: 0, deadline: '2026-05-20', status: 'blocked', contract_id: 'CTR-2026-004', price_per_night: 1400, notes: 'En attente confirmation devis', project_id: null },
  { id: 'a5', hotel_name: 'Lina Ryad & Spa', city: 'Chefchaouen', category: '4★', check_in: '2026-06-11', check_out: '2026-06-13', rooms_blocked: 12, rooms_confirmed: 0, rooms_released: 12, deadline: '2026-05-15', status: 'released', contract_id: 'CTR-2026-005', price_per_night: 1200, notes: "Client n'a pas confirmé à temps", project_id: null },
]

// ── Form blank ────────────────────────────────────────────────────────────────
const blankForm = (): Partial<AllotmentRow> => ({
  hotel_name: '', city: '', category: '', contract_id: '',
  check_in: '', check_out: '', deadline: '',
  rooms_blocked: 10, rooms_confirmed: 0, rooms_released: 0,
  price_per_night: 0, status: 'blocked', notes: '',
})

// ── AllotmentForm drawer ──────────────────────────────────────────────────────
function AllotmentFormDrawer({
  initial, projectId, onClose, onSaved,
}: {
  initial?: AllotmentRow | null
  projectId?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!initial?.id
  const [form, setForm] = useState<Partial<AllotmentRow>>(() =>
    initial ? { ...initial } : { ...blankForm(), project_id: projectId ?? undefined }
  )

  const set = (k: keyof AllotmentRow, v: any) => setForm(f => ({ ...f, [k]: v }))

  const saveMut = useMutation({
    mutationFn: () => isEdit
      ? allotmentsApi.update(initial!.id, form).then(r => r.data)
      : allotmentsApi.create({ ...form, project_id: projectId ?? undefined }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allotments'] })
      onSaved()
      onClose()
    },
  })

  const nights = form.check_in && form.check_out
    ? Math.max(0, Math.ceil((new Date(form.check_out!).getTime() - new Date(form.check_in!).getTime()) / 86400000))
    : 0
  const totalCost = (form.price_per_night ?? 0) * nights * (form.rooms_blocked ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allotement</div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {isEdit ? 'Modifier' : 'Nouvel allotement'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 p-6 space-y-5">
          {/* Hôtel */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nom de l'hôtel *</label>
            <input
              value={form.hotel_name ?? ''}
              onChange={e => set('hotel_name', e.target.value)}
              placeholder="ex: Riad Fes"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
            />
          </div>

          {/* Ville + Catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Ville *</label>
              <input
                value={form.city ?? ''}
                onChange={e => set('city', e.target.value)}
                placeholder="ex: Marrakech"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Catégorie</label>
              <select
                value={form.category ?? ''}
                onChange={e => set('category', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              >
                <option value="">—</option>
                <option value="3★">3★</option>
                <option value="4★">4★</option>
                <option value="5★">5★</option>
                <option value="Luxe">Luxe</option>
                <option value="Riad">Riad</option>
                <option value="Bivouac">Bivouac</option>
              </select>
            </div>
          </div>

          {/* Contrat */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Référence contrat</label>
            <input
              value={form.contract_id ?? ''}
              onChange={e => set('contract_id', e.target.value)}
              placeholder="ex: CTR-2026-001"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Check-in *</label>
              <input
                type="date"
                value={form.check_in ?? ''}
                onChange={e => set('check_in', e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Check-out *</label>
              <input
                type="date"
                value={form.check_out ?? ''}
                onChange={e => set('check_out', e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={e => set('deadline', e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-rihla/5 border border-rihla/20 rounded-xl px-4 py-2 text-[11px] text-rihla font-bold">
              {nights} nuit{nights > 1 ? 's' : ''}
            </div>
          )}

          {/* Chambres */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Bloquées *</label>
              <input
                type="number" min={0}
                value={form.rooms_blocked ?? ''}
                onChange={e => set('rooms_blocked', Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Confirmées</label>
              <input
                type="number" min={0}
                value={form.rooms_confirmed ?? ''}
                onChange={e => set('rooms_confirmed', Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Libérées</label>
              <input
                type="number" min={0}
                value={form.rooms_released ?? ''}
                onChange={e => set('rooms_released', Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
              />
            </div>
          </div>

          {/* Prix */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Prix par nuit (MAD) *</label>
            <input
              type="number" min={0}
              value={form.price_per_night ?? ''}
              onChange={e => set('price_per_night', Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
            />
            {totalCost > 0 && (
              <div className="mt-1 text-[11px] text-slate-400 font-medium">
                Coût total estimé: <span className="text-rihla font-black">{fmt(totalCost)} MAD</span>
              </div>
            )}
          </div>

          {/* Statut */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Statut</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(statusConfig) as [string, typeof statusConfig[string]][]).map(([key, sc]) => {
                const Icon = sc.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('status', key as AllotmentRow['status'])}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[9px] font-black uppercase transition-all',
                      form.status === key
                        ? `${sc.bgColor} ${sc.borderColor} ${sc.color}`
                        : 'border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    )}
                  >
                    <Icon size={14} />
                    {sc.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Conditions particulières, remarques..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/10 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.hotel_name || !form.city || !form.check_in || !form.check_out}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rihla text-white text-sm font-black shadow-lg shadow-rihla/20 hover:bg-rihla/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ allotment, onClose, onDeleted }: {
  allotment: AllotmentRow
  onClose: () => void
  onDeleted: () => void
}) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => allotmentsApi.remove(allotment.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allotments'] })
      onDeleted()
      onClose()
    },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Supprimer l'allotement?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-bold text-slate-700 dark:text-slate-300">{allotment.hotel_name}</span> — {allotment.city}<br/>
          Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            Annuler
          </button>
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-black shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 transition-all"
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AllotmentManagerPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AllotmentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AllotmentRow | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showTimeline, setShowTimeline] = useState(true)

  // ── Data ──────────────────────────────────────────────────────────
  const { data: liveRows = [], isFetching, isError } = useQuery({
    queryKey: ['allotments', projectId],
    queryFn: () => allotmentsApi.list(projectId ?? undefined).then(r => r.data),
    retry: 0,
  })

  const confirmMut = useMutation({
    mutationFn: (id: string) => allotmentsApi.confirm(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allotments'] }),
  })
  const releaseMut = useMutation({
    mutationFn: (id: string) => allotmentsApi.release(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allotments'] }),
  })

  const isLive = !isError && liveRows.length > 0
  const rawRows: AllotmentRow[] = isLive ? liveRows : MOCK_DATA

  // ── Filters ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rawRows.filter(a => {
      const matchStatus = filterStatus === 'all' || a.status === filterStatus
      const term = search.toLowerCase()
      const matchSearch = !term || a.hotel_name.toLowerCase().includes(term) || a.city.toLowerCase().includes(term) || (a.contract_id ?? '').toLowerCase().includes(term)
      return matchStatus && matchSearch
    })
  }, [rawRows, filterStatus, search])

  // ── Stats (from raw, not filtered) ───────────────────────────────
  const stats = useMemo(() => ({
    totalRooms:   rawRows.reduce((s, a) => s + a.rooms_blocked, 0),
    confirmed:    rawRows.reduce((s, a) => s + a.rooms_confirmed, 0),
    released:     rawRows.reduce((s, a) => s + a.rooms_released, 0),
    pending:      rawRows.reduce((s, a) => s + Math.max(0, a.rooms_blocked - a.rooms_confirmed - a.rooms_released), 0),
    totalCost:    rawRows.reduce((s, a) => {
      const nights = Math.max(0, Math.ceil((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 86400000))
      return s + a.price_per_night * nights * a.rooms_blocked
    }, 0),
    nearDeadline: rawRows.filter(a => {
      if (!a.deadline) return false
      const diff = (new Date(a.deadline).getTime() - Date.now()) / 86400000
      return diff > 0 && diff < 7 && a.status !== 'confirmed' && a.status !== 'released'
    }).length,
  }), [rawRows])

  // ── Timeline range ────────────────────────────────────────────────
  const timelineDates = useMemo(() => {
    if (!rawRows.length) return { min: new Date(), max: new Date(), range: 1 }
    const dates = rawRows.flatMap(a => [new Date(a.check_in), new Date(a.check_out)])
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    return { min, max, range: Math.max(1, max.getTime() - min.getTime()) }
  }, [rawRows])

  const openCreate = () => { setEditTarget(null); setDrawerOpen(true) }
  const openEdit = (row: AllotmentRow) => { setEditTarget(row); setDrawerOpen(true) }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Contracting <ChevronRight size={10} /> Allotements
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
              <Hotel className="text-rihla" size={32} />
              Gestion des Allotements
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium italic">
              Bloquer · confirmer · libérer les chambres hôtel par dossier
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && <Loader2 size={14} className="animate-spin text-slate-400" />}
            <span className={clsx(
              'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5',
              isLive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-white/10 text-slate-500',
            )}>
              {isLive ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isLive ? 'Live' : 'Démo'}
            </span>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-rihla text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-rihla/20 hover:bg-rihla/90 transition-all"
            >
              <Plus size={14} /> Nouvel allotement
            </button>
          </div>
        </div>

        {/* ── PROJECT PICKER ─────────────────────────────────────────── */}
        <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
          <Building2 size={16} className="text-slate-400 shrink-0" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Dossier</span>
          <div className="flex-1 max-w-xs">
            <ProjectPicker value={projectId} onChange={setProjectId} placeholder="Tous les dossiers" />
          </div>
          {projectId && (
            <button onClick={() => setProjectId(null)} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold transition-colors">
              Effacer
            </button>
          )}
        </div>

        {/* ── KPI CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Bloquées', value: stats.totalRooms, icon: Lock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Confirmées', value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Libérées', value: stats.released, icon: Unlock, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-white/5' },
            { label: 'Deadline < 7j', value: stats.nearDeadline, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Coût total', value: `${(stats.totalCost / 1000).toFixed(0)}k`, icon: Building2, color: 'text-rihla', bg: 'bg-rihla/5' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-2xl border border-transparent p-4 shadow-sm', s.bg)}>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                <s.icon size={12} className={s.color} /> {s.label}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── TIMELINE ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setShowTimeline(t => !t)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Vue Chronologique ({rawRows.length} hôtels)
            </span>
            {showTimeline ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showTimeline && (
            <div className="px-6 pb-6">
              <div className="relative" style={{ height: `${Math.max(80, rawRows.length * 40 + 20)}px` }}>
                {/* Axis line */}
                <div className="absolute top-0 bottom-5 left-0 right-0">
                  {rawRows.map((a, i) => {
                    const sc = statusConfig[a.status]
                    const startMs = new Date(a.check_in).getTime()
                    const endMs = new Date(a.check_out).getTime()
                    const left = ((startMs - timelineDates.min.getTime()) / timelineDates.range) * 100
                    const width = Math.max(3, ((endMs - startMs) / timelineDates.range) * 100)
                    const daysToDeadline = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000) : null
                    return (
                      <div
                        key={a.id}
                        className="absolute flex items-center"
                        style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(width, 100 - left)}%`, top: `${i * 40}px`, height: '32px' }}
                      >
                        <div
                          className={clsx('h-8 w-full rounded-lg flex items-center px-2 gap-1.5 cursor-pointer hover:brightness-95 transition-all border', sc.bgColor, sc.borderColor)}
                          title={`${a.hotel_name} · ${a.city}`}
                          onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        >
                          <span className={clsx('text-[9px] font-black truncate', sc.color)}>
                            {a.hotel_name.split(' ').slice(0, 2).join(' ')}
                          </span>
                          {daysToDeadline !== null && daysToDeadline > 0 && daysToDeadline < 7 && (
                            <Bell size={9} className="text-red-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Axis labels */}
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-medium">
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                  const d = new Date(timelineDates.min.getTime() + t * timelineDates.range)
                  return <span key={t}>{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── FILTERS BAR ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher hôtel, ville, contrat..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rihla/30 focus:border-rihla transition-all"
            />
          </div>
          <div className="flex items-center gap-1">
            <SlidersHorizontal size={14} className="text-slate-400" />
            {['all', 'blocked', 'confirmed', 'partial', 'released', 'expired'].map(s => {
              const sc = s !== 'all' ? statusConfig[s] : null
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all',
                    filterStatus === s
                      ? sc ? `${sc.bgColor} ${sc.color}` : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                  )}
                >
                  {s === 'all' ? 'Tous' : sc?.label}
                </button>
              )
            })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium shrink-0">
            {filtered.length} allotement{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── ALLOTMENT LIST ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-16 text-center">
              <Filter size={32} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">Aucun allotement trouvé</p>
              <p className="text-slate-400 text-[11px] mt-1">Modifiez les filtres ou créez un nouvel allotement</p>
            </div>
          )}

          {filtered.map(a => {
            const sc = statusConfig[a.status]
            const StatusIcon = sc.icon
            const nights = Math.max(0, Math.ceil((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 86400000))
            const totalCost = a.price_per_night * nights * a.rooms_blocked
            const occupancy = a.rooms_blocked > 0 ? (a.rooms_confirmed / a.rooms_blocked) * 100 : 0
            const daysToDeadline = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000) : null
            const isExpanded = expandedId === a.id
            const pendingRooms = Math.max(0, a.rooms_blocked - a.rooms_confirmed - a.rooms_released)

            return (
              <div
                key={a.id}
                className={clsx(
                  'bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden transition-all',
                  isExpanded
                    ? 'border-rihla/30 dark:border-rihla/20 shadow-rihla/10'
                    : 'border-slate-200 dark:border-white/10'
                )}
              >
                {/* Row header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', sc.bgColor)}>
                      <Hotel size={20} className={sc.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2 flex-wrap">
                        {a.hotel_name}
                        {a.category && <span className="text-[10px] text-rihla font-black">{a.category}</span>}
                        {daysToDeadline !== null && daysToDeadline > 0 && daysToDeadline < 7 && a.status !== 'confirmed' && a.status !== 'released' && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full text-[9px] font-black flex items-center gap-1">
                            <Bell size={8} /> {daysToDeadline}j
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {a.city} · {a.check_in} → {a.check_out} ({nights}n)
                        {a.contract_id && <span className="ml-2 text-slate-300 dark:text-slate-600">· {a.contract_id}</span>}
                      </div>
                      <span className={clsx('inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black', sc.bgColor, sc.color)}>
                        <StatusIcon size={9} /> {sc.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-black text-slate-400 uppercase">Chambres</div>
                      <div className="font-black text-slate-900 dark:text-white">
                        {a.rooms_confirmed}<span className="text-slate-400">/{a.rooms_blocked}</span>
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-[9px] font-black text-slate-400 uppercase">Coût</div>
                      <div className="font-black text-rihla text-sm">{fmt(totalCost)}<span className="text-[9px] ml-0.5">MAD</span></div>
                    </div>

                    {/* Quick actions (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(a)}
                        title="Modifier"
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-rihla"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        title="Supprimer"
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-white/5 p-5 space-y-4">
                    {/* Occupancy bar */}
                    <div>
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1.5">
                        <span>Taux d'occupation</span>
                        <span className="text-rihla">{occupancy.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(a.rooms_confirmed / Math.max(1, a.rooms_blocked)) * 100}%` }} />
                        <div className="h-full bg-slate-300 dark:bg-white/20 transition-all" style={{ width: `${(pendingRooms / Math.max(1, a.rooms_blocked)) * 100}%` }} />
                        <div className="h-full bg-slate-100 dark:bg-white/5 transition-all" style={{ width: `${(a.rooms_released / Math.max(1, a.rooms_blocked)) * 100}%` }} />
                      </div>
                      <div className="flex gap-4 mt-1.5">
                        <span className="text-[9px] text-emerald-600 font-bold">{a.rooms_confirmed} conf.</span>
                        <span className="text-[9px] text-slate-400 font-bold">{pendingRooms} att.</span>
                        <span className="text-[9px] text-slate-400 font-bold">{a.rooms_released} lib.</span>
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Prix/nuit</div>
                        <div className="text-sm font-black">{fmt(a.price_per_night)} <span className="text-[10px] font-medium">MAD</span></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Coût total</div>
                        <div className="text-sm font-black text-rihla">{fmt(totalCost)} <span className="text-[10px] font-medium">MAD</span></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Deadline</div>
                        <div className={clsx('text-sm font-black', daysToDeadline !== null && daysToDeadline < 7 && daysToDeadline > 0 ? 'text-red-500' : '')}>
                          {a.deadline ?? '—'}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Notes</div>
                        <div className="text-[11px] text-slate-500 font-medium">{a.notes || '—'}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      {a.status !== 'confirmed' && a.status !== 'released' && (
                        <button
                          onClick={() => confirmMut.mutate(a.id)}
                          disabled={confirmMut.isPending}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 transition-all"
                        >
                          {confirmMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Confirmer tout
                        </button>
                      )}
                      {a.status !== 'released' && a.status !== 'expired' && (
                        <button
                          onClick={() => releaseMut.mutate(a.id)}
                          disabled={releaseMut.isPending}
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-black hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 transition-all"
                        >
                          {releaseMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                          Libérer les non-confirmées
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(a)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-black hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                      >
                        <Pencil size={12} /> Modifier
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-[11px] font-black hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>

      {/* ── FORM DRAWER ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <AllotmentFormDrawer
          initial={editTarget}
          projectId={projectId}
          onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
          onSaved={() => qc.invalidateQueries({ queryKey: ['allotments'] })}
        />
      )}

      {/* ── DELETE CONFIRM ─────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirm
          allotment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => qc.invalidateQueries({ queryKey: ['allotments'] })}
        />
      )}
    </div>
  )
}
