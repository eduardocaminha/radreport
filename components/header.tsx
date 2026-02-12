"use client"

import { motion, AnimatePresence } from "motion/react"
import { LogOut } from "lucide-react"
import { TextEffect } from "@/components/ui/text-effect"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { LocaleSwitcher } from "@/components/locale-switcher"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface HeaderProps {
  reportMode: ReportMode
  onReportModeChange: (value: ReportMode) => void
}

export function Header({ reportMode, onReportModeChange }: HeaderProps) {
  const router = useRouter()
  const t = useTranslations("Header")
  const [logoHovered, setLogoHovered] = useState(false)
  const { signOut } = useClerk()
  const { user } = useUser()

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || "U"
    : "U"

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === "p") {
          e.preventDefault()
          onReportModeChange("ps")
        } else if (e.key.toLowerCase() === "e") {
          e.preventDefault()
          onReportModeChange("eletivo")
        } else if (e.key.toLowerCase() === "o") {
          e.preventDefault()
          onReportModeChange("comparativo")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onReportModeChange])

  async function handleLogout() {
    await signOut(() => {
      router.push("/landing")
    })
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-card/80 backdrop-blur-sm border-b border-border/30 sticky top-0 z-50"
    >
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
        <div
          className="h-7 overflow-hidden cursor-pointer select-none min-w-[140px]"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <AnimatePresence mode="wait">
            {!logoHovered ? (
              <TextEffect
                key="reporter"
                preset="blur"
                per="word"
                as="span"
                className="block text-xl font-medium tracking-tight text-foreground"
                variants={{
                  item: {
                    hidden: { opacity: 0, filter: 'blur(4px)' },
                    visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25 } },
                    exit: { opacity: 0, filter: 'blur(4px)', transition: { duration: 0.25 } },
                  },
                }}
              >
                Reporter
              </TextEffect>
            ) : (
              <motion.span
                key="radiologic"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.25 }}
                className="block text-xl tracking-tight text-foreground"
              >
                <span className="font-medium">by </span>
                <span className="font-medium">Radiologic™</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Avatar size="default">
            {user?.imageUrl && (
              <AvatarImage src={user.imageUrl} alt={user.fullName ?? "Avatar"} />
            )}
            <AvatarFallback className="bg-background text-muted-foreground">{initials}</AvatarFallback>
          </Avatar>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="gap-2 bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
