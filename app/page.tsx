"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useState } from "react"
import { Header } from "@/components/header"
import { DictationInput } from "@/components/dictation-input"
import { ReportOutput } from "@/components/report-output"

type ReportMode = "ps" | "eletivo" | "comparativo"

export default function Home() {
  const [dictatedText, setDictatedText] = useState("")
  const [generatedReport, setGeneratedReport] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportMode, setReportMode] = useState<ReportMode>("ps")

  const handleGenerate = async () => {
    if (!dictatedText.trim()) return
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setGeneratedReport(
      `<div><h2>LAUDO RADIOLÓGICO</h2>` +
        `<p><strong>Exame:</strong> Tomografia Computadorizada</p>` +
        `<p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>` +
        `<p><strong>Modo:</strong> ${reportMode.charAt(0).toUpperCase() + reportMode.slice(1)}</p>` +
        `<h3>TÉCNICA:</h3>` +
        `<p>Exame realizado em equipamento multislice, com aquisições antes e após administração endovenosa de meio de contraste iodado.</p>` +
        `<h3>ACHADOS:</h3>` +
        `<p>${dictatedText}</p>` +
        `<h3>CONCLUSÃO:</h3>` +
        `<p>Achados descritos acima, correlacionar com dados clínicos e laboratoriais.</p></div>`,
    )
    setIsGenerating(false)
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
        className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6"
      >
        <motion.div
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
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
          }}
        >
          <ReportOutput report={generatedReport} isGenerating={isGenerating} />
        </motion.div>
      </motion.main>
    </div>
  )
}
