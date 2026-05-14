/**
 * DataTable — advanced reusable table with:
 *   · Column-level sorting (asc/desc toggle)
 *   · Global search + per-column string filter
 *   · Multi-row selection with bulk actions
 *   · Client-side pagination
 *   · CSV / Excel export
 *   · Empty state slot
 *   · Sticky header
 *   · Loading skeleton rows
 */
import { useState, useMemo, useCallback, type ReactNode } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, X, Download, CheckSquare, Square,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Column definition ──────────────────────────────────────────────────────
export interface DataTableColumn<T> {
  key: string
  header: string
  accessor: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  filterValue?: (row: T) => string
  width?: string
  align?: 'left' | 'center' | 'right'
  sticky?: boolean
}

// ── Bulk action ────────────────────────────────────────────────────────────
export interface BulkAction<T> {
  label: string
  icon?: React.ElementType
  variant?: 'default' | 'danger'
  onClick: (rows: T[]) => void
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  bulkActions?: BulkAction<T>[]
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  exportFilename?: string
  exportData?: (rows: T[]) => Record<string, string | number>[]
  loading?: boolean
  loadingRows?: number
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  className?: string
  density?: 'comfortable' | 'standard' | 'compact'
  caption?: string
}

type SortDir = 'asc' | 'desc' | null

const DENSITY_ROW: Record<string, string> = {
  comfortable: 'py-4',
  standard:    'py-2.5',
  compact:     'py-1.5',
}

// ── CSV export helper ──────────────────────────────────────────────────────
function exportCSV(rows: Record<string, string | number>[], filename: string) {
  const headers = Object.keys(rows[0] ?? {})
  const lines   = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = String(r[h] ?? '')
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td className="pl-4 pr-3 py-3"><div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" /></td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={clsx('h-3.5 rounded bg-slate-200 dark:bg-white/10 animate-pulse', i === 0 ? 'w-36' : i % 2 === 0 ? 'w-20' : 'w-24')} />
        </td>
      ))}
    </tr>
  )
}

// ── DataTable ──────────────────────────────────────────────────────────────
export function DataTable<T>({
  data, columns, getRowId, bulkActions = [],
  pageSize = 25, searchable = true, searchPlaceholder = 'Rechercher…',
  exportFilename = 'export', exportData, loading = false, loadingRows = 8,
  emptyState, onRowClick, rowClassName, className, density = 'standard', caption,
}: DataTableProps<T>) {
  const [search,      setSearch]      = useState('')
  const [sortKey,     setSortKey]     = useState<string | null>(null)
  const [sortDir,     setSortDir]     = useState<SortDir>(null)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [page,        setPage]        = useState(1)

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const fn = col.filterValue ?? col.sortValue
        if (!fn) return false
        return String(fn(row)).toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  // ── Sorting ──────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const col = columns.find(c => c.key === sortKey)
    if (!col?.sortValue) return filtered
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, columns])

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageData    = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when data/search changes
  useMemo(() => setPage(1), [search, sortKey, sortDir])

  // ── Selection helpers ────────────────────────────────────────────────────
  const pageIds    = pageData.map(r => getRowId(r))
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const someSel    = pageIds.some(id => selected.has(id)) && !allPageSel

  const toggleRow = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const togglePage = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allPageSel) pageIds.forEach(id => next.delete(id))
      else            pageIds.forEach(id => next.add(id))
      return next
    })
  }, [allPageSel, pageIds])

  const selectedRows = data.filter(r => selected.has(getRowId(r)))

  // ── Sort header click ─────────────────────────────────────────────────────
  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev !== key) { setSortDir('asc');  return key }
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
      return key
    })
  }, [])

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = exportData ? exportData(sorted) : sorted.map(row =>
      Object.fromEntries(columns.map(c => [c.header, String(c.filterValue?.(row) ?? c.sortValue?.(row) ?? '')]))
    )
    exportCSV(rows, exportFilename)
  }, [sorted, exportData, exportFilename, columns])

  const rowPad = DENSITY_ROW[density] ?? DENSITY_ROW.standard

  return (
    <div className={clsx('flex flex-col gap-0 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-slate-900 overflow-hidden', className)}>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/5 flex-wrap">
        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            {bulkActions.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={i}
                  onClick={() => { action.onClick(selectedRows); setSelected(new Set()) }}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors',
                    action.variant === 'danger'
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300',
                  )}
                >
                  {Icon && <Icon size={13} />}{action.label}
                </button>
              )
            })}
            <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-slate-600 ml-1">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search */}
        {searchable && selected.size === 0 && (
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] placeholder-slate-400 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rihla/30 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Row count */}
        {selected.size === 0 && (
          <span className="text-[12px] text-slate-400 ml-auto">
            {filtered.length} {filtered.length !== data.length && `/ ${data.length}`} ligne{filtered.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
          title="Exporter en CSV"
        >
          <Download size={13} /> Export
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead className="bg-slate-50 dark:bg-white/3 sticky top-0 z-10">
            <tr>
              {/* Select all */}
              <th className="w-10 pl-4 pr-3 py-2.5">
                <button onClick={togglePage} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  {allPageSel
                    ? <CheckSquare size={15} className="text-rihla" />
                    : someSel
                    ? <CheckSquare size={15} className="text-slate-400 opacity-50" />
                    : <Square size={15} />}
                </button>
              </th>

              {columns.map(col => {
                const isSorted  = sortKey === col.key
                const SortIcon  = isSorted && sortDir === 'asc' ? ChevronUp : isSorted && sortDir === 'desc' ? ChevronDown : ChevronsUpDown
                const sortable  = !!col.sortValue

                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={clsx(
                      'px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap select-none',
                      col.align === 'center' && 'text-center',
                      col.align === 'right'  && 'text-right',
                      sortable && 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors',
                    )}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {sortable && <SortIcon size={11} className={isSorted ? 'text-rihla' : 'text-slate-300'} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading
              ? Array.from({ length: loadingRows }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))
              : pageData.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400 text-[13px]">
                    {emptyState ?? (
                      <div className="flex flex-col items-center gap-2">
                        <Search size={24} className="text-slate-300" />
                        <span>Aucun résultat{search ? ` pour "${search}"` : ''}</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
              : pageData.map(row => {
                  const id  = getRowId(row)
                  const sel = selected.has(id)
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={clsx(
                        'transition-colors group',
                        sel
                          ? 'bg-rihla/4 dark:bg-rihla/8'
                          : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/3',
                        onRowClick && 'cursor-pointer',
                        rowClassName?.(row),
                      )}
                    >
                      <td className="pl-4 pr-3" onClick={e => { e.stopPropagation(); toggleRow(id) }}>
                        <div className="flex items-center justify-center w-4">
                          {sel
                            ? <CheckSquare size={15} className="text-rihla cursor-pointer" />
                            : <Square size={15} className="text-slate-300 hover:text-slate-500 cursor-pointer" />}
                        </div>
                      </td>
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={clsx(
                            'px-4 text-[13px] text-slate-800 dark:text-slate-200',
                            rowPad,
                            col.align === 'center' && 'text-center',
                            col.align === 'right'  && 'text-right',
                          )}
                        >
                          {col.accessor(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/2">
          <span className="text-[12px] text-slate-500">
            Page {currentPage} / {totalPages} · {sorted.length} lignes
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded text-[12px] text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >«</button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Page numbers — show at most 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - currentPage) <= 2)
              .map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors',
                    p === currentPage
                      ? 'bg-rihla text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-white/10',
                  )}
                >
                  {p}
                </button>
              ))
            }

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded text-[12px] text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >»</button>
          </div>
        </div>
      )}
    </div>
  )
}
