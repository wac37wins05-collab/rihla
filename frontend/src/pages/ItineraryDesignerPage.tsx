import { useState, useCallback } from 'react'
import {
  Plus, Trash2, GripVertical, MapPin, Hotel, Utensils, Camera,
  Bus, Coffee, Star, ChevronDown, ChevronUp, Clock, Users,
  Download, Save, Eye, Sparkles, ArrowUp, ArrowDown, Copy,
  Flag, Circle, Loader2, FileText, Globe, Compass, Sun, Calendar
} from 'lucide-react'
import { exportDayProgrammePDF } from '@/lib/pdfExport'

// ─── Types ────────────────────────────────────────────────────────────────────

type StopType = 'depart' | 'visit' | 'meal' | 'hotel' | 'activity' | 'break' | 'arrival' | 'transfer'

interface Stop {
  id: string
  time: string
  type: StopType
  place: string
  duration: string
  notes: string
  included: boolean
}

interface Day {
  id: string
  day: number
  city: string
  date: string
  hotel: string
  meals: string[]
  stops: Stop[]
  collapsed: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STOP_TYPES: { type: StopType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { type: 'depart',   label: 'Départ',     icon: <Bus size={13} />,       color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  { type: 'visit',    label: 'Visite',     icon: <Camera size={13} />,    color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  { type: 'meal',     label: 'Repas',      icon: <Utensils size={13} />,  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { type: 'hotel',    label: 'Hôtel',      icon: <Hotel size={13} />,     color: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-100 dark:bg-teal-900/40' },
  { type: 'activity', label: 'Activité',   icon: <Star size={13} />,      color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-100 dark:bg-rose-900/40' },
  { type: 'break',    label: 'Pause',      icon: <Coffee size={13} />,    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  { type: 'transfer', label: 'Transfert',  icon: <Globe size={13} />,     color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/40' },
  { type: 'arrival',  label: 'Arrivée',    icon: <Flag size={13} />,      color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
]

const STOP_CONFIG = Object.fromEntries(STOP_TYPES.map(s => [s.type, s]))

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function makeDefaultStop(time = '09:00'): Stop {
  return { id: uid(), time, type: 'visit', place: '', duration: '1h', notes: '', included: true }
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_DAYS: Day[] = [
  {
    id: uid(), day: 1, city: 'Marrakech', date: '12 Mai 2026',
    hotel: 'Riad El Fenn ★★★★★', meals: ['Dîner'],
    collapsed: false,
    stops: [
      { id: uid(), time: '14:00', type: 'depart',   place: 'Aéroport Menara', duration: '—', notes: 'Vol AT201 — Accueil avec panneau personnalisé', included: true },
      { id: uid(), time: '15:30', type: 'hotel',     place: 'Riad El Fenn',    duration: '30min', notes: 'Installation et visite du riad', included: true },
      { id: uid(), time: '19:00', type: 'meal',      place: 'Restaurant du Riad', duration: '2h', notes: 'Dîner de bienvenue avec musique gnaoua', included: true },
    ],
  },
  {
    id: uid(), day: 2, city: 'Marrakech', date: '13 Mai 2026',
    hotel: 'Riad El Fenn ★★★★★', meals: ['Petit-déjeuner', 'Déjeuner'],
    collapsed: false,
    stops: [
      { id: uid(), time: '08:30', type: 'break',    place: 'Petit-déjeuner au Riad', duration: '45min', notes: '', included: true },
      { id: uid(), time: '09:30', type: 'visit',    place: 'Palais Bahia',     duration: '1h30', notes: 'Visite avec historien local', included: true },
      { id: uid(), time: '11:30', type: 'activity', place: 'Souk Semmarine',   duration: '1h',   notes: 'Temps libre shopping', included: true },
      { id: uid(), time: '13:00', type: 'meal',     place: 'Restaurant Dar Moha', duration: '1h30', notes: 'Déjeuner traditionnel', included: true },
      { id: uid(), time: '15:00', type: 'visit',    place: 'Jardins Majorelle',duration: '1h30', notes: 'Billet inclus', included: true },
    ],
  },
  {
    id: uid(), day: 3, city: 'Désert Agafay', date: '14 Mai 2026',
    hotel: 'Scarabeo Camp ★★★★★', meals: ['Petit-déjeuner', 'Déjeuner', 'Dîner'],
    collapsed: true,
    stops: [
      { id: uid(), time: '06:00', type: 'depart',   place: 'Hôtel — départ lever soleil', duration: '—', notes: 'Tenue confort recommandée', included: true },
      { id: uid(), time: '07:00', type: 'activity', place: 'Safari 4×4 Agafay',  duration: '3h', notes: 'Avec guide et photographe', included: true },
      { id: uid(), time: '13:00', type: 'meal',     place: 'Déjeuner nomade',     duration: '1h30', notes: 'Sous tente bédouine', included: true },
      { id: uid(), time: '21:00', type: 'activity', place: 'Observation des étoiles', duration: '1h', notes: 'Avec astronome professionnel', included: true },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StopRow({
  stop,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  stop: Stop
  onUpdate: (s: Stop) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const cfg = STOP_CONFIG[stop.type]

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 group transition-all ${stop.included ? '' : 'opacity-50'}`}>
      {/* Drag handle (visual) */}
      <div className="flex flex-col gap-1 mt-1 flex-shrink-0">
        <button onClick={onMoveUp} disabled={!canMoveUp} className="p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 transition-all">
          <ArrowUp size={12} />
        </button>
        <button onClick={onMoveDown} disabled={!canMoveDown} className="p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 transition-all">
          <ArrowDown size={12} />
        </button>
      </div>

      {/* Type icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Fields */}
      <div className="flex-1 grid grid-cols-12 gap-2">
        {/* Time */}
        <input
          type="time"
          value={stop.time}
          onChange={e => onUpdate({ ...stop, time: e.target.value })}
          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#5B1914]/30"
        />

        {/* Type select */}
        <select
          value={stop.type}
          onChange={e => onUpdate({ ...stop, type: e.target.value as StopType })}
          className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none"
        >
          {STOP_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>

        {/* Place */}
        <input
          value={stop.place}
          onChange={e => onUpdate({ ...stop, place: e.target.value })}
          placeholder="Lieu / Prestation..."
          className="col-span-5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#5B1914]/30"
        />

        {/* Duration */}
        <input
          value={stop.duration}
          onChange={e => onUpdate({ ...stop, duration: e.target.value })}
          placeholder="Durée"
          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[12px] focus:outline-none"
        />

        {/* Notes */}
        <input
          value={stop.notes}
          onChange={e => onUpdate({ ...stop, notes: e.target.value })}
          placeholder="Notes pour le guide..."
          className="col-span-10 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#5B1914]/30"
        />

        {/* Included toggle */}
        <button
          onClick={() => onUpdate({ ...stop, included: !stop.included })}
          className={`col-span-2 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
            stop.included
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-400'
          }`}
          title="Inclus dans le prix?"
        >
          {stop.included ? '✓ Inclus' : 'Option'}
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ItineraryDesignerPage() {
  const [days, setDays] = useState<Day[]>(INITIAL_DAYS)
  const [circuitName, setCircuitName] = useState('Grand Tour Maroc')
  const [paxCount, setPaxCount] = useState(18)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activePreview, setActivePreview] = useState(false)

  const updateDay = useCallback((dayId: string, updates: Partial<Day>) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, ...updates } : d))
  }, [])

  const addStop = useCallback((dayId: string) => {
    const day = days.find(d => d.id === dayId)!
    const lastTime = day.stops[day.stops.length - 1]?.time ?? '09:00'
    const [h, m] = lastTime.split(':').map(Number)
    const newH = Math.min(h + 2, 22)
    const newTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    updateDay(dayId, { stops: [...day.stops, makeDefaultStop(newTime)] })
  }, [days, updateDay])

  const updateStop = useCallback((dayId: string, stopId: string, updated: Stop) => {
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, stops: d.stops.map(s => s.id === stopId ? updated : s) }
      : d
    ))
  }, [])

  const deleteStop = useCallback((dayId: string, stopId: string) => {
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, stops: d.stops.filter(s => s.id !== stopId) }
      : d
    ))
  }, [])

  const moveStop = useCallback((dayId: string, stopIdx: number, dir: -1 | 1) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      const stops = [...d.stops]
      const newIdx = stopIdx + dir
      if (newIdx < 0 || newIdx >= stops.length) return d;
      [stops[stopIdx], stops[newIdx]] = [stops[newIdx], stops[stopIdx]]
      return { ...d, stops }
    }))
  }, [])

  const addDay = () => {
    const lastDay = days[days.length - 1]
    const nextDayNum = (lastDay?.day ?? 0) + 1
    setDays(prev => [...prev, {
      id: uid(), day: nextDayNum, city: 'Nouvelle ville', date: `Jour ${nextDayNum}`,
      hotel: '', meals: ['Petit-déjeuner'],
      collapsed: false,
      stops: [makeDefaultStop('09:00')],
    }])
  }

  const removeDay = (dayId: string) => {
    if (days.length <= 1) return
    setDays(prev => prev.filter(d => d.id !== dayId).map((d, i) => ({ ...d, day: i + 1 })))
  }

  const duplicateDay = (dayId: string) => {
    const day = days.find(d => d.id === dayId)!
    const newDay: Day = {
      ...day,
      id: uid(),
      day: day.day + 1,
      stops: day.stops.map(s => ({ ...s, id: uid() })),
    }
    setDays(prev => {
      const idx = prev.findIndex(d => d.id === dayId)
      const copy = [...prev]
      copy.splice(idx + 1, 0, newDay)
      return copy.map((d, i) => ({ ...d, day: i + 1 }))
    })
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const activeDay = days[0]
      await exportDayProgrammePDF({
        projectRef: 'MRK-2026-0042',
        groupName: circuitName,
        guideeName: 'Guide assigné',
        date: activeDay.date,
        day: activeDay.day,
        totalDays: days.length,
        hotel: activeDay.hotel,
        paxCount,
        programme: activeDay.stops.map(s => ({
          time: s.time,
          place: s.place || '—',
          duration: s.duration,
          notes: s.notes,
          type: s.type,
        })),
      })
    } finally {
      setExporting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
  }

  const totalStops = days.reduce((a, d) => a + d.stops.length, 0)
  const totalHours = days.reduce((a, d) =>
    a + d.stops.reduce((b, s) => {
      const n = parseFloat(s.duration) || 0
      return b + (s.duration.includes('min') ? n / 60 : n)
    }, 0), 0
  )

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#5B1914]/10 dark:bg-[#E8734A]/20 flex items-center justify-center">
            <Compass size={18} className="text-[#5B1914] dark:text-[#E8734A]" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={circuitName}
              onChange={e => setCircuitName(e.target.value)}
              className="text-[16px] font-black text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none w-full"
              placeholder="Nom du circuit..."
            />
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span>{days.length} jours</span>
              <span>·</span>
              <span>{totalStops} étapes</span>
              <span>·</span>
              <span>{totalHours.toFixed(0)}h d'activités</span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Users size={10} />
                <input
                  type="number"
                  value={paxCount}
                  onChange={e => setPaxCount(Number(e.target.value))}
                  className="w-10 bg-transparent border-none outline-none text-slate-400 text-[11px]"
                  min={1}
                />
                <span>pax</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActivePreview(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
              activePreview
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
            }`}
          >
            <Eye size={13} /> Aperçu
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#5B1914]/40 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Sauvegarder
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#5B1914] text-white hover:bg-[#4a1410] transition-all disabled:opacity-60"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {days.map((day, dayIdx) => (
          <div key={day.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Day header */}
            <div className={`flex items-start gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800 ${
              day.collapsed ? '' : 'bg-gradient-to-r from-[#5B1914]/5 dark:from-[#E8734A]/5 to-transparent'
            }`}>
              <div className="w-9 h-9 rounded-xl bg-[#5B1914] dark:bg-[#E8734A] flex items-center justify-center text-white font-black text-[13px] flex-shrink-0">
                {day.day}
              </div>

              <div className="flex-1 grid grid-cols-4 gap-3">
                <input
                  value={day.city}
                  onChange={e => updateDay(day.id, { city: e.target.value })}
                  placeholder="Ville / Destination"
                  className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[#5B1914]/30"
                />
                <input
                  value={day.date}
                  onChange={e => updateDay(day.id, { date: e.target.value })}
                  placeholder="Date"
                  className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] focus:outline-none"
                />
                <input
                  value={day.hotel}
                  onChange={e => updateDay(day.id, { hotel: e.target.value })}
                  placeholder="Hôtel / Hébergement"
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-400">{day.stops.length} étapes</span>
                <button onClick={() => duplicateDay(day.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Dupliquer">
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => removeDay(day.id)}
                  disabled={days.length <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-20"
                  title="Supprimer le jour"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => updateDay(day.id, { collapsed: !day.collapsed })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  {day.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>

            {/* Stops */}
            {!day.collapsed && (
              <div className="p-4 space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-11 mb-1 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider">
                  <span className="col-span-2">Heure</span>
                  <span className="col-span-3">Type</span>
                  <span className="col-span-5">Lieu</span>
                  <span className="col-span-2">Durée</span>
                </div>

                {day.stops.map((stop, si) => (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    onUpdate={updated => updateStop(day.id, stop.id, updated)}
                    onDelete={() => deleteStop(day.id, stop.id)}
                    onMoveUp={() => moveStop(day.id, si, -1)}
                    onMoveDown={() => moveStop(day.id, si, 1)}
                    canMoveUp={si > 0}
                    canMoveDown={si < day.stops.length - 1}
                  />
                ))}

                {/* Add stop button */}
                <button
                  onClick={() => addStop(day.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[12px] font-semibold hover:border-[#5B1914]/40 hover:text-[#5B1914] dark:hover:text-[#E8734A] dark:hover:border-[#E8734A]/40 transition-all"
                >
                  <Plus size={14} /> Ajouter une étape
                </button>

                {/* Meals chips */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Repas inclus :</span>
                  {['Petit-déjeuner', 'Déjeuner', 'Dîner'].map(meal => {
                    const included = day.meals.includes(meal)
                    return (
                      <button
                        key={meal}
                        onClick={() => updateDay(day.id, {
                          meals: included ? day.meals.filter(m => m !== meal) : [...day.meals, meal]
                        })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          included
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        {meal === 'Petit-déjeuner' ? '☕' : meal === 'Déjeuner' ? '🍽️' : '🌙'} {meal}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add day */}
        <button
          onClick={addDay}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[13px] font-semibold hover:border-[#5B1914]/50 hover:text-[#5B1914] dark:hover:text-[#E8734A] dark:hover:border-[#E8734A]/50 transition-all"
        >
          <Plus size={16} /> Ajouter un jour
        </button>

        {/* Summary card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Sun size={14} /> Résumé du Circuit
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Jours',      value: days.length,         icon: <Calendar size={14} /> },
              { label: 'Étapes',     value: totalStops,           icon: <MapPin size={14} /> },
              { label: 'Villes',     value: new Set(days.map(d => d.city)).size, icon: <Globe size={14} /> },
              { label: 'Pax',        value: paxCount,             icon: <Users size={14} /> },
            ].map(k => (
              <div key={k.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1 text-[#5B1914] dark:text-[#E8734A]">{k.icon}</div>
                <p className="text-[20px] font-black text-slate-900 dark:text-slate-100">{k.value}</p>
                <p className="text-[10px] text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
