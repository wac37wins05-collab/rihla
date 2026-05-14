import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Reset key — when this changes, the boundary resets (use location.pathname) */
  resetKey?: string
}

interface State {
  error: Error | null
  resetKey?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: undefined }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Auto-reset when the route changes (resetKey changes)
    if (props.resetKey !== undefined && props.resetKey !== state.resetKey && state.error) {
      return { error: null, resetKey: props.resetKey }
    }
    if (props.resetKey !== state.resetKey) {
      return { resetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 500))
  }

  handleRetry = () => this.setState({ error: null })

  handleHome = () => {
    this.setState({ error: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const msg = this.state.error.message

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-8 py-16 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-6">
          <AlertTriangle size={28} className="text-rose-500" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Une erreur inattendue est survenue
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-8">
          {msg || 'Le composant a planté. Essayez de recharger la page ou revenez au tableau de bord.'}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
          <button
            onClick={this.handleHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rihla text-white text-sm font-medium hover:bg-rihla-dark transition-colors"
          >
            <Home size={14} />
            Tableau de bord
          </button>
        </div>

        {/* Dev detail */}
        {import.meta.env.DEV && (
          <details className="mt-8 text-left max-w-lg w-full">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
              Détails (dev only)
            </summary>
            <pre className="mt-2 text-[11px] bg-slate-100 dark:bg-white/5 rounded-lg p-3 overflow-auto text-rose-600 dark:text-rose-400">
              {this.state.error.stack}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
