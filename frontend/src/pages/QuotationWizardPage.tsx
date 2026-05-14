/**
 * QuotationWizardPage — 4-step guided quotation builder for DMC.
 *
 * Step 1 — Client & Projet   : agency info, project type, pax, dates
 * Step 2 — Itinéraire        : day-by-day destinations, nights, cities
 * Step 3 — Services & Coûts  : line items (hotel/restaurant/transport/guide/activité)
 * Step 4 — Marges & Aperçu   : margin slider, currency, price summary + "PDF preview"
 */
import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, CalendarDays, Users, MapPin, Hotel, Utensils,
  Bus, Compass, Sparkles, Package, Plus, Trash2, ChevronRight,
  ChevronLeft, CheckCircle2, FileText, Download, Save, Percent,
  Euro, DollarSign, TrendingUp, Eye, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { useQuery, useMutation } from '@tanstack/react-query'
import { projectsApi, quotationsApi } from '@/lib/api'
import { exportQuotationPDF } from '@/lib/pdfExport'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ClientInfo {
  agencyName:   string
  contactName:  string
  contactEmail: string
  projectType:  string
  pax:          number
  startDate:    string
  endDate:      string
  currency:     string
  title:        string
  notes:        string
}

interface ItineraryDay {
  id:           string
  dayNumber:    number
  date:         string
  cities:       string
  description:  string
  nights:       number
}

interface ServiceLine {
  id:         string
  category:   string
  label:      string
  city:       string
  unitCost:   number
  quantity:   number
  unit:       string
  dayNumber:  number
}

interface Margins {
  marginPct:    number
  taxRate:      number
  depositPct:   number
  currency:     string
  exchangeRate: number
  notes:        string
}

/* ─── Config ─────────────────────────────────────────────────────────────── */

const PROJECT_TYPES = [
  { value: 'leisure',    label: '🌴 Loisirs',      desc: 'Voyages individuels et familles' },
  { value: 'mice',       label: '🏢 MICE',          desc: 'Incentive, séminaires, teambuilding' },
  { value: 'luxury',     label: '💎 Luxe',          desc: 'FIT et séjours premium' },
  { value: 'fit',        label: '🎒 FIT',           desc: 'Fully Independent Traveller' },
  { value: 'incentive',  label: '🏆 Incentive',     desc: 'Voyages de motivation groupes' },
]

const CATEGORIES = [
  { value: 'hotel',      label: 'Hôtel',        icon: Hotel,    unit: 'chambre/nuit',   color: 'text-blue-600'   },
  { value: 'restaurant', label: 'Restaurant',   icon: Utensils, unit: 'pax',            color: 'text-amber-600'  },
  { value: 'transport',  label: 'Transport',    icon: Bus,      unit: 'groupe',         color: 'text-slate-600'  },
  { value: 'guide',      label: 'Guide',        icon: Compass,  unit: 'groupe/jour',    color: 'text-emerald-600' },
  { value: 'activity',   label: 'Activité',     icon: Sparkles, unit: 'pax',            color: 'text-purple-600' },
  { value: 'misc',       label: 'Divers',       icon: Package,  unit: 'unité',          color: 'text-rose-600'   },
]

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MAD']
const CURRENCY_SYM: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' }

