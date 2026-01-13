"use client"

import { motion } from "motion/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface HeaderProps {
  reportMode: ReportMode
  onReportModeChange: (value: ReportMode) => void
}

export function Header({ reportMode, onReportModeChange }: HeaderProps) {
  const modes: { value: ReportMode; label: string }[] = [
    { value: "ps", label: "PS" },
    { value: "eletivo", label: "Eletivo" },
    { value: "comparativo", label: "Comparativo" },
  ]

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

          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
