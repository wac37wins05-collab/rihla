import { useState, useCallback, useEffect } from 'react'
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotificationToast } from '@/components/ui/NotificationToast'
import { GeniusAssistant }   from '@/components/ai/GeniusAssistant'
import { CommandPalette }    from '@/components/ui/CommandPalette'
import { PageTransition }    from '@/components/layout/PageTransition'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { clsx } from 'clsx'

import {
  LayoutDashboard, FolderKanban, Calculator, MapPin,
  Sparkles, BarChart2, Hash, Receipt, LogOut,
  Search, Bell, HelpCircle, Settings, Bus, FileText, Building2, Calendar, Hotel, BarChart3,
  Sun, Moon, Type, Compass, Gem, Utensils, Users, Radio, PieChart, TrendingUp,
  Globe, Car, Star, Truck, Trophy, Copy, Image as ImageIcon, Wand2, Plug, Leaf, Bot, Brain, Cloud, Workflow, ShoppingCart, Database, ListChecks, Zap, LayoutGrid, Library, Smartphone,
  Mail, FileSpreadsheet, Sliders, MessageCircle, Plane, Award, Layers,
  ChevronDown, ChevronRight, ChevronLeft, Menu, X, LucideIcon, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation, SUPPORTED_LANGUAGES } from '@/i18n/config'
import { useSSENotifications, SSENotification } from '@/hooks/useSSENotifications'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { GuidedTour } from '@/components/ui/GuidedTour'
import { getNavGroups, isMobileRole } from '@/lib/roleConfig'
import { useAppNotifications } from '@/hooks/useAppNotifications'
import { NotificationCenter } from '@/components/ui/NotificationCenter'
import { useAlertsEngine } from '@/hooks/useAlertsEngine'
import { useAllPrefs } from '@/hooks/usePref'
import rihlaLogoDark from '@/assets/rihla_logo_dark_bg.png'
import rihlaLogoLight from '@/assets/rihla_logo_light_bg.png'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FolderKanban, Calculator, MapPin, Sparkles, BarChart2, Hash, Receipt,
  Bus, FileText, Building2, Calendar, Hotel, BarChart3, Type, Compass, Gem, Utensils,
  Users, Radio, PieChart, TrendingUp, Globe, Car, Star, Truck, Bell, Settings, Trophy, Copy, ImageIcon, Wand2, Plug, Leaf, Bot, Brain, Cloud, Workflow, ShoppingCart, Database, ListChecks, Zap, LayoutGrid, Library, Smartphone,
  Mail, FileSpreadsheet, Sliders, MessageCircle, Plane, Award, Layers,
}

