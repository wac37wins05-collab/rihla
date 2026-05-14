import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, RefreshCw, FileText,
  Mail, X, Sliders, TrendingUp, CheckCircle, Loader2,
  Send, AlertCircle,
} from 'lucide-react'
import { quotationsApi, projectsApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge, Spinner, PriceDisplay, SectionTitle } from '@/components/ui'
import { QuotationsListSkeleton } from '@/components/ui/Skeleton'
import { MarginCalculator } from '@/components/analytics/SalesIntelligence'

const CATEGORIES = [
  { value: 'hotel',       label: '🏨 Hôtel',      unit: 'room' },
  { value: 'restaurant',  label: '🍽 Restaurant',  unit: 'pax' },
  { value: 'monument',    label: '🏛 Monument',    unit: 'pax' },
  { value: 'transport',   label: '🚌 Transport',   unit: 'group' },
  { value: 'guide',       label: '🧭 Guide',       unit: 'group' },
  { value: 'activity',    label: '🐪 Activité',    unit: 'pax' },
  { value: 'misc',        label: '📦 Divers',      unit: 'pax' },
]

const CURRENCY_SYM: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' }

function fmt(v: number | string | null | undefined, currency = 'EUR') {
  if (v == null) return '–'
  const num = typeof v === 'string' ? parseFloat(v) : v
  const sym = CURRENCY_SYM[currency] ?? currency
  return `${sym} ${new Intl.NumberFormat('fr-FR').format(Math.round(num))}`
}

