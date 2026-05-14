/**
 * InvoicePage — Vue liste + gestion factures
 *
 * Données : NestJS Billing Engine (via billingInvoicesApi)
 * Garde aussi la compatibilité avec l'ancien invoicesApi FastAPI
 * pour la création depuis projet (fromProject).
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Download, FileText, CheckCircle,
  Clock, XCircle, Banknote, Send, AlertCircle,
} from 'lucide-react'
import { invoicesApi, projectsApi } from '@/lib/api'
import {
  billingInvoicesApi, billingPaymentsApi,
  fmtAmount, INV_STATUS_CONFIG,
  InvoiceSummary, InvoiceStatus,
} from '@/lib/billingApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner, SectionTitle } from '@/components/ui'
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal'
import { InvoiceDetailDrawer } from '@/components/billing/InvoiceDetailDrawer'
import { RecordPaymentModal } from '@/components/billing/RecordPaymentModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'

const fmtDate = (d?: string | null) => {
  if (!d) return '–'
  try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }) } catch { return d }
}

// Map new NestJS statuses → display config
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  ...INV_STATUS_CONFIG,
  // Legacy FastAPI statuses (fallback)
  draft:     { label: 'Brouillon', color: 'bg-slate-100 text-slate-500' },
  issued:    { label: 'Émise',     color: 'bg-amber-50 text-amber-700'  },
  sent:      { label: 'Envoyée',   color: 'bg-amber-50 text-amber-700'  },
  paid:      { label: 'Réglée',    color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Annulée',   color: 'bg-gray-100 text-gray-400'   },
}

function InvBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide', cfg.color)}>
      {cfg.label}
    </span>
  )
}

// ── Quick create from project (legacy) ────────────────────────────
function QuickCreateFromProject({
  projects,
  onCreated,
}: {
  projects: any[]
  onCreated: () => void
}) {
  const [projectId, setProjectId] = useState('')
  const [loading,   setLoading]   = useState(false)

  const handleCreate = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      await invoicesApi.fromProject(projectId)
      onCreated()
      setProjectId('')
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <select
          className="input-base"
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
        >
          <option value="">⚡ Créer depuis un projet existant…</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.client_name ? ` — ${p.client_name}` : ''}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleCreate}
        disabled={!projectId || loading}
        className="btn-primary"
      >
        {loading ? <Spinner size={14} className="text-warm" /> : <Plus size={14} />}
        Auto-créer
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export function InvoicePage() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('')
  const [showCreate,   setShowCreate]   = useState(false)
  const [selectedInv,  setSelectedInv]  = useState<InvoiceSummary | null>(null)
  const [payInv,       setPayInv]       = useState<InvoiceSummary | null>(null)
  const [downloading,  setDownloading]  = useState<string | null>(null)

  // ── Projects (for quick-create) ─────────────────────────────────
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 200 }).then(r => r.data?.items ?? []),
  })

  // ── Invoices from NestJS billing engine ─────────────────────────
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['billing-invoices', filterStatus],
    queryFn: () =>
      billingInvoicesApi.list({
        status: filterStatus || undefined,
        limit: 200,
      }).then(r => r.data),
  })

  const invoices: InvoiceSummary[] = invoicesData?.items ?? []

  // ── Mutations ───────────────────────────────────────────────────
  const sendMut = useMutation({
    mutationFn: (id: string) => billingInvoicesApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing-invoices'] }),
  })

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      billingInvoicesApi.void(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing-invoices'] }),
  })

  const handleSend = (inv: InvoiceSummary) => {
    if (confirm(`Envoyer la facture ${inv.invoiceNumber} ? (DRAFT → SENT)`)) {
      sendMut.mutate(inv.id)
    }
  }

  const handleVoid = (inv: InvoiceSummary) => {
    const reason = prompt(`Raison de l'annulation de ${inv.invoiceNumber} :`)
    if (reason) voidMut.mutate({ id: inv.id, reason })
  }

  const downloadPdf = async (inv: InvoiceSummary) => {
    setDownloading(inv.id)
    try {
      const res = await billingInvoicesApi.pdf(inv.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `Facture_${inv.invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF non disponible — service PDF bientôt activé.')
    } finally {
      setDownloading(null)
    }
  }

  // ── Stats ───────────────────────────────────────────────────────
  const total       = invoicesData?.total ?? 0
  const totalAmount = invoices.reduce((a, i) => a + Number(i.grandTotal), 0)
  const paid        = invoices.filter(i => i.status === 'PAID').length
  const paidAmount  = invoices
    .filter(i => i.status === 'PAID')
    .reduce((a, i) => a + Number(i.grandTotal), 0)
  const overdue     = invoices.filter(i => i.status === 'OVERDUE').length

  // Infer currency from first invoice
  const currency = invoices[0]?.currency ?? 'MAD'

  return (
    <div className="min-h-full">
      <PageHeader
        title="Facturation"
        subtitle="Gestion des factures · NestJS Billing Engine · TVA Maroc"
      />

      <div className="p-8">

        {/* Create bar */}
        <div className="card p-5 mb-6">
          <SectionTitle>Créer une facture</SectionTitle>
          <div className="flex items-center gap-4 mt-3">
            <QuickCreateFromProject
              projects={projects ?? []}
              onCreated={() => refetch()}
            />
            <div className="text-muted text-xs font-semibold">ou</div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-bordeaux text-warm rounded-brand text-xs font-bold hover:bg-bordeaux-dark transition-colors"
            >
              <Plus size={13} /> Facture manuelle (ERP)
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Factures totales',  value: total,                          sub: 'tous statuts',      icon: FileText    },
            { label: 'Montant total',     value: fmtAmount(totalAmount, currency),sub: 'TTC',               icon: Banknote    },
            { label: 'Réglées',           value: paid,                            sub: `/ ${total} factures`,icon: CheckCircle },
            { label: 'En retard',         value: overdue,                         sub: 'à relancer',        icon: AlertCircle },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-label text-muted">{label}</p>
                <div className="w-7 h-7 bg-warm border border-line rounded-brand flex items-center justify-center">
                  <Icon size={13} className="text-bordeaux" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-ink">{value}</p>
              <p className="text-xs text-muted mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(['', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-brand text-xs font-semibold transition-all',
                filterStatus === s
                  ? 'bg-bordeaux text-warm'
                  : 'text-muted hover:text-ink hover:bg-warm border border-transparent hover:border-line',
              )}
            >
              {s === '' ? 'Toutes' : INV_STATUS_CONFIG[s as InvoiceStatus]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-4 flex-1 bg-slate-200/70 dark:bg-white/5 rounded" />
                  <div className="h-4 w-24 bg-slate-200/70 dark:bg-white/5 rounded" />
                  <div className="h-4 w-20 bg-slate-200/70 dark:bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : !invoices.length ? (
            <div className="text-center py-12 text-muted">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Aucune facture{filterStatus ? ` avec statut "${filterStatus}"` : ''}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-xs font-semibold text-bordeaux hover:underline"
              >
                Créer la première facture →
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  {['Numéro','Client','Total TTC','Encaissé','Solde','Émission','Échéance','Statut',''].map(h => (
                    <th key={h} className="text-left text-label text-muted px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr
                    key={inv.id}
                    className="border-b border-line/50 hover:bg-warm/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedInv(inv)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-ink text-xs">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink text-xs truncate max-w-[130px]">{inv.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-ink text-xs">
                        {fmtAmount(inv.grandTotal, inv.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-mono text-xs',
                        Number(inv.amountPaid) > 0 ? 'text-emerald-600 font-bold' : 'text-muted',
                      )}>
                        {Number(inv.amountPaid) > 0 ? fmtAmount(inv.amountPaid, inv.currency) : '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-mono text-xs font-bold',
                        Number(inv.amountDue) > 0 ? 'text-amber-600' : 'text-emerald-600',
                      )}>
                        {fmtAmount(inv.amountDue, inv.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <InvBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Send */}
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSend(inv)}
                            disabled={sendMut.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                            title="Envoyer"
                          >
                            <Send size={10} /> Envoyer
                          </button>
                        )}
                        {/* Record payment */}
                        {['SENT', 'PARTIAL', 'OVERDUE'].includes(inv.status) && (
                          <button
                            onClick={() => setPayInv(inv)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                            title="Enregistrer paiement"
                          >
                            <Banknote size={10} /> Payer
                          </button>
                        )}
                        {/* Void */}
                        {['DRAFT', 'SENT', 'PARTIAL'].includes(inv.status) && (
                          <button
                            onClick={() => handleVoid(inv)}
                            disabled={voidMut.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-red-500 border border-red-200 rounded text-[10px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Annuler"
                          >
                            <XCircle size={10} /> Annuler
                          </button>
                        )}
                        {/* PDF */}
                        <button
                          onClick={() => downloadPdf(inv)}
                          disabled={downloading === inv.id}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-white rounded text-[10px] font-bold hover:bg-slate-900 transition-colors disabled:opacity-50"
                          title="Télécharger PDF"
                        >
                          {downloading === inv.id
                            ? <Spinner size={10} className="text-white" />
                            : <Download size={10} />}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateInvoiceModal onClose={() => { setShowCreate(false); refetch() }} />
      )}
      {selectedInv && (
        <InvoiceDetailDrawer
          invoiceId={selectedInv.id}
          summary={selectedInv}
          onClose={() => setSelectedInv(null)}
        />
      )}
      {payInv && (
        <RecordPaymentModal
          invoice={payInv}
          onClose={() => { setPayInv(null); refetch() }}
        />
      )}
    </div>
  )
}
