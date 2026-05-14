import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search,
  MapPin, Users, ChevronRight,
  TrendingUp, Hash, LayoutGrid, Kanban, List,
  CalendarDays, DollarSign, Trash2, Tag,
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { StatusBadge, EmptyState } from '@/components/ui'
import { ProjectGridSkeleton } from '@/components/ui/Skeleton'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { DataTable, type DataTableColumn, type BulkAction } from '@/components/ui/DataTable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { clsx } from 'clsx'

const STATUSES = ['', 'draft', 'in_progress', 'validated', 'sent', 'won', 'lost']
const LABELS: Record<string, string> = {
  '': 'Tous',
  draft: 'Brouillon',
  in_progress: 'Étude active',
  validated: 'Devis prêt',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
}

const TYPE_COLORS: Record<string, string> = {
  incentive: 'bg-purple-50 text-purple-700 border-purple-200',
  leisure:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  mice:      'bg-blue-50 text-blue-700 border-blue-200',
  fit:       'bg-amber-50 text-amber-700 border-amber-200',
  luxury:    'bg-rihla/8 text-rihla border-rihla/20',
}

const PAGE_SIZE = 20
type ViewMode = 'grid' | 'kanban' | 'list'

/* ─── DataTable columns definition ──────────────────────────────────────── */

const TABLE_COLUMNS: DataTableColumn<any>[] = [
  {
    key: 'reference',
    header: 'Réf.',
    width: '110px',
    accessor: (p) => (
      <Link to={`/projects/${p.id}`} className="font-mono text-[12px] text-rihla hover:underline">
        {p.reference || 'PENDING'}
      </Link>
    ),
    sortValue: (p) => p.reference || '',
    filterValue: (p) => p.reference || '',
  },
  {
    key: 'name',
    header: 'Dossier',
    accessor: (p) => (
      <div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-cream line-clamp-1">{p.name}</p>
        <p className="text-[11px] text-slate-400">{p.client_name || 'Client direct'}</p>
      </div>
    ),
    sortValue: (p) => p.name || '',
    filterValue: (p) => `${p.name || ''} ${p.client_name || ''}`,
  },
  {
    key: 'status',
    header: 'Statut',
    accessor: (p) => <StatusBadge status={p.status} />,
    sortValue: (p) => p.status || '',
    filterValue: (p) => p.status || '',
    width: '120px',
  },
  {
    key: 'project_type',
    header: 'Type',
    width: '110px',
    accessor: (p) => (
      <span className={clsx(
        'text-[10px] font-medium px-2 py-0.5 rounded border uppercase tracking-wide',
        TYPE_COLORS[p.project_type] ?? 'bg-slate-50 text-slate-500 border-slate-200',
      )}>
        {p.project_type || '—'}
      </span>
    ),
    sortValue: (p) => p.project_type || '',
    filterValue: (p) => p.project_type || '',
  },
  {
    key: 'destination',
    header: 'Destination',
    accessor: (p) => (
      <span className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-400">
        <MapPin size={11} className="text-slate-400" /> {p.destination || 'Maroc'}
      </span>
    ),
    sortValue: (p) => p.destination || '',
    filterValue: (p) => p.destination || '',
  },
  {
    key: 'pax_count',
    header: 'Pax',
    width: '70px',
    accessor: (p) => (
      <span className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-400">
        <Users size={11} /> {p.pax_count ?? 0}
      </span>
    ),
    sortValue: (p) => p.pax_count ?? 0,
  },
  {
    key: 'budget_total',
    header: 'Budget',
    width: '130px',
    accessor: (p) => (
      <span className="text-[12px] font-bold text-rihla tabular-nums">
        {p.budget_total
          ? new Intl.NumberFormat('fr-FR').format(p.budget_total) + ' MAD'
          : '—'}
      </span>
    ),
    sortValue: (p) => p.budget_total ?? 0,
  },
  {
    key: 'updated_at',
    header: 'Modifié',
    width: '110px',
    accessor: (p) => (
      <span className="text-[11px] text-slate-400 tabular-nums">
        {p.updated_at ? format(new Date(p.updated_at), 'dd/MM/yy', { locale: fr }) : '—'}
      </span>
    ),
    sortValue: (p) => p.updated_at || '',
  },
  {
    key: 'id',
    header: '',
    width: '48px',
    accessor: (p) => (
      <Link
        to={`/projects/${p.id}`}
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-rihla hover:bg-rihla/5 transition-colors"
      >
        <ChevronRight size={14} />
      </Link>
    ),
  },
]

/* ─── Bulk actions ───────────────────────────────────────────────────────── */

