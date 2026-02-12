"use client"

import { useState, useRef, useCallback, useEffect } from "react"

/* ------------------------------------------------------------------ */
/*  useRealtimeTranscription                                          */
/*                                                                    */
/*  Manages a WebRTC connection to OpenAI's Realtime API for          */
/*  transcription-only mode.  Exposes:                                */
/*    • start / stop / cancel   – lifecycle controls                  */
/*    • isRecording / elapsed   – recording state                     */
/*    • frequencyData           – 80-bin audio level array (0-255)    */
/*    • error                   – user-facing error message           */
/*                                                                    */
/*  The hook dispatches "realtime-recording" CustomEvents on window   */
/*  so sibling components (e.g. LocaleSwitcher) can react.            */
/* ------------------------------------------------------------------ */

interface UseRealtimeTranscriptionOptions {
  locale: string
  /** Called with each incremental transcript delta */
  onDelta: (delta: string, itemId: string) => void
  /** Called when a full turn transcript is finalized */
  onComplete: (transcript: string, itemId: string) => void
}

const FREQ_BINS = 80

export function useRealtimeTranscription({
  locale,
  onDelta,
  onComplete,
}: UseRealtimeTranscriptionOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [frequencyData, setFrequencyData] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Keep mutable refs so callbacks inside event listeners are always fresh
  const onDeltaRef = useRef(onDelta)
  const onCompleteRef = useRef(onComplete)
  const localeRef = useRef(locale)

  useEffect(() => { onDeltaRef.current = onDelta }, [onDelta])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { localeRef.current = locale }, [locale])

  // Internal refs for resources
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startingRef = useRef(false)

  // ---- helpers (all stable — no deps on props/state) ----

  /** Map next-intl locale to ISO-639-1 for OpenAI */
  function getLanguage() {
    const loc = localeRef.current
    if (loc.startsWith("pt")) return "pt"
    if (loc.startsWith("es")) return "es"
    return "en"
  }

  /** requestAnimationFrame loop that reads AnalyserNode data */
  const updateFrequency = useCallback(() => {
    if (!analyserRef.current) return
    const raw = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(raw)

    const step = Math.max(1, Math.floor(raw.length / FREQ_BINS))
    const bins: number[] = []
    for (let i = 0; i < FREQ_BINS; i++) {
      bins.push(raw[i * step] ?? 0)
    }
    setFrequencyData(bins)
    animFrameRef.current = requestAnimationFrame(updateFrequency)
  }, [])

  /** Tear down all resources */
  const cleanup = useCallback(() => {
    startingRef.current = false

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    dcRef.current?.close()
    dcRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close()
    }
    audioCtxRef.current = null
    analyserRef.current = null

    setFrequencyData([])
    setIsRecording(false)
    setElapsed(0)

    window.dispatchEvent(
      new CustomEvent("realtime-recording", { detail: { active: false } }),
    )
  }, [])

  // ---- public API (all stable — deps only on other stable callbacks) ----

  const start = useCallback(async () => {
    // Guard against double-start while async is in progress
    if (startingRef.current || pcRef.current) return
    startingRef.current = true
    setError(null)

    try {
      // 1. Fetch ephemeral client secret from our API
      const tokenRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: getLanguage() }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({})) as {
          error?: string
          detail?: string
        }
        const msg = err.detail
          ? `${err.error}: ${err.detail}`
          : err.error ?? `Server error ${tokenRes.status}`
        throw new Error(msg)
      }

      const { clientSecret } = (await tokenRes.json()) as {
        clientSecret: string
      }

      // 2. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 3. AudioContext + AnalyserNode for waveform
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // 4. RTCPeerConnection
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      pc.addTrack(stream.getTracks()[0])

      // 5. Data channel for events
      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data) as {
            type: string
            delta?: string
            transcript?: string
            item_id?: string
            error?: { message?: string }
          }

          switch (event.type) {
            case "conversation.item.input_audio_transcription.delta":
              onDeltaRef.current(event.delta ?? "", event.item_id ?? "")
              break
            case "conversation.item.input_audio_transcription.completed":
              onCompleteRef.current(
                event.transcript ?? "",
                event.item_id ?? "",
              )
              break
            case "error":
              console.error("[Realtime] Server error:", event.error)
              setError(event.error?.message ?? "Transcription error")
              break
          }
        } catch {
          // non-JSON, ignore
        }
      })

      // 6. SDP exchange via ephemeral token
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
      })

      if (!sdpRes.ok) {
        throw new Error(`WebRTC negotiation failed: ${sdpRes.status}`)
      }

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })

      // 7. Active! Start timers and animation
      startingRef.current = false
      setIsRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
      animFrameRef.current = requestAnimationFrame(updateFrequency)

      window.dispatchEvent(
        new CustomEvent("realtime-recording", { detail: { active: true } }),
      )
    } catch (err) {
      console.error("[Realtime] Start error:", err)
      const message =
        err instanceof Error ? err.message : "Failed to start recording"

      if (
        message.includes("Permission") ||
        message.includes("NotAllowed") ||
        message.includes("permission")
      ) {
        setError("micPermissionDenied")
      } else {
        setError(message)
      }

      cleanup()
    }
  }, [updateFrequency, cleanup])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const cancel = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    start,
    stop,
    cancel,
    isRecording,
    elapsed,
    frequencyData,
    error,
  }
}
