"use client"

import { useState, useEffect, useRef, useCallback } from "react"

/* ------------------------------------------------------------------ */
/*  useUserPreferences                                                 */
/*                                                                    */
/*  Loads user preferences from /api/preferences on mount and         */
/*  provides a debounced save function that persists changes.         */
/* ------------------------------------------------------------------ */

type ReportMode = "ps" | "eletivo" | "comparativo"

export interface UserPreferences {
  fontSizeIdx: number
  locale: string
  defaultReportMode: ReportMode
  usarPesquisa: boolean
  anthropicApiKey: string
  openaiApiKey: string
  preferredModel: string
}

const DEFAULT_PREFS: UserPreferences = {
  fontSizeIdx: 1,
  locale: "pt-BR",
  defaultReportMode: "ps",
  usarPesquisa: false,
  anthropicApiKey: "",
  openaiApiKey: "",
  preferredModel: "claude-sonnet-4-5-20250929",
}

const DEBOUNCE_MS = 500

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/preferences")
        if (res.ok && !cancelled) {
          const data = await res.json()
          setPreferences({
            fontSizeIdx: data.fontSizeIdx ?? DEFAULT_PREFS.fontSizeIdx,
            locale: data.locale ?? DEFAULT_PREFS.locale,
            defaultReportMode: data.defaultReportMode ?? DEFAULT_PREFS.defaultReportMode,
            usarPesquisa: data.usarPesquisa ?? DEFAULT_PREFS.usarPesquisa,
            anthropicApiKey: data.anthropicApiKey ?? DEFAULT_PREFS.anthropicApiKey,
            openaiApiKey: data.openaiApiKey ?? DEFAULT_PREFS.openaiApiKey,
            preferredModel: data.preferredModel ?? DEFAULT_PREFS.preferredModel,
          })
          setIsLoaded(true)
        }
      } catch {
        // Silently fall back to defaults
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Debounced save to API
  const saveToServer = useCallback((updates: Partial<UserPreferences>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      } catch {
        // Silently ignore save errors (preferences are non-critical)
      }
    }, DEBOUNCE_MS)
  }, [])

  // Update a single preference field (immediately in state, debounced to server)
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value }
        saveToServer({ [key]: value })
        return next
      })
    },
    [saveToServer],
  )

  // Batch update (immediately in state, debounced to server)
  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates }
        saveToServer(updates)
        return next
      })
    },
    [saveToServer],
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    preferences,
    isLoading,
    isLoaded,
    updatePreference,
    updatePreferences,
  }
}
