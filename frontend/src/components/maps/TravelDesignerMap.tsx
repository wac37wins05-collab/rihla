/**
 * Travel Designer Map — carte interactive et ÉDITABLE du circuit.
 *
 * Nouvelles features d'édition (v2) :
 *   ✦ Drag-and-drop des étapes entre jours (panneau latéral)
 *   ✦ Réordonnement des jours par glisser-déposer
 *   ✦ Créer une étape en cliquant sur la carte (modal + geocoding)
 *   ✦ Édition inline du nom d'hôtel, restaurant, monument
 *
 * Tabs :
 *   • 🗺 Vue globale         — route complète Leaflet + ressources
 *   • 📅 Éditeur jour        — jour sélectionné + édition drag-and-drop intra-jour
 *   • ⏱ Timeline horaire     — Gantt vertical synthétisé
 */

import { useMemo, useState, useCallback, useRef } from 'react'
import {
  MapContainer, TileLayer, Marker, Polyline, ZoomControl,
  useMap, CircleMarker, Tooltip, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, Active } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Hotel as HotelIcon, Utensils, Landmark, Bus, MapPin, Sun, Sunset, Moon, Coffee,
  ArrowRight, Calendar, ChevronLeft, ChevronRight, Map as MapIcon, Clock, Globe2,
  Users, GripVertical, Plus, X, Check, Edit2, Trash2, AlertCircle, Move,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────

export interface DesignerDay {
  day: number
  date: string
  km: number
  cities: string
  hotel: string
  formula: string
  halfDbl: number
  ss: number
  taxe: number
  water: number
  rest: string
  restPrice: number
  monument: string
  monuPrice: number
  lg: number
}

interface CityNode {
  key: string
  display: string
  lat: number
  lng: number
}

interface DayStop {
  day: DesignerDay
  city: CityNode
}

export interface Waypoint {
  id: string
  lat: number
  lng: number
  label: string
}

// ── City database ────────────────────────────────────────────────────

const CITY_DB: Record<string, { display: string; lat: number; lng: number }> = {
  CASABLANCA:  { display: 'Casablanca',  lat: 33.5731, lng: -7.5898 },
  CASA:        { display: 'Casablanca',  lat: 33.5731, lng: -7.5898 },
  RABAT:       { display: 'Rabat',       lat: 34.0209, lng: -6.8417 },
  RBA:         { display: 'Rabat',       lat: 34.0209, lng: -6.8417 },
  CHEFCHAOUEN: { display: 'Chefchaouen', lat: 35.1688, lng: -5.2636 },
  TANGER:      { display: 'Tanger',      lat: 35.7595, lng: -5.8340 },
  TETOUAN:     { display: 'Tétouan',     lat: 35.5786, lng: -5.3684 },
  FES:         { display: 'Fès',         lat: 34.0181, lng: -5.0078 },
  'FÈS':       { display: 'Fès',         lat: 34.0181, lng: -5.0078 },
  MEKNES:      { display: 'Meknès',      lat: 33.8935, lng: -5.5547 },
  'MEKNÈS':    { display: 'Meknès',      lat: 33.8935, lng: -5.5547 },
  MIDELT:      { display: 'Midelt',      lat: 32.6852, lng: -4.7333 },
  ERFOUD:      { display: 'Erfoud',      lat: 31.4293, lng: -4.2299 },
  MERZOUGA:    { display: 'Merzouga',    lat: 31.0998, lng: -4.0125 },
  OUARZAZATE:  { display: 'Ouarzazate',  lat: 30.9189, lng: -6.8934 },
  MARRAKECH:   { display: 'Marrakech',   lat: 31.6295, lng: -7.9811 },
  RAK:         { display: 'Marrakech',   lat: 31.6295, lng: -7.9811 },
  ESSAOUIRA:   { display: 'Essaouira',   lat: 31.5085, lng: -9.7595 },
  ESS:         { display: 'Essaouira',   lat: 31.5085, lng: -9.7595 },
  AGADIR:      { display: 'Agadir',      lat: 30.4278, lng: -9.5981 },
  DAKHLA:      { display: 'Dakhla',      lat: 23.6848, lng: -15.9579 },
}

function resolveCity(token: string): CityNode | null {
  const norm = token.trim().toUpperCase().replace(/[—–]/g, ' ').split(/\s+/)[0]
  if (CITY_DB[norm]) return { key: norm, ...CITY_DB[norm] }
  const stripped = norm.replace(/È/g, 'E').replace(/É/g, 'E')
  if (CITY_DB[stripped]) return { key: stripped, ...CITY_DB[stripped] }
  return null
}

function primaryCity(d: DesignerDay): CityNode | null {
  const parts = d.cities.split(/[›→\->\/]+/).map(s => s.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const c = resolveCity(parts[i])
    if (c) return c
  }
  return resolveCity(d.cities)
}

// ── Leaflet helpers ──────────────────────────────────────────────────

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

