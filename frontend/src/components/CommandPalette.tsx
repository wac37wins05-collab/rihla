/**
 * CommandPalette — ⌘K / Ctrl+K
 * Recherche globale fuzzy + actions rapides + pages récentes
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, ChevronRight, Command, Plus, FolderPlus, FileText,
  Calculator, Users, TrendingUp, Settings, Calendar,
  BarChart2, Clock, ArrowRight, Zap, Hash, Briefcase,
  CreditCard, MapPin, Star, Activity,
} from 'lucide-react'
import { ALL_GROUPS as NAV_GROUPS_ALL } from '../lib/roleConfig'
import clsx from 'clsx'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ResultKind = 'action' | 'page' | 'recent'

interface PaletteItem {
  id:       string
  kind:     ResultKind
  label:    string
  sub?:     string
  to?:      string
  action?:  () => void
  icon:     React.ElementType
  iconCls?: string
  badge?:   string
  kbd?:     string
}

/* ─── Quick actions ──────────────────────────────────────────────────────── */
const QUICK_ACTIONS = (navigate: (to: string) => void): PaletteItem[] => [
  {
    id: 'new-project', kind: 'action', label: 'Nouveau dossier voyage',
    sub: 'Créer un projet DMC', to: '/projects/new',
    icon: FolderPlus, iconCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    badge: 'Nouveau', kbd: 'N P',
  },
  {
    id: 'new-deal', kind: 'action', label: 'Nouveau deal CRM',
    sub: 'Ajouter un deal dans le pipeline', to: '/crm/pipeline-dmc',
    icon: TrendingUp, iconCls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    badge: 'Nouveau', kbd: 'N D',
  },
  {
    id: 'new-quotation', kind: 'action', label: 'Générer un devis',
    sub: 'Lancer le wizard de cotation', to: '/quotations/new',
    icon: Calculator, iconCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    badge: 'Nouveau', kbd: 'N Q',
  },
  {
    id: 'new-invoice', kind: 'action', label: 'Créer une facture',
    sub: 'Émettre une facture client', to: '/invoices',
    icon: CreditCard, iconCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    badge: 'Nouveau', kbd: 'N F',
  },
  {
    id: 'ops-cockpit', kind: 'action', label: 'Cockpit opérations live',
    sub: 'Vue temps réel des groupes actifs', to: '/ops/cockpit',
    icon: Activity, iconCls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
  {
    id: 'finance', kind: 'action', label: 'Tableau de bord Finance',
    sub: 'P&L, trésorerie, budgets', to: '/finance',
    icon: BarChart2, iconCls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
]

/* ─── Recent pages (localStorage-based) ─────────────────────────────────── */
const RECENT_KEY = 'rihla_cmd_recent_v1'

function loadRecent(): { label: string; to: string }[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(label: string, to: string) {
  try {
    const prev = loadRecent().filter(r => r.to !== to)
    const next = [{ label, to }, ...prev].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

/* ─── Flatten nav items ──────────────────────────────────────────────────── */
interface NavItem { to: string; label: string; group: string; icon?: React.ElementType }

const ICON_MAP: Record<string, React.ElementType> = {
  '/dashboard': Star, '/projects': Briefcase, '/quotations': Calculator,
  '/invoices': CreditCard, '/crm': TrendingUp, '/crm/pipeline-dmc': TrendingUp,
  '/finance': BarChart2, '/operations': Calendar, '/ops/cockpit': Activity,
  '/admin/users': Users, '/settings': Settings,
}

function allNavItems(): NavItem[] {
  const out: NavItem[] = []
  for (const g of NAV_GROUPS_ALL) {
    for (const it of g.items) {
      out.push({
        to:    it.to,
        label: it.label,
        group: g.label,
        icon:  ICON_MAP[it.to] ?? Hash,
      })
    }
  }
  return out
}

/* ─── Fuzzy score ────────────────────────────────────────────────────────── */
function fuzzy(hay: string, needle: string): number {
  if (!needle) return 0
  hay    = hay.toLowerCase()
  needle = needle.toLowerCase()
  if (hay.startsWith(needle)) return 2000
  if (hay.includes(needle))   return 1000 - hay.indexOf(needle)
  let hi = 0, score = 0, streak = 0
  for (const ch of needle) {
    const idx = hay.indexOf(ch, hi)
    if (idx === -1) return -1
    streak = idx === hi ? streak + 1 : 1
    score += streak
    hi = idx + 1
  }
  return score
}

/* ─── Result row ─────────────────────────────────────────────────────────── */
function ResultRow({
  item, active, onHover, onClick,
}: {
  item: PaletteItem; active: boolean; onHover: () => void; onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        active
          ? 'bg-rihla/8 dark:bg-rihla/15'
          : 'hover:bg-slate-50 dark:hover:bg-white/3',
      )}
    >
      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', item.iconCls ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
        <Icon size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={clsx('text-[13px] font-bold truncate', active ? 'text-rihla' : 'text-slate-800 dark:text-cream')}>
          {item.label}
        </p>
        {item.sub && (
          <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.badge && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rihla/10 text-rihla">
            {item.badge}
          </span>
        )}
        {item.kbd && (
          <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 hidden sm:block">
            {item.kbd}
          </span>
        )}
        {active && <ArrowRight size={13} className="text-rihla" />}
      </div>
    </button>
  )
}

/* ─── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50/80 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">({count})</span>
      )}
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function CommandPalette() {
  const [open,   setOpen]   = useState(false)
  const [q,      setQ]      = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const navItems  = useMemo(() => allNavItems(), [])
  const actions   = useMemo(() => QUICK_ACTIONS(navigate), [navigate])
  const recent    = useMemo(() => loadRecent(), [open]) // reload when opened

  /* ── Build flat result list ── */
  const allResults = useMemo((): PaletteItem[] => {
    if (!q.trim()) {
      // No query: show actions + recent pages
      const recentItems: PaletteItem[] = recent.map(r => ({
        id:      `recent:${r.to}`,
        kind:    'recent' as ResultKind,
        label:   r.label,
        sub:     r.to,
        to:      r.to,
        icon:    Clock,
        iconCls: 'bg-slate-100 text-slate-400 dark:bg-slate-800',
      }))
      return [...actions, ...recentItems]
    }

    const needle = q.trim()

    // Score actions
    const scoredActions = actions
      .map(a => ({ item: a, s: Math.max(fuzzy(a.label, needle), fuzzy(a.sub ?? '', needle)) }))
      .filter(r => r.s > 0)

    // Score nav items
    const scoredNav = navItems
      .map(n => ({
        s: Math.max(fuzzy(n.label, needle), fuzzy(n.group, needle), fuzzy(n.to, needle)),
        item: {
          id:      `nav:${n.to}`,
          kind:    'page' as ResultKind,
          label:   n.label,
          sub:     n.group,
          to:      n.to,
          icon:    n.icon ?? Hash,
          iconCls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        } as PaletteItem,
      }))
      .filter(r => r.s > 0)

    return [
      ...scoredActions.sort((a, b) => b.s - a.s).slice(0, 4).map(r => r.item),
      ...scoredNav.sort((a, b) => b.s - a.s).slice(0, 8).map(r => r.item),
    ]
  }, [q, actions, navItems, recent])

  /* ── Cursor reset on query change ── */
  useEffect(() => setCursor(0), [q])

  /* ── Global hotkey ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  /* ── Focus input on open ── */
  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const go = useCallback((item: PaletteItem) => {
    if (item.to) {
      saveRecent(item.label, item.to)
      setOpen(false)
      navigate(item.to)
    } else if (item.action) {
      setOpen(false)
      item.action()
    }
  }, [navigate])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = allResults[cursor]
      if (r) go(r)
    }
  }

  if (!open) return null

  // Split into sections for empty query
  const actionResults  = allResults.filter(r => r.kind === 'action')
  const recentResults  = allResults.filter(r => r.kind === 'recent')
  const pageResults    = allResults.filter(r => r.kind === 'page')
  const isFiltered     = q.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[620px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/10">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Rechercher une page, créer un dossier, lancer une action…"
            className="flex-1 bg-transparent outline-none text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-400">K</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 110px)' }}>

          {/* Filtered view */}
          {isFiltered && (
            <>
              {allResults.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Search size={24} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-[13px] font-semibold text-slate-400">Aucun résultat pour « {q} »</p>
                  <p className="text-[11px] text-slate-300 mt-1">Essayez "projet", "devis", "facture", "CRM"…</p>
                </div>
              ) : (
                <>
                  {actionResults.length > 0 && (
                    <>
                      <SectionHeader label="Actions rapides" count={actionResults.length} />
                      {actionResults.map((item, i) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          active={cursor === i}
                          onHover={() => setCursor(i)}
                          onClick={() => go(item)}
                        />
                      ))}
                    </>
                  )}
                  {pageResults.length > 0 && (
                    <>
                      <SectionHeader label="Pages" count={pageResults.length} />
                      {pageResults.map((item, i) => {
                        const absIdx = actionResults.length + i
                        return (
                          <ResultRow
                            key={item.id}
                            item={item}
                            active={cursor === absIdx}
                            onHover={() => setCursor(absIdx)}
                            onClick={() => go(item)}
                          />
                        )
                      })}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Default (no query) */}
          {!isFiltered && (
            <>
              {/* Quick actions */}
              <SectionHeader label="Actions rapides" />
              {actionResults.map((item, i) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  active={cursor === i}
                  onHover={() => setCursor(i)}
                  onClick={() => go(item)}
                />
              ))}

              {/* Recent pages */}
              {recentResults.length > 0 && (
                <>
                  <SectionHeader label="Récemment visité" count={recentResults.length} />
                  {recentResults.map((item, i) => {
                    const absIdx = actionResults.length + i
                    return (
                      <ResultRow
                        key={item.id}
                        item={item}
                        active={cursor === absIdx}
                        onHover={() => setCursor(absIdx)}
                        onClick={() => go(item)}
                      />
                    )
                  })}
                </>
              )}

              {recentResults.length === 0 && (
                <div className="px-4 py-4 text-center text-[11px] text-slate-300 dark:text-slate-600">
                  Commencez à taper pour rechercher dans toute l'application
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/5 flex items-center gap-4 text-[10px] text-slate-400 bg-slate-50/80 dark:bg-white/2">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono">↑↓</kbd> naviguer
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono">↵</kbd> ouvrir
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono">Esc</kbd> fermer
          </span>
          <span className="ml-auto flex items-center gap-1 text-rihla font-bold">
            <Zap size={10} /> {allResults.length} résultat{allResults.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
