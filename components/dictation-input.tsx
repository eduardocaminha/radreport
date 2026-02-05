"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholderPhrases = [
    "tc abdome com contraste, microcalculo no rim esquerdo 0,2",
    "tomo torax sem, normal",
    "tc cranio sem contraste, avc isquemico no territorio da acm direita",
  ]

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

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
        setAnimatedPlaceholder(currentPhrase.substring(0, state.currentCharIndex + 1))
        state.currentCharIndex++
        state.timeoutId = setTimeout(typeWriter, 30)
      } else {
        state.timeoutId = setTimeout(() => {
          state.currentPhraseIndex = (state.currentPhraseIndex + 1) % placeholderPhrases.length
          state.currentCharIndex = 0
          typeWriter()
        }, 2000)
      }
    }

    typeWriter()

    return () => {
      if (typewriterRef.current.timeoutId) {
        clearTimeout(typewriterRef.current.timeoutId)
      }
    }
  }, [value])

  return (
    <section>
      {/* Top bar: Radiopaedia + Historico no canto superior direito */}
      <div className="flex items-center justify-end gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <Switch
            id="pesquisa-radiopaedia"
            checked={usarPesquisa}
            onCheckedChange={onUsarPesquisaChange}
            disabled={isGenerating}
            className="peer"
          />
          <Label
            htmlFor="pesquisa-radiopaedia"
            className="text-sm cursor-pointer flex items-center gap-1.5 text-foreground/40 peer-data-[state=checked]:text-foreground/70 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Radiopaedia
          </Label>
        </div>

        {historico.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setHistoricoAberto(!historicoAberto)}
              className="text-sm font-medium text-foreground/40 hover:text-foreground/70 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Historico ({historico.length})
            </button>

            <AnimatePresence>
              {historicoAberto && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-card border border-border/50 rounded-2xl z-50"
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
                  <div className="max-h-60 overflow-y-auto scrollbar-none">
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

      {/* Textarea auto-grow: comeca com 1 linha, expande com wrap */}
      <textarea
        ref={textareaRef}
        placeholder={animatedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full bg-transparent border-none outline-none resize-none text-2xl sm:text-3xl leading-relaxed text-foreground placeholder:text-muted-foreground/30 font-light overflow-hidden"
        rows={1}
      />

      {/* Botao Gerar Laudo + Kbd: canto direito inferior, abaixo do input */}
      <div className="flex items-center justify-end gap-3 mt-4">
        <KbdGroup>
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <span className="text-muted-foreground/40 text-xs">+</span>
          <Kbd>Enter</Kbd>
        </KbdGroup>
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !value.trim()}
          size="lg"
          className="gap-2 bg-muted/60 text-foreground/70 hover:bg-accent hover:text-accent-foreground shadow-none"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Gerar Laudo
        </Button>
      </div>
    </section>
  )
}
