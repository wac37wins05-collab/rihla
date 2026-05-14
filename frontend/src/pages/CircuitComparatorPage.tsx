/**
 * Circuit Comparator — Compare Luxe / Confort / Essentiel variants side by side.
 *
 * Allows the commercial team to instantly generate three pricing tiers for
 * the same circuit, then present the comparison matrix to the client.
 *
 * API: POST /api/comparator/generate
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Layers, Sparkles, Plus, X, ChevronDown, ChevronUp,
  TrendingUp, Hotel, Utensils, Star, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, Download, FileText
} from 'lucide-react'
import { clsx } from 'clsx'
import { comparatorApi, type ComparatorVariant, type ComparatorResponse, type ComparatorVariantRequest } from '@/lib/api'

// ── Morocco cities for quick-add ─────────────────────────────────────
const MOROCCO_CITIES = [
  'Casablanca', 'Marrakech', 'Fès', 'Meknès', 'Rabat', 'Agadir',
  'Tanger', 'Chefchaouen', 'Merzouga', 'Ouarzazate', 'Essaouira',
  'El Jadida', 'Ifrane', 'Dakhla', 'Laâyoune',
]

const MEAL_PLAN_LABELS: Record<string, string> = {
  FB: 'Pension complète', HB: 'Demi-pension', BB: 'Petit-déjeuner', RO: 'Logement seul',
}

const TIER_ICONS: Record<string, typeof Star> = {
  luxe: Star, confort: CheckCircle2, essentiel: AlertCircle,
}

const fmt = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

// ── VariantCard ───────────────────────────────────────────────────────
function VariantCard({ variant, currency = 'EUR' }: { variant: ComparatorVariant; currency?: string }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TIER_ICONS[variant.tier] ?? Star
  const savings = variant.price_per_person > 0 ? null : null

  return (
    <div
      className="rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-lg"
      style={{ borderColor: variant.tier_color }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 text-white"
        style={{ backgroundColor: variant.tier_color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon size={20} className="text-white/80" aria-hidden="true" />
            <span className="text-lg font-bold tracking-wide">{variant.tier_label}</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {variant.hotel_category}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-3xl font-black">
            {variant.price_per_person > 0 ? fmt(variant.price_per_person, currency) : '—'}
          </p>
          <p className="text-white/70 text-[12px] mt-0.5">par personne · base 20 pax</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
          <Hotel size={14} aria-hidden="true" />
          <span>Hôtels {variant.hotel_category}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
          <Utensils size={14} aria-hidden="true" />
          <span>{MEAL_PLAN_LABELS[variant.meal_plan] ?? variant.meal_plan}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
          <TrendingUp size={14} aria-hidden="true" />
          <span>Coût : {variant.cost_per_person > 0 ? fmt(variant.cost_per_person, currency) : '—'} / pers.</span>
        </div>
      </div>

      {/* Pricing by pax range */}
      {variant.pricing?.ranges && variant.pricing.ranges.length > 0 && (
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Grille tarifaire
          </p>
          <div className="space-y-1">
            {variant.pricing.ranges.map((r, i) => (
              <div key={i} className="flex justify-between text-[12px]">
                <span className="text-slate-500">{r.min_pax}–{r.max_pax} pax</span>
                <span className="font-semibold text-slate-800 dark:text-cream">
                  {fmt(r.selling_per_person, currency)}
                  <span className="text-[10px] text-emerald-600 ml-1.5">{r.margin_pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable itinerary */}
      {variant.days && variant.days.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-cream bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 transition-colors"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Masquer' : 'Voir'} l'itinéraire ({variant.days.length}J)</span>
            {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>

          {expanded && (
            <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 max-h-72 overflow-y-auto">
              <div className="space-y-2">
                {variant.days.map(d => (
                  <div key={d.day_number} className="flex gap-3 text-[12px]">
                    <span className="flex-shrink-0 w-8 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      J{d.day_number}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-cream truncate">{d.title || d.city}</p>
                      {d.hotel && (
                        <p className="text-slate-500 truncate">{d.hotel} · {d.meal_plan}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export function CircuitComparatorPage() {
  const [cities, setCities] = useState<string[]>(['Casablanca', 'Marrakech', 'Fès'])
  const [cityInput, setCityInput] = useState('')
  const [duration, setDuration] = useState(8)
  const [paxMin, setPaxMin] = useState(20)
  const [paxMax, setPaxMax] = useState(30)
  const [margin, setMargin] = useState(18)
  const [circuitType, setCircuitType] = useState<'leisure' | 'mice' | 'adventure'>('leisure')
  const [result, setResult] = useState<ComparatorResponse | null>(null)

  /** Current form params — used for both generate and PDF */
  const currentParams: ComparatorVariantRequest = {
    cities,
    duration_days: duration,
    circuit_type: circuitType,
    tiers: ['luxe', 'confort', 'essentiel'],
    pax_ranges: [{ min: paxMin, max: paxMax }],
    margin_pct: margin,
    language: 'fr',
  }

  const generateMut = useMutation({
    mutationFn: () =>
      comparatorApi.generate(currentParams).then(r => r.data),
    onSuccess: (data) => setResult(data),
  })

  const pdfMut = useMutation({
    mutationFn: () => comparatorApi.generatePdf(currentParams),
  })

  const addCity = (city: string) => {
    const trimmed = city.trim()
    if (trimmed && !cities.includes(trimmed)) {
      setCities(prev => [...prev, trimmed])
    }
    setCityInput('')
  }

  const removeCity = (city: string) => setCities(prev => prev.filter(c => c !== city))

  const comparison = result?.data?.comparison
  const variants = result?.data?.variants ?? []

  // Savings badge
  const savingsPct = comparison?.price_range?.savings_pct
  const priceMin = comparison?.price_range?.min
  const priceMax = comparison?.price_range?.max

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Page header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-cream flex items-center gap-2.5">
              <Layers size={24} className="text-amber-500" aria-hidden="true" />
              Comparateur de Circuits
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Générez 3 variantes tarifaires (Luxe · Confort · Essentiel) pour le même circuit
            </p>
          </div>

          {result && (
            <div className="flex items-center gap-2">
              {/* PDF Download */}
              <button
                onClick={() => pdfMut.mutate()}
                disabled={pdfMut.isPending}
                title="Télécharger la proposition PDF (Luxe · Confort · Essentiel)"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all',
                  pdfMut.isPending
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/10 cursor-wait'
                    : pdfMut.isError
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-300 dark:border-red-700'
                    : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm hover:shadow-md active:scale-[0.98]'
                )}
              >
                {pdfMut.isPending ? (
                  <><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Génération PDF…</>
                ) : (
                  <><FileText size={13} aria-hidden="true" /> Télécharger PDF</>
                )}
              </button>

              {pdfMut.isError && (
                <span className="text-[11px] text-red-500">
                  Erreur PDF — vérifiez que WeasyPrint est installé
                </span>
              )}

              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-white/10 rounded-lg"
              >
                <RefreshCw size={13} aria-hidden="true" />
                Nouvelle simulation
              </button>
            </div>
          )}
        </div>

        {/* Configuration form */}
        {!result && (
          <div className="card p-6 mb-6 space-y-5">
            <h2 className="text-[14px] font-semibold text-slate-700 dark:text-cream">
              Paramètres du circuit
            </h2>

            {/* Cities */}
            <div>
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-2">
                Villes (ordre du circuit)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {cities.map(city => (
                  <span
                    key={city}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-[12px] rounded-full border border-amber-200 dark:border-amber-700"
                  >
                    {city}
                    <button
                      onClick={() => removeCity(city)}
                      aria-label={`Supprimer ${city}`}
                      className="hover:text-amber-600"
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCity(cityInput)}
                  placeholder="Ajouter une ville…"
                  className="px-2.5 py-1 text-[12px] border border-slate-200 dark:border-white/10 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-cream placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 min-w-[150px]"
                />
              </div>

              {/* Quick-add pills */}
              <div className="flex flex-wrap gap-1.5">
                {MOROCCO_CITIES.filter(c => !cities.includes(c)).slice(0, 8).map(c => (
                  <button
                    key={c}
                    onClick={() => addCity(c)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full border border-slate-200 dark:border-white/10 transition-colors"
                  >
                    <Plus size={10} aria-hidden="true" />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration + pax + margin */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Durée (jours)
                </label>
                <input
                  type="number"
                  min={3}
                  max={21}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-cream focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  PAX Min
                </label>
                <input
                  type="number"
                  min={1}
                  value={paxMin}
                  onChange={e => setPaxMin(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-cream focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  PAX Max
                </label>
                <input
                  type="number"
                  min={1}
                  value={paxMax}
                  onChange={e => setPaxMax(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-cream focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Marge (%)
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={0.5}
                  value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-cream focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            </div>

            {/* Circuit type */}
            <div>
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-2">
                Type de circuit
              </label>
              <div className="flex gap-2">
                {(['leisure', 'mice', 'adventure'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setCircuitType(type)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors capitalize',
                      circuitType === type
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                    )}
                  >
                    {type === 'leisure' ? 'Loisirs' : type === 'mice' ? 'MICE' : 'Aventure'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending || cities.length === 0}
              className={clsx(
                'w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-[14px] transition-all',
                generateMut.isPending || cities.length === 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg active:scale-[0.99]'
              )}
            >
              {generateMut.isPending ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Génération en cours…</>
              ) : (
                <><Sparkles size={16} aria-hidden="true" /> Générer les 3 variantes</>
              )}
            </button>

            {generateMut.isError && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-[13px]">
                <AlertCircle size={15} aria-hidden="true" />
                Erreur lors de la génération. Vérifiez que le backend est démarré.
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Route + summary banner */}
            <div className="card p-5 mb-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <p className="text-[12px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">
                  Simulation générée
                </p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-cream">
                  {comparison?.route}
                </h2>
                <p className="text-[13px] text-slate-500">
                  {comparison?.duration} · {variants.length} variantes générées
                </p>
              </div>

              {savingsPct !== undefined && savingsPct > 0 && (
                <div className="text-center px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{savingsPct}%</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">d'écart Luxe ↔ Essentiel</p>
                  {priceMin !== undefined && priceMax !== undefined && (
                    <p className="text-[10px] text-emerald-500 mt-0.5">
                      {fmt(priceMin)} — {fmt(priceMax)} / pers.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Comparison matrix table */}
            {comparison?.matrix && comparison.matrix.length > 0 && (
              <div className="card mb-5 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-slate-700 dark:text-cream">
                    Matrice de comparaison
                  </h3>
                  <button
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => {
                      const rows = comparison.matrix.map(m =>
                        `${m.tier}\t${m.hotel_category}\t${m.meal_plan}\t€${Math.round(m.price_per_person)}`
                      ).join('\n')
                      navigator.clipboard.writeText(`Tier\tHôtel\tRepas\tPrix/pers.\n${rows}`)
                    }}
                  >
                    <Download size={12} aria-hidden="true" />
                    Copier
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Variante</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Hôtels</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Repas</th>
                        <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Prix / pers.</th>
                        <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Coût / pers.</th>
                        <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">Extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.matrix.map((m, i) => (
                        <tr
                          key={i}
                          className="border-t border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white text-[11px] font-semibold"
                              style={{ backgroundColor: m.color }}
                            >
                              {m.tier}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{m.hotel_category}</td>
                          <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                            {MEAL_PLAN_LABELS[m.meal_plan] ?? m.meal_plan}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-cream">
                            {m.price_per_person > 0 ? fmt(m.price_per_person) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">
                            {m.cost_per_person > 0 ? fmt(m.cost_per_person) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {(m as any).includes_extras ? (
                              <span className="text-amber-600 text-[11px] font-medium">✓ Inclus</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Variant cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {variants.map((v, i) => (
                <VariantCard key={i} variant={v} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
