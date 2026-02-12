"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const localeConfig: Record<
  string,
  { label: string; hoverClass: string }
> = {
  "pt-BR": {
    label: "PT",
    hoverClass:
      "hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400",
  },
  "en-US": {
    label: "EN",
    hoverClass:
      "hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-400",
  },
  "es-MX": {
    label: "ES",
    hoverClass:
      "hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400",
  },
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("LocaleSwitcher")

  const locales = routing.locales
  const currentIndex = locales.indexOf(locale as (typeof locales)[number])
  const nextIndex = (currentIndex + 1) % locales.length
  const nextLocale = locales[nextIndex]

  const config = localeConfig[locale]

  // Listen for realtime-recording events from DictationInput
  const [isRecordingActive, setIsRecordingActive] = useState(false)

  useEffect(() => {
    function handleRecordingEvent(e: Event) {
      const detail = (e as CustomEvent<{ active: boolean }>).detail
      setIsRecordingActive(detail.active)
    }
    window.addEventListener("realtime-recording", handleRecordingEvent)
    return () =>
      window.removeEventListener("realtime-recording", handleRecordingEvent)
  }, [])

  function handleToggle() {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <Tooltip open={isRecordingActive ? true : undefined}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={handleToggle}
          className={cn(
            "min-w-[44px] px-3 bg-muted text-muted-foreground/40 font-medium transition-all",
            config?.hoverClass,
            isRecordingActive &&
              "animate-locale-pulse ring-2 ring-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10",
          )}
        >
          {config?.label ?? locale}
        </Button>
      </TooltipTrigger>
      {isRecordingActive && (
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-center"
        >
          {t("voiceActive")}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
