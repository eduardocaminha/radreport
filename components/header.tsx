"use client"

import { motion } from "motion/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface HeaderProps {
  reportMode: ReportMode
  onReportModeChange: (value: ReportMode) => void
}

export function Header({ reportMode, onReportModeChange }: HeaderProps) {
  const router = useRouter()
  const [isMac, setIsMac] = useState(false)
  
  const modes: { value: ReportMode; label: string; key: string }[] = [
    { value: "ps", label: "PS", key: "p" },
    { value: "eletivo", label: "Eletivo", key: "e" },
    { value: "comparativo", label: "Comparativo", key: "o" },
  ]

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl ou Cmd + Shift + tecla
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
    try {
      await fetch("/api/auth", {
        method: "DELETE",
      })
      router.push("/login")
      router.refresh()
    } catch {
      // Em caso de erro, ainda redireciona para login
      router.push("/login")
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-card/80 backdrop-blur-sm shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] sticky top-0 z-50"
    >
      <div className="max-w-4xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <span className="text-lg font-medium tracking-tight text-foreground">RadReport</span>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Desktop: Tabs customizados com animação pill-shaped */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/60 rounded-full p-1 relative">
            {modes.map((mode) => (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onReportModeChange(mode.value)}
                    className="relative h-8 px-4 text-sm font-medium rounded-full transition-colors z-10"
                  >
                    {reportMode === mode.value && (
                      <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 bg-card shadow-sm rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        reportMode === mode.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <KbdGroup>
                    <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                    <span>+</span>
                    <Kbd>Shift</Kbd>
                    <span>+</span>
                    <Kbd>{mode.key.toUpperCase()}</Kbd>
                  </KbdGroup>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Mobile: Toggle único que cicla entre os modos */}
          <div className="sm:hidden">
            <Toggle
              pressed={true}
              onPressedChange={() => {
                const currentIndex = modes.findIndex(m => m.value === reportMode)
                const nextIndex = (currentIndex + 1) % modes.length
                onReportModeChange(modes[nextIndex].value)
              }}
              variant="outline"
              size="sm"
              className="rounded-full px-4 py-1.5 text-sm font-medium data-[state=on]:bg-card data-[state=on]:shadow-sm"
            >
              {modes.find(m => m.value === reportMode)?.label}
            </Toggle>
          </div>

          <Button 
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