export function QuotationsPage() {
  const qc = useQueryClient()
  const [selectedProject, setSelectedProject] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [pax, setPax] = useState(20)
  const [margin, setMargin] = useState(10)
  const [newLine, setNewLine] = useState({
    category: 'hotel', label: '', city: '', unit_cost: 0, quantity: 1, unit: 'room', day_number: 1,
  })
  const [calcResult, setCalcResult] = useState<any>(null)

  // What-if
  const [showWhatIf, setShowWhatIf] = useState(false)
  const [wiPax, setWiPax] = useState(20)
  const [wiMargin, setWiMargin] = useState(18)
  const [wiRate, setWiRate] = useState(10.8)
  const [wiResult, setWiResult] = useState<any>(null)

  // Email modal
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailName, setEmailName] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailLang, setEmailLang] = useState<'fr'|'en'>('fr')
  const [emailSent, setEmailSent] = useState(false)

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data?.items ?? []),
    staleTime: 30_000,
  })

  const { data: quotation, isLoading: quotLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => quotationsApi.get(quotationId).then(r => r.data),
    enabled: !!quotationId,
  })

  const createQuotation = useMutation({
    mutationFn: (data: any) => quotationsApi.create(data),
    onSuccess: (res) => {
      setQuotationId(res.data.id)
      qc.invalidateQueries({ queryKey: ['quotation'] })
    },
  })

  const addLine = useMutation({
    mutationFn: (data: any) => quotationsApi.addLine(quotationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', quotationId] })
      setNewLine({ category: 'hotel', label: '', city: '', unit_cost: 0, quantity: 1, unit: 'room', day_number: 1 })
    },
  })

  const recalc = useMutation({
    mutationFn: () => quotationsApi.recalculate(quotationId, pax),
    onSuccess: (res) => {
      setCalcResult(res.data)
      qc.invalidateQueries({ queryKey: ['quotation', quotationId] })
    },
  })

  const updateMargin = useMutation({
    mutationFn: () => quotationsApi.update(quotationId, { margin_pct: margin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotation', quotationId] }),
  })

  // PDF download
  const downloadPdf = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('stours_token') ?? ''
      const resp = await fetch(`/api/pdf/quotation/${quotationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(`PDF error ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devis_stours_${quotationId}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    },
  })

  // What-if simulation
  const whatIfMut = useMutation({
    mutationFn: () => quotationsApi.whatIf(quotationId, {
      pax: wiPax, margin_pct: wiMargin, exchange_rate: wiRate,
    }),
    onSuccess: res => setWiResult(res.data),
  })

  // Send email
  const sendEmailMut = useMutation({
    mutationFn: () => quotationsApi.sendEmail(quotationId, {
      recipient_email: emailTo,
      recipient_name: emailName,
      message: emailMsg,
      language: emailLang,
    }),
    onSuccess: () => {
      setEmailSent(true)
      setTimeout(() => { setShowEmail(false); setEmailSent(false) }, 3000)
    },
  })

  const currency = quotation?.currency ?? 'EUR'

  return (
    <div className="min-h-full">
      <PageHeader
        title="Moteur de cotation"
        subtitle="Calcul déterministe · Règle QA : somme des lignes = totaux affichés"
        actions={
          quotationId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowWhatIf(true); setWiPax(pax); setWiMargin(margin); setWiResult(null) }}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Sliders size={13} /> What-if
              </button>
              <button
                onClick={() => downloadPdf.mutate()}
                disabled={downloadPdf.isPending}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                {downloadPdf.isPending ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                PDF
              </button>
              <button
                onClick={() => { setShowEmail(true); setEmailSent(false) }}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Mail size={13} /> Email
              </button>
              <button
                onClick={() => recalc.mutate()}
                className="btn-primary flex items-center gap-1.5 text-xs"
                disabled={recalc.isPending}
              >
                {recalc.isPending ? <Spinner size={13} className="text-warm" /> : <RefreshCw size={13} />}
                Recalculer
              </button>
            </div>
          ) : null
        }
      />

      <div className="p-8 space-y-5">

        {/* Loading state when fetching a quotation */}
        {quotLoading && <QuotationsListSkeleton count={5} />}

        {!quotLoading && (<>

        {/* Step 1 — select project */}
        <div className="card p-5">
          <SectionTitle>1 · Projet source</SectionTitle>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <select
                className="input-base"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
              >
                <option value="">Sélectionner un projet…</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.client_name ? `— ${p.client_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-primary"
              disabled={!selectedProject || createQuotation.isPending}
              onClick={() => createQuotation.mutate({
                project_id: selectedProject,
                currency: 'EUR',
                margin_pct: margin,
              })}
            >
              <Plus size={14} />
              {quotationId ? 'Nouvelle version' : 'Créer cotation'}
            </button>
          </div>
        </div>

        {quotLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-4 animate-pulse">
                <div className="h-5 w-1/3 bg-slate-200/70 dark:bg-white/5 rounded mb-3" />
                <div className="h-4 w-2/3 bg-slate-200/70 dark:bg-white/5 rounded mb-2" />
                <div className="h-4 w-1/2 bg-slate-200/70 dark:bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {quotation && (
          <>
            {/* Step 2 — params */}
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-1 space-y-5">
                <div className="card p-5">
                  <SectionTitle>2 · Paramètres</SectionTitle>
                  <div className="space-y-4">
                    <div>
                      <label className="text-label text-muted block mb-1.5">PAX de référence</label>
                      <input type="number" className="input-base font-mono" value={pax} min={1} max={500}
                             onChange={e => setPax(+e.target.value)} />
                    </div>
                    <div>
                      <label className="text-label text-muted block mb-1.5">Devise</label>
                      <select className="input-base" value={quotation.currency}
                              onChange={e => quotationsApi.update(quotationId, { currency: e.target.value })}>
                        {['EUR','USD','MAD','GBP'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <MarginCalculator lines={quotation.lines} pax={pax} />
              </div>

              <div className="col-span-2">
                {/* Step 3 — lines */}
                <div className="card overflow-hidden h-full">
                  <div className="px-5 py-3 border-b border-line flex items-center justify-between">
                    <SectionTitle className="mb-0">3 · Lignes de coût</SectionTitle>
                    <StatusBadge status={quotation.status} />
                  </div>

                  {/* Add line form */}
                  <div className="px-5 py-3 border-b border-line bg-warm/40">
                    <div className="grid grid-cols-7 gap-2 items-end">
                      <div>
                        <label className="text-label text-muted block mb-1">Jour</label>
                        <input type="number" className="input-base font-mono text-xs" min={1}
                               value={newLine.day_number}
                               onChange={e => setNewLine(s => ({ ...s, day_number: +e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-label text-muted block mb-1">Catégorie</label>
                        <select className="input-base text-xs" value={newLine.category}
                                onChange={e => {
                                  const cat = CATEGORIES.find(c => c.value === e.target.value)
                                  setNewLine(s => ({ ...s, category: e.target.value, unit: cat?.unit ?? 'pax' }))
                                }}>
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-label text-muted block mb-1">Libellé</label>
                        <input className="input-base text-xs" placeholder="Hôtel Mamounia…"
                               value={newLine.label}
                               onChange={e => setNewLine(s => ({ ...s, label: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-label text-muted block mb-1">Ville</label>
                        <input className="input-base text-xs" placeholder="Marrakech"
                               value={newLine.city}
                               onChange={e => setNewLine(s => ({ ...s, city: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-label text-muted block mb-1">
                          Coût unit. ({currency})
                        </label>
                        <input type="number" className="input-base font-mono text-xs" min={0}
                               value={newLine.unit_cost}
                               onChange={e => setNewLine(s => ({ ...s, unit_cost: +e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-label text-muted block mb-1">Qté</label>
                        <div className="flex gap-1">
                          <input type="number" className="input-base font-mono text-xs" min={0}
                                 value={newLine.quantity}
                                 onChange={e => setNewLine(s => ({ ...s, quantity: +e.target.value }))} />
                          <button className="btn-primary btn-sm px-3"
                                  onClick={() => addLine.mutate(newLine)}
                                  disabled={!newLine.label || addLine.isPending}>
                            {addLine.isPending ? <Spinner size={12} className="text-warm" /> : <Plus size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lines table */}
                  <div className="overflow-y-auto max-h-[500px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b border-line">
                          {['J.','Catégorie','Libellé','Ville','Coût unit.','Qté','Total'].map(h => (
                            <th key={h} className="text-left text-label text-muted px-4 py-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {quotation.lines?.length === 0 ? (
                          <tr><td colSpan={7} className="text-center text-muted py-8">
                            Aucune ligne — ajoutez des coûts ci-dessus
                          </td></tr>
                        ) : quotation.lines?.map((l: any) => (
                          <tr key={l.id} className="border-b border-line/50 hover:bg-warm/40 transition-colors">
                            <td className="px-4 py-2 font-mono text-muted">{l.day_number ?? '–'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold
                                ${l.category === 'hotel'      ? 'bg-amber-50 text-amber-700'  :
                                  l.category === 'transport'  ? 'bg-blue-50 text-blue-700'   :
                                  l.category === 'restaurant' ? 'bg-green-50 text-green-700' :
                                  'bg-warm text-muted'}`}>
                                {l.category}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-medium text-ink">{l.label}</td>
                            <td className="px-4 py-2 text-muted">{l.city ?? '–'}</td>
                            <td className="px-4 py-2 font-mono">{fmt(l.unit_cost, currency)}</td>
                            <td className="px-4 py-2 font-mono text-muted">{l.quantity} {l.unit}</td>
                            <td className="px-4 py-2 font-mono font-semibold text-ink">
                              {fmt(l.total_cost, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            {calcResult && (
              <>
                {/* Cost breakdown */}
                <div className="card p-5">
                  <SectionTitle>4 · Ventilation des coûts</SectionTitle>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {Object.entries(calcResult.breakdown ?? {})
                      .filter(([, v]: any) => v > 0)
                      .map(([cat, val]: any) => (
                        <div key={cat} className="card-warm px-4 py-3 rounded-card">
                          <p className="text-label text-muted mb-1 capitalize">{cat}</p>
                          <p className="font-mono font-semibold text-ink">{fmt(val, currency)}</p>
                        </div>
                      ))
                    }
                  </div>
                  <div className="flex gap-6 pt-3 border-t border-line">
                    <PriceDisplay value={calcResult.total_cost}    currency={currency} label="Coût total" size="md" />
                    <PriceDisplay value={calcResult.total_selling} currency={currency} label="Prix de vente" size="lg" />
                    <PriceDisplay value={calcResult.price_per_pax} currency={currency} label={`Prix / pax (base ${pax})`} size="md" />
                  </div>
                </div>

                {/* Pricing grid */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-line">
                    <SectionTitle className="mb-0">5 · Grille tarifaire</SectionTitle>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-ink text-warm">
                        {['Base', 'PAX réels', 'Prix / pax', 'Suppl. SGL', 'Total groupe', 'Marge / pax'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {calcResult.pricing_grid?.map((row: any, i: number) => (
                        <tr key={i} className={`border-b border-line ${i % 2 === 0 ? '' : 'bg-warm/40'}`}>
                          <td className="px-5 py-3 font-semibold">{row.basis}+{row.foc} FOC</td>
                          <td className="px-5 py-3 font-mono text-muted">{row.basis}</td>
                          <td className="px-5 py-3">
                            <span className="font-serif text-xl font-bold text-bordeaux">
                              {fmt(row.price_pax, currency)}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono">{fmt(row.single_supplement, currency)}</td>
                          <td className="px-5 py-3 font-mono text-muted">{fmt(row.total_group, currency)}</td>
                          <td className="px-5 py-3">
                            <span className="text-green-700 font-mono font-medium">
                              +{fmt(row.margin_per_pax, currency)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        </>)}
      </div>

      {/* ── What-if Modal ─────────────────────────────────────────── */}
      {showWhatIf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                  <Sliders size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">Simulation What-if</h3>
                  <p className="text-[10px] text-muted">Variez PAX, marge et taux de change sans modifier la cotation</p>
                </div>
              </div>
              <button onClick={() => setShowWhatIf(false)} className="text-muted hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* PAX slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase">Nombre de PAX</label>
                  <span className="text-sm font-black text-ink">{wiPax} pax</span>
                </div>
                <input
                  type="range" min={1} max={200} value={wiPax}
                  onChange={e => setWiPax(+e.target.value)}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[9px] text-muted mt-0.5">
                  <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
                </div>
              </div>

              {/* Margin slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase">Marge commerciale</label>
                  <span className="text-sm font-black text-emerald-600">{wiMargin}%</span>
                </div>
                <input
                  type="range" min={5} max={50} value={wiMargin}
                  onChange={e => setWiMargin(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-muted mt-0.5">
                  <span>5%</span><span>15%</span><span>25%</span><span>35%</span><span>50%</span>
                </div>
              </div>

              {/* Exchange rate */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase">Taux de change (EUR→MAD)</label>
                  <span className="text-sm font-black text-slate-700">{wiRate.toFixed(1)}</span>
                </div>
                <input
                  type="range" min={8} max={15} step={0.1} value={wiRate}
                  onChange={e => setWiRate(+e.target.value)}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-muted mt-0.5">
                  <span>8</span><span>10</span><span>12</span><span>15</span>
                </div>
              </div>

              <button
                onClick={() => whatIfMut.mutate()}
                disabled={whatIfMut.isPending}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {whatIfMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                Calculer
              </button>

              {/* Result */}
              {wiResult && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Coût/pax', value: `${fmt(wiResult.cost_per_pax, currency)}`, sub: '' },
                      { label: 'Prix vente/pax', value: `${fmt(wiResult.sell_per_pax, currency)}`, sub: `${wiResult.margin_pct}% marge`, highlight: true },
                      { label: 'Marge totale', value: `${fmt(wiResult.margin_amount, currency)}`, sub: `sur ${wiPax} pax` },
                      { label: 'Revenu groupe', value: `${fmt(wiResult.group_revenue, currency)}`, sub: '' },
                    ].map(k => (
                      <div key={k.label} className={`rounded-lg px-3 py-2.5 ${k.highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-200'}`}>
                        <p className="text-[9px] font-bold text-muted uppercase mb-0.5">{k.label}</p>
                        <p className={`text-sm font-black tabular-nums ${k.highlight ? 'text-emerald-700' : 'text-ink'}`}>{k.value}</p>
                        {k.sub && <p className="text-[9px] text-muted">{k.sub}</p>}
                      </div>
                    ))}
                  </div>
                  {wiResult.sell_converted && (
                    <p className="text-[10px] text-center text-muted">
                      ≈ {fmt(wiResult.sell_converted, 'MAD')} / pax au taux {wiRate.toFixed(1)}
                    </p>
                  )}
                </div>
              )}

              {whatIfMut.isError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  <AlertCircle size={13} /> {(whatIfMut.error as any)?.response?.data?.detail ?? 'Recalculez la cotation d\'abord'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Email Modal ───────────────────────────────────────────── */}
      {showEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                  <Mail size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">Envoyer le devis par email</h3>
                  <p className="text-[10px] text-muted">PDF en pièce jointe · S'TOURS branding</p>
                </div>
              </div>
              <button onClick={() => setShowEmail(false)} className="text-muted hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            {emailSent ? (
              <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <p className="font-bold text-emerald-700">Email envoyé !</p>
                <p className="text-xs text-muted">Le devis a été transmis à {emailTo}</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase block mb-1">Email destinataire *</label>
                    <input
                      type="email"
                      className="input-base text-sm"
                      placeholder="client@agency.com"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase block mb-1">Nom du contact</label>
                    <input
                      type="text"
                      className="input-base text-sm"
                      placeholder="Sophie Martin"
                      value={emailName}
                      onChange={e => setEmailName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted uppercase block mb-1">Langue</label>
                  <div className="flex gap-2">
                    {(['fr', 'en'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => setEmailLang(l)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          emailLang === l
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-muted border-line hover:border-slate-400'
                        }`}
                      >
                        {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted uppercase block mb-1">Message personnalisé (optionnel)</label>
                  <textarea
                    rows={3}
                    className="input-base text-sm resize-none"
                    placeholder={emailLang === 'fr'
                      ? 'Bonjour, veuillez trouver ci-joint votre devis…'
                      : 'Dear client, please find attached your quotation…'}
                    value={emailMsg}
                    onChange={e => setEmailMsg(e.target.value)}
                  />
                </div>

                {sendEmailMut.isError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                    <AlertCircle size={13} /> {(sendEmailMut.error as any)?.message ?? 'Erreur d\'envoi'}
                  </div>
                )}

                {sendEmailMut.data?.data?.demo_mode && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>Mode démo — configurez SMTP_HOST dans .env pour activer l'envoi réel.</span>
                  </div>
                )}

                <button
                  onClick={() => sendEmailMut.mutate()}
                  disabled={!emailTo || sendEmailMut.isPending}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {sendEmailMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {emailLang === 'fr' ? 'Envoyer le devis' : 'Send quotation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
