"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Clock, Sparkles, Loader2, X, Search } from "lucide-react"

interface ItemHistorico {
  id: string
  texto: string
  laudo: string
  data: string
}

interface DictationInputProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isGenerating: boolean
  historico: ItemHistorico[]
  onLimparHistorico: () => void
  usarPesquisa: boolean
  onUsarPesquisaChange: (value: boolean) => void
}

export function DictationInput({
  value,
  onChange,
  onGenerate,
  onKeyDown,
  isGenerating,
  historico,
  onLimparHistorico,
  usarPesquisa,
  onUsarPesquisaChange,
}: DictationInputProps) {
  const [historicoAberto, setHistoricoAberto] = useState(false)

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Texto ditado</h2>
        <div className="flex items-center gap-4">
          {/* Checkbox de pesquisa */}
          <div className="flex items-center gap-2">
            <Switch
              id="pesquisa-radiopaedia"
              checked={usarPesquisa}
              onCheckedChange={onUsarPesquisaChange}
              disabled={isGenerating}
            />
            <Label
              htmlFor="pesquisa-radiopaedia"
              className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Pesquisar Radiopaedia
            </Label>
          </div>

          {historico.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setHistoricoAberto(!historicoAberto)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="w-4 h-4" />
                Histórico ({historico.length})
              </button>

              <AnimatePresence>
                {historicoAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50"
                  >
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Últimos laudos</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onLimparHistorico}
                          className="text-xs text-muted-foreground hover:text-destructive h-6 px-2"
                        >
                          Limpar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoricoAberto(false)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {historico.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onChange(item.texto)
                            setHistoricoAberto(false)
                          }}
                          className="w-full text-left p-3 hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
                        >
                          <p className="text-sm text-foreground truncate">{item.texto}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.data}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
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
