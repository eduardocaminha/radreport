"use client"

import { motion, AnimatePresence } from "motion/react"
import { LogOut, Menu, X, Settings, FileText, Paintbrush } from "lucide-react"
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
  const tMenu = useTranslations("Menu")
  const [logoHovered, setLogoHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [menuOpen])

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
      {/* Main header bar */}
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="h-8 w-8 bg-muted text-muted-foreground/40 hover:text-muted-foreground shrink-0"
          >
            <AnimatePresence mode="wait" initial={false}>
              {menuOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
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
            className="min-w-11 sm:min-w-0 gap-2 bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t("logout")}</span>
          </Button>
        </div>
      </div>

      {/* Expanding menu — slides down from header */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 pb-5">
              {/* pl-11 = 2.75rem = button 2rem + gap-3 0.75rem → aligns under logo */}
              <div className="flex items-center gap-2 pl-11">
                <Button
                  variant="ghost"
                  onClick={() => setMenuOpen(false)}
                  className="gap-1.5 bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{tMenu("configLLM")}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMenuOpen(false)}
                  className="gap-1.5 bg-muted text-muted-foreground hover:text-foreground"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{tMenu("geradorMascaras")}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMenuOpen(false)}
                  className="gap-1.5 bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>{tMenu("formatadorMascaras")}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
