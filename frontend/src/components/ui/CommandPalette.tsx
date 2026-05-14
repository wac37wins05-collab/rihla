import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, FolderKanban, BarChart2, Calculator, MapPin,
  Users, Settings, Zap, ArrowRight, Hash,
  Hotel, Bus, Receipt, Trophy, BookOpen, Clock,
  Plus, FilePlus, Sparkles,
  // CRM & Direction
  UserCheck, Inbox, GitMerge, PieChart, Target, Bell,
  // Opérations
  CalendarDays, Wrench, CheckCircle2, Truck, Clipboard, Navigation2,
  // Finance
  TrendingUp, DollarSign, Landmark, LineChart, Scale,
  // Studio IA
  Wand2, FileText, Leaf, CreditCard, Bot, Brain, Workflow,
  // Logistique & Ressources
  Globe, Package, Layers, Building2, Smartphone,
  // Extras & Outils
  Plane, MessageCircle, Download, UserPlus, Copy, PiggyBank,
  // Intégrations & Portails
  Server, ExternalLink, Layout, LayoutDashboard, Link2,
  // Misc
  Star, Mail, Gauge,
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { useRecentProjects } from '@/hooks/useRecentProjects'
import { clsx } from 'clsx'

// ── Quick Actions (creation flows) ─────────────────────────────────
type QuickAction = {
  label: string
  description: string
  path: string
  icon: typeof Plus
  shortcut?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Créer un projet',     description: 'Nouveau dossier DMC',       path: '/projects/new',        icon: Plus,       shortcut: '⌘⇧N' },
  { label: 'Créer un devis',      description: 'Nouvelle cotation',         path: '/quotations?new=1',    icon: Calculator, shortcut: '⌘J' },
  { label: 'Créer une facture',   description: 'Nouvelle facture client',   path: '/invoices?new=1',      icon: FilePlus,   shortcut: '⌘B' },
  { label: 'Créer un itinéraire', description: 'Nouveau circuit',           path: '/itineraries?new=1',   icon: MapPin },
  { label: 'Cloner un projet',    description: 'Dupliquer un dossier',      path: '/projects/clone',      icon: Copy },
]

// ── Navigation statique — tous les modules RIHLA ──────────────────
type NavItem = {
  label: string
  path: string
  icon: typeof BarChart2
  group: string
  shortcut?: string
}

