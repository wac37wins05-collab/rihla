/**
 * useDashboardWS — native WebSocket hook for real-time Dashboard KPI feed.
 *
 * Connects to /ws/dashboard?token=<jwt>, receives:
 *   { type: "kpi",   data: { total_projects, active_projects } }
 *   { type: "event", event: "project_created" | "invoice_created" | ... }
 *   { type: "ping" }   — server keepalive (we reply with pong)
 *
 * On KPI or event messages → invalidates React Query caches so the
 * dashboard re-fetches without a manual page refresh.
 */

import { useEffect, useRef, useState } from 'react'
import { useQueryClient }              from '@tanstack/react-query'
import { useAuthStore }                from '@/stores/authStore'

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface KpiPatch {
  total_projects?: number
  active_projects?: number
}

interface UseDashboardWSResult {
  /** Current WebSocket connection status */
  status: WsStatus
  /** Latest KPI patch received from backend (if any) */
  latestKpi: KpiPatch | null
  /** Last event name received (project_created, invoice_created, …) */
  lastEvent: string | null
}

const WS_BASE = import.meta.env.VITE_WS_URL
  ? import.meta.env.VITE_WS_URL.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

const INVALIDATE_EVENTS: Record<string, string[][]> = {
  project_created:   [['projects'], ['dashboard-kpis']],
  project_updated:   [['projects'], ['dashboard-kpis']],
  invoice_created:   [['invoices'], ['dashboard-kpis']],
  invoice_updated:   [['invoices']],
  quotation_created: [['quotations'], ['dashboard-kpis']],
}

export function useDashboardWS(): UseDashboardWSResult {
  const { token }   = useAuthStore()
  const queryClient = useQueryClient()
  const wsRef       = useRef<WebSocket | null>(null)
  const pingTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  const [status,    setStatus]    = useState<WsStatus>('disconnected')
  const [latestKpi, setLatestKpi] = useState<KpiPatch | null>(null)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const url = `${WS_BASE}/ws/dashboard?token=${encodeURIComponent(token)}`
    let ws: WebSocket

    const connect = () => {
      setStatus('connecting')
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        // Client-side keepalive every 20s (server sends ping every 15s anyway)
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 20_000)
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as {
            type: string
            data?: KpiPatch
            event?: string
          }

          if (msg.type === 'kpi' && msg.data) {
            setLatestKpi(msg.data)
            // Patch React Query cache directly for instant UI update
            queryClient.setQueryData(['dashboard-kpis'], (old: any) =>
              old ? { ...old, ...msg.data } : msg.data
            )
          } else if (msg.type === 'event' && msg.event) {
            setLastEvent(msg.event)
            const keys = INVALIDATE_EVENTS[msg.event]
            if (keys) {
              keys.forEach(k => queryClient.invalidateQueries({ queryKey: k }))
            }
          } else if (msg.type === 'ping') {
            // Server keepalive — send pong back
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }))
            }
          }
        } catch {
          // non-JSON frame — ignore
        }
      }

      ws.onerror = () => setStatus('error')

      ws.onclose = (evt) => {
        setStatus('disconnected')
        if (pingTimer.current) clearInterval(pingTimer.current)
        // Reconnect after 5s unless intentionally closed (code 1000 or 4001)
        if (evt.code !== 1000 && evt.code !== 4001) {
          setTimeout(connect, 5_000)
        }
      }
    }

    connect()

    return () => {
      if (pingTimer.current) clearInterval(pingTimer.current)
      wsRef.current?.close(1000)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, latestKpi, lastEvent }
}
