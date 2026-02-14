"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { SquircleCard } from "@/components/ui/squircle-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Clock,
  Sparkles,
  Loader2,
  X,
  Search,
  AudioLines,
  Check,
  Minus,
  Plus,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription"

interface ItemHistorico {
  id: string
  texto: string
  textoCompleto: string
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
  /** Called when a history item is selected — restores full text + report */
  onHistoricoSelect?: (item: ItemHistorico) => void
  usarPesquisa: boolean
  onUsarPesquisaChange: (value: boolean) => void
  /** Controlled font size index (from user preferences) */
  fontSizeIdx: number
  onFontSizeIdxChange: (idx: number) => void
  /** Called when an audio session has been uploaded after recording stops */
  onAudioSessionReady?: (audioSessionId: number) => void
}

export function DictationInput({
  value,
  onChange,
  onGenerate,
  onKeyDown,
  isGenerating,
  historico,
  onLimparHistorico,
  onHistoricoSelect,
  usarPesquisa,
  onUsarPesquisaChange,
  fontSizeIdx,
  onFontSizeIdxChange,
  onAudioSessionReady,
}: DictationInputProps) {
  const locale = useLocale()
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const t = useTranslations("DictationInput")

  // Font size steps (tailwind-like rem values)
  const FONT_SIZES = [
    { class: "text-xs", label: "12" },
    { class: "text-sm sm:text-base", label: "14" },
    { class: "text-base sm:text-lg", label: "16" },
    { class: "text-lg sm:text-xl", label: "20" },
  ] as const

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
  }, [value, fontSizeIdx, adjustHeight])

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

  // Upload audio session data when audioBlob becomes available after recording stops
  const lastUploadedBlobRef = useRef<Blob | null>(null)
  useEffect(() => {
    const blob = transcription.audioBlob
    if (!blob || blob === lastUploadedBlobRef.current) return
    lastUploadedBlobRef.current = blob

    // Build the full transcript from all turns
    const fullTranscript = transcription.turnTranscripts
      .map((t) => t.text)
      .filter(Boolean)
      .join(" ")

    const wordCount = fullTranscript
      .split(/\s+/)
      .filter(Boolean).length

    const metadata = {
      language: locale.startsWith("pt") ? "pt" : locale.startsWith("es") ? "es" : "en",
      durationSeconds: transcription.elapsed || undefined,
      transcriptRaw: fullTranscript || undefined,
      transcriptDeltas: transcription.transcriptDeltas,
      turnTranscripts: transcription.turnTranscripts,
      turnCount: transcription.turnTranscripts.length,
      wordCount,
      extra: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    }

    const formData = new FormData()
    formData.append("audio", blob, "recording.webm")
    formData.append("metadata", JSON.stringify(metadata))

    fetch("/api/audio-sessions", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((session: { id?: number }) => {
        if (session.id && onAudioSessionReady) {
          onAudioSessionReady(session.id)
        }
      })
      .catch((err) => {
        console.error("[DictationInput] Failed to upload audio session:", err)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription.audioBlob])

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

  const localeBadgeClass =
    locale.startsWith("pt")
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : locale.startsWith("es")
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "bg-blue-500/15 text-blue-700 dark:text-blue-400"

  return (
    <section>
      {/* Top bar: on mobile big centered Ditar; on desktop Audio left, Historico right */}
      <div className="grid grid-cols-[1fr_auto_1fr] sm:flex sm:items-center sm:justify-between gap-4 mb-6 items-center">
        {/* Audio / Ditar button — large and centered on mobile */}
        <div className="group/audio relative flex justify-center col-start-2 sm:col-auto sm:justify-start">
          <Button
            variant="ghost"
            onClick={toggleRecording}
            disabled={isGenerating}
            className={`gap-2 sm:gap-1.5 h-14 min-w-14 px-6 rounded-full sm:h-11 sm:min-w-0 sm:px-6 ${
              transcription.isRecording
                ? `bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background ${localePulseClass}`
                : "bg-muted text-foreground/70 hover:bg-foreground/80 hover:text-background"
            }`}
          >
            <AudioLines className="w-6 h-6 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>{t("dictate")}</span>
          </Button>

          {/* Kbd shortcut hint (hidden when recording & on mobile) */}
          {!transcription.isRecording && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
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

        {/* Historico — right column on mobile, same as desktop */}
        <div className="flex items-center justify-end gap-4 col-start-3">
          {historico.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setHistoricoAberto(!historicoAberto)}
                className={`gap-1.5 ${historicoAberto ? "bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {t("history", { count: historico.length })}
                </span>
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
                          className="rounded-full h-6 px-2.5 text-[10px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          {t("clear")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setHistoricoAberto(false)}
                          className="rounded-full size-6 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-3"
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-none">
                      {historico.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (onHistoricoSelect) {
                              onHistoricoSelect(item)
                            } else {
                              onChange(item.texto)
                            }
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
                <span
                  className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${localeBadgeClass}`}
                >
                  {langLabel}
                </span>

                <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-[40px]">
                  {Math.floor(transcription.elapsed / 60)
                    .toString()
                    .padStart(1, "0")}
                  :{(transcription.elapsed % 60).toString().padStart(2, "0")}
                </span>

                {/* Cancel */}
                <button
                  onClick={handleCancelRecording}
                  className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Confirm / stop */}
                <button
                  onClick={handleStopRecording}
                  className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
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
      <SquircleCard className="relative p-8">
        {/* Font size pill — top-right inside the card */}
        <div className="absolute top-2.5 right-3 flex items-stretch bg-muted/50 rounded-full h-5 overflow-hidden z-10">
          <button
            onClick={() => onFontSizeIdxChange(Math.max(0, fontSizeIdx - 1))}
            disabled={fontSizeIdx === 0}
            className="h-full flex-1 min-w-0 flex items-center justify-center px-1.5 text-muted-foreground/50 hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="flex-1 min-w-0 flex items-center justify-center px-1.5 text-[9px] font-medium text-muted-foreground/60 select-none">
            A
          </span>
          <button
            onClick={() =>
              onFontSizeIdxChange(Math.min(FONT_SIZES.length - 1, fontSizeIdx + 1))
            }
            disabled={fontSizeIdx === FONT_SIZES.length - 1}
            className="h-full flex-1 min-w-0 flex items-center justify-center px-1.5 text-muted-foreground/50 hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          placeholder={animatedPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`w-full bg-transparent border-none outline-none resize-none leading-relaxed text-foreground placeholder:text-muted-foreground/30 font-medium overflow-hidden ${FONT_SIZES[fontSizeIdx].class}`}
          rows={1}
        />
      </SquircleCard>

      {/* Bottom bar: Radiopaedia (start) + Gerar Laudo (end) — space between so kbd hint doesn’t overlap */}
      <div className="flex items-center justify-between mt-6">
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => onUsarPesquisaChange(!usarPesquisa)}
              disabled={isGenerating}
              className={`gap-1.5 ${usarPesquisa ? "bg-foreground/80 text-background hover:bg-foreground/70 hover:text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("radiopaedia")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Ativar sugestões com Radiopaedia
          </TooltipContent>
        </Tooltip>
        {/* Gerar Laudo + Kbd */}
        <div className="group/gerar relative">
          <div className="absolute right-full top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
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
            {/* Mobile: short label, Desktop: full label */}
            <span className="sm:hidden">{t("generateShort")}</span>
            <span className="hidden sm:inline">{t("generateReport")}</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
