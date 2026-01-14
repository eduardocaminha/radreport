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
  const modes: { value: ReportMode; label: string }[] = [
    { value: "ps", label: "PS" },
    { value: "eletivo", label: "Eletivo" },
    { value: "comparativo", label: "Comparativo" },
  ]

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
        } else if (e.key.toLowerCase() === "c") {
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
      className="border-b border-border bg-card sticky top-0 z-50"
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-foreground">RadReport</span>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 relative">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onReportModeChange(mode.value)}
                className="relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors z-10"
              >
                {reportMode === mode.value && (
                  <motion.div
                    layoutId="activeMode"
                    className="absolute inset-0 bg-card shadow-sm rounded-md"
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
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
