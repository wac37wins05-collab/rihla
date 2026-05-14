import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { I18nProvider } from '@/i18n/config'
import './index.css'

const originalRemoveChild = Node.prototype.removeChild
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) return child
  return originalRemoveChild.call(this, child) as T
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => undefined)
}

if ('caches' in window) {
  caches.keys()
    .then((keys) => keys.forEach((key) => caches.delete(key)))
    .catch(() => undefined)
}

// ── Sentry error monitoring ──────────────────────────────────────────
// Only active when VITE_SENTRY_DSN is set (production / staging).
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
    // Sample 100% of errors, 10% of performance traces
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    // Ignore noisy browser extensions & network errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error exception captured',
      /^Network Error$/,
      /^Request aborted$/,
    ],
    beforeSend(event) {
      // Strip user PII from breadcrumbs before sending
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/, 'token=REDACTED')
      }
      return event
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
)
