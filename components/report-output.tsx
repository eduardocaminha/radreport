"use client"

import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Copy, FileText, Check } from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"

// Função para formatar laudo no cliente (duplicada da lib/formatador para uso no cliente)
function formatarLaudoHTMLCliente(texto: string): string {
  if (!texto) return ''
  
  // Se já tem HTML formatado corretamente, retorna como está
  if (texto.includes('class="laudo-titulo"') || texto.includes('class="laudo-secao"')) {
    return texto
  }
  
  // Remove HTML existente se houver (caso venha mal formatado)
  let textoLimpo = texto
  if (texto.includes('<p>') || texto.includes('<br>')) {
    textoLimpo = texto
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
  }
  
  const linhas = textoLimpo.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (linhas.length === 0) return ''
  
  let html = ''
  let i = 0
  let emAnalise = false
  
  // Título
  if (i < linhas.length) {
    html += `<h1 class="laudo-titulo">${linhas[i].toUpperCase()}</h1>`
    i++
  }
  
  // Urgência
  if (i < linhas.length) {
    const linha = linhas[i].toLowerCase()
    if (linha.includes('urgência') || linha.includes('urgencia') || linha.includes('eletivo')) {
      html += `<p class="laudo-urgencia">${linhas[i]}</p>`
      i++
    }
  }
  
  html += '<br>'
  
  // Processar seções
  while (i < linhas.length) {
    const linha = linhas[i]
    const linhaUpper = linha.toUpperCase().trim()
    
    if (linhaUpper.startsWith('TÉCNICA:') || linhaUpper.startsWith('TECNICA:')) {
      html += `<p class="laudo-secao">TÉCNICA:</p>`
      i++
      emAnalise = false
      
      if (i < linhas.length) {
        const textoTecnica = linhas[i].replace(/\b(multislice|multidetector|helical|spiral|contrast|enhancement|attenuation|hounsfield|mip|mpr|vr|3d)\b/gi, '<em>$1</em>')
        html += `<p class="laudo-texto">${textoTecnica}</p>`
        i++
      }
      
      html += '<br>'
    } else if (linhaUpper.startsWith('ANÁLISE:') || linhaUpper.startsWith('ANALISE:')) {
      html += `<p class="laudo-secao">ANÁLISE:</p>`
      i++
      emAnalise = true
      
      while (i < linhas.length) {
        const linhaAnalise = linhas[i]
        const linhaAnaliseUpper = linhaAnalise.toUpperCase().trim()
        
        if (linhaAnaliseUpper.startsWith('TÉCNICA:') || 
            linhaAnaliseUpper.startsWith('TECNICA:') ||
            linhaAnaliseUpper.startsWith('ANÁLISE:') ||
            linhaAnaliseUpper.startsWith('ANALISE:')) {
          break
        }
        
        html += `<p class="laudo-texto">${linhaAnalise}</p>`
        i++
      }
    } else if (emAnalise) {
      html += `<p class="laudo-texto">${linha}</p>`
      i++
    } else {
      html += `<p class="laudo-texto">${linha}</p>`
      i++
    }
  }
  
  return html
}

interface ReportOutputProps {
  report: string
  isGenerating: boolean
}

export function ReportOutput({ report, isGenerating }: ReportOutputProps) {
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const previousReportRef = useRef<string>("")

  // O laudo já vem formatado em HTML do backend, mas vamos garantir formatação correta
  const reportHtml = useMemo(() => {
    if (!report) return ""
    
    // Se já tem HTML formatado com as classes corretas, retorna como está
    if (report.includes('class="laudo-titulo"') || report.includes('class="laudo-secao"')) {
      return report
    }
    
    // Formata o texto (pode ser texto plano ou HTML mal formatado)
    return formatarLaudoHTMLCliente(report)
  }, [report])

  // Copiar automaticamente quando um novo laudo é gerado
  useEffect(() => {
    // Copia quando a geração termina (isGenerating muda de true para false) e há um novo laudo
    if (!isGenerating && report && reportHtml && !report.includes('class="text-destructive"')) {
      // Verifica se é realmente um novo laudo (diferente do anterior)
      if (previousReportRef.current !== report) {
        navigator.clipboard.writeText(reportHtml).then(() => {
          setCopiedHtml(true)
          setTimeout(() => setCopiedHtml(false), 2000)
        }).catch(() => {
          // Silenciosamente falha se não conseguir copiar
        })
        previousReportRef.current = report
      }
    }
  }, [report, isGenerating, reportHtml])

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
