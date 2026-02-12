"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const localeConfig: Record<
  string,
  { label: string; hoverClass: string }
> = {
  "pt-BR": {
    label: "PT",
    hoverClass: "hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400",
  },
  "en-US": {
    label: "EN",
    hoverClass: "hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-400",
  },
  "es-MX": {
    label: "ES",
    hoverClass: "hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400",
  },
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const locales = routing.locales
  const currentIndex = locales.indexOf(locale as (typeof locales)[number])
  const nextIndex = (currentIndex + 1) % locales.length
  const nextLocale = locales[nextIndex]

  const config = localeConfig[locale]

  function handleToggle() {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <Button
      variant="ghost"
      onClick={handleToggle}
      className={cn(
        "min-w-[44px] px-3 bg-muted text-muted-foreground font-medium transition-colors",
        config?.hoverClass
      )}
    >
      {config?.label ?? locale}
    </Button>
  )
}