const TYPE_META = {
  hotel:      { color: '#2563eb', emoji: '🏨', label: 'Hôtel' },
  restaurant: { color: '#d97706', emoji: '🍽',  label: 'Restaurant' },
  monument:   { color: '#7c3aed', emoji: '🏛',  label: 'Monument' },
  transport:  { color: '#059669', emoji: '🚌', label: 'Transport' },
  guide:      { color: '#0891b2', emoji: '👤', label: 'Guide local' },
} as const
type ResourceType = keyof typeof TYPE_META

const dotIcon = (type: ResourceType, label: string) => L.divIcon({
  className: 'rihla-designer-dot',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<div style="position:relative;width:30px;height:30px;border-radius:50%;background:${TYPE_META[type].color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.20),0 0 0 4px ${TYPE_META[type].color}22;" title="${label.replace(/"/g, '&quot;')}">${TYPE_META[type].emoji}</div>`,
})

const stopIcon = (n: number, color: string, isDragging = false) => L.divIcon({
  className: 'rihla-designer-stop',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 6px 14px rgba(0,0,0,.20),0 0 0 6px ${color}28;${isDragging ? 'transform:scale(1.2);' : ''}">J${n}</div>`,
})

const newPinIcon = () => L.divIcon({
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f59e0b;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.25)"><div style="transform:rotate(45deg);text-align:center;font-size:14px;line-height:24px">📍</div></div>`,
})

function curvedPath(a: [number, number], b: [number, number], steps = 36, bulge = 0.18): [number, number][] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const dy = b[0] - a[0]
  const dx = b[1] - a[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = -dy / (len || 1)
  const ny =  dx / (len || 1)
  const ctrl: [number, number] = [mid[0] + nx * len * bulge, mid[1] + ny * len * bulge]
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0]
    const lng = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]
    out.push([lat, lng])
  }
  return out
}

function offsetAround(c: CityNode, idx: number): [number, number] {
  const r = 0.025
  const angle = (idx * (Math.PI * 2) / 5) + 0.6
  return [c.lat + r * Math.sin(angle), c.lng + r * Math.cos(angle)]
}

