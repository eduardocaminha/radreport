"use client"

import type React from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Sparkles, Loader2 } from "lucide-react"

interface DictationInputProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isGenerating: boolean
}

export function DictationInput({ value, onChange, onGenerate, onKeyDown, isGenerating }: DictationInputProps) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Texto ditado</h2>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Clock className="w-4 h-4" />
          Histórico (2)
        </button>
      </div>

      <Textarea
        placeholder="Cole ou digite o texto ditado aqui...&#10;&#10;Exemplos:&#10;• tc abdome com contraste, microcalculo no rim esquerdo 0,2&#10;• tomo torax sem, normal&#10;• tc cranio sem contraste, avc isquemico no territorio da acm direita"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-[180px] bg-input border-border resize-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
      />

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] font-mono">Ctrl</kbd>
          {" + "}
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] font-mono">
            Enter
          </kbd>{" "}
          para gerar
        </span>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={onGenerate} disabled={isGenerating || !value.trim()} className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar Laudo
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
