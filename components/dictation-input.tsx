"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
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
  const [isMac, setIsMac] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("")

  const placeholderPhrases = [
    "tc abdome com contraste, microcalculo no rim esquerdo 0,2",
    "tomo torax sem, normal",
    "tc cranio sem contraste, avc isquemico no territorio da acm direita",
  ]

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  const typewriterRef = useRef({
    currentPhraseIndex: 0,
    currentCharIndex: 0,
    timeoutId: null as ReturnType<typeof setTimeout> | null,
  })

  useEffect(() => {
    if (value.trim()) {
      if (typewriterRef.current.timeoutId) {
        clearTimeout(typewriterRef.current.timeoutId)
      }
      setAnimatedPlaceholder("")
      return
    }

    const typeWriter = () => {
      const state = typewriterRef.current
      const currentPhrase = placeholderPhrases[state.currentPhraseIndex]

      if (state.currentCharIndex < currentPhrase.length) {
        // Digita letra por letra
        setAnimatedPlaceholder(currentPhrase.substring(0, state.currentCharIndex + 1))
        state.currentCharIndex++
        state.timeoutId = setTimeout(typeWriter, 30) // Mais rápido: 30ms ao invés de 50ms
      } else {
        // Terminou de digitar, segura a frase completa por 2 segundos
        state.timeoutId = setTimeout(() => {
          // Apaga tudo de uma vez e passa para próxima frase
          state.currentPhraseIndex = (state.currentPhraseIndex + 1) % placeholderPhrases.length
          state.currentCharIndex = 0
          // Inicia imediatamente a próxima frase (sem deixar vazio)
          typeWriter()
        }, 2000)
      }
    }

    // Inicia a animação
    typeWriter()

    return () => {
      if (typewriterRef.current.timeoutId) {
        clearTimeout(typewriterRef.current.timeoutId)
      }
    }
  }, [value])

  return (
    <section className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-medium text-muted-foreground">Texto ditado</h2>
        {historico.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoricoAberto(!historicoAberto)}
                className="gap-2 text-muted-foreground"
              >
                <Clock className="w-4 h-4" />
                Histórico ({historico.length})
              </Button>

              <AnimatePresence>
                {historicoAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-card border border-border/50 rounded-2xl shadow-lg z-50"
                  >
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Ultimos laudos</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onLimparHistorico}
                          className="text-xs text-muted-foreground hover:bg-destructive hover:text-destructive-foreground h-7 px-3"
                        >
                          Limpar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoricoAberto(false)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-3.5 h-3.5" />
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
                          className="w-full text-left p-4 hover:bg-muted/50 border-b border-border/30 last:border-0 transition-colors"
                        >
                          <p className="text-sm text-foreground truncate">{item.texto}</p>
                          <p className="text-xs text-muted-foreground mt-1.5">{item.data}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
      </div>

      <Textarea
        placeholder={animatedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-10 bg-input/40 border-border/50 resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 overflow-hidden"
        rows={1}
      />

      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <KbdGroup>
            <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <span className="text-muted-foreground/50">+</span>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          {" "}para gerar
        </span>

        <div className="flex items-center gap-5">
          {/* Checkbox de pesquisa */}
          <div className="flex items-center gap-2.5">
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
              Radiopaedia
            </Label>
          </div>

          <Button onClick={onGenerate} disabled={isGenerating || !value.trim()} size="sm" className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar Laudo
          </Button>
        </div>
      </div>
    </section>
  )
}