const NAV_ITEMS: NavItem[] = [
  // ── Core DMC ──────────────────────────────────────────────────────
  { label: 'Dashboard',             path: '/dashboard',                   icon: LayoutDashboard, group: 'Navigation',        shortcut: '⌘D' },
  { label: 'Projets',               path: '/projects',                    icon: FolderKanban,    group: 'Navigation',        shortcut: '⌘P' },
  { label: 'Devis',                 path: '/quotations',                  icon: Calculator,      group: 'Navigation',        shortcut: '⌘J' },
  { label: 'Itinéraires',           path: '/itineraries',                 icon: MapPin,          group: 'Navigation' },
  { label: 'Factures',              path: '/invoices',                    icon: Receipt,         group: 'Navigation',        shortcut: '⌘B' },
  { label: 'Analytics',             path: '/analytics',                   icon: BarChart2,       group: 'Navigation' },
  { label: 'Paramètres',            path: '/settings',                    icon: Settings,        group: 'Navigation' },

  // ── CRM & Direction ───────────────────────────────────────────────
  { label: 'CRM',                   path: '/crm',                         icon: UserCheck,       group: 'CRM & Direction' },
  { label: 'Leads & Inbox',         path: '/crm/leads',                   icon: Inbox,           group: 'CRM & Direction' },
  { label: 'Pipeline DMC',          path: '/crm/pipeline',                icon: GitMerge,        group: 'CRM & Direction' },
  { label: 'CRM Reporting',         path: '/crm/reporting',               icon: PieChart,        group: 'CRM & Direction' },
  { label: 'CRM Nurturing',         path: '/crm/nurturing',               icon: Target,          group: 'CRM & Direction' },
  { label: 'CRM Tâches',            path: '/crm/tasks',                   icon: CheckCircle2,    group: 'CRM & Direction' },
  { label: 'DMC Quotes',            path: '/dmc-quotes',                  icon: FileText,        group: 'CRM & Direction' },
  { label: 'Leaderboard',           path: '/gamification/leaderboard',    icon: Trophy,          group: 'CRM & Direction' },

  // ── Opérations Live ───────────────────────────────────────────────
  { label: 'Opérations',            path: '/operations',                  icon: Gauge,           group: 'Opérations' },
  { label: 'Calendrier Ops',        path: '/operations/calendar',         icon: CalendarDays,    group: 'Opérations' },
  { label: 'Concierge',             path: '/operations/concierge',        icon: Star,            group: 'Opérations' },
  { label: 'Command Center',        path: '/operations/command-center',   icon: Navigation2,     group: 'Opérations' },
  { label: 'Ops Cockpit',           path: '/operations/cockpit',          icon: BarChart2,       group: 'Opérations' },
  { label: 'Rooming List',          path: '/operations/rooming',          icon: Clipboard,       group: 'Opérations' },
  { label: 'Qualité',               path: '/quality',                     icon: CheckCircle2,    group: 'Opérations' },
  { label: 'Field Ops',             path: '/field-ops',                   icon: Wrench,          group: 'Opérations' },
  { label: 'Group Ops Hub',         path: '/group-ops',                   icon: Package,         group: 'Opérations' },

  // ── Logistique & Ressources ────────────────────────────────────────
  { label: 'Hôtels',                path: '/inventory/hotels',            icon: Hotel,           group: 'Logistique' },
  { label: 'Guides',                path: '/inventory/guides',            icon: Users,           group: 'Logistique' },
  { label: 'Restaurants',           path: '/inventory/restaurants',       icon: Building2,       group: 'Logistique' },
  { label: 'Catalogue Premium',     path: '/catalogue-premium',           icon: Layers,          group: 'Logistique' },
  { label: 'Transports',            path: '/operations/command-center',   icon: Bus,             group: 'Logistique' },
  { label: 'Fleet Optimizer',       path: '/fleet-optimizer',             icon: Truck,           group: 'Logistique' },
  { label: 'Horizon Portal',        path: '/portal/horizon',              icon: Globe,           group: 'Logistique' },
  { label: 'Médiathèque',           path: '/media-library',               icon: BookOpen,        group: 'Logistique' },
  { label: 'Templates Itinéraires', path: '/itinerary-templates',         icon: Layout,          group: 'Logistique' },
  { label: 'Scoring Fournisseurs',  path: '/supplier-scoring',            icon: Star,            group: 'Logistique' },
  { label: 'Allotements',           path: '/allotments',                  icon: Layers,          group: 'Logistique' },

  // ── Finance & Gestion ─────────────────────────────────────────────
  { label: 'Rapports',              path: '/reports',                     icon: TrendingUp,      group: 'Finance' },
  { label: 'Références',            path: '/references',                  icon: Hash,            group: 'Finance' },
  { label: 'Forex Dashboard',       path: '/forex',                       icon: DollarSign,      group: 'Finance' },
  { label: 'Simulateur de Prix',    path: '/pricing-simulator',           icon: Calculator,      group: 'Finance' },
  { label: 'Stratégie Financière',  path: '/finance/strategy',            icon: Landmark,        group: 'Finance' },
  { label: 'P&L Dashboard',         path: '/finance/p-l',                 icon: LineChart,       group: 'Finance' },
  { label: 'Budget Tracker',        path: '/budget-tracker',              icon: PiggyBank,       group: 'Finance' },
  { label: 'Export Excel',          path: '/export-excel',                icon: Download,        group: 'Finance' },

  // ── Studio IA & Créatif ────────────────────────────────────────────
  { label: 'Assistant IA',          path: '/ai',                          icon: Sparkles,        group: 'Studio IA' },
  { label: 'Content Studio',        path: '/ai/content-studio',           icon: BookOpen,        group: 'Studio IA' },
  { label: 'Générateur de Circuits',path: '/circuit-generator',           icon: Wand2,           group: 'Studio IA' },
  { label: 'Proposal Studio',       path: '/proposal-studio',             icon: FileText,        group: 'Studio IA' },
  { label: 'Rédaction Propositions',path: '/proposal-writer',             icon: Brain,           group: 'Studio IA' },
  { label: 'Travel Designer',       path: '/travel-designer',             icon: MapPin,          group: 'Studio IA' },
  { label: 'Travel Designer Pro',   path: '/travel-designer-pro',         icon: Sparkles,        group: 'Studio IA' },
  { label: 'Cotation Avancée',      path: '/cotation-advanced',           icon: Calculator,      group: 'Studio IA' },
  { label: 'Devis par Email',       path: '/email-quotation',             icon: Mail,            group: 'Studio IA' },
  { label: 'Pricing Coach',         path: '/pricing-coach',               icon: TrendingUp,      group: 'Studio IA' },
  { label: 'Durabilité',            path: '/sustainability',              icon: Leaf,            group: 'Studio IA' },
  { label: 'Agent Designer',        path: '/agent-designer',              icon: Bot,             group: 'Studio IA' },
  { label: 'Automations',           path: '/automations',                 icon: Workflow,        group: 'Studio IA' },
  { label: 'Templates Documents',   path: '/document-templates',          icon: Layout,          group: 'Studio IA' },
  { label: 'Simulateur What-If',    path: '/what-if',                     icon: Scale,           group: 'Studio IA' },

  // ── B2B & Portails ─────────────────────────────────────────────────
  { label: 'Portail Client',        path: '/portal',                      icon: ExternalLink,    group: 'B2B & Portails' },
  { label: 'Client Portal Interactif', path: '/client-portal',            icon: Link2,           group: 'B2B & Portails' },
  { label: 'Portail Guide',         path: '/portal/guide',                icon: Users,           group: 'B2B & Portails' },
  { label: 'Portail Driver',        path: '/portal/driver',               icon: Truck,           group: 'B2B & Portails' },
  { label: 'Portail B2B',           path: '/b2b-portal',                  icon: Building2,       group: 'B2B & Portails' },
  { label: 'Gestion Passagers',     path: '/passengers',                  icon: UserPlus,        group: 'B2B & Portails' },
  { label: 'Recherche Vols',        path: '/flight-search',               icon: Plane,           group: 'B2B & Portails' },
  { label: 'WhatsApp Hub',          path: '/whatsapp',                    icon: MessageCircle,   group: 'B2B & Portails' },
  { label: 'Notifications',         path: '/notifications',               icon: Bell,            group: 'B2B & Portails' },
  { label: 'Alertes & Règles',     path: '/alerts',                      icon: Zap,             group: 'B2B & Portails', shortcut: '⌘A' },
  { label: 'Export PDF',           path: '/pdf-export',                  icon: Download,        group: 'Finance',        shortcut: '⌘⇧P' },
  { label: 'Apps Mobiles',          path: '/mobile-apps',                 icon: Smartphone,      group: 'B2B & Portails' },

  // ── Intégrations & Tech ────────────────────────────────────────────
  { label: 'Intégrations',          path: '/integrations',                icon: Zap,             group: 'Intégrations' },
  { label: 'M365 Hub',              path: '/m365',                        icon: Server,          group: 'Intégrations' },
  { label: 'O2C Hub',               path: '/o2c',                         icon: TrendingUp,      group: 'Intégrations' },
  { label: 'P2P Hub',               path: '/p2p',                         icon: Receipt,         group: 'Intégrations' },
  { label: 'Data Hub',              path: '/data-hub',                    icon: BarChart2,       group: 'Intégrations' },
  { label: 'ERP Integrations',      path: '/erp-integrations',            icon: Server,          group: 'Intégrations' },
  { label: 'Agent de Paiement',     path: '/payment-agent',               icon: CreditCard,      group: 'Intégrations' },
]