export function AppShell() {
  const { user, logout } = useAuthStore()
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'finance' | 'ops' | 'crm' | 'cotation' | 'system' | 'security'>('all')
  const [sidebarMini, setSidebarMini] = useState<boolean>(() => {
    try { return localStorage.getItem('rihla_sidebar_mini') === '1' } catch { return false }
  })
  const toggleSidebarMini = useCallback(() => {
    setSidebarMini(prev => {
      const next = !prev
      try { localStorage.setItem('rihla_sidebar_mini', next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-open')
    }
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  // ── Collapsible sidebar groups ────────────────────────────────────
  const COLLAPSED_DEFAULTS: Record<string, boolean> = {
    'EXTRAS — HAUTE VALEUR':  true,
    'EXTRAS — INNOVATION':    true,
    'LOGISTIQUE & RESSOURCES': true,
    'GESTION & FINANCE':      true,
    'INTÉGRATIONS & TECH':    true,
  }
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('rihla_nav_collapsed')
      return stored ? JSON.parse(stored) : COLLAPSED_DEFAULTS
    } catch { return COLLAPSED_DEFAULTS }
  })
  const toggleNavGroup = useCallback((label: string) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] }
      localStorage.setItem('rihla_nav_collapsed', JSON.stringify(next))
      return next
    })
  }, [])

  useKeyboardShortcuts({ onOpenCommandPalette: () => setCmdOpen(true) })

  // ── Sync backend prefs → ThemeContext + i18n on mount ───────────────────
  const backendPrefs = useAllPrefs()
  useEffect(() => {
    if (!backendPrefs || Object.keys(backendPrefs).length === 0) return
    // Sync theme
    const prefTheme = backendPrefs['theme'] as string | undefined
    if (prefTheme === 'dark' && theme !== 'dark') toggleTheme()
    else if (prefTheme === 'light' && theme !== 'light') toggleTheme()
    // Sync language
    const prefLang = SUPPORTED_LANGUAGES.find(({ code }) => code === backendPrefs['language'])?.code
    if (prefLang && prefLang !== i18n.language) i18n.changeLanguage(prefLang)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendPrefs])

  // ── RTL & Language Logic ─────────────────────────────────────────
  // (applyDirection is already called inside i18n.changeLanguage,
  //  this effect just keeps doc attrs in sync on first render)
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  const handleNotification = useCallback((n: SSENotification) => {
    console.info(`[Notification] ${n.title} — ${n.message}`)
  }, [])

  useSSENotifications(handleNotification)

  const isPublicPath = location.pathname === '/pricing-simulator'

  if (!user && !localStorage.getItem('stours_token') && !isPublicPath) {
    return <Navigate to="/login" replace />
  }

  const role = user?.role?.name ?? ''
  const mobileRole = isMobileRole(role)

  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismiss } = useAppNotifications()
  const { criticalCount: alertsCritical } = useAlertsEngine()
  const navGroups = getNavGroups(role)

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

  const hideSidebar = mobileRole

  // Redirect mobile roles to their dedicated portals
  if (mobileRole && (location.pathname === '/dashboard' || location.pathname === '/')) {
    if (role === 'driver')  return <Navigate to="/portal/driver" replace />
    if (role === 'guide')   return <Navigate to="/portal/guide" replace />
    if (role === 'client')  return <Navigate to="/portal" replace />
  }

    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <GlobalSearch />
        <GuidedTour />

      {/* ── COMMAND PALETTE ─────────────────────────────────────── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* ── SIDEBAR (Hidden for Field Ops & Clients) ────────────── */}
      {!hideSidebar && (
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        <aside
          className={clsx(
            'flex-shrink-0 flex flex-col border-r border-white/10 relative z-50 text-cream shadow-2xl',
            'transition-[width] duration-300 ease-in-out',
            sidebarMini ? 'w-16' : 'w-64',
            // Mobile: absolute drawer sliding from left
            'fixed lg:static inset-y-0 left-0 transition-transform duration-300',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{ background: 'linear-gradient(180deg, #5B1914 0%, #36100D 100%)' }}
        >

        {/* Logo header + mini toggle */}
        <div className={clsx(
          'border-b border-white/15 bg-black/10 flex items-center',
          sidebarMini ? 'px-3 py-5 justify-center' : 'px-5 py-5 justify-between'
        )}>
          {!sidebarMini && (
            <Link to="/dashboard" className="block">
              <img src={rihlaLogoLight} alt="RIHLA Suite" className="h-7 w-auto block dark:hidden" />
              <img src={rihlaLogoDark}  alt="RIHLA Suite" className="h-7 w-auto hidden dark:block" />
            </Link>
          )}
          {sidebarMini && (
            <Link to="/dashboard" title="Dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <LayoutDashboard size={16} className="text-cream" />
            </Link>
          )}
          <button
            onClick={toggleSidebarMini}
            title={sidebarMini ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
            className={clsx(
              'hidden lg:flex items-center justify-center rounded-lg transition-colors text-[#F2D2A1] hover:text-white hover:bg-white/15',
              sidebarMini ? 'w-8 h-8 mt-2' : 'w-7 h-7'
            )}
          >
            {sidebarMini ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={clsx('flex-1 overflow-y-auto pb-3 pt-3', sidebarMini ? 'px-2' : 'px-3')}>
          {navGroups.map((group, gi) => {
            const isCollapsed = !!collapsedGroups[group.label]
            // Check if any item in this group is active (so we can auto-expand)
            const checkActive = (path: string) => {
              const [toPath, toQuery = ''] = path.split('?')
              const targetKind = new URLSearchParams(toQuery).get('kind')
              const currentKind = new URLSearchParams(location.search).get('kind')
              return targetKind
                ? location.pathname === toPath && currentKind === targetKind
                : location.pathname === toPath ||
                  (location.pathname.startsWith(toPath) && toPath !== '/' && !targetKind && location.search === '')
            }
            const hasActiveItem = group.items.some(item =>
              checkActive(item.to) || (item.children?.some(c => checkActive(c.to)) ?? false)
            )
            // Auto-expand if active item is inside a collapsed group
            const effectivelyCollapsed = isCollapsed && !hasActiveItem

            return (
              <div key={group.label} className={clsx(gi > 0 && 'mt-5')}>
                {/* Group header — hidden in mini mode */}
                {!sidebarMini && (
                  <button
                    onClick={() => toggleNavGroup(group.label)}
                    aria-expanded={!effectivelyCollapsed}
                    aria-controls={`nav-group-${gi}`}
                    className="w-full flex items-center justify-between px-2 mb-2 group/hdr"
                  >
                    <span className="text-[10px] font-black tracking-wider uppercase text-[#F2D2A1] group-hover/hdr:text-white transition-colors">
                      {group.label}
                    </span>
                    <ChevronDown
                      size={11}
                      className={clsx(
                        'text-[#F2D2A1] transition-transform duration-200',
                        effectivelyCollapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  </button>
                )}
                {/* Divider in mini mode */}
                {sidebarMini && gi > 0 && <div className="my-2 border-t border-white/10" />}

                {/* Collapsible items */}
                <div
                  id={`nav-group-${gi}`}
                  className={clsx(
                    'overflow-hidden transition-all duration-200',
                    !sidebarMini && (effectivelyCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100')
                  )}
                >
                  {group.items.map((item) => {
                    const { to, icon: iconName, label, shortcut, children } = item
                    const Icon = ICON_MAP[iconName] ?? Hash

                    // Helper to check active state
                    const isActive = (p: string) => {
                      const [tp, tq = ''] = p.split('?')
                      const tk = new URLSearchParams(tq).get('kind')
                      const ck = new URLSearchParams(location.search).get('kind')
                      return tk
                        ? location.pathname === tp && ck === tk
                        : location.pathname === tp ||
                          (location.pathname.startsWith(tp) && tp !== '/' && !tk && location.search === '')
                    }

                    // ── Mini mode: icon-only with tooltip ──
                    if (sidebarMini) {
                      const active = isActive(to) || (children?.some(c => isActive(c.to)) ?? false)
                      return (
                        <Link
                          key={to}
                          to={children?.[0]?.to ?? to}
                          title={label}
                          style={active ? { backgroundColor: '#FFF7EE' } : undefined}
                          className={clsx(
                            'flex items-center justify-center w-10 h-10 rounded-xl mb-1 mx-auto transition-colors',
                            active
                              ? 'text-rihla shadow-sm'
                              : 'text-[#F2D2A1] hover:text-white hover:bg-white/[0.15]'
                          )}
                        >
                          <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                        </Link>
                      )
                    }

                    // ── Item with children (sub-menu) ──
                    if (children && children.length > 0) {
                      const childActive = children.some(c => isActive(c.to))
                      const subKey = `sub:${to}`
                      const subCollapsed = !!collapsedGroups[subKey] && !childActive
                      return (
                        <div key={to} className="mb-1">
                          <button
                            onClick={() => toggleNavGroup(subKey)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px]',
                              'transition-colors group relative',
                              childActive
                                ? 'text-rihla font-extrabold bg-[#FFF7EE] shadow-sm'
                                : 'text-[#FFF7EE] font-semibold hover:text-white hover:bg-white/[0.12]'
                            )}
                          >
                            <Icon size={16} className={clsx('flex-shrink-0', childActive ? 'text-rihla' : 'text-[#F2D2A1]')} strokeWidth={2} aria-hidden="true" />
                            <span className="flex-1 truncate text-left">{t(label.toLowerCase().replace(/ /g, '_')) || label}</span>
                            <ChevronRight size={13} className={clsx('flex-shrink-0 transition-transform duration-200', childActive ? 'text-rihla' : 'text-[#F2D2A1]', !subCollapsed && 'rotate-90')} />
                          </button>
                          <div className={clsx('overflow-hidden transition-all duration-200 ml-3', subCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100')}>
                            {children.map((child) => {
                              const ChildIcon = ICON_MAP[child.icon] ?? Hash
                              const cActive = isActive(child.to)
                              return (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  style={cActive ? { backgroundColor: '#FFF7EE' } : undefined}
                                  className={clsx(
                                    'flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12px]',
                                    'transition-colors group relative mb-0.5',
                                    cActive
                                      ? 'text-rihla font-extrabold shadow-sm'
                                      : 'text-[#FFF7EE] font-semibold hover:text-white hover:bg-white/[0.12]'
                                  )}
                                >
                                  <ChildIcon size={14} className={clsx('flex-shrink-0', cActive ? 'text-rihla' : 'text-[#F2D2A1]')} strokeWidth={2} aria-hidden="true" />
                                  <span className="flex-1 truncate">{t(child.label.toLowerCase().replace(/ /g, '_')) || child.label}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    // ── Regular item (no children) ──
                    const active = isActive(to)
                    return (
                      <Link
                        key={to}
                        to={to}
                        style={active ? { backgroundColor: '#FFF7EE' } : undefined}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px]',
                          'transition-colors group relative mb-1',
                          active
                            ? 'text-rihla font-extrabold shadow-sm'
                            : 'text-[#FFF7EE] font-semibold hover:text-white hover:bg-white/[0.12]'
                        )}
                      >
                        <Icon size={16} className={clsx('flex-shrink-0', active ? 'text-rihla' : 'text-[#F2D2A1]')} strokeWidth={2} aria-hidden="true" />
                        <span className="flex-1 truncate">{t(label.toLowerCase().replace(/ /g, '_')) || label}</span>
                        {shortcut && !active && (
                          <kbd className="hidden group-hover:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/15 border border-white/20 text-white">
                            ⌘{shortcut}
                          </kbd>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User card */}
        <div className={clsx('border-t border-white/15 bg-black/10', sidebarMini ? 'px-2 py-3' : 'px-3 py-4')}>
          {sidebarMini ? (
            /* Mini user card */
            <div className="flex flex-col items-center gap-2">
              <div className="relative" title={user?.full_name ?? 'Utilisateur'}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rihla to-rihla-dark flex items-center justify-center text-[11px] font-semibold text-white cursor-default">
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white/20" />
              </div>
              <button onClick={toggleTheme} title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F2D2A1] hover:text-white hover:bg-white/15 transition-colors">
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <Link to="/settings" title="Paramètres"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F2D2A1] hover:text-white hover:bg-white/15 transition-colors">
                <Settings size={14} />
              </Link>
              <button onClick={logout} title="Déconnexion"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F2D2A1] hover:text-red-300 hover:bg-white/15 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            /* Full user card */
            <>
              <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors group cursor-pointer">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rihla to-rihla-dark flex items-center justify-center text-[11px] font-semibold text-white">
                    {initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-white truncate leading-tight">
                    {user?.full_name ?? 'Utilisateur'}
                  </p>
                  <p className="text-[11px] text-[#F2D2A1] font-semibold truncate leading-tight mt-0.5">
                    {(user?.role?.name ?? 'expert').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 px-1">
                <button onClick={toggleTheme}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F2D2A1] hover:text-white hover:bg-white/15 transition-colors"
                  title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}>
                  {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
                <Link to="/settings" title="Paramètres"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F2D2A1] hover:text-white hover:bg-white/15 transition-colors">
                  <Settings size={14} />
                </Link>
                <div className="flex-1" />
                <button onClick={logout}
                  className="flex items-center gap-1.5 px-2 h-8 rounded-lg text-[11px] font-bold text-[#F2D2A1] hover:text-white hover:bg-white/15 transition-colors">
                  <LogOut size={12} /> Quitter
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
        </>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className={clsx('rihla-app-content flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300')}>
        
        {/* Top Global Bar (Hidden for field ops) */}
        {!hideSidebar && (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-30 shadow-sm dark:shadow-slate-900">
          <div className="flex items-center gap-3 text-[13px]">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-rihla hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-slate-600 dark:text-slate-400 font-semibold hidden sm:inline">Console</span>
            <ChevronRight size={12} className="text-slate-500 dark:text-slate-600 hidden sm:inline" />
            <span className="text-slate-950 dark:text-slate-100 font-extrabold capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 h-9 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 transition-colors"
            >
              <Search size={13} strokeWidth={2} />
              <span className="text-[12px] font-semibold w-32 text-left">Rechercher…</span>
              <kbd className="text-[10px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">⌘K</kbd>
            </button>

            {/* Notifications Bell → opens NotificationCenter panel */}
            <div className="relative flex items-center">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:text-rihla hover:bg-slate-100 dark:text-slate-300 dark:hover:text-[#E8734A] dark:hover:bg-white/10 transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
              >
                <Bell size={16} strokeWidth={1.75} aria-hidden="true" />
                {/* Unread notifications dot */}
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rihla rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>
              {/* Critical alerts badge */}
              {alertsCritical > 0 && (
                <Link
                  to="/alerts"
                  title={`${alertsCritical} alerte${alertsCritical > 1 ? 's' : ''} critique${alertsCritical > 1 ? 's' : ''}`}
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10"
                >
                  {alertsCritical}
                </Link>
              )}
            </div>

            {/* Notification center panel */}
            <NotificationCenter
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              unreadCount={unreadCount}
              onRead={markAsRead}
              onMarkAllRead={markAllRead}
              onDismiss={dismiss}
              onClearAll={clearAll}
              activeFilter={notifFilter}
              onFilterChange={setNotifFilter}
            />

            {/* Language Switcher — dropdown for 9 languages */}
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors"
                aria-label={`Langue : ${i18n.language.toUpperCase()}`}
              >
                <Globe size={13} aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase">{i18n.language}</span>
              </button>
              <div className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1.5">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors",
                      i18n.language === lang.code
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-cream"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
                    )}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {i18n.language === lang.code && <span className="ml-auto text-rihla text-[10px] font-black">ON</span>}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-rihla dark:hover:text-[#E8734A] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Aide">
              <HelpCircle size={16} strokeWidth={1.75} />
            </button>
          </div>
        </header>
        )}

        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <NotificationToast />
          <GeniusAssistant />
          {/* Route-level error boundary — resets automatically on navigation */}
          <ErrorBoundary resetKey={location.pathname}>
            {/* PageTransition key re-mounts on every route change → CSS enter animation */}
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

