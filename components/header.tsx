"use client"

import { motion, AnimatePresence } from "motion/react"
import { LogOut, ChevronDown, Settings, FileText, Paintbrush, User } from "lucide-react"
import { TextEffect } from "@/components/ui/text-effect"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SettingsInline } from "@/components/settings-panel"
import { useRouter, usePathname } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useEffect, useState, useRef } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const localeConfig: Record<
  string,
  { label: string; hoverClass: string; activeClass: string }
> = {
  "pt-BR": {
    label: "PT",
    hoverClass: "hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400",
    activeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  "en-US": {
    label: "EN",
    hoverClass: "hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-400",
    activeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  "es-MX": {
    label: "ES",
    hoverClass: "hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400",
    activeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
}

type ReportMode = "ps" | "eletivo" | "comparativo"

interface HeaderProps {
  reportMode: ReportMode
  onReportModeChange: (value: ReportMode) => void
}

export function Header({ reportMode, onReportModeChange }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("Header")
  const tMenu = useTranslations("Menu")
  const [logoHovered, setLogoHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  // null = menu items, "configLLM" = settings form, etc.
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const { signOut } = useClerk()
  const { user } = useUser()

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || "U"
    : "U"

  // The expanding section is open when menuOpen OR activePanel is set
  const isExpanded = menuOpen || activePanel !== null

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

  // Close everything on Escape
  useEffect(() => {
    if (!isExpanded) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false)
        setActivePanel(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isExpanded])

  // Close avatar menu on Escape or click outside
  useEffect(() => {
    if (!avatarMenuOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAvatarMenuOpen(false)
    }
    function handleClickOutside(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("mousedown", handleClickOutside)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousedown", handleClickOutside)
    }
  }, [avatarMenuOpen])

  function handleChevronClick() {
    if (activePanel) {
      // If inside a panel, close everything
      setActivePanel(null)
      setMenuOpen(false)
    } else {
      // Toggle menu items
      setMenuOpen((prev) => !prev)
    }
  }

  async function handleLogout() {
    await signOut(() => {
      router.push("/landing")
    })
  }

  return (<>
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-50",
        activePanel ? "bg-card" : "bg-card/80 backdrop-blur-sm"
      )}
    >
      {/* Main header bar */}
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleChevronClick}
            className="h-6 w-6 p-0 bg-muted text-muted-foreground/40 hover:text-muted-foreground shrink-0"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="inline-flex"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
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

        <div className="relative flex items-center" ref={avatarMenuRef}>
          <button
            type="button"
            onClick={() => setAvatarMenuOpen((prev) => !prev)}
            className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border/30 focus-visible:ring-offset-2 cursor-pointer"
            aria-expanded={avatarMenuOpen}
            aria-haspopup="true"
          >
            <Avatar size="sm">
              {user?.imageUrl && (
                <AvatarImage src={user.imageUrl} alt={user.fullName ?? "Avatar"} />
              )}
              <AvatarFallback className="bg-background text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
          </button>

          <AnimatePresence>
            {avatarMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-2 w-max min-w-0 bg-card border border-border/50 rounded-2xl z-50"
              >
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center gap-1.5">
                    {[...routing.locales].map((loc) => {
                      const config = localeConfig[loc]
                      const isActive = locale === loc
                      return (
                        <Button
                          key={loc}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            router.replace(pathname, { locale: loc })
                            fetch("/api/preferences", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ locale: loc }),
                            }).catch(() => {})
                          }}
                          className={cn(
                            "h-6 min-w-0 px-2 text-[10px] font-medium rounded-full transition-colors",
                            isActive && config ? config.activeClass : "bg-muted text-muted-foreground",
                            config?.hoverClass
                          )}
                        >
                          {config?.label ?? loc}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit justify-start gap-2 h-8 text-xs bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => {
                      setAvatarMenuOpen(false)
                      router.push("/account")
                    }}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t("myAccount")}</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setAvatarMenuOpen(false)
                      handleLogout()
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-fit justify-start gap-2 h-8 text-xs bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t("logout")}</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expanding menu — slides down from header */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pl-4 sm:pl-11">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activePanel === "configLLM") {
                      setActivePanel(null)
                      setMenuOpen(true)
                    } else {
                      setMenuOpen(false)
                      setActivePanel("configLLM")
                    }
                  }}
                  className={cn(
                    "w-fit sm:w-auto justify-start sm:justify-center gap-1.5 shadow-none",
                    activePanel === "configLLM"
                      ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>{tMenu("configLLM")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActivePanel(null)
                    setMenuOpen(false)
                  }}
                  className="w-fit sm:w-auto justify-start sm:justify-center gap-1.5 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground shadow-none"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>{tMenu("geradorMascaras")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActivePanel(null)
                    setMenuOpen(false)
                  }}
                  className="w-fit sm:w-auto justify-start sm:justify-center gap-1.5 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground shadow-none"
                >
                  <Paintbrush className="w-3.5 h-3.5 shrink-0" />
                  <span>{tMenu("formatadorMascaras")}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>

    {/* White overlay — covers entire page below header when panel is active */}
    {activePanel !== null && (
      <div className="fixed inset-0 z-40 bg-card overflow-y-auto">
        <div className="pt-56 sm:pt-44 max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 pb-16">
          <div className="pl-4 sm:pl-11 w-full">
            {activePanel === "configLLM" && <SettingsInline />}
          </div>
        </div>
      </div>
    )}
  </>)
}
