/**
 * CreateInvoiceModal — Formulaire de création de facture
 * Lignes dynamiques, sélection TVA, multi-devise, aperçu totaux live
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { billingInvoicesApi, CreateInvoiceDto, CreateInvoiceItemDto, InvoiceType } from '@/lib/billingApi'

// ── Tax rate presets Morocco ──────────────────────────────────────
const TVA_PRESETS = [
  { label: 'Exonéré (0%)',  value: 0  },
  { label: 'TVA 7%',        value: 7  },
  { label: 'TVA 10%',       value: 10 },
  { label: 'TVA 14%',       value: 14 },
  { label: 'TVA 20%',       value: 20 },
]

const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP']
const INV_TYPES: { value: InvoiceType; label: string }[] = [
  { value: 'PROFORMA',         label: 'Proforma' },
  { value: 'FINAL',            label: 'Facture définitive' },
  { value: 'CREDIT_NOTE',      label: 'Avoir' },
  { value: 'RECEIPT',          label: 'Reçu' },
]

const EMPTY_ITEM: CreateInvoiceItemDto = {
  description: '',
  quantity: 1,
  unitPrice: '0',
  discountAmount: '0',
  taxRatePct: 20,
  isTaxInclusive: false,
}

interface Props {
  onClose: () => void
  defaultCustomerId?: string
}

function calcLineTotal(item: CreateInvoiceItemDto) {
  const sub = (Number(item.unitPrice) * item.quantity) - Number(item.discountAmount ?? 0)
  const tax = item.isTaxInclusive
    ? sub - sub / (1 + (item.taxRatePct ?? 0) / 100)
    : sub * ((item.taxRatePct ?? 0) / 100)
  const gross = item.isTaxInclusive ? sub : sub + tax
  return { sub: Math.max(0, sub), tax, gross }
}

export function CreateInvoiceModal({ onClose, defaultCustomerId }: Props) {
  const qc = useQueryClient()

  // ── Form state ─────────────────────────────────────────────────
  const [type,     setType]     = useState<InvoiceType>('PROFORMA')
  const [custId,   setCustId]   = useState(defaultCustomerId ?? '')
  const [currency, setCurrency] = useState('MAD')
  const [issueDate,setIssueDate]= useState(new Date().toISOString().slice(0, 10))
  const [dueDate,  setDueDate]  = useState('')
  const [notes,    setNotes]    = useState('')
  const [items,    setItems]    = useState<CreateInvoiceItemDto[]>([{ ...EMPTY_ITEM }])
  const [error,    setError]    = useState('')

  // ── Load CRM accounts as customer list ─────────────────────────
  const { data: customers } = useQuery({
    queryKey: ['crm-accounts-mini'],
    queryFn: () => fetch('/api/crm/accounts?limit=200').then(r => r.json()).then((d: any) => d.items ?? d),
    staleTime: 60_000,
  })

  // ── Computed totals ────────────────────────────────────────────
  const totals = items.reduce(
    (acc, item) => {
      const { sub, tax, gross } = calcLineTotal(item)
      return {
        subtotal: acc.subtotal + sub,
        tax: acc.tax + tax,
        grand: acc.grand + gross,
      }
    },
    { subtotal: 0, tax: 0, grand: 0 },
  )

  const fmt = (v: number) =>
    v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Item helpers ────────────────────────────────────────────────
  const updateItem = useCallback(
    (idx: number, field: keyof CreateInvoiceItemDto, value: any) => {
      setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    },
    [],
  )

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (idx: number) =>
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  // ── Submit ─────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (dto: CreateInvoiceDto) => billingInvoicesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      onClose()
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? e.message ?? 'Erreur lors de la création')
    },
  })

  const handleSubmit = () => {
    setError('')
    if (!custId) { setError('Sélectionnez un client'); return }
    if (items.some(i => !i.description.trim())) {
      setError('Toutes les lignes doivent avoir une description')
      return
    }

    const dto: CreateInvoiceDto = {
      type,
      customerId: custId,
      currency,
      issueDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      items: items.map(i => ({
        ...i,
        unitPrice: String(i.unitPrice),
        discountAmount: String(i.discountAmount ?? 0),
      })),
    }
    createMut.mutate(dto)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="font-bold text-ink dark:text-cream text-base">Nouvelle facture</h2>
            <p className="text-xs text-slate-400 mt-0.5">Billing Engine NestJS · TVA Maroc automatique</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Row 1: type + client + currency */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as InvoiceType)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              >
                {INV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Client</label>
              <select
                value={custId}
                onChange={e => setCustId(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              >
                <option value="">Sélectionner…</option>
                {customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Devise</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Date d'émission</label>
              <input
                type="date" value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Date d'échéance</label>
              <input
                type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase text-slate-400">Lignes de facture</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Plus size={13} /> Ajouter ligne
              </button>
            </div>

            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2fr_0.7fr_1fr_0.7fr_0.8fr_0.8fr_0.5fr] gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <span>Description</span>
                <span>Qté</span>
                <span>Prix unitaire</span>
                <span>Remise</span>
                <span>TVA</span>
                <span>Total TTC</span>
                <span></span>
              </div>

              {items.map((item, idx) => {
                const { gross } = calcLineTotal(item)
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[2fr_0.7fr_1fr_0.7fr_0.8fr_0.8fr_0.5fr] gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-white/5 items-center"
                  >
                    <input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="Description du service…"
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-ink dark:text-cream placeholder-slate-300"
                    />
                    <input
                      type="number" min="0.01" step="0.01"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-ink dark:text-cream text-center"
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-ink dark:text-cream text-right font-mono"
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={item.discountAmount ?? 0}
                      onChange={e => updateItem(idx, 'discountAmount', e.target.value)}
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-ink dark:text-cream text-right font-mono"
                    />
                    <select
                      value={item.taxRatePct ?? 20}
                      onChange={e => updateItem(idx, 'taxRatePct', Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-ink dark:text-cream"
                    >
                      {TVA_PRESETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <span className="text-xs font-mono font-bold text-ink dark:text-cream text-right">
                      {fmt(gross)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Notes / Conditions</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Conditions de paiement, remarques…"
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer — totals + submit */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50 dark:bg-white/5">
          <div className="flex gap-6 text-xs">
            <div>
              <span className="text-slate-400">HT</span>
              <span className="font-mono font-bold text-ink dark:text-cream ml-2">
                {fmt(totals.subtotal)} {currency}
              </span>
            </div>
            <div>
              <span className="text-slate-400">TVA</span>
              <span className="font-mono font-bold text-amber-600 ml-2">
                {fmt(totals.tax)} {currency}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold">TOTAL TTC</span>
              <span className="font-mono font-black text-ink dark:text-cream ml-2 text-sm">
                {fmt(totals.grand)} {currency}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending}
              className="px-6 py-2 rounded-lg text-xs font-black bg-ink text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {createMut.isPending ? 'Création…' : 'Créer la facture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
