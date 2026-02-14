"use client"

import { motion } from "motion/react"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { SquircleCard } from "@/components/ui/squircle-card"
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

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const t = useTranslations("Settings")
  const { preferences, isLoaded, updatePreference } = useUserPreferences()

  // Local state for inputs (synced from preferences on load)
  const [anthropicKey, setAnthropicKey] = useState("")
  const [openaiKey, setOpenaiKey] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when preferences load
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

  // Cleanup timer
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
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Top bar — matches header height */}
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 bg-muted text-muted-foreground/40 hover:text-muted-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-xl font-medium tracking-tight text-foreground">
            {t("title")}
          </span>
        </div>

        {/* Saved indicator */}
        <div
          className={`flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-opacity duration-200 ${
            showSaved ? "opacity-100" : "opacity-0"
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t("saved")}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-10">
        <SquircleCard className="p-8">
          <div className="space-y-8">
            {/* Model selection */}
            <div className="space-y-2">
              <Label htmlFor="report-model">{t("reportModel")}</Label>
              <p className="text-xs text-muted-foreground/60">
                {t("reportModelDesc")}
              </p>
              <Select
                value={preferences.preferredModel}
                onValueChange={handleModelChange}
              >
                <SelectTrigger id="report-model">
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

            {/* Divider */}
            <div className="border-t border-border/30" />

            {/* Anthropic API key */}
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">{t("anthropicKey")}</Label>
              <p className="text-xs text-muted-foreground/60">
                {t("anthropicKeyDesc")}
              </p>
              <PasswordInput
                id="anthropic-key"
                placeholder={t("anthropicKeyPlaceholder")}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                onBlur={handleAnthropicKeyBlur}
                autoComplete="off"
              />
            </div>

            {/* OpenAI API key */}
            <div className="space-y-2">
              <Label htmlFor="openai-key">{t("openaiKey")}</Label>
              <p className="text-xs text-muted-foreground/60">
                {t("openaiKeyDesc")}
              </p>
              <PasswordInput
                id="openai-key"
                placeholder={t("openaiKeyPlaceholder")}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                onBlur={handleOpenaiKeyBlur}
                autoComplete="off"
              />
            </div>
          </div>
        </SquircleCard>
      </div>
    </motion.div>
  )
}
