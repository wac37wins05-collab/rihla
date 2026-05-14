import { Link } from 'react-router-dom'
import { Smartphone, MapPin, UserCheck, Car, ExternalLink, Palette } from 'lucide-react'

type App = {
  slug: string
  title: string
  subtitle: string
  description: string
  icon: typeof Smartphone
  gradient: string
  features: string[]
}

const APPS: App[] = [
  {
    slug: 'travel-designer',
    title: 'Travel Designer',
    subtitle: 'App mobile commercial',
    description: 'Gestion des dossiers, itinéraire jour-par-jour, catalogue produits, devis et messagerie clients — version mobile du studio de création.',
    icon: MapPin,
    gradient: 'from-rihla-700 to-rihla-light',
    features: ['Dossiers & pipeline', 'Itinéraire & circuits', 'Catalogue produits', 'Devis & messages'],
  },
  {
    slug: 'client',
    title: 'Client voyageur',
    subtitle: 'App mobile voyageur',
    description: 'Portail voyageur mobile : programme jour-par-jour, vouchers, contacts d\'urgence, chat avec le concierge et photos du voyage.',
    icon: Smartphone,
    gradient: 'from-rihla-dark to-rihla-700',
    features: ['Programme voyage', 'Vouchers digitaux', 'Concierge live', 'Album photos'],
  },
  {
    slug: 'guide',
    title: 'Guide terrain',
    subtitle: 'App mobile guide',
    description: 'Interface guide : planning du jour, fiches monuments, profil voyageurs, briefs S\'TOURS et reporting de fin de journée.',
    icon: UserCheck,
    gradient: 'from-rihla-light to-rihla-700',
    features: ['Planning du jour', 'Fiches monuments', 'Profils PAX', 'Reporting'],
  },
  {
    slug: 'chauffeur',
    title: 'Chauffeur',
    subtitle: 'App mobile chauffeur',
    description: 'Interface chauffeur : trajets, navigation, check-in véhicule, frais et tracking en temps réel pour la cellule opérations.',
    icon: Car,
    gradient: 'from-rihla-700 to-rihla-dark',
    features: ['Trajets & GPS', 'Check-in véhicule', 'Frais & tickets', 'Position live'],
  },
]

export default function MobileAppsHubPage() {
  return (
    <div className="rihla-page-bg min-h-screen p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="rihla-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 -translate-y-1/3 translate-x-1/4 rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(91,25,20,0.08), transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl rihla-button-primary flex items-center justify-center text-white shadow-lg">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-rihla-light">RIHLA Mobile Suite</span>
            </div>
            <h1 className="text-4xl font-black mb-2" style={{ color: 'var(--rihla-text)' }}>
              4 applications mobiles RIHLA
            </h1>
            <p className="text-lg max-w-3xl" style={{ color: 'var(--rihla-text-soft)' }}>
              Suite complète bordeaux + ivoire — Travel Designer pour le commercial, Client pour le voyageur,
              Guide pour les opérations terrain, Chauffeur pour la flotte. Toutes les apps partagent la même
              identité visuelle premium.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: 'var(--rihla-line)', background: 'var(--rihla-ivory-50)', color: 'var(--rihla-bordeaux-800)' }}>
                <Palette className="inline w-3 h-3 mr-1" />Theme bordeaux #5B1914
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: 'var(--rihla-line)', background: 'var(--rihla-ivory-50)', color: 'var(--rihla-bordeaux-800)' }}>
                Ivoire #FFF7EE
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: 'var(--rihla-line)', background: 'var(--rihla-ivory-50)', color: 'var(--rihla-bordeaux-800)' }}>
                4 apps × responsive
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: 'var(--rihla-line)', background: 'var(--rihla-ivory-50)', color: 'var(--rihla-bordeaux-800)' }}>
                PWA-ready
              </span>
            </div>
          </div>
        </div>

        {/* App grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {APPS.map((app) => {
            const Icon = app.icon
            return (
              <div key={app.slug} className="rihla-card p-6 flex flex-col group hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rihla-muted)' }}>
                      {app.subtitle}
                    </div>
                    <h2 className="text-2xl font-black" style={{ color: 'var(--rihla-text)' }}>
                      {app.title}
                    </h2>
                  </div>
                </div>

                <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--rihla-text-soft)' }}>
                  {app.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {app.features.map((f) => (
                    <div key={f} className="text-xs font-semibold flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                         style={{ background: 'var(--rihla-ivory-100)', color: 'var(--rihla-bordeaux-800)' }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: 'var(--rihla-red-600)' }} />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex gap-2">
                  <Link
                    to={`/mobile-apps/${app.slug}`}
                    className="rihla-button-primary flex-1 px-4 py-2.5 text-center text-sm flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    Ouvrir dans le shell
                  </Link>
                  <a
                    href={`/mobile-apps/APP_${app.slug.toUpperCase().replace('-', '_')}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rihla-button-secondary px-4 py-2.5 text-sm flex items-center gap-2"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs" style={{ color: 'var(--rihla-muted)' }}>
          Les 4 apps sont également accessibles directement via les URLs publiques&nbsp;:
          <code className="mx-1 px-1.5 py-0.5 rounded" style={{ background: 'var(--rihla-ivory-100)' }}>/mobile-apps/APP_*.html</code>
        </div>
      </div>
    </div>
  )
}
