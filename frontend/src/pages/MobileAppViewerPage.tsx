import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Smartphone } from 'lucide-react'

const APP_TITLES: Record<string, { title: string; file: string }> = {
  'travel-designer': { title: 'Travel Designer — App mobile', file: 'APP_TRAVEL_DESIGNER.html' },
  'client':          { title: 'Client voyageur — App mobile', file: 'APP_CLIENT.html' },
  'guide':           { title: 'Guide terrain — App mobile',   file: 'APP_GUIDE.html' },
  'chauffeur':       { title: 'Chauffeur — App mobile',       file: 'APP_CHAUFFEUR.html' },
}

export default function MobileAppViewerPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const meta = APP_TITLES[slug]

  if (!meta) {
    return (
      <div className="rihla-page-bg min-h-screen p-10 flex items-center justify-center">
        <div className="rihla-card p-8 max-w-md text-center">
          <h1 className="text-2xl font-black mb-2">App introuvable</h1>
          <p className="rihla-text-muted mb-4">L'app mobile demandée n'existe pas.</p>
          <Link to="/mobile-apps" className="rihla-button-primary inline-block px-4 py-2 text-sm">
            Retour au hub
          </Link>
        </div>
      </div>
    )
  }

  const src = `/mobile-apps/${meta.file}`

  return (
    <div className="rihla-page-bg min-h-screen flex flex-col">
      {/* Toolbar */}
      <div className="rihla-card mx-4 mt-4 mb-3 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mobile-apps" className="rihla-button-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Hub mobile
          </Link>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" style={{ color: 'var(--rihla-bordeaux-800)' }} />
            <h1 className="text-base font-bold" style={{ color: 'var(--rihla-text)' }}>{meta.title}</h1>
          </div>
        </div>
        <a href={src} target="_blank" rel="noopener noreferrer"
           className="rihla-button-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          Plein écran
        </a>
      </div>

      {/* Mobile-frame iframe */}
      <div className="flex-1 flex items-center justify-center px-4 pb-6">
        <div className="rihla-card overflow-hidden shadow-2xl"
             style={{ width: '420px', maxWidth: '100%', height: '85vh', maxHeight: '880px',
                      borderRadius: '36px', padding: '8px',
                      background: 'linear-gradient(135deg, var(--rihla-bordeaux-900), var(--rihla-bordeaux-700))' }}>
          <iframe
            src={src}
            title={meta.title}
            className="w-full h-full border-0"
            style={{ borderRadius: '28px', background: 'var(--rihla-ivory-100)' }}
          />
        </div>
      </div>
    </div>
  )
}
