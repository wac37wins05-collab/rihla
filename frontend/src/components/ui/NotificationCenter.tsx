/**
 * NotificationCenter — slide-in panel with grouped, actionable notifications.
 * Covers all 4 business domains: Finance, Ops, CRM, Cotation + System.
 */
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  X, CheckCheck, Trash2,
  TrendingUp, Navigation, Users, Calculator, Settings, ShieldAlert,
  AlertTriangle, CheckCircle, Info, AlertCircle,
  Bell,
} from 'lucide-react'
import { clsx } from 'clsx'
import { type AppNotification, type NotifDomain, type NotifType } from '@/hooks/useAppNotifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── Domain metadata ────────────────────────────────────────────────────────
const DOMAIN_META: Record<NotifDomain, { label: string; color: string; Icon: React.ElementType }> = {
  finance:  { label: 'Finance',    color: 'bg-amber-400',  Icon: TrendingUp },
  ops:      { label: 'Opérations', color: 'bg-blue-400',   Icon: Navigation },
  crm:      { label: 'CRM',        color: 'bg-purple-400', Icon: Users },
  cotation: { label: 'Cotation',   color: 'bg-emerald-400',Icon: Calculator },
  system:   { label: 'Système',    color: 'bg-slate-400',  Icon: Settings },
  security: { label: 'Sécurité',   color: 'bg-red-400',    Icon: ShieldAlert },
}

// ── Type metadata ──────────────────────────────────────────────────────────
const TYPE_META: Record<NotifType, { Icon: React.ElementType; text: string; bg: string }> = {
  success: { Icon: CheckCircle, text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  warning: { Icon: AlertTriangle, text: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20'   },
  error:   { Icon: AlertCircle,  text: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/20'     },
  info:    { Icon: Info,         text: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20'     },
}

// ── Filter tab type ────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unread' | NotifDomain

// ── NotificationItem ──────────────────────────────────────────────────────
function NotificationItem({
  notif, onRead, onDismiss,
}: {
  notif: AppNotification
  onRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const dm = DOMAIN_META[notif.domain]
  const tm = TYPE_META[notif.type]
  const DomainIcon = dm.Icon
  const TypeIcon   = tm.Icon

  const timeAgo = formatDistanceToNow(new Date(notif.timestamp), {
    addSuffix: true, locale: fr,
  })

  return (
    <div
      className={clsx(
        'relative flex gap-3 p-3.5 rounded-xl border transition-all group',
        notif.isRead
          ? 'border-transparent bg-transparent opacity-60 hover:opacity-90'
          : 'border-slate-200/80 dark:border-white/8 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow',
      )}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-rihla" />
      )}

      {/* Domain color strip */}
      <div className={clsx('absolute left-0 top-3 bottom-3 w-0.5 rounded-r', dm.color)} />

      {/* Type icon */}
      <div className={clsx('flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5', tm.bg)}>
        <TypeIcon size={15} className={tm.text} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DomainIcon size={10} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{dm.label}</span>
          <span className="text-slate-300 text-[10px]">·</span>
          <span className="text-[10px] text-slate-400">{timeAgo}</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-cream leading-snug">
          {notif.title}
        </p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
          {notif.message}
        </p>
        {notif.action && (
          <Link
            to={notif.action.href}
            onClick={() => onRead(notif.id)}
            className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-rihla hover:underline"
          >
            {notif.action.label} →
          </Link>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(notif.id)}
        className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        title="Ignorer"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ── Main NotificationCenter ───────────────────────────────────────────────
interface NotificationCenterProps {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  unreadCount: number
  onRead: (id: string) => void
  onMarkAllRead: () => void
  onDismiss: (id: string) => void
  onClearAll: () => void
  activeFilter: FilterTab
  onFilterChange: (f: FilterTab) => void
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',      label: 'Tout' },
  { id: 'unread',   label: 'Non lues' },
  { id: 'finance',  label: 'Finance' },
  { id: 'ops',      label: 'Ops' },
  { id: 'crm',      label: 'CRM' },
  { id: 'cotation', label: 'Cotation' },
]

export function NotificationCenter({
  open, onClose, notifications, unreadCount,
  onRead, onMarkAllRead, onDismiss, onClearAll,
  activeFilter, onFilterChange,
}: NotificationCenterProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap — move focus into panel when it opens
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus()
  }, [open])

  const filtered = notifications.filter(n => {
    if (activeFilter === 'all')    return true
    if (activeFilter === 'unread') return !n.isRead
    return n.domain === activeFilter
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-[60] bg-black/25 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Centre de notifications"
        className={clsx(
          'fixed top-0 right-0 h-full w-[400px] max-w-[100vw] z-[61]',
          'bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-white/10',
          'flex flex-col shadow-2xl outline-none',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rihla/10 flex items-center justify-center">
              <Bell size={15} className="text-rihla" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-900 dark:text-cream leading-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <p className="text-[11px] text-rihla font-semibold">{unreadCount} non lues</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                title="Tout marquer comme lu"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <CheckCheck size={13} /> Tout lire
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Effacer tout"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                activeFilter === tab.id
                  ? 'bg-rihla text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-rihla text-white text-[9px] font-black">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <Bell size={22} className="text-slate-300" />
              </div>
              <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-400">
                {activeFilter === 'unread' ? 'Tout est lu !' : 'Aucune notification'}
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                {activeFilter === 'unread'
                  ? 'Vous êtes à jour 🎉'
                  : 'Les nouvelles alertes apparaîtront ici.'}
              </p>
            </div>
          ) : (
            filtered.map(n => (
              <NotificationItem
                key={n.id}
                notif={n}
                onRead={onRead}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
          <p className="text-[11px] text-center text-slate-400">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · STOURS Suite
          </p>
        </div>
      </div>
    </>
  )
}