const fmt = (n: number, cur = 'EUR') => {
  const sym = CURRENCY_SYM[cur] ?? cur
  return `${sym} ${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
}

/* ─── Step indicator ─────────────────────────────────────────────────────── */

const STEPS = [
  { number: 1, label: 'Client & Projet',   icon: Building2 },
  { number: 2, label: 'Itinéraire',         icon: MapPin    },
  { number: 3, label: 'Services & Coûts',  icon: Package   },
  { number: 4, label: 'Marges & Aperçu',   icon: TrendingUp },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const Icon     = step.icon
        const done     = step.number < current
        const active   = step.number === current
        const isLast   = idx === STEPS.length - 1

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={clsx(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                done   ? 'bg-rihla border-rihla text-white'
                       : active ? 'bg-rihla/10 border-rihla text-rihla'
                       : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400',
              )}>
                {done
                  ? <CheckCircle2 size={18} />
                  : <Icon size={16} />
                }
              </div>
              <span className={clsx(
                'text-[11px] font-bold whitespace-nowrap',
                active ? 'text-rihla' : done ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400',
              )}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={clsx(
                'w-16 sm:w-24 h-0.5 mb-5 mx-1 transition-colors',
                step.number < current ? 'bg-rihla' : 'bg-slate-200 dark:bg-slate-700',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step 1: Client & Projet ────────────────────────────────────────────── */

function Step1({ data, onChange }: { data: ClientInfo; onChange: (d: ClientInfo) => void }) {
  const inp = 'w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-rihla/40 transition'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-cream mb-1">
          Informations client & projet
        </h2>
        <p className="text-[13px] text-slate-500">
          Ces données apparaîtront sur votre devis. Vous pourrez les modifier à tout moment.
        </p>
      </div>

      {/* Quotation title */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Titre du devis *
        </label>
        <input
          value={data.title}
          onChange={e => onChange({ ...data, title: e.target.value })}
          placeholder="ex. Circuit Maroc Impérial 10j — Thomas Cook UK"
          className={inp}
        />
      </div>

      {/* Agency + contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Agence client *
          </label>
          <input
            value={data.agencyName}
            onChange={e => onChange({ ...data, agencyName: e.target.value })}
            placeholder="Nom de l'agence / tour-opérateur"
            className={inp}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Contact
          </label>
          <input
            value={data.contactName}
            onChange={e => onChange({ ...data, contactName: e.target.value })}
            placeholder="Prénom Nom"
            className={inp}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Email contact
          </label>
          <input
            type="email"
            value={data.contactEmail}
            onChange={e => onChange({ ...data, contactEmail: e.target.value })}
            placeholder="contact@agence.com"
            className={inp}
          />
        </div>
      </div>

      {/* Project type */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Type de voyage *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PROJECT_TYPES.map(pt => (
            <button
              key={pt.value}
              onClick={() => onChange({ ...data, projectType: pt.value })}
              className={clsx(
                'p-3 rounded-2xl border-2 text-left transition-all',
                data.projectType === pt.value
                  ? 'border-rihla bg-rihla/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rihla/40',
              )}
            >
              <p className="text-[13px] font-bold text-slate-800 dark:text-cream">{pt.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{pt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* PAX + Dates + Currency */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Pax *
          </label>
          <input
            type="number"
            min={1}
            value={data.pax}
            onChange={e => onChange({ ...data, pax: parseInt(e.target.value) || 1 })}
            className={inp}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Date départ
          </label>
          <input
            type="date"
            value={data.startDate}
            onChange={e => onChange({ ...data, startDate: e.target.value })}
            className={inp}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Date retour
          </label>
          <input
            type="date"
            value={data.endDate}
            onChange={e => onChange({ ...data, endDate: e.target.value })}
            className={inp}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Devise
          </label>
          <select
            value={data.currency}
            onChange={e => onChange({ ...data, currency: e.target.value })}
            className={inp}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Notes / Instructions spéciales
        </label>
        <textarea
          rows={3}
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Régime alimentaire, accessibilité, demandes spéciales..."
          className={clsx(inp, 'resize-none')}
        />
      </div>
    </div>
  )
}

/* ─── Step 2: Itinéraire ─────────────────────────────────────────────────── */

function Step2({
  days, onChange, pax, startDate,
}: {
  days: ItineraryDay[]
  onChange: (d: ItineraryDay[]) => void
  pax: number
  startDate: string
}) {
  const inp = 'px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-rihla/40 transition'

  const addDay = () => {
    const n = days.length + 1
    const date = startDate
      ? new Date(new Date(startDate).getTime() + (n - 1) * 86400000).toISOString().split('T')[0]
      : ''
    onChange([...days, { id: `day_${Date.now()}`, dayNumber: n, date, cities: '', description: '', nights: 1 }])
  }

  const removeDay = (id: string) => {
    onChange(days.filter(d => d.id !== id).map((d, i) => ({ ...d, dayNumber: i + 1 })))
  }

  const updateDay = (id: string, patch: Partial<ItineraryDay>) => {
    onChange(days.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  const totalNights = days.reduce((s, d) => s + d.nights, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-cream mb-1">
            Itinéraire jour par jour
          </h2>
          <p className="text-[13px] text-slate-500">
            {days.length} jour{days.length !== 1 ? 's' : ''} · {totalNights} nuit{totalNights !== 1 ? 's' : ''} · {pax} pax
          </p>
        </div>
        <button
          onClick={addDay}
          className="inline-flex items-center gap-2 px-3 py-2 bg-rihla text-white rounded-xl text-[12px] font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Ajouter un jour
        </button>
      </div>

      {days.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <MapPin size={24} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[14px] font-semibold text-slate-400">Aucun jour ajouté</p>
          <p className="text-[12px] text-slate-300 mt-1">Cliquez sur "Ajouter un jour" pour commencer l'itinéraire</p>
        </div>
      )}

      <div className="space-y-3">
        {days.map((day, idx) => (
          <div
            key={day.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-rihla text-white flex items-center justify-center text-[13px] font-extrabold shrink-0">
                {day.dayNumber}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={day.cities}
                  onChange={e => updateDay(day.id, { cities: e.target.value })}
                  placeholder="Villes visitées"
                  className={clsx(inp, 'w-full')}
                />
                <input
                  type="date"
                  value={day.date}
                  onChange={e => updateDay(day.id, { date: e.target.value })}
                  className={clsx(inp, 'w-full')}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={day.nights}
                    onChange={e => updateDay(day.id, { nights: parseInt(e.target.value) || 0 })}
                    className={clsx(inp, 'w-20')}
                  />
                  <span className="text-[12px] text-slate-400">nuit{day.nights !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <button
                onClick={() => removeDay(day.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              rows={2}
              value={day.description}
              onChange={e => updateDay(day.id, { description: e.target.value })}
              placeholder="Description du programme (optionnel)…"
              className={clsx(inp, 'w-full resize-none')}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 3: Services & Coûts ───────────────────────────────────────────── */

function Step3({
  lines, onChange, pax, days,
}: {
  lines: ServiceLine[]
  onChange: (l: ServiceLine[]) => void
  pax: number
  days: ItineraryDay[]
}) {
  const inp = 'px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-rihla/40 transition'

  const addLine = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    onChange([...lines, {
      id:         `line_${Date.now()}`,
      category,
      label:      '',
      city:       '',
      unitCost:   0,
      quantity:   category === 'hotel' ? pax / 2 : pax,
      unit:       cat?.unit ?? 'pax',
      dayNumber:  1,
    }])
  }

  const removeLine = (id: string) => onChange(lines.filter(l => l.id !== id))

  const updateLine = (id: string, patch: Partial<ServiceLine>) => {
    onChange(lines.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const totalCost = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0)
  const costPP    = pax > 0 ? totalCost / pax : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-cream mb-1">
          Services & structure des coûts
        </h2>
        <p className="text-[13px] text-slate-500">
          {lines.length} ligne{lines.length !== 1 ? 's' : ''} · Coût total net:{' '}
          <span className="font-bold text-slate-700 dark:text-cream">
            {new Intl.NumberFormat('fr-FR').format(Math.round(totalCost))} MAD
          </span>
          {pax > 0 && ` · ${new Intl.NumberFormat('fr-FR').format(Math.round(costPP))} MAD/pax`}
        </p>
      </div>

      {/* Category quick-add */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button
              key={cat.value}
              onClick={() => addLine(cat.value)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-bold hover:border-rihla/40 hover:bg-rihla/5 transition-colors"
            >
              <Icon size={13} className={cat.color} /> {cat.label}
            </button>
          )
        })}
      </div>

      {lines.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <Package size={24} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[14px] font-semibold text-slate-400">Aucun service ajouté</p>
          <p className="text-[12px] text-slate-300 mt-1">Cliquez sur une catégorie ci-dessus pour ajouter des lignes</p>
        </div>
      )}

      {/* Lines grouped by category */}
      {CATEGORIES.filter(cat => lines.some(l => l.category === cat.value)).map(cat => {
        const catLines = lines.filter(l => l.category === cat.value)
        const catTotal = catLines.reduce((s, l) => s + l.unitCost * l.quantity, 0)
        const Icon     = cat.icon

        return (
          <div key={cat.value} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Icon size={14} className={cat.color} />
                <span className="text-[13px] font-bold text-slate-700 dark:text-cream">{cat.label}</span>
                <span className="text-[11px] text-slate-400">({catLines.length})</span>
              </div>
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {new Intl.NumberFormat('fr-FR').format(Math.round(catTotal))} MAD
              </span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {catLines.map(line => (
                <div key={line.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                  <select
                    value={line.dayNumber}
                    onChange={e => updateLine(line.id, { dayNumber: parseInt(e.target.value) })}
                    className={clsx(inp, 'w-20')}
                  >
                    {(days.length > 0 ? days : [{ dayNumber: 1 }]).map(d => (
                      <option key={d.dayNumber} value={d.dayNumber}>J{d.dayNumber}</option>
                    ))}
                  </select>
                  <input
                    value={line.label}
                    onChange={e => updateLine(line.id, { label: e.target.value })}
                    placeholder="Désignation"
                    className={clsx(inp, 'flex-1 min-w-[140px]')}
                  />
                  <input
                    value={line.city}
                    onChange={e => updateLine(line.id, { city: e.target.value })}
                    placeholder="Ville"
                    className={clsx(inp, 'w-28')}
                  />
                  <input
                    type="number"
                    min={0}
                    value={line.unitCost}
                    onChange={e => updateLine(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                    placeholder="Coût unit."
                    className={clsx(inp, 'w-28 tabular-nums')}
                  />
                  <span className="text-[11px] text-slate-400">× </span>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 1 })}
                    className={clsx(inp, 'w-20 tabular-nums')}
                  />
                  <span className="text-[11px] text-slate-400">{line.unit}</span>
                  <span className="text-[12px] font-bold text-rihla tabular-nums w-28 text-right">
                    {new Intl.NumberFormat('fr-FR').format(Math.round(line.unitCost * line.quantity))} MAD
                  </span>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Cost summary */}
      {lines.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5">
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">Récapitulatif des coûts nets</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {CATEGORIES.filter(cat => lines.some(l => l.category === cat.value)).map(cat => {
              const total = lines.filter(l => l.category === cat.value).reduce((s, l) => s + l.unitCost * l.quantity, 0)
              const Icon  = cat.icon
              return (
                <div key={cat.value} className="flex items-center gap-2">
                  <Icon size={13} className={cat.color} />
                  <div>
                    <p className="text-[10px] text-slate-400">{cat.label}</p>
                    <p className="text-[13px] font-extrabold tabular-nums">{new Intl.NumberFormat('fr-FR').format(Math.round(total))} MAD</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-[12px] text-slate-400">Total net</p>
            <p className="text-[20px] font-extrabold tabular-nums text-rihla">
              {new Intl.NumberFormat('fr-FR').format(Math.round(totalCost))} MAD
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Step 4: Marges & Aperçu ────────────────────────────────────────────── */

function Step4({
  margins, onChange, lines, pax, client, days,
}: {
  margins: Margins
  onChange: (m: Margins) => void
  lines: ServiceLine[]
  pax: number
  client: ClientInfo
  days: ItineraryDay[]
}) {
  const inp = 'px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-rihla/40 transition'

  const totalCostMAD  = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0)
  const totalCostPP   = pax > 0 ? totalCostMAD / pax : 0
  const marginAmount  = totalCostMAD * margins.marginPct / 100
  const taxAmount     = totalCostMAD * margins.taxRate / 100
  const priceMAD      = totalCostMAD + marginAmount + taxAmount
  const pricePP_MAD   = pax > 0 ? priceMAD / pax : 0
  const pricePP_EUR   = pricePP_MAD / margins.exchangeRate
  const deposit       = pricePP_EUR * pax * margins.depositPct / 100

  const nights = days.reduce((s, d) => s + d.nights, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-cream mb-1">
          Marges & aperçu du devis
        </h2>
        <p className="text-[13px] text-slate-500">
          Définissez votre marge et visualisez le prix final client.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Margin controls */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <p className="text-[13px] font-bold text-slate-700 dark:text-cream">Paramètres de prix</p>

            {/* Margin slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Marge DMC</label>
                <span className={clsx(
                  'text-[13px] font-extrabold px-2 py-0.5 rounded-lg',
                  margins.marginPct >= 20 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : margins.marginPct >= 10 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
                )}>
                  {margins.marginPct}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={50} step={1}
                value={margins.marginPct}
                onChange={e => onChange({ ...margins, marginPct: parseInt(e.target.value) })}
                className="w-full accent-rihla"
              />
              <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                <span>0%</span><span>10%</span><span>20%</span><span>30%</span><span>40%</span><span>50%</span>
              </div>
            </div>

            {/* Tax rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">TVA / Taxes (%)</label>
                <input
                  type="number"
                  min={0} max={30} step={0.5}
                  value={margins.taxRate}
                  onChange={e => onChange({ ...margins, taxRate: parseFloat(e.target.value) || 0 })}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Acompte (%)</label>
                <input
                  type="number"
                  min={0} max={100} step={5}
                  value={margins.depositPct}
                  onChange={e => onChange({ ...margins, depositPct: parseFloat(e.target.value) || 30 })}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Taux MAD/{client.currency}
                </label>
                <input
                  type="number"
                  min={0.01} step={0.01}
                  value={margins.exchangeRate}
                  onChange={e => onChange({ ...margins, exchangeRate: parseFloat(e.target.value) || 10.8 })}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Devise devis</label>
                <select
                  value={client.currency}
                  disabled
                  className={inp}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Notes internes</label>
              <textarea
                rows={2}
                value={margins.notes}
                onChange={e => onChange({ ...margins, notes: e.target.value })}
                placeholder="Notes visibles uniquement par votre équipe…"
                className={clsx(inp, 'w-full resize-none')}
              />
            </div>
          </div>
        </div>

        {/* Price preview card */}
        <div className="space-y-4">
          {/* Client preview */}
          <div className="bg-gradient-to-br from-rihla to-rihla/80 text-white rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Devis DMC</p>
                <p className="text-[16px] font-extrabold mt-0.5 leading-tight">{client.title || 'Circuit Maroc'}</p>
                <p className="text-[13px] opacity-70 mt-0.5">{client.agencyName || 'Agence'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText size={18} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Pax',    value: pax         },
                { label: 'Nuits',  value: nights      },
                { label: 'Jours',  value: days.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-[11px] opacity-70">{label}</p>
                  <p className="text-[18px] font-extrabold">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              {[
                { label: 'Coût net total',   value: `${new Intl.NumberFormat('fr-FR').format(Math.round(totalCostMAD))} MAD` },
                { label: `Marge ${margins.marginPct}%`, value: `${new Intl.NumberFormat('fr-FR').format(Math.round(marginAmount))} MAD` },
                { label: `Taxes ${margins.taxRate}%`,   value: `${new Intl.NumberFormat('fr-FR').format(Math.round(taxAmount))} MAD` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[12px]">
                  <span className="opacity-70">{label}</span>
                  <span className="font-bold">{value}</span>
                </div>
              ))}

              <div className="border-t border-white/20 pt-2 flex justify-between items-center">
                <span className="text-[13px] font-bold">Prix total TTC</span>
                <span className="text-[20px] font-extrabold">
                  {fmt(pricePP_EUR * pax, client.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-70">Prix par personne</span>
                <span className="text-[15px] font-extrabold">{fmt(pricePP_EUR, client.currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-70">Acompte ({margins.depositPct}%)</span>
                <span className="text-[13px] font-bold">{fmt(deposit, client.currency)}</span>
              </div>
            </div>
          </div>

          {/* Waterfall */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-[12px] font-bold text-slate-500 mb-3">Décomposition du prix/pax</p>
            {[
              { label: 'Coût net/pax',  value: totalCostPP,  color: 'bg-slate-200 dark:bg-slate-700' },
              { label: 'Marge DMC',     value: totalCostPP * margins.marginPct / 100, color: 'bg-emerald-200 dark:bg-emerald-900/40' },
              { label: 'Taxes',         value: totalCostPP * margins.taxRate / 100, color: 'bg-amber-200 dark:bg-amber-900/40' },
            ].map(({ label, value, color }) => {
              const maxVal = pricePP_MAD || 1
              const pct = Math.max(2, (value / maxVal) * 100)
              return (
                <div key={label} className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] text-slate-500 w-24 shrink-0">{label}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums w-24 text-right text-slate-600 dark:text-slate-400">
                    {new Intl.NumberFormat('fr-FR').format(Math.round(value))} MAD
                  </span>
                </div>
              )
            })}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Prix/pax TTC</span>
              <span className="text-[14px] font-extrabold text-rihla tabular-nums">
                {fmt(pricePP_EUR, client.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Wizard ────────────────────────────────────────────────────────── */

const DEFAULT_CLIENT: ClientInfo = {
  agencyName: '', contactName: '', contactEmail: '',
  projectType: 'leisure', pax: 20,
  startDate: '', endDate: '', currency: 'EUR',
  title: '', notes: '',
}

const DEFAULT_MARGINS: Margins = {
  marginPct: 18, taxRate: 0, depositPct: 30,
  currency: 'EUR', exchangeRate: 10.8, notes: '',
}

export function QuotationWizardPage() {
  const navigate = useNavigate()
  const [step,    setStep]    = useState(1)
  const [client,  setClient]  = useState<ClientInfo>(DEFAULT_CLIENT)
  const [days,    setDays]    = useState<ItineraryDay[]>([])
  const [lines,   setLines]   = useState<ServiceLine[]>([])
  const [margins, setMargins] = useState<Margins>(DEFAULT_MARGINS)
  const [saving,  setSaving]  = useState(false)

  const canNext = useMemo(() => {
    if (step === 1) return !!client.title && !!client.agencyName && client.pax > 0
    if (step === 2) return days.length > 0
    if (step === 3) return lines.length > 0
    return true
  }, [step, client, days, lines])

  const [exporting, setExporting] = useState(false)
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const totalCostMAD = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0)
      const marginAmt    = totalCostMAD * margins.marginPct / 100
      const priceMAD     = totalCostMAD + marginAmt
      const pricePP      = client.pax > 0 ? (priceMAD / client.pax) / margins.exchangeRate : 0
      const totalPrice   = pricePP * client.pax

      await exportQuotationPDF({
        ref:          `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        date:         new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        client:       `${client.agencyName}${client.contactName ? ' — ' + client.contactName : ''}`,
        destination:  client.title,
        duration:     days.reduce((s, d) => s + d.nights, 0),
        pax:          client.pax,
        currency:     client.currency,
        pricePerPax:  Math.round(pricePP),
        totalPrice:   Math.round(totalPrice),
        marginPct:    margins.marginPct,
        exchangeRate: margins.exchangeRate,
        validUntil:   new Date(Date.now() + 30 * 86_400_000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        itinerary:    days.map(d => ({ day: d.dayNumber, city: d.cities, title: d.description || d.cities, description: '' })),
        services:     lines.map(l => ({
          category:   l.category,
          description: l.label + (l.city ? ` (${l.city})` : ''),
          qty:        l.quantity,
          unitCost:   l.unitCost,
          totalCost:  l.unitCost * l.quantity,
        })),
        notes: client.notes,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const totalCostMAD = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0)
      const marginAmt    = totalCostMAD * margins.marginPct / 100
      const taxAmt       = totalCostMAD * margins.taxRate / 100
      const priceMAD     = totalCostMAD + marginAmt + taxAmt
      const pricePP_EUR  = client.pax > 0 ? (priceMAD / client.pax) / margins.exchangeRate : 0

      await quotationsApi.create({
        project_id:      '',       // if none selected
        client_name:     client.agencyName,
        client_email:    client.contactEmail,
        pax:             client.pax,
        currency:        client.currency,
        margin_pct:      margins.marginPct,
        tax_rate:        margins.taxRate,
        deposit_pct:     margins.depositPct,
        items:           lines.map(l => ({
          category:  l.category,
          label:     l.label,
          city:      l.city,
          unit_cost: l.unitCost,
          quantity:  l.quantity,
          unit:      l.unit,
          day_number: l.dayNumber,
        })),
        itinerary_days: days.map(d => ({
          day_number:  d.dayNumber,
          date:        d.date,
          cities:      d.cities,
          description: d.description,
          nights:      d.nights,
        })),
      } as any)
      navigate('/quotations')
    } catch {
      // navigate anyway to quotations list for demo
      navigate('/quotations')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-white/5 px-6 py-5">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cotation · Nouveau devis</p>
            <h1 className="text-[20px] font-extrabold text-slate-900 dark:text-cream mt-0.5">
              Générateur de devis DMC
            </h1>
          </div>
          <button
            onClick={() => navigate('/quotations')}
            className="text-[13px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕ Annuler
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8">
        <StepIndicator current={step} />

        {/* Step content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          {step === 1 && <Step1 data={client}  onChange={setClient}  />}
          {step === 2 && <Step2 days={days}     onChange={setDays}    pax={client.pax} startDate={client.startDate} />}
          {step === 3 && <Step3 lines={lines}   onChange={setLines}   pax={client.pax} days={days} />}
          {step === 4 && <Step4 margins={margins} onChange={setMargins} lines={lines} pax={client.pax} client={client} days={days} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Précédent
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.number}
                className={clsx(
                  'rounded-full transition-all',
                  s.number === step ? 'w-6 h-2 bg-rihla' : s.number < step ? 'w-2 h-2 bg-rihla/50' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700',
                )}
              />
            ))}
          </div>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 px-5 py-3 bg-rihla text-white rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* PDF Export */}
              <button
                disabled={exporting}
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-4 py-3 bg-slate-700 dark:bg-slate-600 text-white rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                title="Générer le PDF client"
              >
                {exporting
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Download size={15} />
                }
                {exporting ? 'Génération…' : 'Exporter PDF'}
              </button>
              {/* Save */}
              <button
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-3 bg-rihla text-white rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={15} />
                }
                Enregistrer le devis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
