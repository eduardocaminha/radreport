"use client"

import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Copy, FileText, Check } from "lucide-react"
import { useState, useMemo } from "react"

interface ReportOutputProps {
  report: string
  isGenerating: boolean
}

export function ReportOutput({ report, isGenerating }: ReportOutputProps) {
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  // O laudo já vem formatado em HTML do backend
  const reportHtml = useMemo(() => {
    if (!report) return ""
    
    // Se já tem tags HTML formatadas, retorna como está
    if (report.includes("<") && report.includes(">")) {
      return report
    }
    
    // Fallback: se vier texto plano, formata básico (não deveria acontecer)
    const paragraphs = report.split(/\n\n+/)
    return paragraphs
      .map((p) => {
        const lines = p.split(/\n/)
        return `<p class="laudo-texto">${lines.join("<br>")}</p>`
      })
      .join("")
  }, [report])

  // Texto plano com quebras de linha preservadas
  const plainText = useMemo(() => {
    if (!report) return ""
    
    // Se tem tags HTML, extrai o texto
    if (report.includes("<") && report.includes(">")) {
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = report
      return tempDiv.textContent || tempDiv.innerText || ""
    }
    
    // Se já é texto plano, retorna como está
    return report
  }, [report])

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(reportHtml)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(plainText)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  // Verifica se é uma mensagem de erro (começa com tag de erro)
  const isError = report.includes('class="text-destructive"') || report.includes('text-destructive')

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Resultado</h2>
        <AnimatePresence>
          {report && !isError && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHtml}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  {copiedHtml ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  {copiedHtml ? "Copiado" : "Copiar HTML"}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyText}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  {copiedText ? <Check className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4" />}
                  {copiedText ? "Copiado" : "Copiar Texto"}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`min-h-[220px] rounded-lg border p-4 overflow-hidden ${
        isError 
          ? "bg-destructive/5 border-destructive/20" 
          : "bg-muted/50 border-border"
      }`}>
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full min-h-[188px] flex flex-col items-center justify-center gap-3 text-muted-foreground"
            >
              <div className="flex gap-1">
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.15 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              </div>
              <span className="text-sm">Gerando laudo...</span>
            </motion.div>
          ) : report ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`${
                isError 
                  ? "text-destructive" 
                  : "text-foreground [&_.laudo-texto]:mb-0 [&_.laudo-texto+br]:block"
              }`}
              dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full min-h-[188px] flex items-center justify-center"
            >
              <span className="text-sm text-muted-foreground">O laudo gerado aparecerá aqui</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
