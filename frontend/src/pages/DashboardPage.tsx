import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, TrendingUp, FolderKanban,
  ArrowRight, Receipt,
  Activity, AlertCircle, ChevronRight, Wifi, WifiOff, RefreshCw,
} from 'lucide-react'
import { projectsApi, invoicesApi, dashboardApi } from '@/lib/api'
import { StatusPill, StatCard } from '@/components/ui'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { clsx } from 'clsx'
import { InteractiveMoroccoMap } from '@/components/maps/InteractiveMoroccoMap'
import { GroupItineraryMap } from '@/components/maps/GroupItineraryMap'
import { useDashboardWS } from '@/hooks/useDashboardWS'
import { AlertsBanner } from '@/components/ui/AlertsBanner'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { useAlertsEngine } from '@/hooks/useAlertsEngine'
import { Zap, AlertOctagon } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuthStore()

  // ── Real-time KPI WebSocket ───────────────────────────────────────
  const { status: wsStatus, lastEvent } = useDashboardWS()

  // ── /dashboard/overview — single call replaces 3 separate requests ──
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(90).then(r => r.data),
    staleTime: 60_000,
  })

  // Fetch up to 100 projects for sparklines + activity feed (still needed for detail)
  const { data: projectsAll } = useQuery({
    queryKey: ['projects', 'dashboard-all'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data?.items ?? []),
    staleTime: 30_000,
  })
  const projects = projectsAll as any[] | undefined

  // Legacy kpis query kept for WS cache patching compatibility
  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardApi.kpis().then(r => r.data),
    staleTime: 60_000,
  })

  const { data: invoices } = useQuery({
    queryKey: ['invoices', 'dashboard'],
    queryFn: () => invoicesApi.list({ limit: 100 }).then(r => r.data).catch(() => []),
    staleTime: 30_000,
  })

  // Real KPI values — prefer overview data, fall back to kpis or projects
  const total       = overview?.summary?.total_projects ?? kpis?.total_projects ?? projects?.length ?? 0
  const inProgress  = overview?.by_status?.in_progress ?? kpis?.active_projects ?? 0
  const recentCount = overview?.summary?.period_projects ?? kpis?.recent_projects_30d ?? 0

  // Real invoice totals — memoized so sparkline deps don't invalidate on every render
  const paidInvoices = useMemo(
    () => (invoices as any[])?.filter((i: any) => i.status === 'paid') ?? [],
    [invoices]
  )
  const pendingInvoices = useMemo(
    () => (invoices as any[])?.filter((i: any) => i.status === 'sent' || i.status === 'overdue') ?? [],
    [invoices]
  )
  const paidTotal    = useMemo(() => paidInvoices.reduce((s: number, i: any) => s + (Number(i.total ?? 0)), 0), [paidInvoices])
  const pendingTotal = useMemo(() => pendingInvoices.reduce((s: number, i: any) => s + (Number(i.total ?? 0)), 0), [pendingInvoices])
  const grandTotal   = useMemo(() => paidTotal + pendingTotal, [paidTotal, pendingTotal])

  // ── Sparklines: aggregate daily activity over the last 14 days ─────────
  const today0 = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const projectsCreatedSpark = useMemo(() => {
    const buckets = Array(14).fill(0)
    for (const p of projects ?? []) {
      const d = new Date(p.created_at)
      d.setHours(0, 0, 0, 0)
      const diff = Math.floor((today0.getTime() - d.getTime()) / 86400000)
      if (diff >= 0 && diff < 14) buckets[13 - diff] += 1
    }
    return buckets
  }, [projects, today0])

  const projectsUpdatedSpark = useMemo(() => {
    const buckets = Array(14).fill(0)
    for (const p of projects ?? []) {
      const d = new Date(p.updated_at)
      d.setHours(0, 0, 0, 0)
      const diff = Math.floor((today0.getTime() - d.getTime()) / 86400000)
      if (diff >= 0 && diff < 14) buckets[13 - diff] += 1
    }
    return buckets
  }, [projects, today0])

  const invoicesPaidSpark = useMemo(() => {
    const buckets = Array(14).fill(0)
    for (const i of paidInvoices) {
      if (!i.issue_date && !i.created_at) continue
      const d = new Date(i.issue_date ?? i.created_at)
      d.setHours(0, 0, 0, 0)
      const diff = Math.floor((today0.getTime() - d.getTime()) / 86400000)
      if (diff >= 0 && diff < 14) buckets[13 - diff] += Number(i.total ?? 0)
    }
    return buckets
  }, [paidInvoices, today0])

  const invoicesPendingSpark = useMemo(() => {
    const buckets = Array(14).fill(0)
    for (const i of pendingInvoices) {
      if (!i.issue_date && !i.created_at) continue
      const d = new Date(i.issue_date ?? i.created_at)
      d.setHours(0, 0, 0, 0)
      const diff = Math.floor((today0.getTime() - d.getTime()) / 86400000)
      if (diff >= 0 && diff < 14) buckets[13 - diff] += Number(i.total ?? 0)
    }
    return buckets
  }, [pendingInvoices, today0])

  // Recently updated projects (sorted) for activity feed
  const recentlyUpdated = useMemo(() => {
    return [...(projects ?? [])]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
  }, [projects])
  
  const { criticalCount, warningCount, totalActive: totalAlerts, activeAlerts } = useAlertsEngine()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.full_name?.split(' ')[0] ?? 'Chakir'
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-white/5 px-8 py-6">
        <div className="max-w-[1600px] mx-auto flex justify-between items-end gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {wsStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <Wifi size={11} />
                  Temps réel
                </span>
              ) : wsStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
                  <RefreshCw size={11} className="animate-spin" />
                  Connexion…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <WifiOff size={11} />
                  Hors ligne
                </span>
              )}
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-500 capitalize">{today}</span>
              {lastEvent && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-rihla font-medium animate-pulse">
                    Mise à jour reçue
                  </span>
                </>
              )}
            </div>
            <h1 className="text-[24px] font-semibold text-slate-900 dark:text-cream tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Voici un aperçu de votre activité aujourd'hui.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-md transition-colors dark:bg-white/5 dark:border-white/10 dark:text-cream dark:hover:bg-white/10">
              <Activity size={14} strokeWidth={2} />
              Market Watch
            </button>
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-white bg-rihla hover:bg-rihla-dark rounded-md transition-colors"
            >
              <Plus size={14} strokeWidth={2.25} />
              Nouveau dossier
            </Link>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">

        {/* Smart alerts banner — only shown when there's something to act on */}
        {!isLoading && <AlertsBanner />}

        {/* Business Rules Alerts — AlertsEngine strip */}
        {!isLoading && totalAlerts > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-900/15 dark:to-amber-900/15 border border-rose-200/60 dark:border-rose-500/20">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-rose-500" />
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                Règles métier — {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''} active{totalAlerts > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-1">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                  <AlertOctagon size={9} /> {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  ⚠ {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {/* First critical alert preview */}
            {activeAlerts[0] && (
              <span className="hidden md:block text-[12px] text-slate-500 dark:text-slate-400 truncate flex-1">
                {activeAlerts[0].title} — {activeAlerts[0].message.substring(0, 60)}…
              </span>
            )}
            <Link
              to="/alerts"
              className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-[#5B1914] dark:text-[#E8734A] hover:underline"
            >
              Voir toutes <ChevronRight size={12} />
            </Link>
          </div>
        )}

        {/* Onboarding checklist — auto-hides when all steps done or dismissed */}
        {!isLoading && <OnboardingChecklist />}

        {isLoading && <DashboardSkeleton />}
        {!isLoading && (<>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Projets total"
            value={total}
            sub={`${inProgress} actifs`}
            icon={FolderKanban}
            sparkline={projectsUpdatedSpark}
            sparklineColor="rgb(180, 62, 32)"
          />
          <StatCard
            label="Nouveaux (30j)"
            value={recentCount}
            sub="créés ce mois-ci"
            icon={TrendingUp}
            sparkline={projectsCreatedSpark}
            sparklineColor="rgb(16, 185, 129)"
          />
          <StatCard
            label="Facturé"
            value={paidTotal > 0 ? `${(paidTotal/1000).toFixed(0)}k MAD` : '0 MAD'}
            sub={`${paidInvoices.length} facture${paidInvoices.length > 1 ? 's' : ''} payée${paidInvoices.length > 1 ? 's' : ''}`}
            icon={Receipt}
            sparkline={invoicesPaidSpark}
            sparklineColor="rgb(16, 185, 129)"
          />
          <StatCard
            label="En attente"
            value={pendingTotal > 0 ? `${(pendingTotal/1000).toFixed(0)}k MAD` : '0 MAD'}
            sub={`${pendingInvoices.length} facture${pendingInvoices.length > 1 ? 's' : ''} à encaisser`}
            icon={Activity}
            sparkline={invoicesPendingSpark}
            sparklineColor="rgb(245, 158, 11)"
          />
        </div>

        {/* ── IMMERSIVE MAP CENTERPIECE ──────────────────────────── */}
        <div className="stagger-5">
          <InteractiveMoroccoMap />
        </div>

        {/* ── GROUP ITINERARIES — animated routes, day timeline ─── */}
        <div className="stagger-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Itinéraires des groupes</h2>
              <p className="text-[12px] text-slate-500">
                Suivez chaque groupe jour par jour — lancez l'animation, sautez à un jour, comparez les routes.
              </p>
            </div>
          </div>
          <GroupItineraryMap />
        </div>

        <div className="grid grid-cols-12 gap-4">

          {/* MAIN COLUMN — PROJECTS & ACTIVITY (8 cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* RECENT PROJECTS */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-slate-900 dark:text-cream flex items-center gap-2">
                  <FolderKanban size={15} className="text-slate-400" strokeWidth={2} />
                  Projets en cours
                </h3>
                <Link to="/projects" className="text-[12px] text-rihla hover:underline font-medium flex items-center gap-0.5">
                  Voir tout <ChevronRight size={13} />
                </Link>
              </div>

              {(projects?.length ?? 0) === 0 ? (
                <div className="py-16 text-center text-[13px] text-slate-400">Aucun projet</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentlyUpdated.map((p: any) => (
                    <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group">
                      <div className="w-8 h-8 rounded-md bg-rihla/8 flex items-center justify-center text-rihla text-[12px] font-semibold flex-shrink-0">
                        {p.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 dark:text-cream truncate">{p.name}</p>
                        <p className="text-[12px] text-slate-500 truncate">{p.client_name}{p.destination && ` · ${p.destination}`}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <StatusPill status={p.status} />
                        <p className="text-[11px] text-slate-400 mt-1">{formatDistanceToNow(new Date(p.updated_at), { locale: fr, addSuffix: true })}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK ACTIONS — cross-domain widget */}
            <QuickActions />
          </div>

          {/* SIDE COLUMN — FINANCE & STATUS (4 cols) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* FINANCE WIDGET */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-cream flex items-center gap-2">
                  <Receipt size={14} className="text-slate-400" strokeWidth={2} />
                  Facturation
                </h3>
                <Link to="/invoices" className="text-[12px] text-rihla hover:underline">Détail</Link>
              </div>

              <p className="text-[24px] font-semibold tabular-nums text-slate-900 dark:text-cream tracking-tight">
                {grandTotal > 0 ? `${grandTotal.toLocaleString('fr-MA')} MAD` : '—'}
              </p>
              {paidTotal > 0 && grandTotal > 0 ? (
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp size={12} strokeWidth={2.25} />
                  {Math.round((paidTotal / grandTotal) * 100)}% encaissé
                </p>
              ) : grandTotal === 0 ? (
                <p className="text-[12px] text-slate-400 mt-1">Aucune facture enregistrée</p>
              ) : null}

              {grandTotal > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-[12px] items-center">
                    <span className="text-slate-500">Payées ({paidInvoices.length})</span>
                    <span className="font-medium tabular-nums text-slate-900 dark:text-cream">{paidTotal.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500"
                         style={{ width: `${Math.round((paidTotal / grandTotal) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[12px] items-center">
                    <span className="text-slate-500">En attente ({pendingInvoices.length})</span>
                    <span className="font-medium tabular-nums text-slate-900 dark:text-cream">{pendingTotal.toLocaleString('fr-MA')} MAD</span>
                  </div>
                </div>
              )}
            </div>

            {/* ACTIVITY FEED */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-5">
              <h3 className="text-[13px] font-semibold text-slate-900 dark:text-cream flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="text-slate-400" strokeWidth={2} />
                Activité récente
              </h3>
              <div className="space-y-3.5">
                {recentlyUpdated.length > 0 ? (
                  recentlyUpdated.slice(0, 5).map((p: any) => {
                    const updated = new Date(p.updated_at)
                    const created = new Date(p.created_at)
                    const isNew = Math.abs(updated.getTime() - created.getTime()) < 60_000
                    return (
                      <Link key={p.id} to={`/projects/${p.id}`} className="flex gap-2.5 items-start group">
                        <div className={clsx(
                          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                          p.status === 'in_progress' ? 'bg-blue-500' :
                          p.status === 'confirmed' || p.status === 'won' ? 'bg-emerald-500' :
                          p.status === 'draft' ? 'bg-slate-400' :
                          p.status === 'sent' ? 'bg-rihla' : 'bg-amber-500'
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-tight">
                            <span className="font-medium text-slate-900 dark:text-cream">
                              {isNew ? 'Nouveau dossier' : 'Mise à jour'}
                            </span>
                            {' · '}
                            <span className="text-rihla group-hover:underline">{p.name}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {p.client_name ?? 'Client non défini'}
                            {p.destination && ` · ${p.destination}`}
                            {' · '}
                            {formatDistanceToNow(updated, { locale: fr, addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <p className="text-[12px] text-slate-400 text-center py-4">Aucune activité récente</p>
                )}
              </div>
            </div>

          </div>
        </div>

        </>)}
      </div>
    </div>
  )
}

