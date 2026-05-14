import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle, FolderKanban, Calculator, MapPin, BarChart2, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { usePref } from '@/hooks/usePref'

interface Step {
  icon: typeof Sparkles
  title: string
  content: string
  emoji: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    emoji: '👋',
    title: 'Bienvenue sur RIHLA',
    content: 'RIHLA est votre suite complète pour gérer votre activité DMC au Maroc — de la cotation à la facturation, en passant par la logistique de groupe.',
  },
  {
    icon: FolderKanban,
    emoji: '📁',
    title: 'Vos Dossiers',
    content: 'Chaque groupe voyage est un "dossier". Créez-en un depuis le menu Projets ou avec le bouton "+ Nouveau dossier" sur le tableau de bord.',
  },
  {
    icon: Calculator,
    emoji: '💰',
    title: 'Cotation en quelques clics',
    content: 'Dans chaque dossier, l\'onglet Cotation vous permet de composer votre budget ligne par ligne (hôtel, transport, guide…) et de calculer la marge automatiquement.',
  },
  {
    icon: MapPin,
    emoji: '🗺️',
    title: 'Itinéraire IA',
    content: 'Cliquez "Générer via IA" pour produire un itinéraire jour par jour en quelques secondes. Vous pouvez ensuite le personnaliser et l\'exporter en PDF.',
  },
  {
    icon: BarChart2,
    emoji: '📊',
    title: 'Tableau de bord live',
    content: 'Le dashboard se met à jour en temps réel via WebSocket. Vous voyez instantanément l\'état de votre pipeline, les dossiers actifs et les factures en attente.',
  },
  {
    icon: Zap,
    emoji: '⌘',
    title: 'Raccourcis clavier',
    content: 'Appuyez sur Ctrl+K (ou Cmd+K sur Mac) pour ouvrir la palette de commandes et naviguer vers n\'importe quelle section sans souris. Votre productivité va décoller.',
  },
]

export function GuidedTour() {
  const [tourSeen, setTourSeen] = usePref<boolean>('tour_seen', false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Wait for preferences to load before deciding to show tour
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!tourSeen) {
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [mounted, tourSeen])

  const finish = () => {
    setTourSeen(true)
    setIsOpen(false)
    setCurrentStep(0)
  }

  const step = STEPS[currentStep]
  const Icon = step?.icon ?? Sparkles

  // Help button always visible
  const helpBtn = (
    <button
      onClick={() => { setCurrentStep(0); setIsOpen(true) }}
      className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-rihla text-white shadow-xl flex items-center justify-center hover:scale-110 transition-all z-40 group"
      title="Aide & Tutoriel"
    >
      <HelpCircle size={18} />
      <span className="absolute right-13 bottom-0 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Aide
      </span>
    </button>
  )

  if (!isOpen) return helpBtn

  return (
    <>
      {helpBtn}
      <div className="fixed inset-0 z-[300] pointer-events-none">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm pointer-events-auto"
          onClick={finish}
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 pointer-events-auto overflow-hidden">

          {/* Top bar with step indicator */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    i === currentStep ? 'w-5 bg-rihla' : 'w-1.5 bg-slate-200 dark:bg-white/10 hover:bg-rihla/40'
                  )}
                />
              ))}
            </div>
            <button
              onClick={finish}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="px-7 pt-7 pb-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rihla/10 dark:bg-rihla/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{step.emoji}</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-rihla uppercase tracking-widest mb-1">
                  Étape {currentStep + 1} sur {STEPS.length}
                </p>
                <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-7 pb-6">
            <button
              onClick={finish}
              className="text-[12px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Passer le tutoriel
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <button
                onClick={() => currentStep === STEPS.length - 1 ? finish() : setCurrentStep(s => s + 1)}
                className="flex items-center gap-2 px-5 h-9 bg-rihla text-white rounded-xl text-[13px] font-medium hover:bg-rihla-dark transition-colors"
              >
                {currentStep === STEPS.length - 1 ? "C'est parti !" : 'Suivant'}
                {currentStep < STEPS.length - 1 && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
