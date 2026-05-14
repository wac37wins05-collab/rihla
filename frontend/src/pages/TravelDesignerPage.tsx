import { useState } from 'react'
import {
  MapPin, Hotel, Utensils, Bus, Calculator, Users,
  ChevronDown, ChevronUp, Eye, Landmark, Droplets,
  GripVertical, DollarSign, Compass, Mountain,
  Plus, X, Sparkles, Save, CheckCircle, Loader2, Edit2,
  Globe, Calendar, Star, Coffee,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  XLS_DAILY, XLS_FIXED, XLS_VARIABLE, XLS_SINGLE_SUPPLEMENT,
  XLS_MARGIN_PCT, XLS_GRID_REFERENCE, XLS_META, XLS_EXCHANGE_RATE,
} from '@/data/ys_travel_11d'
import { TravelDesignerMap } from '@/components/maps/TravelDesignerMap'
import { aiTravelDesignerApi, projectsApi, itinerariesApi, type GeneratedCircuit, type GeneratedDay } from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────
interface DayRow {
  day: number; date: string; km: number; cities: string
  hotel: string; formula: string; halfDbl: number; ss: number
  taxe: number; water: number; rest: string; restPrice: number
  monument: string; monuPrice: number; lg: number
}

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (v: number, cur = 'MAD') =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} ${cur}`

const CATEGORY_COLORS: Record<string, string> = {
  hotel: 'bg-blue-50 text-blue-700 border-blue-200',
  restaurant: 'bg-amber-50 text-amber-700 border-amber-200',
  monument: 'bg-purple-50 text-purple-700 border-purple-200',
  transport: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  guide: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  tax: 'bg-slate-50 text-slate-600 border-slate-200',
  water: 'bg-sky-50 text-sky-700 border-sky-200',
  misc: 'bg-rose-50 text-rose-700 border-rose-200',
}

const CITY_COORDS: Record<string, [number, number]> = {
  'CASABLANCA': [28, 32], 'RABAT': [33, 24], 'CHEFCHAOUEN': [46, 12],
  'FES': [48, 28], 'FÈS': [48, 28], 'MIDELT': [55, 40],
  'MERZOUGA': [68, 55], 'OUARZAZATE': [38, 60], 'MARRAKECH': [25, 55],
  'ESSAOUIRA': [10, 55],
}

// ── Circuit Map ──────────────────────────────────────────────────
function CircuitMap({ days }: { days: DayRow[] }) {
  const cities = days
    .map(d => d.cities.split(/[›→—]/)[0].trim().toUpperCase())
    .filter((c, i, a) => a.indexOf(c) === i && CITY_COORDS[c])

  const points = cities.map(c => CITY_COORDS[c] || [50, 50])

  return (
    <div className="relative w-full aspect-[5/4] bg-slate-900 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full p-6">
        <path d="M30 5 L60 8 L75 30 L72 65 L55 75 L20 70 L8 55 L12 25 Z"
              className="fill-white/5 stroke-white/10" strokeWidth="0.3" />
        {points.length > 1 && (
          <path
            d={`M ${points.map(p => `${p[0]} ${p[1]}`).join(' L ')}`}
            className="fill-none stroke-amber-400" strokeWidth="0.8"
            strokeDasharray="2 1"
          />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="1.8" className="fill-amber-400" />
            <text x={p[0] + 3} y={p[1] + 1}
                  className="fill-white/50 font-bold" style={{ fontSize: '3px' }}>
              {cities[i]}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Circuit Map</p>
          <p className="text-xs font-bold text-amber-200">{XLS_META.destination}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/30 uppercase">Total</p>
          <p className="text-sm font-black text-white">{XLS_META.km_total} km</p>
        </div>
      </div>
    </div>
  )
}

// ── Day Card ─────────────────────────────────────────────────────
function DayCard({ d, isExpanded, onToggle }: { d: DayRow; isExpanded: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: d.day })

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const dayCost = d.halfDbl + d.restPrice + d.monuPrice + d.taxe + d.water + d.lg

  return (
    <div ref={setNodeRef} style={dragStyle} className={clsx(
      'card overflow-hidden transition-all border-l-4',
      isDragging && 'shadow-2xl ring-2 ring-amber-400 opacity-90',
      isExpanded ? 'shadow-float border-l-amber-500' : 'border-l-transparent hover:border-l-amber-200'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-warm/40 transition-colors"
           onClick={onToggle}>
        <div
          className="text-slate-300 hover:text-amber-500 p-0.5 cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
          {...attributes}
          {...listeners}
        ><GripVertical size={14} /></div>
        <div className="w-7 h-7 rounded-full bg-slate-900 text-cream flex items-center justify-center text-[10px] font-black flex-shrink-0">
          {d.day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px] text-slate-800 truncate">{d.cities}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {d.hotel !== 'DEPART' && d.hotel !== 'DÉPART' && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Hotel size={9} /> {d.hotel}
              </span>
            )}
            {d.km > 0 && (
              <span className="text-[10px] text-slate-400">{d.km} km</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {d.formula && d.formula !== '—' && (
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase">{d.formula}</span>
          )}
          <span className="text-[11px] font-bold text-slate-600 tabular-nums">{fmt(dayCost)}</span>
          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="px-5 py-4 bg-white border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {d.halfDbl > 0 && (
              <CostChip icon={<Hotel size={12} />} label="Hotel (1/2 Dbl)" value={d.halfDbl} cat="hotel" />
            )}
            {d.ss > 0 && (
              <CostChip icon={<Hotel size={12} />} label="Single Suppl." value={d.ss} cat="hotel" />
            )}
            {d.restPrice > 0 && (
              <CostChip icon={<Utensils size={12} />} label={d.rest} value={d.restPrice} cat="restaurant" />
            )}
            {d.monuPrice > 0 && (
              <CostChip icon={<Landmark size={12} />} label={d.monument} value={d.monuPrice} cat="monument" />
            )}
            {d.taxe > 0 && (
              <CostChip icon={<DollarSign size={12} />} label="City Tax" value={d.taxe} cat="tax" />
            )}
            {d.water > 0 && (
              <CostChip icon={<Droplets size={12} />} label="Water" value={d.water} cat="water" />
            )}
            {d.lg > 0 && (
              <CostChip icon={<Compass size={12} />} label="Local Guide" value={d.lg} cat="guide" />
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{d.date}</span>
            <span className="text-sm font-black text-slate-700">
              Total jour: {fmt(dayCost)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function CostChip({ icon, label, value, cat }: { icon: React.ReactNode; label: string; value: number; cat: string }) {
  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px]', CATEGORY_COLORS[cat] || CATEGORY_COLORS.misc)}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-bold truncate">{label}</p>
      </div>
      <span className="font-black tabular-nums whitespace-nowrap">{fmt(value)}</span>
    </div>
  )
}

// ── Pricing Grid ─────────────────────────────────────────────────
function PricingGrid() {
  const paxBases = Object.keys(XLS_GRID_REFERENCE).map(Number)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-[10px] font-black uppercase text-slate-400">PAX</th>
            <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Cost/PAX</th>
            <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Sell/PAX</th>
            <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Margin</th>
            <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Group Total</th>
          </tr>
        </thead>
        <tbody>
          {paxBases.map(pax => {
            const ref = XLS_GRID_REFERENCE[pax]
            const margin = ref.sell - ref.cost
            return (
              <tr key={pax} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 font-black text-slate-800">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-amber-500" />
                    {pax} PAX
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">{fmt(ref.cost)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-800">{fmt(ref.sell)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-bold">{fmt(margin)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-black text-slate-800">{fmt(ref.sell * pax)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Cost Breakdown Chart ─────────────────────────────────────────
function CostBreakdown() {
  const items = [
    { label: 'Hotels', value: XLS_FIXED.hotels, color: 'bg-blue-500' },
    { label: 'Restaurants', value: XLS_FIXED.restaurants, color: 'bg-amber-500' },
    { label: 'Monuments', value: XLS_FIXED.monuments, color: 'bg-purple-500' },
    { label: 'City Taxes', value: XLS_FIXED.taxes, color: 'bg-slate-400' },
    { label: 'Water', value: XLS_FIXED.water, color: 'bg-sky-400' },
    { label: 'Local Guides', value: XLS_FIXED.local_guides, color: 'bg-cyan-500' },
    { label: 'Extras', value: XLS_FIXED.extras, color: 'bg-rose-400' },
  ]
  const total = items.reduce((s, i) => s + i.value, 0)

  return (
    <div className="space-y-2">
      <div className="flex rounded-full h-3 overflow-hidden">
        {items.map(i => (
          <div key={i.label} className={clsx(i.color, 'transition-all')}
               style={{ width: `${(i.value / total) * 100}%` }}
               title={`${i.label}: ${fmt(i.value)}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map(i => (
          <div key={i.label} className="flex items-center gap-2 text-[10px]">
            <div className={clsx('w-2 h-2 rounded-full', i.color)} />
            <span className="text-slate-500">{i.label}</span>
            <span className="font-bold text-slate-700 ml-auto tabular-nums">{fmt(i.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Variable Costs ───────────────────────────────────────────────
function VariableCosts() {
  const items = [
    { label: 'Autocar 48 PAX', sub: `${XLS_META.bus_rate_km} MAD/km x ${XLS_META.km_total} km`, value: XLS_VARIABLE.bus, icon: <Bus size={14} /> },
    { label: 'Guide National', sub: '1,000 MAD/day x 9 days', value: XLS_VARIABLE.guide, icon: <Compass size={14} /> },
    { label: 'Taxis Chefchaouen', sub: 'Pedestrian medina', value: XLS_VARIABLE.taxi_chef, icon: <Bus size={14} /> },
    { label: '4x4 Merzouga', sub: 'Sahara desert excursion', value: XLS_VARIABLE.merzouga_4x4, icon: <Mountain size={14} /> },
    { label: 'Vehicle Upgrade', sub: 'Premium coach', value: XLS_VARIABLE.upgrade, icon: <Bus size={14} /> },
  ]
  const total = Object.values(XLS_VARIABLE).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
          <div className="text-emerald-500">{i.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-700">{i.label}</p>
            <p className="text-[9px] text-slate-400">{i.sub}</p>
          </div>
          <span className="text-[12px] font-black text-slate-700 tabular-nums">{fmt(i.value)}</span>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Variable</span>
        <span className="text-sm font-black text-slate-800">{fmt(total)}</span>
      </div>
    </div>
  )
}

// ── AI Generator ─────────────────────────────────────────────────

const HOTEL_CATEGORIES = ['5*', '4*', '3*']
const MEAL_PLANS = [
  { value: 'FB', label: 'Pension complète' },
  { value: 'HB', label: 'Demi-pension' },
  { value: 'BB', label: 'Petit-déjeuner' },
  { value: 'RO', label: 'Sans repas' },
]
const CIRCUIT_TYPES = [
  { value: 'leisure', label: '🏖 Loisirs' },
  { value: 'mice', label: '🎯 MICE / Incentive' },
  { value: 'luxury', label: '⭐ Luxe' },
  { value: 'adventure', label: '🏔 Aventure' },
  { value: 'cultural', label: '🎭 Culturel' },
]

const AVAILABLE_CITIES = [
  'Casablanca','Rabat','Fès','Marrakech','Meknès','Chefchaouen',
  'Agadir','Ouarzazate','Merzouga','Essaouira','Tanger','Aït Ben Haddou',
]

const MEAL_PLAN_BADGE: Record<string, string> = {
  FB: 'bg-green-100 text-green-700',
  HB: 'bg-blue-100 text-blue-700',
  BB: 'bg-amber-100 text-amber-700',
  RO: 'bg-slate-100 text-slate-600',
}

// Editable AI Day Card
function AIDayCard({
  day,
  index,
  onUpdate,
}: {
  day: GeneratedDay
  index: number
  onUpdate: (index: number, updated: Partial<GeneratedDay>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [hotelEdit, setHotelEdit] = useState(day.hotel ?? '')
  const [activitiesEdit, setActivitiesEdit] = useState((day.activities ?? []).join(', '))
  const [mealEdit, setMealEdit] = useState(day.meal_plan)

  const save = () => {
    onUpdate(index, {
      hotel: hotelEdit,
      activities: activitiesEdit.split(',').map(a => a.trim()).filter(Boolean),
      meal_plan: mealEdit,
    })
    setEditing(false)
  }

  return (
    <div className="card overflow-hidden border-l-4 border-l-amber-400">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-black flex-shrink-0">
          {day.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm text-slate-800 truncate">{day.title || day.city}</p>
            <button
              onClick={() => { setEditing(!editing); setHotelEdit(day.hotel ?? ''); setActivitiesEdit((day.activities ?? []).join(', ')); setMealEdit(day.meal_plan) }}
              className="text-slate-400 hover:text-amber-500 flex-shrink-0 transition-colors"
            >
              <Edit2 size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <MapPin size={9} /> {day.city}
            </span>
            {day.distance_km && day.distance_km > 0 && (
              <span className="text-[10px] text-slate-400">{day.distance_km} km</span>
            )}
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-bold', MEAL_PLAN_BADGE[day.meal_plan] ?? 'bg-slate-100 text-slate-500')}>
              {day.meal_plan}
            </span>
          </div>

          {!editing ? (
            <div className="mt-2 space-y-1">
              {day.hotel && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <Hotel size={10} className="text-blue-400" /> {day.hotel}
                </div>
              )}
              {(day.activities ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(day.activities ?? []).map((a, i) => (
                    <span key={i} className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Hôtel</label>
                <input className="input-base text-xs" value={hotelEdit} onChange={e => setHotelEdit(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Activités (séparées par virgule)</label>
                <input className="input-base text-xs" value={activitiesEdit} onChange={e => setActivitiesEdit(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Repas</label>
                <select className="input-base text-xs" value={mealEdit} onChange={e => setMealEdit(e.target.value)}>
                  {MEAL_PLANS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="btn-primary btn-sm text-xs">
                  <CheckCircle size={11} /> Sauvegarder
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary btn-sm text-xs">Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// AI Generator Panel
function AIGeneratorPanel() {
  const qc = useQueryClient()
  const [selectedCities, setSelectedCities] = useState<string[]>(['Marrakech', 'Fès', 'Merzouga'])
  const [duration, setDuration] = useState(8)
  const [hotelCat, setHotelCat] = useState('5*')
  const [mealPlan, setMealPlan] = useState('HB')
  const [circuitType, setCircuitType] = useState('leisure')
  const [brief, setBrief] = useState('')
  const [paxMin, setPaxMin] = useState(20)
  const [paxMax, setPaxMax] = useState(30)
  const [margin, setMargin] = useState(18)
  const [result, setResult] = useState<GeneratedCircuit | null>(null)
  const [editedDays, setEditedDays] = useState<GeneratedDay[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  const generateMut = useMutation({
    mutationFn: () => aiTravelDesignerApi.generate({
      brief: brief || undefined,
      duration_days: duration,
      hotel_category: hotelCat,
      meal_plan: mealPlan,
      cities: selectedCities,
      circuit_type: circuitType,
      language: 'fr',
      pax_ranges: [{ min: paxMin, max: paxMax }],
      margin_pct: margin,
    }),
    onSuccess: res => {
      setResult(res.data.data)
      setEditedDays(res.data.data.days ?? [])
    },
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No circuit generated')
      // 1. Create project
      const proj = await projectsApi.create({
        name: result.title,
        client_name: '',
        destination: result.destination,
        duration_days: result.duration_days,
        duration_nights: result.duration_days - 1,
        project_type: circuitType,
        status: 'draft',
      })
      const projectId = (proj.data as any).id
      // 2. Create itinerary with edited days
      await itinerariesApi.create({
        project_id: projectId,
        language: 'fr',
        days: editedDays.map(d => ({
          day_number: d.day_number,
          city: d.city,
          title: d.title || d.city,
          hotel: d.hotel ?? undefined,
          hotel_category: d.hotel_category ?? undefined,
          meal_plan: d.meal_plan,
          activities: d.activities,
          distance_km: d.distance_km ?? undefined,
        })),
      })
      return { projectId }
    },
    onSuccess: () => {
      setSaveSuccess(true)
      qc.invalidateQueries({ queryKey: ['projects'] })
      setTimeout(() => setSaveSuccess(false), 4000)
    },
  })

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  const updateDay = (index: number, updated: Partial<GeneratedDay>) => {
    setEditedDays(prev => prev.map((d, i) => i === index ? { ...d, ...updated } : d))
  }

  const pricing = result?.pricing
  const firstRange = pricing?.ranges?.[0]

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Générateur IA de circuit</h2>
            <p className="text-[10px] text-slate-400">Basé sur la knowledge base S'TOURS Morocco · 12 villes · moteur de prix intégré</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                <Globe size={10} className="inline mr-1" />Villes du circuit
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={clsx(
                      'text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all',
                      selectedCities.includes(city)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                <Calendar size={10} className="inline mr-1" />Durée (jours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={3} max={21} value={duration}
                  onChange={e => setDuration(+e.target.value)}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-sm font-black text-slate-700 w-16 text-right">{duration}J/{duration-1}N</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Type de circuit</label>
              <div className="flex flex-wrap gap-1.5">
                {CIRCUIT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setCircuitType(t.value)}
                    className={clsx(
                      'text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-all',
                      circuitType === t.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Brief client (optionnel)
              </label>
              <textarea
                rows={3}
                className="input-base text-xs resize-none"
                placeholder="Ex: Groupe de 25 seniors français, passionnés d'histoire, budget confort…"
                value={brief}
                onChange={e => setBrief(e.target.value)}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  <Star size={10} className="inline mr-1" />Catégorie hôtel
                </label>
                <select className="input-base text-xs" value={hotelCat} onChange={e => setHotelCat(e.target.value)}>
                  {HOTEL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  <Coffee size={10} className="inline mr-1" />Formule repas
                </label>
                <select className="input-base text-xs" value={mealPlan} onChange={e => setMealPlan(e.target.value)}>
                  {MEAL_PLANS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                <Users size={10} className="inline mr-1" />Tranche PAX
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={200} className="input-base text-xs font-mono w-20" value={paxMin} onChange={e => setPaxMin(+e.target.value)} />
                <span className="text-slate-400 text-xs">→</span>
                <input type="number" min={1} max={200} className="input-base text-xs font-mono w-20" value={paxMax} onChange={e => setPaxMax(+e.target.value)} />
                <span className="text-[10px] text-slate-400">pax</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                <DollarSign size={10} className="inline mr-1" />Marge (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={5} max={50} value={margin}
                  onChange={e => setMargin(+e.target.value)}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-black text-emerald-600 w-12 text-right">{margin}%</span>
              </div>
            </div>

            {/* Summary chip */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">Résumé de la demande</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCities.slice(0, 5).map(c => (
                  <span key={c} className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{c}</span>
                ))}
                {selectedCities.length > 5 && <span className="text-[9px] text-slate-400">+{selectedCities.length - 5}</span>}
                <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{duration}J</span>
                <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{hotelCat}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{margin}%</span>
              </div>
            </div>

            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending || selectedCities.length === 0}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all',
                generateMut.isPending || selectedCities.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-md hover:shadow-lg'
              )}
            >
              {generateMut.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Génération en cours…</>
              ) : (
                <><Sparkles size={16} /> Générer le circuit IA</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {generateMut.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {(generateMut.error as any)?.message ?? 'Erreur lors de la génération'}
        </div>
      )}

      {/* Result */}
      {result && editedDays.length > 0 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800 text-lg">{result.title}</h2>
              <p className="text-sm text-slate-500">{result.destination} · {result.duration_days}J/{result.duration_days - 1}N · {result.hotel_category} · {result.circuit_type}</p>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle size={13} /> Projet créé !
                </span>
              )}
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Sauvegarder comme projet
              </button>
            </div>
          </div>

          {/* Pricing summary */}
          {firstRange && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Coût/pax', value: `${Math.round(firstRange.cost_per_person)} €`, color: 'text-slate-700' },
                { label: 'Prix vente/pax', value: `${Math.round(firstRange.selling_per_person)} €`, color: 'text-violet-700 font-black' },
                { label: 'Marge/pax', value: `${Math.round(firstRange.margin_per_pax)} €`, color: 'text-emerald-600' },
                { label: `Total groupe (${paxMin}→${paxMax}pax)`, value: `${Math.round(firstRange.selling_total_group)} €`, color: 'text-slate-700' },
              ].map(k => (
                <div key={k.label} className="card-warm px-4 py-3 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{k.label}</p>
                  <p className={clsx('text-sm font-bold tabular-nums', k.color)}>{k.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Day cards — editable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {editedDays.map((day, i) => (
              <AIDayCard key={i} day={day} index={i} onUpdate={updateDay} />
            ))}
          </div>

          {/* Save error */}
          {saveMut.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              ⚠️ Erreur de sauvegarde : {(saveMut.error as any)?.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
type Tab = 'ai' | 'circuit' | 'costs' | 'grid' | 'compare'

export function TravelDesignerPage() {
  const [tab, setTab] = useState<Tab>('circuit')
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]))
  const [paxForCalc, setPaxForCalc] = useState(20)
  const [days, setDays] = useState<DayRow[]>(XLS_DAILY as DayRow[])
  const [waypoints, setWaypoints] = useState<{ id: string; lat: number; lng: number; label: string }[]>([])
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setDays(prev => {
        const oldIndex = prev.findIndex(d => d.day === Number(active.id))
        const newIndex = prev.findIndex(d => d.day === Number(over.id))
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setPendingPin({ lat, lng })
    setPendingLabel('')
  }

  const confirmWaypoint = () => {
    if (!pendingPin) return
    setWaypoints(prev => [...prev, {
      id: `wp-${Date.now()}`,
      lat: pendingPin.lat,
      lng: pendingPin.lng,
      label: pendingLabel.trim() || `Point ${prev.length + 1}`,
    }])
    setPendingPin(null)
  }

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(day) ? next.delete(day) : next.add(day)
      return next
    })
  }
  const fixedPerPax = Object.values(XLS_FIXED).reduce((s, v) => s + v, 0)
  const variableTotal = Object.values(XLS_VARIABLE).reduce((s, v) => s + v, 0)
  const variablePerPax = variableTotal / paxForCalc
  const costPerPax = fixedPerPax + variablePerPax
  const sellPerPax = Math.round(costPerPax * (1 + XLS_MARGIN_PCT / 100))

  const TABS: { id: Tab; label: string; icon: typeof MapPin; highlight?: boolean }[] = [
    { id: 'ai',      label: 'IA Generator',   icon: Sparkles, highlight: true },
    { id: 'circuit', label: 'Circuit Designer', icon: MapPin },
    { id: 'costs',   label: 'Cost Breakdown',  icon: Calculator },
    { id: 'grid',    label: 'PAX Grid',         icon: Users },
    { id: 'compare', label: 'XLS Parity',       icon: Eye },
  ]

  return (
    <div className="min-h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
              <Compass size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Travel Designer</h1>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                {XLS_META.reference} — {XLS_META.client} vs {XLS_META.competitor}
              </p>
            </div>
          </div>

          {/* KPI Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            {[
              { label: 'Duration', value: XLS_META.duration },
              { label: 'Distance', value: `${XLS_META.km_total} km` },
              { label: 'Fixed/PAX', value: fmt(fixedPerPax) },
              { label: 'Variable', value: fmt(variableTotal) },
              { label: `Sell @${paxForCalc}`, value: fmt(sellPerPax) },
              { label: 'SS Total', value: fmt(XLS_SINGLE_SUPPLEMENT) },
            ].map(k => (
              <div key={k.label} className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
                <p className="text-sm font-bold text-slate-800 tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex items-center gap-1 mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg',
                  active && t.highlight
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                    : active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : t.highlight
                    ? 'text-violet-500 hover:text-violet-700 hover:bg-violet-50 border border-violet-200'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                )}>
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {tab === 'ai' && <AIGeneratorPanel />}

        {tab === 'circuit' && (
          <div className="space-y-6">
            {/* Interactive Travel Designer Map (3 views: global / day / timeline) */}
            <TravelDesignerMap
              days={days}
              destinationLabel={XLS_META.destination}
              paxCount={paxForCalc}
              onMapClick={handleMapClick}
              waypoints={waypoints}
            />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={days.map(d => d.day)} strategy={verticalListSortingStrategy}>
                  {days.map(d => (
                    <DayCard key={d.day} d={d}
                      isExpanded={expandedDays.has(d.day)}
                      onToggle={() => toggleDay(d.day)} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="card p-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Circuit Summary</h3>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500">Nights</span><span className="font-bold">8</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Hotels</span><span className="font-bold">{days.filter(d => d.hotel !== 'DÉPART').length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Restaurants</span><span className="font-bold">{days.filter(d => d.restPrice > 0).length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Monuments</span><span className="font-bold">{days.filter(d => d.monuPrice > 0).length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Local Guides</span><span className="font-bold">{days.filter(d => d.lg > 0).length} days</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total KM</span><span className="font-bold">{days.reduce((s, d) => s + d.km, 0)}</span></div>
                </div>
              </div>
              <div className="card p-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Calc</h3>
                <label className="text-[10px] font-bold text-slate-500 uppercase">PAX Count</label>
                <input type="number" min={1} max={100} value={paxForCalc}
                  onChange={e => setPaxForCalc(Number(e.target.value) || 1)}
                  className="input-base mt-1 mb-3" />
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500">Cost/PAX</span><span className="font-bold">{fmt(costPerPax)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sell/PAX ({XLS_MARGIN_PCT}%)</span><span className="font-black text-emerald-600">{fmt(sellPerPax)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Group Total</span><span className="font-black">{fmt(sellPerPax * paxForCalc)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SS</span><span className="font-bold">{fmt(XLS_SINGLE_SUPPLEMENT)}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-slate-500">USD equiv.</span>
                    <span className="font-bold">${Math.round(sellPerPax / XLS_EXCHANGE_RATE)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {tab === 'costs' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <div className="card p-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Fixed Costs per PAX (constant regardless of group size)
                </h3>
                <CostBreakdown />
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Fixed / PAX</span>
                  <span className="text-lg font-black text-slate-800">{fmt(fixedPerPax)}</span>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <div className="card p-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Variable Costs (divided by PAX)
                </h3>
                <VariableCosts />
              </div>
              <div className="card p-5 mt-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Per-PAX Extras</h3>
                <div className="space-y-2 text-[11px]">
                  {[
                    ['Tips (luggage)', 70], ['Tips (restaurants)', 75],
                    ['Horse carriage', 100], ['4WD Merzouga', 280],
                    ['Camel ride', 100],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between px-3 py-1.5 bg-slate-50 rounded">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-bold">{fmt(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Total extras/PAX</span>
                    <span className="font-black">{fmt(625)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'grid' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                PAX Scaling Grid — {XLS_META.reference}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-bold">
                  Margin: {XLS_MARGIN_PCT}%
                </span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-bold">
                  FOC: 1 (Tour Leader)
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">
                  SS: {fmt(XLS_SINGLE_SUPPLEMENT)}
                </span>
              </div>
            </div>
            <PricingGrid />
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 space-y-1">
              <p>All prices in MAD (Moroccan Dirhams). Rate: 1 USD = {XLS_EXCHANGE_RATE} MAD</p>
              <p>FOC: 1 tour leader in twin share (no extra room charge)</p>
              <p>Single Supplement: {fmt(XLS_SINGLE_SUPPLEMENT)} per single room request</p>
            </div>
          </div>
        )}

        {tab === 'compare' && (
          <XlsParityCheck paxForCalc={paxForCalc} />
        )}
      </div>

      {/* ── Pending-pin modal ───────────────────────────────────────── */}
      {pendingPin && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center pb-8 px-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-sm pointer-events-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">
                  📍 Nouveau point d'intérêt
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}
                </p>
              </div>
              <button onClick={() => setPendingPin(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              placeholder="Nom du lieu (ex: Riad Al Jazira, Mosquée Hassan II…)"
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmWaypoint() }}
              className="input-base mb-3 text-[12px]"
            />
            <div className="flex gap-2">
              <button onClick={confirmWaypoint}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-xl hover:bg-slate-700 transition-colors">
                <Plus size={13} /> Ajouter au circuit
              </button>
              <button onClick={() => setPendingPin(null)}
                className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── XLS Parity Check ─────────────────────────────────────────────
function XlsParityCheck({ paxForCalc }: { paxForCalc: number }) {
  const fixedPerPax = Object.values(XLS_FIXED).reduce((s, v) => s + v, 0)
  const variableTotal = Object.values(XLS_VARIABLE).reduce((s, v) => s + v, 0)
  const extras = 625

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Verification: RIHLA Computation vs XLS Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase text-slate-400">PAX</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">XLS Cost</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">RIHLA Cost</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Delta</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">XLS Sell</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">RIHLA Sell</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-slate-400">Delta</th>
                <th className="text-center py-2 px-3 text-[10px] font-black uppercase text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(XLS_GRID_REFERENCE).map(([paxStr, ref]) => {
                const pax = Number(paxStr)
                const rihlaCost = Math.round(fixedPerPax + variableTotal / pax + extras)
                const rihlaSell = Math.round(rihlaCost * (1 + XLS_MARGIN_PCT / 100))
                const deltaCost = rihlaCost - ref.cost
                const deltaSell = rihlaSell - ref.sell
                const isClose = Math.abs(deltaSell) < 200

                return (
                  <tr key={pax} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-black">{pax} PAX</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmt(ref.cost)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmt(rihlaCost)}</td>
                    <td className={clsx('py-2.5 px-3 text-right tabular-nums font-bold',
                      deltaCost === 0 ? 'text-emerald-600' : Math.abs(deltaCost) < 100 ? 'text-amber-600' : 'text-red-500'
                    )}>
                      {deltaCost >= 0 ? '+' : ''}{deltaCost}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmt(ref.sell)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmt(rihlaSell)}</td>
                    <td className={clsx('py-2.5 px-3 text-right tabular-nums font-bold',
                      deltaSell === 0 ? 'text-emerald-600' : Math.abs(deltaSell) < 100 ? 'text-amber-600' : 'text-red-500'
                    )}>
                      {deltaSell >= 0 ? '+' : ''}{deltaSell}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={clsx(
                        'text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                        isClose ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {isClose ? 'MATCH' : 'DELTA'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          Computation Method
        </h3>
        <div className="text-[11px] text-slate-600 space-y-2">
          <p><strong>Fixed/PAX</strong> = Hotels ({fmt(XLS_FIXED.hotels)}) + Restaurants ({fmt(XLS_FIXED.restaurants)}) + Monuments ({fmt(XLS_FIXED.monuments)}) + Taxes ({fmt(XLS_FIXED.taxes)}) + Water ({fmt(XLS_FIXED.water)}) + Local Guides ({fmt(XLS_FIXED.local_guides)}) + Extras ({fmt(XLS_FIXED.extras)})</p>
          <p><strong>Variable/PAX</strong> = (Bus + Guide + Taxi + 4x4 + Upgrade) / PAX count</p>
          <p><strong>Extras/PAX</strong> = Tips luggage (70) + Tips rest (75) + Horse (100) + 4WD (280) + Camel (100) = 625 MAD</p>
          <p><strong>Cost/PAX</strong> = Fixed + Variable/PAX + Extras</p>
          <p><strong>Sell/PAX</strong> = Cost x (1 + {XLS_MARGIN_PCT}%)</p>
          <p className="text-[10px] text-slate-400 italic mt-2">Note: Small deltas are expected due to rounding differences between Excel and RIHLA engine.</p>
        </div>
      </div>
    </div>
  )
}
