"use client"

import { motion } from "motion/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface HeaderProps {
  reportMode: ReportMode
  onReportModeChange: (value: ReportMode) => void
}

export function Header({ reportMode, onReportModeChange }: HeaderProps) {
  const router = useRouter()

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
      className="bg-card/80 backdrop-blur-sm border-b border-border/30 sticky top-0 z-50"
    >
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
        <div className="h-6 overflow-hidden group/logo cursor-default select-none">
          <div className="transition-transform duration-300 ease-out group-hover/logo:-translate-y-1/2">
            <span className="block h-6 text-lg font-medium tracking-tight text-foreground leading-6">
              Reporter&#8482;
            </span>
            <span className="block h-6 text-sm text-muted-foreground leading-6">
              by <span className="font-bold text-foreground">Radiologic</span>&#8482;
            </span>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </motion.header>
  )
}
