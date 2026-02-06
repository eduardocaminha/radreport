"use client"

import type React from "react"
import { motion } from "motion/react"
import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { DictationInput } from "@/components/dictation-input"
import { ReportOutput } from "@/components/report-output"
import { Sugestoes } from "@/components/sugestoes"
import type { TokenUsage } from "@/lib/tokens"

type ReportMode = "ps" | "eletivo" | "comparativo"

interface ItemHistorico {
  id: string
  texto: string
  laudo: string
  data: string
}

const MAX_HISTORICO = 5

export default function Home() {
  const [dictatedText, setDictatedText] = useState("")
  const [generatedReport, setGeneratedReport] = useState("")
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportMode, setReportMode] = useState<ReportMode>("ps")
  const [usarPesquisa, setUsarPesquisa] = useState(false)
  const [historico, setHistorico] = useState<ItemHistorico[]>([])
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | undefined>()
  const [model, setModel] = useState<string | undefined>()

  useEffect(() => {
    const saved = localStorage.getItem("radreport_historico")
    if (saved) {
      setHistorico(JSON.parse(saved))
    }
  }, [])

  const adicionarAoHistorico = (texto: string, laudo: string) => {
    const novoItem: ItemHistorico = {
      id: Date.now().toString(),
      texto: texto.slice(0, 100),
      laudo,
      data: new Date().toLocaleString("pt-BR"),
    }

    setHistorico((prev) => {
      const novo = [novoItem, ...prev].slice(0, MAX_HISTORICO)
      localStorage.setItem("radreport_historico", JSON.stringify(novo))
      return novo
    })
  }

  const limparHistorico = () => {
    setHistorico([])
    localStorage.removeItem("radreport_historico")
  }

  const handleGenerate = async () => {
    if (!dictatedText.trim()) return
    setIsGenerating(true)
    setErro(null)
    setSugestoes([])
    setGeneratedReport("")
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
      })

      const data = await response.json()

      // Erro essencial - bloqueia geração
      if (data.erro) {
        setErro(data.erro)
        setGeneratedReport("")
        setSugestoes([])
      } 
      // Laudo gerado com sucesso
      else if (data.laudo) {
        setGeneratedReport(data.laudo)
        setErro(null)
        setSugestoes(data.sugestoes || [])
        setTokenUsage(data.tokenUsage)
        setModel(data.model)
        adicionarAoHistorico(dictatedText, data.laudo)
      }
      // Caso inesperado
      else {
        setErro("Resposta inesperada do servidor")
        setGeneratedReport("")
        setSugestoes([])
      }
    } catch {
      setErro("Erro ao conectar com o servidor")
      setGeneratedReport("")
      setSugestoes([])
    } finally {
      setIsGenerating(false)
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

            {/* Laudo gerado */}
            {generatedReport && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
                }}
              >
                <ReportOutput
                  report={generatedReport}
                  isGenerating={isGenerating}
                  tokenUsage={tokenUsage}
                  model={model}
                />
              </motion.div>
            )}

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