const BULK_ACTIONS: BulkAction<any>[] = [
  {
    label: 'Archiver',
    icon: Tag,
    onClick: (rows) => { console.log('Archive', rows.map(r => r.id)) },
  },
  {
    label: 'Supprimer',
    icon: Trash2,
    variant: 'danger',
    onClick: (rows) => { console.log('Delete', rows.map(r => r.id)) },
  },
]

/* ─── Main component ─────────────────────────────────────────────────────── */

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch]             = useState(searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '')
  const [viewMode, setViewMode]         = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) ?? 'grid',
  )
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.q = debouncedSearch
    if (statusFilter) params.status = statusFilter
    if (viewMode !== 'grid') params.view = viewMode
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, statusFilter, viewMode, setSearchParams])

  /* ── Infinite query (grid) ── */
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['projects', debouncedSearch, statusFilter],
    queryFn: ({ pageParam = 0 }) =>
      projectsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: (pageParam as number) * PAGE_SIZE,
      }).then(r => r.data),
    getNextPageParam: (lastPage: any, allPages) =>
      (lastPage as any)?.has_more ? allPages.length : undefined,
    initialPageParam: 0,
  })

  /* ── Flat query for list/table view (all records) ── */
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['projects-all', debouncedSearch, statusFilter],
    queryFn: () =>
      projectsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        limit: 500,
        offset: 0,
      }).then(r => r.data),
    enabled: viewMode === 'list',
  })

  const projects    = data?.pages.flatMap((p: any) => p?.items ?? []) ?? []
  const allProjects = (allData as any)?.items ?? []
  const total       = (data?.pages[0] as any)?.total ?? 0

  /* ── Infinite scroll sentinel ── */
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { threshold: 0.1, rootMargin: '120px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const qc = useQueryClient()
  const prefetchProject = useCallback((id: string) => {
    qc.prefetchQuery({
      queryKey: ['project', id],
      queryFn: () => projectsApi.get(id).then(r => r.data),
      staleTime: 60_000,
    })
  }, [qc])

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 transition-colors">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-white/5 px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 dark:text-cream tracking-tight">Projets</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Tous les dossiers à l'étude, validés ou archivés.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle — grid / list / kanban */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-md">
              {([
                { mode: 'grid',   icon: LayoutGrid, label: 'Grille' },
                { mode: 'list',   icon: List,       label: 'Liste'  },
                { mode: 'kanban', icon: Kanban,      label: 'Kanban' },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-[12px] font-medium transition-colors flex items-center gap-1.5',
                    viewMode === mode
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cream shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  <Icon size={13} strokeWidth={1.75} /> {label}
                </button>
              ))}
            </div>

            <Link
              to="/projects/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-rihla hover:bg-rihla-dark text-white text-[13px] font-medium rounded-md transition-colors"
            >
              <Plus size={15} strokeWidth={2} /> Nouveau dossier
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-6">

        {/* Search + filters (not shown in list mode — DataTable has its own search) */}
        {viewMode !== 'list' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input
                className="w-full h-9 pl-9 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-md text-[13px]
                           text-slate-900 dark:text-cream placeholder:text-slate-400
                           focus:outline-none focus:border-rihla focus:ring-2 focus:ring-rihla/15 transition"
                placeholder="Rechercher par référence, agence, destination…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-0.5 rounded-md overflow-x-auto scrollbar-none">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 h-8 rounded text-[12px] font-medium whitespace-nowrap transition-colors',
                    statusFilter === s
                      ? s === 'won'  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : s === 'lost' ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                      : 'bg-rihla/10 text-rihla'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
                  )}
                >
                  {s === 'won' && statusFilter === 'won' ? '✓ ' : ''}
                  {LABELS[s]}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-1.5 h-9 px-2.5 bg-emerald-50 border border-emerald-100 rounded-md text-emerald-700 text-[12px] font-medium">
              <TrendingUp size={13} strokeWidth={2} /> +12% vs M-1
            </div>
          </div>
        )}

        {/* List mode: status filter row */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none">
            <div className="flex bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-0.5 rounded-md">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 h-8 rounded text-[12px] font-medium whitespace-nowrap transition-colors',
                    statusFilter === s
                      ? 'bg-rihla/10 text-rihla'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
                  )}
                >
                  {LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 h-9 px-2.5 bg-emerald-50 border border-emerald-100 rounded-md text-emerald-700 text-[12px] font-medium">
              <TrendingUp size={13} strokeWidth={2} /> +12% vs M-1
            </div>
          </div>
        )}

        {/* Count (grid only) */}
        {viewMode !== 'list' && !isLoading && total > 0 && (
          <div className="flex items-center mb-4">
            <p className="text-[12px] text-slate-500">
              {projects.length} / {total} dossier{total > 1 ? 's' : ''}
              {isFetching && !isLoading && <span className="ml-2 text-rihla animate-pulse">↻</span>}
            </p>
          </div>
        )}

        {/* ── List (DataTable) view ── */}
        {viewMode === 'list' && (
          <DataTable
            data={allProjects}
            columns={TABLE_COLUMNS}
            getRowId={(p) => p.id}
            loading={allLoading}
            loadingRows={10}
            searchable
            exportFilename="projets"
            exportData={(rows) => rows.map((p) => ({
              'Référence': p.reference || '',
              'Dossier': p.name,
              'Client': p.client_name || '',
              'Statut': p.status,
              'Type': p.project_type || '',
              'Destination': p.destination || '',
              'Pax': p.pax_count || 0,
              'Budget MAD': p.budget_total || 0,
              'Modifié': p.updated_at ? format(new Date(p.updated_at), 'dd/MM/yyyy', { locale: fr }) : '',
            }))}
            bulkActions={BULK_ACTIONS}
            pageSize={25}
            onRowClick={(p) => window.location.assign(`/projects/${p.id}`)}
            emptyState={
              <EmptyState
                title="Aucun dossier"
                description="Aucun projet ne correspond à vos critères."
                action={
                  <Link to="/projects/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-rihla text-white text-[13px] font-medium rounded-md">
                    <Plus size={14} /> Créer un projet
                  </Link>
                }
              />
            }
          />
        )}

        {/* ── Grid view ── */}
        {viewMode === 'grid' && (
          <>
            {isLoading ? (
              <ProjectGridSkeleton count={8} />
            ) : !projects?.length ? (
              <EmptyState
                title="Aucun dossier"
                description="Aucun projet ne correspond à vos critères actuels."
                action={
                  <Link to="/projects/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-rihla hover:bg-rihla-dark text-white text-[13px] font-medium rounded-md transition-colors">
                    <Plus size={14} /> Créer un projet
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    onMouseEnter={() => prefetchProject(p.id)}
                    onFocus={() => prefetchProject(p.id)}
                    className="group bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5 p-4 hover:border-slate-300 hover:shadow-sm transition-all block"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <StatusBadge status={p.status} />
                      <div className={clsx(
                        'text-[10px] font-medium px-2 py-0.5 rounded border uppercase tracking-wide',
                        TYPE_COLORS[p.project_type] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                      )}>
                        {p.project_type || 'Général'}
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-[14px] font-semibold text-slate-900 dark:text-cream leading-snug group-hover:text-rihla transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-1">
                        <Hash size={10} strokeWidth={1.75} /> {p.reference || 'REF-PENDING'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[12px] text-slate-600 dark:text-slate-400 mb-3">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" strokeWidth={1.75} />
                        {p.destination || 'Maroc'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} className="text-slate-400" strokeWidth={1.75} />
                        {p.pax_count || 0} pax
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">Agence</p>
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{p.client_name ?? 'Client direct'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {format(new Date(p.updated_at), 'dd/MM/yy', { locale: fr })}
                        </span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-rihla group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="mt-6 flex items-center justify-center min-h-[48px]">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-400">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-rihla animate-spin" />
                  Chargement…
                </div>
              ) : hasNextPage ? (
                <button onClick={() => fetchNextPage()} className="text-[12px] text-slate-400 hover:text-rihla transition-colors">
                  Charger plus de dossiers ↓
                </button>
              ) : projects.length > 0 ? (
                <p className="text-[11px] text-slate-300">— Tous les dossiers chargés —</p>
              ) : null}
            </div>
          </>
        )}

        {/* ── Kanban view ── */}
        {viewMode === 'kanban' && (
          <KanbanBoardWrapper search={debouncedSearch} />
        )}
      </div>
    </div>
  )
}

function KanbanBoardWrapper({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['projects-kanban', search],
    queryFn: () => projectsApi.list({ search: search || undefined, limit: 200 }).then(r => r.data),
  })
  const projects = (data as any)?.items ?? []

  if (isLoading) return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="min-w-[280px] bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5 p-3 space-y-3">
          <div className="h-4 w-24 bg-slate-200/70 dark:bg-white/5 rounded animate-pulse" />
          {[1, 2, 3].map(j => (
            <div key={j} className="h-20 bg-slate-100/70 dark:bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )

  return <KanbanBoard projects={projects} />
}
