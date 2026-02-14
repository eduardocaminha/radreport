"use client"

import { Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { useState, useEffect, useRef, useCallback } from "react"

const AVAILABLE_MODELS = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const

export function SettingsInline() {
  const t = useTranslations("Settings")
  const { preferences, isLoaded, updatePreference } = useUserPreferences()

  const [anthropicKey, setAnthropicKey] = useState("")
  const [openaiKey, setOpenaiKey] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    setAnthropicKey(preferences.anthropicApiKey)
    setOpenaiKey(preferences.openaiApiKey)
  }, [isLoaded, preferences.anthropicApiKey, preferences.openaiApiKey])

  const flashSaved = useCallback(() => {
    setShowSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500)
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  function handleModelChange(value: string) {
    updatePreference("preferredModel", value)
    flashSaved()
  }

  function handleAnthropicKeyBlur() {
    if (anthropicKey !== preferences.anthropicApiKey) {
      updatePreference("anthropicApiKey", anthropicKey)
      flashSaved()
    }
  }

  function handleOpenaiKeyBlur() {
    if (openaiKey !== preferences.openaiApiKey) {
      updatePreference("openaiApiKey", openaiKey)
      flashSaved()
    }
  }

  return (
    <div className="space-y-10">
      {/* Saved indicator */}
      <div
        className={`flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-opacity duration-200 ${
          showSaved ? "opacity-100" : "opacity-0"
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        <span>{t("saved")}</span>
      </div>

      {/* Model selection */}
      <div className="space-y-3">
        <Label htmlFor="report-model" className="text-sm font-medium text-foreground">
          {t("reportModel")}
        </Label>
        <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
          {t("reportModelDesc")}
        </p>
        <Select
          value={preferences.preferredModel}
          onValueChange={handleModelChange}
        >
          <SelectTrigger id="report-model" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={8}>
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Anthropic API key */}
      <div className="space-y-3">
        <Label htmlFor="anthropic-key" className="text-sm font-medium text-foreground">
          {t("anthropicKey")}
        </Label>
        <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
          {t("anthropicKeyDesc")}
        </p>
        <PasswordInput
          id="anthropic-key"
          placeholder={t("anthropicKeyPlaceholder")}
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          onBlur={handleAnthropicKeyBlur}
          autoComplete="off"
          className="h-9 text-sm rounded-full"
        />
      </div>

      {/* OpenAI API key */}
      <div className="space-y-3">
        <Label htmlFor="openai-key" className="text-sm font-medium text-foreground">
          {t("openaiKey")}
        </Label>
        <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
          {t("openaiKeyDesc")}
        </p>
        <PasswordInput
          id="openai-key"
          placeholder={t("openaiKeyPlaceholder")}
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          onBlur={handleOpenaiKeyBlur}
          autoComplete="off"
          className="h-9 text-sm rounded-full"
        />
      </div>
    </div>
  )
}