interface Props {
  open: boolean
  onClose: () => void
}

type Result =
  | { type: 'recent';  data: { id: string; name: string; reference?: string | null; client_name?: string | null } }
  | { type: 'project'; data: any }
  | { type: 'action';  data: QuickAction }
  | { type: 'nav';     data: NavItem }

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { recents, refresh: refreshRecents } = useRecentProjects()

  // Project search (live)
  const { data: projectsData } = useQuery({
    queryKey: ['projects-search-palette', query],
    queryFn: () => projectsApi.list({ search: query, limit: 5 }).then(r => r.data),
    enabled: query.length >= 2,
  })
  const matchedProjects: any[] = (projectsData as any)?.items ?? []

  // Filter quick actions
  const matchedActions = useMemo(() => {
    if (!query) return QUICK_ACTIONS
    const q = query.toLowerCase()
    return QUICK_ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      'créer'.includes(q) || 'create'.includes(q) || 'nouveau'.includes(q)
    )
  }, [query])

  // Filter nav — show top 8 when idle, full match on search
  const matchedNav = useMemo(() => {
    if (!query) {
      // Show only the core navigation shortcuts when idle
      return NAV_ITEMS.filter(item => item.group === 'Navigation').slice(0, 8)
    }
    const q = query.toLowerCase()
    // Search across label, group, and path for maximum discoverability
    return NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q)
    )
  }, [query])

  // Recents shown only when no query
  const visibleRecents = !query ? recents.slice(0, 5) : []

  // Filter project ids already in recents to avoid duplicates
  const recentIds = new Set(visibleRecents.map(r => r.id))
  const filteredProjects = matchedProjects.filter(p => !recentIds.has(p.id))

  const allResults: Result[] = [
    ...visibleRecents.map((r): Result => ({ type: 'recent', data: r })),
    ...filteredProjects.map((p): Result => ({ type: 'project', data: p })),
    ...matchedActions.map((a): Result => ({ type: 'action', data: a })),
    ...matchedNav.map((n): Result => ({ type: 'nav', data: n })),
  ]

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      refreshRecents()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, refreshRecents])

  const navigateTo = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  const runResult = useCallback((item: Result) => {
    if (item.type === 'recent')  navigateTo(`/projects/${item.data.id}`)
    else if (item.type === 'project') navigateTo(`/projects/${item.data.id}`)
    else navigateTo(item.data.path)
  }, [navigateTo])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      const item = allResults[selectedIdx]
      if (item) runResult(item)
    }
  }

  if (!open) return null

  // Group rendering helper
  let cursor = 0
  const renderRecents = () => {
    if (!visibleRecents.length) return null
    const start = cursor
    cursor += visibleRecents.length
    return (
      <Section label="Récents" icon={<Clock size={9} />}>
        {visibleRecents.map((r, i) => (
          <Row
            key={`recent-${r.id}`}
            active={selectedIdx === start + i}
            onMouseEnter={() => setSelectedIdx(start + i)}
            onClick={() => navigateTo(`/projects/${r.id}`)}
            iconBg="bg-rihla/10"
            icon={<FolderKanban size={14} className="text-rihla" />}
            title={r.name}
            subtitle={
              <span className="flex items-center gap-1">
                <Hash size={9} /> {r.reference || 'REF-PENDING'}
                {r.client_name && <> · {r.client_name}</>}
              </span>
            }
            tail={selectedIdx === start + i ? <ArrowRight size={12} className="text-rihla" /> : null}
          />
        ))}
      </Section>
    )
  }

  const renderProjects = () => {
    if (!filteredProjects.length) return null
    const start = cursor
    cursor += filteredProjects.length
    return (
      <Section label="Projets" icon={<Search size={9} />}>
        {filteredProjects.map((p, i) => (
          <Row
            key={`proj-${p.id}`}
            active={selectedIdx === start + i}
            onMouseEnter={() => setSelectedIdx(start + i)}
            onClick={() => navigateTo(`/projects/${p.id}`)}
            iconBg="bg-rihla/10"
            icon={<FolderKanban size={14} className="text-rihla" />}
            title={p.name}
            subtitle={
              <span className="flex items-center gap-1">
                <Hash size={9} /> {p.reference || 'REF-PENDING'}
                {p.client_name && <> · {p.client_name}</>}
              </span>
            }
            tail={selectedIdx === start + i ? <ArrowRight size={12} className="text-rihla" /> : null}
          />
        ))}
      </Section>
    )
  }

  const renderActions = () => {
    if (!matchedActions.length) return null
    const start = cursor
    cursor += matchedActions.length
    return (
      <Section label="Actions rapides" icon={<Zap size={9} />}>
        {matchedActions.map((a, i) => (
          <Row
            key={`act-${a.path}`}
            active={selectedIdx === start + i}
            onMouseEnter={() => setSelectedIdx(start + i)}
            onClick={() => navigateTo(a.path)}
            iconBg="bg-emerald-500/10"
            icon={<a.icon size={14} className="text-emerald-600" />}
            title={a.label}
            subtitle={a.description}
            tail={a.shortcut ? <Kbd>{a.shortcut}</Kbd> : null}
          />
        ))}
      </Section>
    )
  }

  const renderNav = () => {
    if (!matchedNav.length) return null
    const start = cursor
    cursor += matchedNav.length
    return (
      <Section label={query ? `Pages (${matchedNav.length})` : 'Navigation'} icon={<ArrowRight size={9} />}>
        {matchedNav.map((item, i) => {
          const Icon = item.icon
          return (
            <Row
              key={`nav-${item.path}`}
              active={selectedIdx === start + i}
              onMouseEnter={() => setSelectedIdx(start + i)}
              onClick={() => navigateTo(item.path)}
              iconBg="bg-slate-100 dark:bg-white/5"
              icon={<Icon size={13} className="text-slate-500" />}
              title={item.label}
              subtitle={
                query
                  ? <span className="text-[10px] text-slate-400">{item.group} <span className="font-mono">· {item.path}</span></span>
                  : <span className="text-[10px] uppercase tracking-widest text-slate-400">{item.group}</span>
              }
              tail={item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
            />
          )
        })}
      </Section>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">

        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher projets, actions, pages…"
            className="flex-1 bg-transparent text-[14px] text-slate-900 dark:text-cream placeholder:text-slate-400 outline-none"
          />
          <Kbd>ESC</Kbd>
        </div>

        {/* Results */}
        <div className="max-h-[440px] overflow-y-auto py-2">
          {allResults.length === 0 && (
            <div className="px-6 py-10 text-center text-[13px] text-slate-400">
              {query ? <>Aucun résultat pour <strong>"{query}"</strong></> : 'Aucun résultat'}
            </div>
          )}
          {renderRecents()}
          {renderProjects()}
          {renderActions()}
          {renderNav()}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> Naviguer</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> Ouvrir</span>
          <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> Fermer</span>
          <span className="flex-1" />
          <span className="opacity-60">{NAV_ITEMS.length} pages · tapez pour filtrer</span>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────
function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-5 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon} {label}
      </p>
      {children}
    </div>
  )
}

function Row({
  active, onClick, onMouseEnter, iconBg, icon, title, subtitle, tail,
}: {
  active: boolean
  onClick: () => void
  onMouseEnter: () => void
  iconBg: string
  icon: React.ReactNode
  title: string
  subtitle: React.ReactNode
  tail: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={clsx(
        'w-full flex items-center gap-3 px-5 py-2 text-left transition-colors',
        active ? 'bg-rihla/5 dark:bg-rihla/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
      )}
    >
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-800 dark:text-cream truncate">{title}</p>
        <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
      </div>
      {tail && <span className="flex-shrink-0">{tail}</span>}
    </button>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[10px] font-mono font-medium text-slate-500 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
      {children}
    </kbd>
  )
}
