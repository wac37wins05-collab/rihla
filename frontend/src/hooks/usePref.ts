/**
 * usePref — read/write a single user preference, persisted to the backend.
 *
 * Usage:
 *   const [theme, setTheme] = usePref('theme', 'light')
 *   const [currency, setCurrency] = usePref('default_currency', 'MAD')
 *
 * On first mount, fetches all prefs from the backend.
 * On write, optimistically updates local cache and fires a PATCH.
 *
 * Supported keys (all optional, falls back to defaultValue):
 *   theme                 "light" | "dark" | "system"
 *   language              "fr" | "en" | "de" | "it" | "es" | "ar" | "ja" | "zh" | "ko"
 *   default_currency      "MAD" | "EUR" | "USD"
 *   notifications_email   boolean
 *   notifications_push    boolean
 *   dashboard_period      7 | 30 | 90
 *   compact_tables        boolean
 *   show_tips             boolean
 *   sidebar_collapsed     boolean
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'

const PREFS_KEY = ['user-preferences'] as const

type PrefValue = string | number | boolean | null | undefined

/** Load all preferences from the backend (cached by React Query). */
export function useAllPrefs(): Record<string, PrefValue> {
  const { data } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => authApi.getPreferences().then(r => r.data?.prefs ?? {}),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  })
  return (data ?? {}) as Record<string, PrefValue>
}

/**
 * Read + write a single preference key.
 * Returns [currentValue, setValue].
 */
export function usePref<T extends PrefValue>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const queryClient = useQueryClient()

  const { data: allPrefs } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => authApi.getPreferences().then(r => r.data?.prefs ?? {}),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const { mutate } = useMutation({
    mutationFn: (prefs: Record<string, unknown>) => authApi.patchPreferences(prefs),
    onMutate: async (newPrefs) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: PREFS_KEY })
      const previous = queryClient.getQueryData(PREFS_KEY)
      queryClient.setQueryData(PREFS_KEY, (old: any) => ({
        ...(old ?? {}),
        ...newPrefs,
      }))
      return { previous }
    },
    onError: (_err, _vars, ctx: any) => {
      // Rollback on error
      if (ctx?.previous) queryClient.setQueryData(PREFS_KEY, ctx.previous)
    },
    onSuccess: (res) => {
      // Sync with server response
      queryClient.setQueryData(PREFS_KEY, res.data?.prefs ?? {})
    },
  })

  const currentValue = (allPrefs?.[key] as T) ?? defaultValue

  const setValue = useCallback(
    (value: T) => {
      mutate({ [key]: value })
    },
    [key, mutate],
  )

  return [currentValue, setValue]
}

/**
 * Write multiple preference keys at once.
 * Returns a function: setPrefsBulk({ theme: 'dark', language: 'fr' })
 */
export function usePrefsBulkSetter(): (prefs: Record<string, PrefValue>) => void {
  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: (prefs: Record<string, unknown>) => authApi.patchPreferences(prefs),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: PREFS_KEY })
      const previous = queryClient.getQueryData(PREFS_KEY)
      queryClient.setQueryData(PREFS_KEY, (old: any) => ({ ...(old ?? {}), ...newPrefs }))
      return { previous }
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.previous) queryClient.setQueryData(PREFS_KEY, ctx.previous)
    },
    onSuccess: (res) => {
      queryClient.setQueryData(PREFS_KEY, res.data?.prefs ?? {})
    },
  })

  return useCallback(
    (prefs) => mutate(prefs as Record<string, unknown>),
    [mutate],
  )
}
