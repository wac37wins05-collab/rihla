/**
 * RecordPaymentModal — Enregistrement d'un paiement client
 * Allocation FIFO automatique sur la/les factures sélectionnées
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import { billingPaymentsApi, fmtAmount, InvoiceSummary, PaymentMethod } from '@/lib/billingApi'

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'CHECK',         label: 'Chèque' },
  { value: 'CASH',          label: 'Espèces' },
  { value: 'CREDIT_CARD',   label: 'Carte bancaire' },
  { value: 'WIRE',          label: 'Swift / Wire' },
  { value: 'MOBILE',        label: 'Mobile Money' },
]

interface Props {
  invoice: InvoiceSummary
  onClose: () => void
}

export function RecordPaymentModal({ invoice, onClose }: Props) {
  const qc = useQueryClient()
  const amountDue = Number(invoice.amountDue)

  const [amount,    setAmount]    = useState(amountDue.toFixed(2))
  const [currency,  setCurrency]  = useState(invoice.currency)
  const [method,    setMethod]    = useState<PaymentMethod>('BANK_TRANSFER')
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      billingPaymentsApi.record({
        customerId: invoice.customerId,
        invoiceIds: [invoice.id],
        amount,
        currency,
        method,
        paymentDate: date,
        reference: reference || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      const alloc = Number(res.data.totalAllocated)
      setSuccess(
        `Paiement de ${fmtAmount(alloc, currency)} enregistré avec succès. ` +
        (res.data.fullyPaidInvoices.length > 0 ? '✓ Facture soldée.' : 'Paiement partiel.'),
      )
      setTimeout(onClose, 2200)
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? e.message ?? 'Erreur lors de l\'enregistrement')
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h2 className="font-bold text-ink dark:text-cream text-sm">Enregistrer un paiement</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Facture {invoice.invoiceNumber} · Solde : {fmtAmount(invoice.amountDue, invoice.currency)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Success overlay */}
          {success && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <CheckCircle size={14} /> {success}
            </div>
          )}

          {/* Amount + currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Montant reçu</label>
              <input
                type="number" min="0.01" step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 text-ink dark:text-cream"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Devise</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              >
                {['MAD', 'EUR', 'USD', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Mode de règlement</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
            >
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Date + reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Date de réception</label>
              <input
                type="date" value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Référence</label>
              <input
                type="text" value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="REF-20260509…"
                className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Notes</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Commentaire optionnel…"
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-ink dark:text-cream resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Allocation preview */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 text-xs">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Solde restant après paiement</span>
              <span className="font-mono font-bold text-ink dark:text-cream">
                {fmtAmount(Math.max(0, amountDue - Number(amount)), invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Statut attendu</span>
              <span className="font-semibold text-emerald-600">
                {Number(amount) >= amountDue ? '✓ SOLDÉE' : '⟳ PARTIELLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !!success}
            className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Enregistrement…' : 'Confirmer le paiement'}
          </button>
        </div>
      </div>
    </div>
  )
}
