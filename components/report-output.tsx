"use client"

import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Copy, FileText, Check } from "lucide-react"
import { useState } from "react"

interface ReportOutputProps {
  report: string
  isGenerating: boolean
}

export function ReportOutput({ report, isGenerating }: ReportOutputProps) {
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(report)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const handleCopyText = async () => {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = report
    const plainText = tempDiv.textContent || tempDiv.innerText || ""
    await navigator.clipboard.writeText(plainText)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Resultado</h2>
        <AnimatePresence>
          {report && (
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

      <div className="min-h-[220px] rounded-lg bg-muted/50 border border-border p-4 overflow-hidden">
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
              className="text-sm leading-relaxed prose prose-sm max-w-none text-foreground 
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                prose-p:my-1 prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: report }}
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
