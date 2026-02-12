"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { SquircleCard } from "@/components/ui/squircle-card"
import {
  Clock,
  Sparkles,
  Loader2,
  X,
  Search,
  AudioLines,
  Check,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription"

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
  const locale = useLocale()
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const t = useTranslations("DictationInput")

  // ---- Transcript accumulation refs (not state → no stale closures) ----
  const preRecordingTextRef = useRef("")
  const turnTextsRef = useRef(new Map<string, string>())
  const turnOrderRef = useRef<string[]>([])

  /**
   * Reconstruct the textarea value from base text + all turn texts.
   * Called on every delta and completion.
   */
  const reconstructText = useCallback(() => {
    const parts = turnOrderRef.current.map(
      (id) => turnTextsRef.current.get(id) ?? "",
    )
    const allTurns = parts.join(" ")
    const base = preRecordingTextRef.current
    const sep = base && allTurns ? " " : ""
    onChange(base + sep + allTurns)
  }, [onChange])

  const handleDelta = useCallback(
    (delta: string, itemId: string) => {
      if (!turnTextsRef.current.has(itemId)) {
        turnTextsRef.current.set(itemId, "")
        turnOrderRef.current.push(itemId)
      }
      const current = turnTextsRef.current.get(itemId) ?? ""
      turnTextsRef.current.set(itemId, current + delta)
      reconstructText()
    },
    [reconstructText],
  )

  const handleComplete = useCallback(
    (transcript: string, itemId: string) => {
      if (!turnTextsRef.current.has(itemId)) {
        turnOrderRef.current.push(itemId)
      }
      turnTextsRef.current.set(itemId, transcript)
      reconstructText()
    },
    [reconstructText],
  )

  const transcription = useRealtimeTranscription({
    locale,
    onDelta: handleDelta,
    onComplete: handleComplete,
  })

  // ---- Placeholder typewriter ----
  const placeholderPhrases = [
    t("placeholder1"),
    t("placeholder2"),
    t("placeholder3"),
  ]

  useEffect(() => {
    setIsMac(
      navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
        navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    )
  }, [])

  // Auto-resize textarea
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
        setAnimatedPlaceholder(
          currentPhrase.substring(0, state.currentCharIndex + 1),
        )
        state.currentCharIndex++
        state.timeoutId = setTimeout(typeWriter, 30)
      } else {
        state.timeoutId = setTimeout(() => {
          state.currentPhraseIndex =
            (state.currentPhraseIndex + 1) % placeholderPhrases.length
          state.currentCharIndex = 0
          typeWriter()
        }, 2000)
      }
    }

    typeWriter()

    return () => {
      if (typewriterRef.current.timeoutId) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(typewriterRef.current.timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // ---- Recording controls ----
  const handleStartRecording = useCallback(async () => {
    preRecordingTextRef.current = value
    turnTextsRef.current.clear()
    turnOrderRef.current = []
    await transcription.start()
  }, [value, transcription])

  const handleStopRecording = useCallback(() => {
    transcription.stop()
    // Text stays as-is (user accepted the dictation)
  }, [transcription])

  const handleCancelRecording = useCallback(() => {
    transcription.cancel()
    // Revert to pre-recording text
    onChange(preRecordingTextRef.current)
  }, [transcription, onChange])

  const toggleRecording = useCallback(async () => {
    if (transcription.isRecording) {
      handleStopRecording()
    } else {
      await handleStartRecording()
    }
  }, [transcription.isRecording, handleStopRecording, handleStartRecording])

  // Keyboard shortcut: Cmd/Ctrl + G
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault()
        toggleRecording()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleRecording])

  // ---- Language label + pulse color for mic button ----
  const langLabel =
    locale.startsWith("pt")
      ? "PT"
      : locale.startsWith("es")
        ? "ES"
        : "EN"

  const localePulseClass =
    locale.startsWith("pt")
      ? "animate-pulse-amber"
      : locale.startsWith("es")
        ? "animate-pulse-emerald"
        : "animate-pulse-blue"

  return (
    <section>
      {/* Top bar: Audio à esquerda, Radiopaedia + Historico à direita */}
      <div className="flex items-center justify-between mb-6">
        {/* Audio button */}
        <div className="group/audio relative">
          <button
            onClick={toggleRecording}
            disabled={isGenerating}
            className={`size-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              transcription.isRecording
                ? `bg-foreground/80 text-background ${localePulseClass}`
                : "bg-muted text-foreground/70 hover:bg-foreground/80 hover:text-background"
            }`}
          >
            <AudioLines className="w-5 h-5" />
          </button>

          {/* Kbd shortcut hint (hidden when recording) */}
          {!transcription.isRecording && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="flex items-center overflow-hidden">
                <div className="-translate-x-[calc(100%+0.75rem)] opacity-0 group-hover/audio:translate-x-0 group-hover/audio:opacity-100 transition-all duration-300 ease-out ml-3">
                  <KbdGroup>
                    <Kbd className="group-hover/audio:bg-foreground/80 group-hover/audio:text-background">
                      {isMac ? "⌘" : "Ctrl"}
                    </Kbd>
                    <span className="text-xs text-foreground/30 group-hover/audio:text-foreground">
                      +
                    </span>
                    <Kbd className="group-hover/audio:bg-foreground/80 group-hover/audio:text-background">
                      G
                    </Kbd>
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
            onClick={() => onUsarPesquisaChange(!usarPesquisa)}
            disabled={isGenerating}
            className={`gap-1.5 ${usarPesquisa ? "bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Search className="w-3.5 h-3.5" />
            {t("radiopaedia")}
          </Button>

          {historico.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setHistoricoAberto(!historicoAberto)}
                className={`gap-1.5 ${historicoAberto ? "bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="w-3.5 h-3.5" />
                {t("history", { count: historico.length })}
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
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("lastReports")}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          onClick={onLimparHistorico}
                          className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          {t("clear")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setHistoricoAberto(false)}
                          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                          <p className="text-sm text-foreground truncate">
                            {item.texto}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {item.data}
                          </p>
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

      {/* Waveform bar — real frequency data or error */}
      <AnimatePresence>
        {transcription.isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden mb-6"
          >
            <div className="flex items-center gap-4 bg-muted/40 rounded-full px-5 py-2 h-11">
              {/* Waveform bars driven by AnalyserNode frequency data */}
              <div className="flex items-center justify-end gap-[1.5px] h-6 flex-1 min-w-0 overflow-hidden">
                {transcription.frequencyData.length > 0
                  ? transcription.frequencyData.map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-0 rounded-full bg-foreground/60 transition-[height] duration-75"
                        style={{
                          maxWidth: 4,
                          height: Math.max(2, (val / 255) * 24),
                        }}
                      />
                    ))
                  : /* Static placeholder bars while connection is establishing */
                    Array.from({ length: 80 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-0 rounded-full bg-foreground/20 animate-pulse"
                        style={{ maxWidth: 4, height: 2 }}
                      />
                    ))}
              </div>

              {/* Timer + language badge + buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Language badge */}
                <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted rounded px-1.5 py-0.5">
                  {langLabel}
                </span>

                <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-[40px]">
                  {Math.floor(transcription.elapsed / 60)
                    .toString()
                    .padStart(1, "0")}
                  :{(transcription.elapsed % 60).toString().padStart(2, "0")}
                </span>

                {/* Cancel */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelRecording}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>

                {/* Confirm / stop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStopRecording}
                  className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Error message */}
            {transcription.error && (
              <p className="text-xs text-destructive mt-2 px-2">
                {transcription.error === "micPermissionDenied"
                  ? t("micPermissionDenied")
                  : transcription.error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Textarea auto-grow inside squircle card */}
      <SquircleCard className="p-8">
        <textarea
          ref={textareaRef}
          placeholder={animatedPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent border-none outline-none resize-none text-sm sm:text-base leading-relaxed text-muted-foreground placeholder:text-muted-foreground/30 font-medium overflow-hidden"
          rows={1}
        />
      </SquircleCard>

      {/* Botao Gerar Laudo + Kbd animado */}
      <div className="flex items-center justify-end mt-4">
        <div className="group/gerar relative">
          <div className="absolute right-full top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex items-center overflow-hidden">
              <div className="translate-x-[calc(100%+0.75rem)] opacity-0 group-hover/gerar:translate-x-0 group-hover/gerar:opacity-100 transition-all duration-300 ease-out mr-3">
                <KbdGroup>
                  <Kbd
                    className={
                      value.trim()
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    {isMac ? "⌘" : "Ctrl"}
                  </Kbd>
                  <span
                    className={`text-xs ${value.trim() ? "text-accent-foreground/50" : "text-foreground/30"}`}
                  >
                    +
                  </span>
                  <Kbd
                    className={
                      value.trim()
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    {isMac ? "Return" : "Enter"}
                  </Kbd>
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
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {t("generateReport")}
          </Button>
        </div>
      </div>
    </section>
  )
}
