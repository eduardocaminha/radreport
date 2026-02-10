"use client"

import type React from "react"
import { motion } from "motion/react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Header } from "@/components/header"
import { DictationInput } from "@/components/dictation-input"
import { ReportOutput } from "@/components/report-output"
import { Sugestoes } from "@/components/sugestoes"
import { formatarLaudoHTML } from "@/lib/formatador"
import type { TokenUsage } from "@/lib/tokens"
import { useTranslations } from "next-intl"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface ItemHistorico {
  id: string
  texto: string
  laudo: string
  data: string
}

const MAX_HISTORICO = 5

export default function Home() {
  const t = useTranslations("Dashboard")
  const [dictatedText, setDictatedText] = useState("")
  const [generatedReport, setGeneratedReport] = useState("")
  const [streamedText, setStreamedText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportMode, setReportMode] = useState<ReportMode>("ps")
  const [usarPesquisa, setUsarPesquisa] = useState(false)
  const [historico, setHistorico] = useState<ItemHistorico[]>([])
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | undefined>()
  const [model, setModel] = useState<string | undefined>()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch(`/api/reports?limit=${MAX_HISTORICO}`)
      .then((res) => res.json())
      .then((data: { id: number; inputText: string; generatedReport: string; createdAt: string }[]) => {
        setHistorico(
          data.map((r) => ({
            id: r.id.toString(),
            texto: r.inputText.slice(0, 100),
            laudo: r.generatedReport,
            data: new Date(r.createdAt).toLocaleString("pt-BR"),
          }))
        )
      })
      .catch(() => {})
  }, [])

  const adicionarAoHistorico = useCallback(
    async (texto: string, laudo: string) => {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputText: texto,
            generatedReport: laudo,
            mode: reportMode,
          }),
        })
        const report = await res.json()
        const novoItem: ItemHistorico = {
          id: report.id.toString(),
          texto: texto.slice(0, 100),
          laudo,
          data: new Date(report.createdAt).toLocaleString("pt-BR"),
        }
        setHistorico((prev) => [novoItem, ...prev].slice(0, MAX_HISTORICO))
      } catch {
        // Fallback: local-only if API fails
        const novoItem: ItemHistorico = {
          id: Date.now().toString(),
          texto: texto.slice(0, 100),
          laudo,
          data: new Date().toLocaleString("pt-BR"),
        }
        setHistorico((prev) => [novoItem, ...prev].slice(0, MAX_HISTORICO))
      }
    },
    [reportMode]
  )

  const limparHistorico = async () => {
    setHistorico([])
    try {
      await fetch("/api/reports", { method: "DELETE" })
    } catch {}
  }

  const handleGenerate = async () => {
    if (!dictatedText.trim()) return

    // Cancelar stream anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsGenerating(true)
    setIsStreaming(false)
    setErro(null)
    setSugestoes([])
    setGeneratedReport("")
    setStreamedText("")
    setTokenUsage(undefined)
    setModel(undefined)

    try {
      const response = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: dictatedText,
          modoPS: reportMode === "ps",
          modoComparativo: reportMode === "comparativo",
          usarPesquisa,
        }),
        signal: abortController.signal,
      })

      // Erro HTTP (validação, API key, etc.)
      if (!response.ok) {
        const data = await response.json()
        setErro(data.erro || t("errorDefault"))
        setIsGenerating(false)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""
      let leftover = ""
      setIsStreaming(true)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = leftover + decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        // A última linha pode estar incompleta — guardar para o próximo chunk
        leftover = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)

            if (event.type === "text_delta") {
              accumulated += event.text
              setStreamedText(accumulated)
            } else if (event.type === "done") {
              const laudoHTML = formatarLaudoHTML(accumulated)
              setGeneratedReport(laudoHTML)
              setSugestoes(event.sugestoes || [])
              if (event.erro) setErro(event.erro)
              setTokenUsage(event.tokenUsage)
              setModel(event.model)
              adicionarAoHistorico(dictatedText, laudoHTML)
            } else if (event.type === "error") {
              setErro(event.message)
            }
          } catch {
            // Linha malformada — ignorar
          }
        }
      }

      // Processar leftover final
      if (leftover.trim()) {
        try {
          const event = JSON.parse(leftover)
          if (event.type === "done") {
            const laudoHTML = formatarLaudoHTML(accumulated)
            setGeneratedReport(laudoHTML)
            setSugestoes(event.sugestoes || [])
            if (event.erro) setErro(event.erro)
            setTokenUsage(event.tokenUsage)
            setModel(event.model)
            adicionarAoHistorico(dictatedText, laudoHTML)
          } else if (event.type === "error") {
            setErro(event.message)
          }
        } catch {
          // Ignorar
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Cancelado pelo usuário — não mostrar erro
        return
      }
      setErro(t("errorConnection"))
      setGeneratedReport("")
      setSugestoes([])
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleGenerate()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header reportMode={reportMode} onReportModeChange={setReportMode} />

      <motion.main
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
        className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 py-10 flex flex-col"
      >
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Coluna esquerda - Input */}
          <motion.div
            className="lg:w-1/2"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
            }}
          >
            <DictationInput
              value={dictatedText}
              onChange={setDictatedText}
              onGenerate={handleGenerate}
              onKeyDown={handleKeyDown}
              isGenerating={isGenerating}
              historico={historico}
              onLimparHistorico={limparHistorico}
              usarPesquisa={usarPesquisa}
              onUsarPesquisaChange={setUsarPesquisa}
            />
          </motion.div>

          {/* Coluna direita - Output */}
          <div className="mt-6 lg:mt-0 lg:w-1/2 flex flex-col gap-6">
            {/* Erro essencial */}
            {erro && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/5 border border-destructive/30 rounded-2xl p-5"
              >
                <p className="text-sm font-medium text-destructive">{erro}</p>
              </motion.div>
            )}

            {/* Laudo gerado ou streaming */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
              }}
            >
              <ReportOutput
                report={generatedReport}
                streamedText={isStreaming ? streamedText : ""}
                isStreaming={isStreaming}
                isGenerating={isGenerating}
                tokenUsage={tokenUsage}
                model={model}
              />
            </motion.div>

            {/* Sugestões (aparecem junto com o laudo) */}
            {sugestoes.length > 0 && generatedReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Sugestoes sugestoes={sugestoes} />
              </motion.div>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  )
}
