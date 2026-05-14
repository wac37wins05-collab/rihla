/**
 * NotFoundPage — 404 élégante avec navigation rapide et Cmd+K
 */
import { useNavigate, Link } from 'react-router-dom'
import {
  Home, FolderKanban, Calculator, BarChart2,
  Receipt, Users, ArrowLeft, Search, MapPin,
  Sparkles,
} from 'lucide-react'

const QUICK_LINKS = [
  { to: '/dashboard',   icon: Home,          label: 'Dashboard',         color: 'text-slate-500' },
  { to: '/projects',    icon: FolderKanban,  label: 'Projets',           color: 'text-rihla' },
  { to: '/quotations',  icon: Calculator,    label: 'Devis',             color: 'text-emerald-500' },
  { to: '/analytics',   icon: BarChart2,     label: 'Analytics',         color: 'text-blue-500' },
  { to: '/invoices',    icon: Receipt,       label: 'Factures',          color: 'text-amber-500' },
  { to: '/crm',         icon: Users,         label: 'CRM',               color: 'text-purple-500' },
  { to: '/travel-designer', icon: MapPin,   label: 'Travel Designer',   color: 'text-pink-500' },
  { to: '/ai',          icon: Sparkles,      label: 'Assistant IA',      color: 'text-indigo-500' },
]

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 transition-colors">

      {/* Illustration */}
      <div className="relative mb-10 select-none">
        <div className="text-[10rem] font-black leading-none tracking-tighter text-slate-100 dark:text-white/5">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-rihla/10 flex items-center justify-center mx-auto mb-3">
              <MapPin size={28} className="text-rihla" />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      <h1 className="text-2xl font-black text-slate-900 dark:text-cream text-center tracking-tight mb-3">
        Page introuvable
      </h1>
      <p className="text-slate-500 text-sm text-center max-w-sm mb-10 leading-relaxed">
        Cette destination n'existe pas sur la carte. Elle a peut-être été déplacée,
        supprimée ou l'URL est incorrecte.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-cream text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rihla text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shadow-rihla/20"
        >
          <Home size={15} /> Accueil
        </Link>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-cream text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
        >
          <Search size={15} />
          Rechercher
          <kbd className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[10px] font-mono text-slate-400">⌘K</kbd>
        </button>
      </div>

      {/* Quick navigation grid */}
      <div className="w-full max-w-lg">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">
          Accès rapide
        </p>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon size={17} className={color} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-12 text-[11px] text-slate-400">
        STOURS Suite · Plateforme DMC
      </p>
    </div>
  )
}