function FitBounds({ stops, dep, padding = 80 }: { stops: DayStop[]; dep: number; padding?: number }) {
  const map = useMap()
  useMemo(() => {
    if (!stops.length) return
    const pts = stops.map(s => [s.city.lat, s.city.lng] as [number, number])
    map.fitBounds(L.latLngBounds(pts), { padding: [padding, padding], maxZoom: 9 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])
  return null
}

// ── Timeline helpers ─────────────────────────────────────────────────

interface Slot {
  time: string
  type: ResourceType | 'rest' | 'travel'
  label: string
  detail?: string
  cost?: number
}

function buildSchedule(d: DesignerDay): Slot[] {
  const out: Slot[] = []
  const isFB = d.formula === 'FB'
  const isBB = d.formula === 'BB'
  if (d.hotel && d.hotel !== '—' && d.hotel !== 'DÉPART') {
    out.push({ time: '07:30', type: 'hotel', label: 'Petit-déjeuner', detail: d.hotel })
  }
  if (d.km > 0) {
    out.push({ time: '08:30', type: 'transport', label: `Route ${d.km} km`, detail: d.cities })
  }
  if (d.lg > 0) {
    out.push({ time: '10:00', type: 'guide', label: 'Guide local', detail: d.cities.split(/[›→]/).pop()?.trim(), cost: d.lg })
  }
  if (d.restPrice > 0 && !isBB) {
    out.push({ time: '12:30', type: 'restaurant', label: 'Déjeuner', detail: d.rest, cost: d.restPrice })
  } else if (!isBB) {
    out.push({ time: '12:30', type: 'rest', label: 'Déjeuner libre' })
  }
  if (d.monuPrice > 0 || (d.monument && d.monument !== '—')) {
    out.push({ time: '14:30', type: 'monument', label: d.monument || 'Visite culturelle', cost: d.monuPrice })
  }
  if (d.hotel && d.hotel !== '—' && d.hotel !== 'DÉPART') {
    out.push({ time: '17:30', type: 'hotel', label: 'Check-in', detail: d.hotel, cost: d.halfDbl })
  }
  if (d.formula && d.formula !== '—' && d.formula !== '' && !isBB) {
    out.push({ time: '19:30', type: 'restaurant', label: 'Dîner', detail: isFB ? d.rest : `${d.hotel} (${d.formula})`, cost: isFB ? d.restPrice : 0 })
  }
  return out
}

const SLOT_PERIODS = [
  { label: 'Matin',       icon: Sun,     range: ['06:00', '12:00'] },
  { label: 'Midi',        icon: Coffee,  range: ['12:00', '14:00'] },
  { label: 'Après-midi',  icon: Sun,     range: ['14:00', '18:00'] },
  { label: 'Soir',        icon: Sunset,  range: ['18:00', '22:00'] },
  { label: 'Nuit',        icon: Moon,    range: ['22:00', '24:00'] },
]

function periodOf(time: string): number {
  const [h] = time.split(':').map(Number)
  if (h < 12) return 0
  if (h < 14) return 1
  if (h < 18) return 2
  if (h < 22) return 3
  return 4
}

// ── Intra-day resource type ──────────────────────────────────────────

interface IntraStop {
  id: string
  type: ResourceType
  pos: [number, number]
  label: string
  cost?: number
  editable?: boolean
}

function buildIntraDay(stop: DayStop): IntraStop[] {
  const center = stop.city
  const r = 0.012
  const rotate = (i: number): [number, number] => {
    const a = (i * Math.PI * 2) / 5 + 0.5
    return [center.lat + r * Math.sin(a), center.lng + r * Math.cos(a)]
  }
  const out: IntraStop[] = []
  let i = 0
  if (stop.day.hotel && stop.day.hotel !== '—' && stop.day.hotel !== 'DÉPART') {
    out.push({ id: `hotel-${stop.day.day}`, type: 'hotel', pos: [center.lat, center.lng], label: stop.day.hotel, cost: stop.day.halfDbl, editable: true })
    i++
  }
  if (stop.day.lg > 0) {
    out.push({ id: `guide-${stop.day.day}`, type: 'guide', pos: rotate(i++), label: 'Guide local', cost: stop.day.lg, editable: false })
  }
  if (stop.day.monuPrice > 0 || (stop.day.monument && stop.day.monument !== '—')) {
    out.push({ id: `monument-${stop.day.day}`, type: 'monument', pos: rotate(i++), label: stop.day.monument || 'Monument', cost: stop.day.monuPrice, editable: true })
  }
  if (stop.day.restPrice > 0 || stop.day.rest) {
    out.push({ id: `resto-${stop.day.day}`, type: 'restaurant', pos: rotate(i++), label: stop.day.rest || 'Restaurant', cost: stop.day.restPrice, editable: true })
  }
  return out
}

// ── Modal: ajouter une étape via clic sur la carte ────────────────────

interface NewStopModal {
  lat: number
  lng: number
}

interface NewStopForm {
  type: ResourceType
  label: string
  targetDay: number
  cost: string
}

function AddStopModal({
  modal,
  days,
  onConfirm,
  onClose,
}: {
  modal: NewStopModal
  days: DesignerDay[]
  onConfirm: (form: NewStopForm) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<NewStopForm>({
    type: 'hotel',
    label: '',
    targetDay: days[0]?.day ?? 1,
    cost: '',
  })

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <MapPin size={16} className="text-rose-700" />
            Ajouter une étape
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-mono mb-4">
          📍 {modal.lat.toFixed(4)}, {modal.lng.toFixed(4)}
        </div>

        <div className="space-y-3">
          {/* Type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(TYPE_META) as ResourceType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border text-[9px] font-bold transition-all',
                    form.type === t
                      ? 'border-rose-700 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300'
                  )}
                >
                  <span className="text-base">{TYPE_META[t].emoji}</span>
                  <span className="truncate">{TYPE_META[t].label.slice(0, 5)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Nom</label>
            <input
              autoFocus
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder={`Ex: ${form.type === 'hotel' ? 'Riad El Fenn' : form.type === 'restaurant' ? 'Dar Zitoun' : 'Médina de Fès'}`}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-rose-700 focus:ring-2 focus:ring-rose-700/20 outline-none"
            />
          </div>

          {/* Jour cible */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Affecter au jour</label>
            <select
              value={form.targetDay}
              onChange={e => setForm(f => ({ ...f, targetDay: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-rose-700 outline-none"
            >
              {days.map(d => (
                <option key={d.day} value={d.day}>
                  J{d.day} · {d.cities.split(/[›→]/)[0].trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Coût optionnel */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Coût (MAD, optionnel)</label>
            <input
              type="number"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              placeholder="0"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-rose-700 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-bold"
          >
            Annuler
          </button>
          <button
            disabled={!form.label.trim()}
            onClick={() => { if (form.label.trim()) onConfirm(form) }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-700 text-white text-sm font-black hover:bg-rose-800 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check size={14} /> Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sortable day item in sidebar ─────────────────────────────────────

function SortableDayItem({
  stop,
  isActive,
  onClick,
}: {
  stop: DayStop
  isActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.day.day })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'w-full text-left rounded-xl border transition select-none',
        isDragging && 'opacity-40 shadow-2xl ring-2 ring-rose-400',
        isActive ? 'bg-rose-700 text-white border-rose-700 shadow' : 'bg-white border-slate-200',
      )}
    >
      <div className="flex items-stretch">
        {/* Drag handle */}
        <button
          className={clsx(
            'flex items-center px-2 rounded-l-xl cursor-grab active:cursor-grabbing touch-none',
            isActive ? 'text-rose-200 hover:text-white' : 'text-slate-300 hover:text-slate-500',
          )}
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Glisser pour réordonner"
        >
          <GripVertical size={14} />
        </button>

        {/* Content */}
        <button className="flex-1 text-left px-2 py-2.5" onClick={onClick}>
          <div className={clsx('text-[10px] font-bold uppercase tracking-wider',
            isActive ? 'text-rose-100' : 'text-rose-700')}>
            J{stop.day.day} · {stop.day.date}
          </div>
          <div className={clsx('text-[12px] font-semibold leading-tight mt-0.5',
            isActive ? 'text-white' : 'text-slate-900')}>{stop.city.display}</div>
          <div className={clsx('text-[10px] leading-tight mt-0.5 truncate',
            isActive ? 'text-rose-100/80' : 'text-slate-400')}>
            {stop.day.km > 0 ? `${stop.day.km} km · ` : ''}{stop.day.hotel || '—'}
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Sortable intra-day resource item ─────────────────────────────────

function SortableIntraItem({
  item,
  onEditLabel,
  onRemove,
}: {
  item: IntraStop
  onEditLabel: (id: string, label: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(item.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitEdit = () => {
    if (editVal.trim()) onEditLabel(item.id, editVal.trim())
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white transition-all',
        isDragging ? 'shadow-2xl ring-2 ring-rose-400 border-rose-200 opacity-90 z-50' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {/* Drag handle */}
      <button
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* Emoji badge */}
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px] flex-shrink-0"
        style={{ background: TYPE_META[item.type].color }}
      >
        {TYPE_META[item.type].emoji}
      </span>

      {/* Label (editable) */}
      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditVal(item.label); setEditing(false) } }}
          className="flex-1 text-xs px-2 py-1 rounded-lg border border-rose-400 focus:ring-2 focus:ring-rose-400/30 outline-none font-semibold"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-[12px] font-semibold text-slate-800 truncate">{item.label}</span>
      )}

      {/* Cost */}
      {item.cost !== undefined && item.cost > 0 && (
        <span className="text-[10px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
          {Math.round(item.cost)} MAD
        </span>
      )}

      {/* Actions */}
      {item.editable !== false && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-700 transition-colors"
            title="Renommer"
          >
            <Edit2 size={11} />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Summary cell ─────────────────────────────────────────────────────

function SummaryCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
        <Icon size={10} /> {label}
      </div>
      <div className="text-[14px] font-extrabold text-slate-900 leading-none mt-1">{value}</div>
    </div>
  )
}

// ── Slot row (timeline) ───────────────────────────────────────────────

function SlotRow({ slot }: { slot: Slot }) {
  const meta = (slot.type === 'rest' || slot.type === 'travel') ? null : TYPE_META[slot.type]
  const color = meta?.color ?? '#64748b'
  const emoji = meta?.emoji ?? (slot.type === 'travel' ? '🚌' : '☕')
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:border-slate-300 transition">
      <span className="text-[11px] font-mono font-bold text-slate-700 w-12 shrink-0 mt-0.5">{slot.time}</span>
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[14px] shrink-0" style={{ background: color }}>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-900 truncate">{slot.label}</div>
        {slot.detail && <div className="text-[11px] text-slate-500 truncate">{slot.detail}</div>}
      </div>
      {typeof slot.cost === 'number' && slot.cost > 0 && (
        <span className="text-[11px] font-bold text-slate-700 tabular-nums whitespace-nowrap">{Math.round(slot.cost)} MAD</span>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────

type ViewTab = 'global' | 'day' | 'timeline'

interface Props {
  days: DesignerDay[]
  destinationLabel?: string
  paxCount?: number
  defaultDay?: number
  onMapClick?: (lat: number, lng: number) => void
  onDaysChange?: (days: DesignerDay[]) => void
  waypoints?: Waypoint[]
  editable?: boolean
}

// ── Main Component ────────────────────────────────────────────────────

export function TravelDesignerMap({
  days: initialDays,
  destinationLabel,
  paxCount,
  defaultDay = 1,
  onMapClick: externalMapClick,
  onDaysChange,
  waypoints = [],
  editable = true,
}: Props) {
  const [view, setView] = useState<ViewTab>('global')
  const [activeDay, setActiveDay] = useState(defaultDay)
  const [days, setDays] = useState<DesignerDay[]>(initialDays)
  const [intraStopsState, setIntraStopsState] = useState<Record<number, IntraStop[]>>({})
  const [newStopModal, setNewStopModal] = useState<NewStopModal | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const updateDays = useCallback((next: DesignerDay[]) => {
    setDays(next)
    setHasUnsavedChanges(true)
    onDaysChange?.(next)
  }, [onDaysChange])

  // Build geo stops
  const stops: DayStop[] = useMemo(() => (
    days.map(d => {
      const c = primaryCity(d)
      return c ? { day: d, city: c } : null
    }).filter((s): s is DayStop => s !== null)
  ), [days])

  const activeStop = stops.find(s => s.day.day === activeDay) ?? stops[0]

  // Per-day intra stops (lazy, with override from edits)
  const intraStops: IntraStop[] = useMemo(() => {
    if (!activeStop) return []
    if (intraStopsState[activeStop.day.day]) return intraStopsState[activeStop.day.day]
    return buildIntraDay(activeStop)
  }, [activeStop, intraStopsState])

  const setDayIntraStops = (dayNum: number, items: IntraStop[]) => {
    setIntraStopsState(prev => ({ ...prev, [dayNum]: items }))
    setHasUnsavedChanges(true)
  }

  // ── Day reorder handler ──────────────────────────────────────────
  const handleDayDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const oldIdx = days.findIndex(d => d.day === active.id)
    const newIdx = days.findIndex(d => d.day === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(days, oldIdx, newIdx).map((d, i) => ({ ...d, day: i + 1 }))
    updateDays(reordered)
  }

  // ── Intra-stop reorder handler ───────────────────────────────────
  const handleIntraDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (!over || active.id === over.id || !activeStop) return
    const oldIdx = intraStops.findIndex(s => s.id === active.id)
    const newIdx = intraStops.findIndex(s => s.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    setDayIntraStops(activeStop.day.day, arrayMove(intraStops, oldIdx, newIdx))
  }

  // ── Map click → open modal ───────────────────────────────────────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    externalMapClick?.(lat, lng)
    if (editable) setNewStopModal({ lat, lng })
  }, [editable, externalMapClick])

  // ── Add new stop from modal ──────────────────────────────────────
  const handleAddStop = (form: NewStopForm) => {
    setNewStopModal(null)
    const cost = Number(form.cost) || 0
    const dayNum = form.targetDay

    // Create a new intra stop
    const newItem: IntraStop = {
      id: `${form.type}-${dayNum}-${Date.now()}`,
      type: form.type,
      pos: newStopModal ? [newStopModal.lat, newStopModal.lng] : [0, 0],
      label: form.label,
      cost,
      editable: true,
    }

    const existing = intraStopsState[dayNum] ?? buildIntraDay(stops.find(s => s.day.day === dayNum) ?? stops[0])
    setDayIntraStops(dayNum, [...existing, newItem])

    // Also patch the days array for the relevant field
    const updatedDays = days.map(d => {
      if (d.day !== dayNum) return d
      if (form.type === 'hotel') return { ...d, hotel: form.label, halfDbl: cost }
      if (form.type === 'restaurant') return { ...d, rest: form.label, restPrice: cost }
      if (form.type === 'monument') return { ...d, monument: form.label, monuPrice: cost }
      if (form.type === 'guide') return { ...d, lg: cost }
      return d
    })
    updateDays(updatedDays)

    // Switch to the target day in day view
    setActiveDay(dayNum)
    setView('day')
  }

  // ── Edit intra stop label ────────────────────────────────────────
  const handleEditLabel = (dayNum: number, id: string, newLabel: string) => {
    const updated = intraStops.map(s => s.id === id ? { ...s, label: newLabel } : s)
    setDayIntraStops(dayNum, updated)

    // Patch days array
    const updatedDays = days.map(d => {
      if (d.day !== dayNum) return d
      if (id.startsWith('hotel')) return { ...d, hotel: newLabel }
      if (id.startsWith('resto')) return { ...d, rest: newLabel }
      if (id.startsWith('monument')) return { ...d, monument: newLabel }
      return d
    })
    updateDays(updatedDays)
  }

  // ── Remove intra stop ────────────────────────────────────────────
  const handleRemoveStop = (dayNum: number, id: string) => {
    const updated = intraStops.filter(s => s.id !== id)
    setDayIntraStops(dayNum, updated)

    const updatedDays = days.map(d => {
      if (d.day !== dayNum) return d
      if (id.startsWith('hotel')) return { ...d, hotel: '—', halfDbl: 0 }
      if (id.startsWith('resto')) return { ...d, rest: '—', restPrice: 0 }
      if (id.startsWith('monument')) return { ...d, monument: '—', monuPrice: 0 }
      if (id.startsWith('guide')) return { ...d, lg: 0 }
      return d
    })
    updateDays(updatedDays)
  }

  // Aggregate stats
  const totalKm  = days.reduce((s, d) => s + d.km, 0)
  const nbHotels = new Set(days.filter(d => d.hotel && d.hotel !== '—' && d.hotel !== 'DÉPART').map(d => d.hotel)).size
  const nbRestos = days.filter(d => d.restPrice > 0).length
  const nbMonums = days.filter(d => d.monuPrice > 0 || (d.monument && d.monument !== '—')).length
  const nbGuides = days.filter(d => d.lg > 0).length

  return (
    <>
      {/* Add stop modal */}
      {newStopModal && editable && (
        <AddStopModal
          modal={newStopModal}
          days={days}
          onConfirm={handleAddStop}
          onClose={() => setNewStopModal(null)}
        />
      )}

      <div className="rihla-leaflet-root rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Globe2 size={14} className="text-rose-700" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              {destinationLabel ? destinationLabel : 'Carte du circuit'}
            </span>
            {paxCount ? (
              <span className="text-[10px] text-slate-500 ml-2 flex items-center gap-1">
                <Users size={10} /> {paxCount} pax
              </span>
            ) : null}
            {editable && hasUnsavedChanges && (
              <span className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                <AlertCircle size={9} /> Modifié
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editable && hasUnsavedChanges && (
              <button
                onClick={() => { setHasUnsavedChanges(false); onDaysChange?.(days) }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-700 text-white text-[10px] font-black hover:bg-rose-800 transition-all"
              >
                <Check size={11} /> Sauvegarder
              </button>
            )}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {([
                { id: 'global',   label: 'Vue globale', icon: MapIcon },
                { id: 'day',      label: 'Éditeur jour', icon: Calendar },
                { id: 'timeline', label: 'Timeline',     icon: Clock },
              ] as const).map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition',
                      view === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    <Icon size={12} /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Vue Globale ─────────────────────────────────────────── */}
        {view === 'global' && (
          <div className="grid grid-cols-12 gap-0">
            {/* Map */}
            <div className="col-span-12 lg:col-span-9 relative h-[520px]">
              <MapContainer
                center={[31.79, -7.09]}
                zoom={6}
                zoomControl={false}
                scrollWheelZoom
                className={clsx('h-full w-full', editable && 'cursor-crosshair')}
              >
                <TileLayer
                  attribution='© OpenStreetMap · © CartoDB'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <ZoomControl position="bottomleft" />
                <FitBounds stops={stops} dep={stops.length} />
                {editable && <MapClickHandler onMapClick={handleMapClick} />}

                {/* Curved route */}
                {stops.length > 1 && (() => {
                  const pts: [number, number][] = []
                  for (let i = 0; i < stops.length - 1; i++) {
                    pts.push(...curvedPath(
                      [stops[i].city.lat, stops[i].city.lng],
                      [stops[i + 1].city.lat, stops[i + 1].city.lng],
                      32, 0.16,
                    ))
                  }
                  return <Polyline positions={pts} pathOptions={{ color: '#C0392B', weight: 4, opacity: 0.85 }} />
                })()}

                {/* Day markers */}
                {stops.map(s => (
                  <Marker
                    key={`stop-${s.day.day}`}
                    position={[s.city.lat, s.city.lng]}
                    icon={stopIcon(s.day.day, '#C0392B')}
                    eventHandlers={{ click: () => { setActiveDay(s.day.day); setView('day') } }}
                  >
                    <Tooltip permanent={false} direction="top" offset={[0, -18]}>
                      <strong>J{s.day.day}</strong> · {s.city.display} — cliquer pour éditer
                    </Tooltip>
                  </Marker>
                ))}

                {/* Resource pins */}
                {stops.flatMap((s, sIdx) => {
                  const pins: { type: ResourceType; pos: [number, number]; label: string }[] = []
                  let off = 0
                  if (s.day.hotel && s.day.hotel !== '—' && s.day.hotel !== 'DÉPART')
                    pins.push({ type: 'hotel', pos: offsetAround(s.city, off++), label: s.day.hotel })
                  if (s.day.restPrice > 0 || s.day.rest)
                    pins.push({ type: 'restaurant', pos: offsetAround(s.city, off++), label: s.day.rest || 'Restaurant' })
                  if (s.day.monuPrice > 0 || (s.day.monument && s.day.monument !== '—'))
                    pins.push({ type: 'monument', pos: offsetAround(s.city, off++), label: s.day.monument })
                  if (s.day.lg > 0)
                    pins.push({ type: 'guide', pos: offsetAround(s.city, off++), label: `Guide local ${s.city.display}` })
                  return pins.map((p, i) => (
                    <Marker key={`pin-${s.day.day}-${i}-${sIdx}`} position={p.pos} icon={dotIcon(p.type, p.label)}>
                      <Tooltip direction="top" offset={[0, -14]}>
                        <span style={{ fontWeight: 600 }}>{TYPE_META[p.type].label}</span><br />{p.label}
                      </Tooltip>
                    </Marker>
                  ))
                })}

                {/* Waypoints */}
                {waypoints.map(wp => (
                  <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={newPinIcon()}>
                    <Tooltip permanent={false} direction="top" offset={[0, -44]}>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>📍 {wp.label}</span>
                    </Tooltip>
                  </Marker>
                ))}
              </MapContainer>

              {editable && (
                <div className="absolute bottom-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm border border-rose-200 rounded-xl px-3 py-1.5 shadow text-[10px] font-bold text-rose-700 flex items-center gap-1.5 pointer-events-none">
                  <MapPin size={11} /> Cliquer sur la carte pour ajouter une étape
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="col-span-12 lg:col-span-3 border-l border-slate-100 p-4 space-y-3 overflow-y-auto max-h-[520px]">
              {/* Réordonnement jours */}
              {editable && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Move size={11} /> Ordre des jours
                  </h4>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={e => setActiveDragId(e.active.id)}
                    onDragEnd={handleDayDragEnd}
                  >
                    <SortableContext items={stops.map(s => s.day.day)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {stops.map(s => (
                          <SortableDayItem
                            key={s.day.day}
                            stop={s}
                            isActive={s.day.day === activeDay}
                            onClick={() => { setActiveDay(s.day.day); setView('day') }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Legend */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Légende</h4>
                <div className="space-y-1.5">
                  {(Object.keys(TYPE_META) as ResourceType[]).map(t => (
                    <div key={t} className="flex items-center gap-2 text-[12px] text-slate-700">
                      <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[11px]" style={{ background: TYPE_META[t].color }}>
                        {TYPE_META[t].emoji}
                      </span>
                      <span>{TYPE_META[t].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Synthèse</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <SummaryCell icon={MapPin}    label="Étapes"     value={String(stops.length)} />
                  <SummaryCell icon={Bus}       label="Total km"   value={String(totalKm)} />
                  <SummaryCell icon={HotelIcon} label="Hôtels"     value={String(nbHotels)} />
                  <SummaryCell icon={Utensils}  label="Restos"     value={String(nbRestos)} />
                  <SummaryCell icon={Landmark}  label="Monuments"  value={String(nbMonums)} />
                  <SummaryCell icon={Users}     label="Guides"     value={String(nbGuides)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Éditeur Jour (Drag-and-drop intra-day) ──────────────── */}
        {view === 'day' && activeStop && (
          <div className="grid grid-cols-12 gap-0 min-h-[520px]">
            {/* Day picker with reorder */}
            <div className="col-span-12 lg:col-span-3 border-r border-slate-100 overflow-y-auto p-2 max-h-[520px]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={e => setActiveDragId(e.active.id)}
                onDragEnd={handleDayDragEnd}
              >
                <SortableContext items={stops.map(s => s.day.day)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {stops.map(s => (
                      <SortableDayItem
                        key={s.day.day}
                        stop={s}
                        isActive={s.day.day === activeDay}
                        onClick={() => setActiveDay(s.day.day)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Right: map + editable resource list */}
            <div className="col-span-12 lg:col-span-9 flex flex-col">
              {/* Intra-city map */}
              <div className="relative h-[300px]">
                <MapContainer
                  key={`day-${activeStop.day.day}`}
                  center={[activeStop.city.lat, activeStop.city.lng]}
                  zoom={13}
                  zoomControl={false}
                  scrollWheelZoom
                  className={clsx('h-full w-full', editable && 'cursor-crosshair')}
                >
                  <TileLayer
                    attribution='© OpenStreetMap · © CartoDB'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <ZoomControl position="bottomleft" />
                  {editable && <MapClickHandler onMapClick={handleMapClick} />}

                  {/* Intra-day path */}
                  {intraStops.length > 1 && (() => {
                    const seg: [number, number][] = []
                    for (let i = 0; i < intraStops.length - 1; i++) {
                      seg.push(...curvedPath(intraStops[i].pos, intraStops[i + 1].pos, 18, 0.06))
                    }
                    return <Polyline positions={seg} pathOptions={{ color: '#C0392B', weight: 3, opacity: 0.7, dashArray: '6 6' }} />
                  })()}

                  {intraStops.map((p, i) => (
                    <Marker key={`intra-${i}`} position={p.pos} icon={dotIcon(p.type, p.label)}>
                      <Tooltip permanent direction="top" offset={[0, -14]}>
                        {TYPE_META[p.type].emoji} {p.label}
                      </Tooltip>
                    </Marker>
                  ))}

                  <CircleMarker
                    center={[activeStop.city.lat, activeStop.city.lng]}
                    radius={26}
                    pathOptions={{ color: '#C0392B', weight: 1, fillColor: '#C0392B', fillOpacity: 0.06 }}
                  />
                </MapContainer>

                {/* Day title overlay */}
                <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2">
                  <div className="bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-md px-3 py-2 flex-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-rose-700">
                      Jour {activeStop.day.day} · {activeStop.day.date}
                    </div>
                    <div className="text-[14px] font-extrabold text-slate-900 leading-tight">{activeStop.city.display}</div>
                    <div className="text-[10px] text-slate-500 truncate">{activeStop.day.cities}{activeStop.day.km > 0 ? ` · ${activeStop.day.km} km` : ''}</div>
                  </div>
                  <div className="flex gap-1">
                    {stops.findIndex(s => s.day.day === activeDay) > 0 && (
                      <button
                        onClick={() => setActiveDay(stops[stops.findIndex(s => s.day.day === activeDay) - 1].day.day)}
                        className="p-2 rounded-xl bg-white/95 border border-slate-200/70 shadow-md text-slate-700"
                      ><ChevronLeft size={16} /></button>
                    )}
                    {stops.findIndex(s => s.day.day === activeDay) < stops.length - 1 && (
                      <button
                        onClick={() => setActiveDay(stops[stops.findIndex(s => s.day.day === activeDay) + 1].day.day)}
                        className="p-2 rounded-xl bg-white/95 border border-slate-200/70 shadow-md text-slate-700"
                      ><ChevronRight size={16} /></button>
                    )}
                  </div>
                </div>

                {editable && (
                  <div className="absolute bottom-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm border border-rose-200 rounded-xl px-3 py-1.5 shadow text-[10px] font-bold text-rose-700 flex items-center gap-1.5 pointer-events-none">
                    <MapPin size={11} /> Cliquer pour ajouter ici
                  </div>
                )}
              </div>

              {/* Editable resource list with DnD */}
              <div className="flex-1 p-4 border-t border-slate-100 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <GripVertical size={11} /> Ressources du jour — glisser pour réordonner
                  </h4>
                  {editable && (
                    <button
                      onClick={() => setNewStopModal({ lat: activeStop.city.lat + 0.01, lng: activeStop.city.lng + 0.01 })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-700 text-white text-[10px] font-black hover:bg-rose-800 transition-all"
                    >
                      <Plus size={11} /> Ajouter
                    </button>
                  )}
                </div>

                {editable ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={e => setActiveDragId(e.active.id)}
                    onDragEnd={handleIntraDragEnd}
                  >
                    <SortableContext items={intraStops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {intraStops.map(item => (
                          <SortableIntraItem
                            key={item.id}
                            item={item}
                            onEditLabel={(id, label) => handleEditLabel(activeStop.day.day, id, label)}
                            onRemove={(id) => handleRemoveStop(activeStop.day.day, id)}
                          />
                        ))}
                        {intraStops.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-sm">
                            <MapPin size={24} className="mx-auto mb-2 opacity-30" />
                            Aucune ressource · cliquer sur la carte ou sur "+ Ajouter"
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {intraStops.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px]" style={{ background: TYPE_META[item.type].color }}>
                          {TYPE_META[item.type].emoji}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-800">{item.label}</span>
                        {item.cost !== undefined && item.cost > 0 && (
                          <span className="ml-auto text-[10px] font-bold text-slate-400">{Math.round(item.cost)} MAD</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────── */}
        {view === 'timeline' && activeStop && (() => {
          const slots = buildSchedule(activeStop.day)
          const grouped: Slot[][] = SLOT_PERIODS.map(() => [])
          for (const s of slots) grouped[periodOf(s.time)].push(s)
          return (
            <div className="grid grid-cols-12 gap-0 min-h-[520px]">
              <div className="col-span-12 lg:col-span-3 border-r border-slate-100 overflow-y-auto p-2 max-h-[520px]">
                <div className="space-y-1.5">
                  {stops.map(s => {
                    const active = s.day.day === activeDay
                    return (
                      <button
                        key={s.day.day}
                        onClick={() => setActiveDay(s.day.day)}
                        className={clsx(
                          'w-full text-left px-3 py-2 rounded-xl border transition',
                          active ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white border-slate-200 hover:border-slate-400',
                        )}
                      >
                        <div className={clsx('text-[10px] font-bold uppercase tracking-wider', active ? 'text-slate-300' : 'text-slate-500')}>
                          J{s.day.day} · {s.day.date}
                        </div>
                        <div className={clsx('text-[12px] font-semibold leading-tight mt-0.5', active ? 'text-white' : 'text-slate-900')}>
                          {s.city.display}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-9 overflow-y-auto p-4">
                <div className="flex items-baseline gap-2 mb-3">
                  <h3 className="text-[14px] font-extrabold text-slate-900">
                    Timeline · J{activeStop.day.day} {activeStop.city.display}
                  </h3>
                  <span className="text-[10px] text-slate-500">{activeStop.day.date}</span>
                </div>
                <div className="space-y-3">
                  {SLOT_PERIODS.map((period, idx) => {
                    const items = grouped[idx]
                    if (!items.length) return null
                    const Icon = period.icon
                    return (
                      <div key={period.label} className="relative pl-9">
                        <div className="absolute left-3.5 top-1 bottom-1 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="absolute left-0 top-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow">
                            <Icon size={13} />
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {period.label} · {period.range[0]} – {period.range[1]}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {items.map((s, i) => <SlotRow key={i} slot={s} />)}
                        </div>
                      </div>
                    )
                  })}
                  {slots.length === 0 && (
                    <div className="text-[12px] text-slate-400 italic">
                      Pas de planning détaillé pour ce jour.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}

export default TravelDesignerMap
