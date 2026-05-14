/**
 * InvoiceDetailDrawer — Panneau latéral : détail facture, lignes, paiements, actions
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Send, XCircle, Banknote, Download, Clock, ChevronRight,
  FileText, CheckCircle, History,
} from 'lucide-react'
import { billingInvoicesApi, fmtAmount, INV_STATUS_CONFIG, InvoiceSummary } from '@/lib/billingApi'
import { RecordPaymentModal } from './RecordPaymentModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d?: string | null) => {
  if (!d) return '–'
  try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }) } catch { return d }
}

interface Props {
  invoiceId: string
  summary: InvoiceSummary
  onClose: () => void
}

export function InvoiceDetailDrawer({ invoiceId, summary, onClose }: Props) {
  const qc = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [tab, setTab] = useState<'lines' | 'payments' | 'history'>('lines')

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['billing-invoice-detail', invoiceId],
    queryFn: () => billingInvoicesApi.get(invoiceId).then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['billing-invoice-history', invoiceId],
    queryFn: () => billingInvoicesApi.history(invoiceId).then(r => r.data),
    enabled: tab === 'history',
  })

  const sendMut = useMutation({
    mutationFn: () => billingInvoicesApi.send(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-invoice-detail', invoiceId] })
    },
  })

  const voidMut = useMutation({
    mutationFn: (reason: string) => billingInvoicesApi.void(invoiceId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-invoice-detail', invoiceId] })
    },
  })

  const handleVoid = () => {
    const reason = prompt('Raison de l\'annulation :')
    if (reason) voidMut.mutate(reason)
  }

  const handleSend = () => {
    if (confirm(`Envoyer la facture ${summary.invoiceNumber} ? Le statut passera à ENVOYÉE.`)) {
      sendMut.mutate()
    }
  }

  const statusCfg = INV_STATUS_CONFIG[summary.status] ?? INV_STATUS_CONFIG.DRAFT

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[540px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-black text-ink dark:text-cream text-base">
                {summary.invoiceNumber}
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-slate-500">{summary.customerName}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Émise le {fmtDate(summary.issueDate)}
              {summary.dueDate && ` · Échéance ${fmtDate(summary.dueDate)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Amount banner */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/10 border-b border-slate-100 dark:border-white/10">
          {[
            { label: 'Total TTC',   value: fmtAmount(summary.grandTotal, summary.currency),   color: 'text-ink dark:text-cream' },
            { label: 'Encaissé',    value: fmtAmount(summary.amountPaid, summary.currency),    color: 'text-emerald-600' },
            { label: 'Solde',       value: fmtAmount(summary.amountDue,  summary.currency),    color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
              <p className={`font-mono font-black text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          {summary.status === 'DRAFT' && (
            <button
              onClick={handleSend}
              disabled={sendMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <Send size={12} /> Envoyer
            </button>
          )}

          {['SENT', 'PARTIAL', 'OVERDUE'].includes(summary.status) && (
            <button
              onClick={() => setShowPayModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Banknote size={12} /> Enregistrer paiement
            </button>
          )}

          {['DRAFT', 'SENT', 'PARTIAL'].includes(summary.status) && (
            <button
              onClick={handleVoid}
              disabled={voidMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-red-200 dark:border-red-500/20"
            >
              <XCircle size={12} /> Annuler
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Télécharger PDF (bientôt disponible)"
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-white/10 px-6">
          {([
            { id: 'lines',    label: 'Lignes',    icon: FileText  },
            { id: 'payments', label: 'Paiements', icon: CheckCircle },
            { id: 'history',  label: 'Historique',icon: History   },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors
                ${tab === t.id
                  ? 'border-ink text-ink dark:border-cream dark:text-cream'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-white/5 rounded-lg" />
              ))}
            </div>
          )}

          {/* Lines tab */}
          {!isLoading && tab === 'lines' && invoice && (
            <div className="space-y-1">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_0.5fr_1fr_0.8fr_0.8fr] gap-2 text-[9px] font-black uppercase text-slate-400 px-3 py-1 tracking-widest">
                <span>Description</span>
                <span className="text-center">Qté</span>
                <span className="text-right">Prix HT</span>
                <span className="text-right">TVA</span>
                <span className="text-right">TTC</span>
              </div>

              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_0.5fr_1fr_0.8fr_0.8fr] gap-2 text-xs px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-ink dark:text-cream font-medium">{item.description}</span>
                  <span className="text-center text-slate-400 font-mono">{item.quantity}</span>
                  <span className="text-right font-mono text-slate-500">
                    {fmtAmount(item.subtotalExcl, invoice.currency)}
                  </span>
                  <span className="text-right font-mono text-amber-600">
                    {Number(item.taxRatePct).toFixed(0)}% · {fmtAmount(item.taxAmount, invoice.currency)}
                  </span>
                  <span className="text-right font-mono font-bold text-ink dark:text-cream">
                    {fmtAmount(item.subtotalIncl, invoice.currency)}
                  </span>
                </div>
              ))}

              {/* Tax breakdown */}
              {invoice.taxBreakdown?.byRate && invoice.taxBreakdown.byRate.length > 0 && (
                <div className="mt-4 border-t border-slate-100 dark:border-white/10 pt-4 space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Récapitulatif TVA</p>
                  {invoice.taxBreakdown.byRate.map((row, i) => (
                    <div key={i} className="flex justify-between text-xs px-3">
                      <span className="text-slate-500">TVA {Number(row.rate).toFixed(0)}%</span>
                      <span className="font-mono text-amber-600">+ {fmtAmount(row.taxAmount, invoice.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold px-3 pt-2 border-t border-slate-100 dark:border-white/10 mt-2">
                    <span className="text-ink dark:text-cream">Total TTC</span>
                    <span className="font-mono text-ink dark:text-cream">
                      {fmtAmount(invoice.grandTotal, invoice.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments tab */}
          {!isLoading && tab === 'payments' && invoice && (
            <div className="space-y-2">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun paiement enregistré</p>
              ) : invoice.payments.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink dark:text-cream">{p.payment.method}</p>
                      <p className="text-[10px] text-slate-400">
                        {fmtDate(p.payment.paymentDate)}
                        {p.payment.reference && ` · ${p.payment.reference}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-600">
                    {fmtAmount(p.allocatedAmount, invoice.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-2">
              {!history ? (
                <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun historique</p>
              ) : history.map((entry: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-ink dark:text-cream">{entry.action}</span>
                    {entry.notes && <span className="text-slate-400"> — {entry.notes}</span>}
                    <p className="text-slate-400 mt-0.5">
                      {entry.userEmail && `${entry.userEmail} · `}
                      {fmtDate(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <RecordPaymentModal
          invoice={summary}
          onClose={() => {
            setShowPayModal(false)
            qc.invalidateQueries({ queryKey: ['billing-invoice-detail', invoiceId] })
          }}
        />
      )}
    </>
  )
}
