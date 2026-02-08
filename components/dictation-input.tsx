"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Clock, Sparkles, Loader2, X, Search, AudioLines, Check } from "lucide-react"

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
  const [audioGravando, setAudioGravando] = useState(false)
  const [audioTempo, setAudioTempo] = useState(0)
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

  // Timer para gravação de áudio
  useEffect(() => {
    if (!audioGravando) {
      setAudioTempo(0)
      return
    }
    const interval = setInterval(() => {
      setAudioTempo((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [audioGravando])

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
      {/* Top bar: Audio à esquerda, Radiopaedia + Historico à direita */}
      <div className="flex items-center justify-between mb-6">
        {/* Audio button */}
        <div className="group/audio relative">
          <button
            onClick={() => setAudioGravando(!audioGravando)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${audioGravando ? "bg-foreground/80 text-background" : "bg-muted text-foreground/70 hover:bg-foreground/80 hover:text-background"}`}
          >
            <AudioLines className="w-5 h-5" />
          </button>
          {!audioGravando && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="flex items-center overflow-hidden">
                <div className="-translate-x-[calc(100%+0.75rem)] opacity-0 group-hover/audio:translate-x-0 group-hover/audio:opacity-100 transition-all duration-300 ease-out ml-3">
                  <KbdGroup>
                    <Kbd className="group-hover/audio:bg-foreground/80 group-hover/audio:text-background">{isMac ? '⌘' : 'Ctrl'}</Kbd>
                    <span className="text-xs text-foreground/30 group-hover/audio:text-foreground">+</span>
                    <Kbd className="group-hover/audio:bg-foreground/80 group-hover/audio:text-background">G</Kbd>
                  </KbdGroup>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Radiopaedia + Historico */}
        <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUsarPesquisaChange(!usarPesquisa)}
          disabled={isGenerating}
          className={`gap-1.5 ${usarPesquisa ? "bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Search className="w-3.5 h-3.5" />
          Radiopaedia
        </Button>

        {historico.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoricoAberto(!historicoAberto)}
              className={`gap-1.5 ${historicoAberto ? "bg-foreground/5 text-muted-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Clock className="w-3.5 h-3.5" />
              Histórico ({historico.length})
            </Button>

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
                        className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 px-3"
                      >
                        Limpar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoricoAberto(false)}
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
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
      </div>

      {/* Waveform bar: linha full-width quando gravando */}
      <AnimatePresence>
        {audioGravando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden mb-6"
          >
            <div className="flex items-center gap-4 bg-muted/40 rounded-full px-5 py-3 h-12">
              {/* Waveform: barras preenchem toda a largura */}
              <div className="flex items-center justify-end gap-[1.5px] h-6 flex-1 overflow-hidden">
                {Array.from({ length: 200 }).map((_, i) => {
                  const seed = [3, 6, 4, 10, 14, 8, 18, 12, 5, 20, 16, 7, 22, 9, 4, 15, 11, 6, 19, 13, 3, 8, 17, 10, 5, 14, 21, 7, 12, 6, 16, 9, 4, 18, 11, 8, 3, 13, 20, 6]
                  const h = seed[i % seed.length]
                  return (
                    <motion.div
                      key={i}
                      className="min-w-[1.5px] flex-1 rounded-full bg-foreground/60"
                      style={{ maxWidth: 2.5 }}
                      initial={{ height: 2 }}
                      animate={{ height: h }}
                      transition={{ duration: 0.4, delay: i * 0.005 }}
                    />
                  )
                })}
              </div>

              {/* Timer + botões */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-[40px]">
                  {Math.floor(audioTempo / 60).toString().padStart(1, '0')}:{(audioTempo % 60).toString().padStart(2, '0')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAudioGravando(false)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 p-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAudioGravando(false)}
                  className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Botao Gerar Laudo + Kbd animado: canto direito inferior */}
      <div className="flex items-center justify-end mt-4">
        <div className="group/gerar relative">
          <div className="absolute right-full top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex items-center overflow-hidden">
              <div className="translate-x-[calc(100%+0.75rem)] opacity-0 group-hover/gerar:translate-x-0 group-hover/gerar:opacity-100 transition-all duration-300 ease-out mr-3">
                <KbdGroup>
                  <Kbd className={value.trim() ? "bg-accent text-accent-foreground" : ""}>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                  <span className={`text-xs ${value.trim() ? "text-accent-foreground/50" : "text-foreground/30"}`}>+</span>
                  <Kbd className={value.trim() ? "bg-accent text-accent-foreground" : ""}>{isMac ? 'Return' : 'Enter'}</Kbd>
                </KbdGroup>
              </div>
            </div>
          </div>
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !value.trim()}
            size="lg"
            className="gap-2 bg-muted text-foreground/70 hover:bg-accent hover:text-accent-foreground shadow-none"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar laudo
          </Button>
        </div>
      </div>
    </section>
  )
}
