import { clsx } from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-slate-200/70 dark:bg-white/5',
        className
      )}
    />
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex justify-between border-t border-slate-200/80 dark:border-white/5 pt-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="h-7 w-16" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100 dark:border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/** Full Dashboard skeleton — KPI row + 2-col content area */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content: wide left + narrow right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Chart placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
        {/* Right: Activity feed placeholder */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg p-5 space-y-3">
          <Skeleton className="h-4 w-28 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Recent projects table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <Skeleton className="h-4 w-36" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={5} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Quotations list skeleton */
export function QuotationsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex gap-6">
          {['w-24', 'w-32', 'w-20', 'w-16', 'w-20'].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: count }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
