/**
 * OnboardingChecklist — guided startup checklist for new STOURS Suite accounts.
 * Appears on the Dashboard when the user has not yet completed all steps.
 * Steps are persisted via localStorage (no backend call needed for this UI layer).
 * Each step links to the relevant page to complete the action.
 */
import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, FolderPlus, Calculator, Users, CreditCard,
  CheckCircle2, Circle, ChevronDown, ChevronUp, X,
  Sparkles, ArrowRight,
} from 'lucide-react'
import { clsx } from 'clsx'

interface OnboardingStep {
  id: string
  icon: React.ElementType
  title: string
  description: string
  href: string
  ctaLabel: string
  reward?: string
}

const STEPS: OnboardingStep[] = [
  {
    id: 'agency_profile',
    icon: Building2,
    title: 'Compléter le profil de votre agence',
    description: 'Renseignez le nom commercial, ICE, email et coordonnées — ces infos apparaissent sur tous vos documents.',
    href: '/settings',
    ctaLabel: 'Configurer l\'agence',
    reward: 'Profil vérifié ✓',
  },
  {
    id: 'first_project',
    icon: FolderPlus,
    title: 'Créer votre premier dossier voyage',
    description: 'Ouvrez un projet pour un groupe ou un client individuel — c\'est le point de départ de toute la chaîne DMC.',
    href: '/projects/new',
    ctaLabel: 'Nouveau dossier',
    reward: 'Chef de projet',
  },
  {
    id: 'first_quotation',
    icon: Calculator,
    title: 'Générer un devis',
    description: 'Utilisez le générateur de cotation pour produire un devis professionnel et l\'envoyer à votre client.',
    href: '/quotations/new',
    ctaLabel: 'Créer un devis',
    reward: 'Vendeur DMC',
  },
  {
    id: 'team_member',
    icon: Users,
    title: 'Inviter un membre de l\'équipe',
    description: 'Ajoutez un collègue (Travel Designer, Opérations, Finance) pour collaborer sur les dossiers.',
    href: '/admin/users',
    ctaLabel: 'Inviter',
    reward: 'Esprit d\'équipe',
  },
  {
    id: 'first_invoice',
    icon: CreditCard,
    title: 'Émettre une facture',
    description: 'Convertissez un devis validé en facture et envoyez-la directement depuis la plateforme.',
    href: '/invoices/new',
    ctaLabel: 'Créer une facture',
    reward: 'Finance Ready',
  },
]

const STORAGE_KEY = 'rihla_onboarding_v1'

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function saveCompleted(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {}
}

function loadDismissed(): boolean {
  try { return localStorage.getItem(`${STORAGE_KEY}_dismissed`) === '1' } catch { return false }
}

export function OnboardingChecklist() {
  const [completed,  setCompleted]  = useState<Set<string>>(loadCompleted)
  const [dismissed,  setDismissed]  = useState<boolean>(loadDismissed)
  const [expanded,   setExpanded]   = useState(true)

  // Persist completed steps
  useEffect(() => { saveCompleted(completed) }, [completed])

  const markDone = useCallback((id: string) => {
    setCompleted(prev => new Set([...prev, id]))
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem(`${STORAGE_KEY}_dismissed`, '1') } catch {}
  }, [])

  const allDone  = STEPS.every(s => completed.has(s.id))
  const donePct  = Math.round((completed.size / STEPS.length) * 100)

  // Don't render if dismissed or all steps complete
  if (dismissed || allDone) return null

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/8 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-lg bg-rihla/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={15} className="text-rihla" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-[14px] font-bold text-slate-900 dark:text-cream">
              Démarrage guidé
            </p>
            <span className="text-[11px] font-black text-rihla bg-rihla/10 px-2 py-0.5 rounded-full">
              {completed.size}/{STEPS.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-rihla rounded-full transition-all duration-700"
                style={{ width: `${donePct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400">{donePct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); dismiss() }}
            title="Masquer le guide"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {STEPS.map((step, idx) => {
            const done = completed.has(step.id)
            const Icon = step.icon

            return (
              <div
                key={step.id}
                className={clsx(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  done ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-white/3',
                )}
              >
                {/* Step number / check */}
                <div className="flex-shrink-0 mt-0.5">
                  {done
                    ? <CheckCircle2 size={20} className="text-emerald-500" />
                    : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-white/20 flex items-center justify-center">
                        <span className="text-[9px] font-black text-slate-400">{idx + 1}</span>
                      </div>
                    )
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={clsx(
                        'text-[13px] font-semibold leading-snug',
                        done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-cream',
                      )}>
                        {step.title}
                      </p>
                      {!done && (
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      )}
                      {done && step.reward && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                          🏅 {step.reward}
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    {!done && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to={step.href}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rihla text-white text-[12px] font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          {step.ctaLabel} <ArrowRight size={11} />
                        </Link>
                        <button
                          onClick={() => markDone(step.id)}
                          title="Marquer comme fait"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {expanded && (
        <div className="px-5 py-3 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Complétez toutes les étapes pour débloquer toutes les fonctionnalités.
          </p>
          <button
            onClick={dismiss}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Masquer
          </button>
        </div>
      )}
    </div>
  )
}
