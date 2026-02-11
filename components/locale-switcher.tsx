"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const localeConfig: Record<string, { label: string; hoverClass: string }> = {
  "pt-BR": { label: "PT", hoverClass: "hover:text-emerald-500" },
  "en-US": { label: "EN", hoverClass: "hover:text-blue-500" },
  es: { label: "ES", hoverClass: "hover:text-amber-500" },
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function handleSwitch(targetLocale: string) {
    router.replace(pathname, { locale: targetLocale })
  }

  return (
    <div className="flex items-center gap-0.5">
      {routing.locales
        .filter((l) => l !== locale)
        .map((l) => {
          const config = localeConfig[l]
          return (
            <Button
              key={l}
              variant="ghost"
              size="sm"
              onClick={() => handleSwitch(l)}
              className={cn(
                "text-muted-foreground/40 min-w-[36px] px-2 transition-colors",
                config?.hoverClass
              )}
            >
              {config?.label ?? l}
            </Button>
          )
        })}
    </div>
  )
}
