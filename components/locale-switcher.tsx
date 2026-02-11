"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const localeConfig: Record<
  string,
  { label: string; hoverBg: string; textColor: string }
> = {
  "pt-BR": {
    label: "PT",
    hoverBg: "hover:bg-amber-500/20",
    textColor: "text-amber-700 dark:text-amber-400",
  },
  "en-US": {
    label: "EN",
    hoverBg: "hover:bg-blue-500/20",
    textColor: "text-blue-700 dark:text-blue-400",
  },
  "es-MX": {
    label: "ES",
    hoverBg: "hover:bg-emerald-500/20",
    textColor: "text-emerald-700 dark:text-emerald-400",
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
      size="sm"
      onClick={handleToggle}
      className={cn(
        "min-w-[36px] px-2 font-medium transition-colors",
        config?.textColor,
        config?.hoverBg
      )}
    >
      {config?.label ?? locale}
    </Button>
  )
}
