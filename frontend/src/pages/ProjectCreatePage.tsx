/**
 * ProjectCreatePage — multi-step creation wizard (3 steps).
 *
 * Step 1 — Type & Template  (project type card picker + AI brief)
 * Step 2 — Détails          (client, destination, dates, pax)
 * Step 3 — Confirmation     (review + submit)
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, ArrowRight, Check, Sparkles, AlertCircle,
  Users, Calendar, MapPin, Tag, FileText, Loader2,
} from 'lucide-react'
import { projectsApi, aiApi } from '@/lib/api'
import { clsx } from 'clsx'

// ── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(120),
  client_name: z.string().max(120).optional().or(z.literal('')),
  project_type: z.enum(['incentive', 'leisure', 'mice', 'fit', 'luxury'], {
    errorMap: () => ({ message: 'Sélectionnez un type' }),
  }),
  destination: z.string().max(200).optional().or(z.literal('')),
  duration_days: z.coerce.number().int().min(1).max(365).optional().or(z.literal('')),
  pax_count: z.coerce.number().int().min(1).max(10000).optional().or(z.literal('')),
  reference: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

// ── Constants ─────────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  {
    value: 'incentive', label: 'Incentive',
    desc: 'Voyage stimulant pour équipes & partenaires',
    emoji: '🏆', color: 'from-amber-50 to-orange-50 border-amber-200',
    activeColor: 'from-amber-100 to-orange-100 border-amber-400',
  },
  {
    value: 'mice', label: 'MICE',
    desc: 'Conférence, séminaire, événement d\'entreprise',
    emoji: '🎯', color: 'from-blue-50 to-indigo-50 border-blue-200',
    activeColor: 'from-blue-100 to-indigo-100 border-blue-400',
  },
  {
    value: 'leisure', label: 'Loisirs',
    desc: 'Séjour vacances groupes & familles',
    emoji: '🏖️', color: 'from-emerald-50 to-teal-50 border-emerald-200',
    activeColor: 'from-emerald-100 to-teal-100 border-emerald-400',
  },
  {
    value: 'luxury', label: 'Luxe',
    desc: 'Expériences haut de gamme & sur-mesure',
    emoji: '💎', color: 'from-purple-50 to-violet-50 border-purple-200',
    activeColor: 'from-purple-100 to-violet-100 border-purple-400',
  },
  {
    value: 'fit', label: 'FIT',
    desc: 'Voyageur indépendant — sur mesure',
    emoji: '🧭', color: 'from-rose-50 to-pink-50 border-rose-200',
    activeColor: 'from-rose-100 to-pink-100 border-rose-400',
  },
] as const

const DESTINATIONS = [
  'Marrakech', 'Fès', 'Casablanca', 'Agadir', 'Chefchaouen',
  'Essaouira', 'Merzouga', 'Ouarzazate', 'Tanger', 'Rabat',
  'Toute le Maroc', 'Afrique du Sud', 'Dubai', 'Portugal', 'Espagne',
]

// ── Sub-components ────────────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-red-500">
      <AlertCircle size={11} /> {message}
    </p>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={clsx(
            'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300',
            i < current
              ? 'bg-emerald-500 text-white'
              : i === current
                ? 'bg-[#5B1914] text-white shadow-md shadow-[#5B1914]/20'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          )}>
            {i < current ? <Check size={13} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={clsx(
              'h-0.5 w-12 rounded-full transition-all duration-500',
              i < current ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
            )} />
          )}
        </div>
      ))}
      <span className="ml-3 text-[12px] text-slate-400 font-medium">
        Étape {current + 1} / {total}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProjectCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [briefText, setBriefText] = useState('')
  const [showBrief, setShowBrief] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  const {
    register, handleSubmit, control, setValue, watch,
    trigger, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_type: 'incentive',
      name: '', client_name: '', destination: '',
      duration_days: '', pax_count: '', reference: '', notes: '',
    },
  })

  const watchedValues = watch()

  // ── Speech recognition ──────────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = true; r.interimResults = true; r.lang = 'fr-FR'
    r.onresult = (e: any) => {
      setBriefText(Array.from(e.results).map((x: any) => x[0].transcript).join(''))
    }
    r.onerror = () => setIsRecording(false)
    recognitionRef.current = r
  }, [])

  useEffect(() => {
    isRecording ? recognitionRef.current?.start() : recognitionRef.current?.stop()
  }, [isRecording])

  const handleMagicExtract = async () => {
    if (!briefText.trim()) return
    setMagicLoading(true)
    try {
      const { data: d } = await aiApi.magicExtract(briefText)
      if (d.name)          setValue('name', d.name, { shouldValidate: true })
      if (d.client_name)   setValue('client_name', d.client_name)
      if (d.project_type)  setValue('project_type', d.project_type)
      if (d.destination)   setValue('destination', d.destination)
      if (d.duration_days) setValue('duration_days', d.duration_days)
      if (d.pax_count)     setValue('pax_count', d.pax_count)
      if (d.notes)         setValue('notes', d.notes)
      setShowBrief(false)
      setStep(1) // jump to details after extraction
    } catch {
      alert("L'assistant n'a pas pu analyser le brief.")
    } finally {
      setMagicLoading(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: (res) => navigate(`/projects/${res.data.id}`),
    onError: (err: any) => {
      const detail = err.response?.data?.detail
      alert(`Erreur: ${Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : detail || 'Création impossible'}`)
    },
  })

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      duration_days: data.duration_days ? Number(data.duration_days) : undefined,
      pax_count: data.pax_count ? Number(data.pax_count) : undefined,
      client_name: data.client_name || undefined,
      destination: data.destination || undefined,
      reference: data.reference || undefined,
      notes: data.notes || undefined,
    })
  }

  const nextStep = async () => {
    const fields: (keyof FormData)[][] = [
      ['project_type'],
      ['name', 'client_name', 'destination', 'duration_days', 'pax_count'],
      [],
    ]
    const ok = await trigger(fields[step])
    if (ok) setStep(s => Math.min(s + 1, 2))
  }

  const selectedTypeInfo = PROJECT_TYPES.find(t => t.value === watchedValues.project_type)

  return (
    <div className="min-h-full bg-[var(--c-rihla-100)] dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-[var(--c-line-soft)] dark:border-white/5 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 dark:text-white">Nouveau dossier</h1>
            <p className="text-[11px] text-slate-400">
              {step === 0 && 'Choisissez le type de voyage'}
              {step === 1 && 'Renseignez les détails du dossier'}
              {step === 2 && 'Confirmez et créez le dossier'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <StepIndicator current={step} total={3} />

        {/* ── STEP 0 — Type & Brief ────────────────────────────────────── */}
        {step === 0 && (
          <div className="animate-fade-up">
            {/* Type picker */}
            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-widest">
              Type de voyage
            </h2>
            <Controller
              name="project_type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {PROJECT_TYPES.map(pt => {
                    const isActive = field.value === pt.value
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => field.onChange(pt.value)}
                        className={clsx(
                          'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200',
                          'bg-gradient-to-br',
                          isActive ? pt.activeColor + ' shadow-md scale-[1.02]' : pt.color + ' hover:scale-[1.01]'
                        )}
                      >
                        <span className="text-2xl">{pt.emoji}</span>
                        <div>
                          <div className="font-bold text-[13px] text-slate-900">{pt.label}</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{pt.desc}</div>
                        </div>
                        {isActive && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-[#5B1914] flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            <FieldError message={errors.project_type?.message} />

            {/* AI Brief assistant */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 p-5 mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center">
                  <Sparkles size={16} className="text-slate-900" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-bold">Assistant IA</p>
                  <p className="text-white/40 text-[10px]">Remplissage automatique depuis votre brief</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setIsRecording(v => !v)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  <div className={clsx('w-1.5 h-1.5 rounded-full', isRecording ? 'bg-white' : 'bg-red-500')} />
                  {isRecording ? 'Écoute...' : 'Dicter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBrief(v => !v)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[11px] font-bold hover:bg-white/20 transition-all"
                >
                  Coller un texte
                </button>
              </div>

              {(showBrief || briefText) && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <textarea
                    value={briefText}
                    onChange={e => setBriefText(e.target.value)}
                    placeholder="Collez votre brief client ici..."
                    rows={3}
                    className="w-full bg-transparent text-white text-[12px] placeholder:text-white/20 resize-none focus:outline-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      disabled={!briefText.trim() || magicLoading}
                      onClick={handleMagicExtract}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-slate-900 text-[11px] font-bold rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-all"
                    >
                      {magicLoading ? <><Loader2 size={11} className="animate-spin" /> Analyse...</> : <><Sparkles size={11} /> Extraire</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1 — Détails ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="animate-fade-up space-y-5">
            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
              Détails du dossier
            </h2>

            {/* Nom */}
            <div>
              <label className="text-label text-slate-500 block mb-1.5">
                Nom du dossier <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                autoFocus
                placeholder="ex : INCENTIVE PARIS 2026, CIRCUIT DÉSERT MAROC…"
                className={clsx('input-base', errors.name && 'border-red-400')}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Client */}
            <div>
              <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <Users size={11} /> Client / Agence
              </label>
              <input
                {...register('client_name')}
                placeholder="ex : TechCorp, Club Med, ESO Travel…"
                className={clsx('input-base', errors.client_name && 'border-red-400')}
              />
              <FieldError message={errors.client_name?.message} />
            </div>

            {/* Destination */}
            <div>
              <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} /> Destination
              </label>
              <input
                {...register('destination')}
                list="destinations-list"
                placeholder="ex : Marrakech, Désert Sahara, Tout le Maroc…"
                className="input-base"
              />
              <datalist id="destinations-list">
                {DESTINATIONS.map(d => <option key={d} value={d} />)}
              </datalist>
              <FieldError message={errors.destination?.message} />
            </div>

            {/* Durée + Pax */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <Calendar size={11} /> Durée (jours)
                </label>
                <input
                  {...register('duration_days')}
                  type="number" placeholder="7" min={1} max={365}
                  className={clsx('input-base', errors.duration_days && 'border-red-400')}
                />
                <FieldError message={errors.duration_days?.message} />
              </div>
              <div>
                <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <Users size={11} /> Participants (pax)
                </label>
                <input
                  {...register('pax_count')}
                  type="number" placeholder="25" min={1}
                  className={clsx('input-base', errors.pax_count && 'border-red-400')}
                />
                <FieldError message={errors.pax_count?.message} />
              </div>
            </div>

            {/* Référence */}
            <div>
              <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <Tag size={11} /> Référence interne
              </label>
              <input
                {...register('reference')}
                placeholder="Auto-générée si vide (ex: STR-20260105-0001)"
                className="input-base"
              />
              <FieldError message={errors.reference?.message} />
            </div>

            {/* Notes */}
            <div>
              <label className="text-label text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <FileText size={11} /> Notes internes
                <span className="ml-auto normal-case text-[10px] font-normal text-slate-400">
                  {watchedValues.notes?.length ?? 0}/2000
                </span>
              </label>
              <textarea
                {...register('notes')}
                placeholder="Contexte, exigences spéciales, informations importantes…"
                className={clsx('input-base resize-none', errors.notes && 'border-red-400')}
                rows={3}
              />
              <FieldError message={errors.notes?.message} />
            </div>
          </div>
        )}

        {/* ── STEP 2 — Confirmation ────────────────────────────────────── */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5">
              Récapitulatif
            </h2>

            <div className="rounded-2xl border border-[var(--c-line-soft)] bg-white dark:bg-slate-900 overflow-hidden mb-6">
              {/* Type badge */}
              <div className="px-5 py-4 border-b border-[var(--c-line-soft)] dark:border-white/5 flex items-center gap-3">
                <span className="text-2xl">{selectedTypeInfo?.emoji}</span>
                <div>
                  <p className="font-bold text-[14px] text-slate-900 dark:text-white">
                    {watchedValues.name || <span className="text-slate-300">— Sans titre —</span>}
                  </p>
                  <p className="text-[11px] text-slate-400">{selectedTypeInfo?.label}</p>
                </div>
              </div>

              {/* Fields summary */}
              <div className="divide-y divide-[var(--c-line-soft)] dark:divide-white/5">
                {[
                  { icon: Users, label: 'Client', value: watchedValues.client_name || '—' },
                  { icon: MapPin, label: 'Destination', value: watchedValues.destination || '—' },
                  { icon: Calendar, label: 'Durée', value: watchedValues.duration_days ? `${watchedValues.duration_days} jours` : '—' },
                  { icon: Users, label: 'Participants', value: watchedValues.pax_count ? `${watchedValues.pax_count} pax` : '—' },
                  { icon: Tag, label: 'Référence', value: watchedValues.reference || 'Auto-générée' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-5 py-3">
                    <Icon size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="text-[12px] text-slate-500 w-24 flex-shrink-0">{label}</span>
                    <span className={clsx('text-[13px] font-medium', value === '—' || value === 'Auto-générée' ? 'text-slate-300' : 'text-slate-800 dark:text-white')}>
                      {value}
                    </span>
                  </div>
                ))}
                {watchedValues.notes && (
                  <div className="px-5 py-3">
                    <p className="text-[11px] text-slate-400 mb-1">Notes</p>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-3">{watchedValues.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {createMutation.isError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-[12px] text-red-600">
                <AlertCircle size={14} />
                Erreur lors de la création. Réessayez.
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────────── */}
        <div className={clsx('flex items-center gap-3 pt-6 border-t border-[var(--c-line-soft)] dark:border-white/5', step > 0 ? 'justify-between' : 'justify-end')}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[var(--c-line)] bg-white dark:bg-slate-800 dark:border-white/10 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={14} /> Retour
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#5B1914] text-white text-[13px] font-bold hover:bg-[#36100D] transition-colors shadow-sm shadow-[#5B1914]/20"
            >
              Continuer <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#5B1914] text-white text-[13px] font-bold hover:bg-[#36100D] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-[#5B1914]/20"
            >
              {createMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Création…</>
              ) : (
                <><Check size={14} /> Créer le dossier</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
