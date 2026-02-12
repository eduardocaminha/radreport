"use client"

import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Copy, Check, DollarSign } from "lucide-react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { calcularCusto, formatarCusto, type TokenUsage } from "@/lib/tokens"
import { parseReportBlocks, blocksToHtml, type ReportBlock } from "@/lib/report-blocks"
import { DraggableReport } from "@/components/draggable-report"
import { SquircleCard } from "@/components/ui/squircle-card"
import { useTranslations } from "next-intl"

// Função para formatar linha do modo comparativo no cliente
function formatarLinhaComparativoCliente(linha: string): string {
  const linhaUpper = linha.toUpperCase()

  // Remover hífens no início da linha (erro comum do LLM)
  let linhaLimpa = linha.trim()
  if (linhaLimpa.startsWith('-') || linhaLimpa.startsWith('•')) {
    linhaLimpa = linhaLimpa.substring(1).trim()
  }

  // Detectar "Exame comparativo com a tomografia de [data] evidencia:"
  if (linhaUpper.includes('EXAME COMPARATIVO') && linhaUpper.includes('EVIDENCIA:')) {
    const indiceEvidencia = linhaLimpa.toLowerCase().indexOf('evidencia:')
    const parteInicial = linhaLimpa.substring(0, indiceEvidencia + 'evidencia:'.length)
    const parteFinal = linhaLimpa.substring(indiceEvidencia + 'evidencia:'.length).trim()

    let resultado = `<strong>${parteInicial}</strong>`
    if (parteFinal) {
      resultado += ` ${parteFinal}`
    }
    return resultado
  }

  // Detectar "Restante permanece sem alterações evolutivas significativas:"
  if (linhaUpper.includes('RESTANTE PERMANECE SEM ALTERAÇÕES EVOLUTIVAS SIGNIFICATIVAS:') ||
      linhaUpper.includes('RESTANTE PERMANECE SEM ALTERACOES EVOLUTIVAS SIGNIFICATIVAS:')) {
    const indiceDoisPontos = linhaLimpa.indexOf(':')
    if (indiceDoisPontos !== -1) {
      const parteInicial = linhaLimpa.substring(0, indiceDoisPontos + 1)
      const parteFinal = linhaLimpa.substring(indiceDoisPontos + 1).trim()

      let resultado = `<strong>${parteInicial}</strong>`
      if (parteFinal) {
        resultado += ` ${parteFinal}`
      }
      return resultado
    }
    return `<strong>${linhaLimpa}</strong>`
  }

  return linhaLimpa
}

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
      let textoUrgencia = linhas[i]
      if (textoUrgencia === textoUrgencia.toUpperCase() && textoUrgencia.length > 10) {
        textoUrgencia = textoUrgencia.charAt(0).toUpperCase() + textoUrgencia.slice(1).toLowerCase()
      }
      html += `<p class="laudo-urgencia">${textoUrgencia}</p>`
      i++
    }
  }

  html += '<br>'

  // Processar seções
  while (i < linhas.length) {
    const linha = linhas[i]
    const linhaUpper = linha.toUpperCase().trim()

    if (linhaUpper.startsWith('INDICAÇÃO:') || linhaUpper.startsWith('INDICACAO:')) {
      html += `<p class="laudo-secao">INDICAÇÃO:</p>`
      i++
      emAnalise = false

      const linhasIndicacao: string[] = []
      while (i < linhas.length) {
        const linhaIndicacao = linhas[i]
        const linhaIndicacaoUpper = linhaIndicacao.toUpperCase().trim()

        if (linhaIndicacaoUpper.startsWith('INDICAÇÃO:') ||
            linhaIndicacaoUpper.startsWith('INDICACAO:') ||
            linhaIndicacaoUpper.startsWith('TÉCNICA:') ||
            linhaIndicacaoUpper.startsWith('TECNICA:') ||
            linhaIndicacaoUpper.startsWith('ANÁLISE:') ||
            linhaIndicacaoUpper.startsWith('ANALISE:')) {
          break
        }

        linhasIndicacao.push(linhaIndicacao)
        i++
      }

      const textoIndicacaoCompleto = linhasIndicacao.join(' ')
      html += `<p class="laudo-texto">${textoIndicacaoCompleto}</p>`
      html += '<br>'
    }
    else if (linhaUpper.startsWith('TÉCNICA:') || linhaUpper.startsWith('TECNICA:')) {
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

        if (linhaAnalise.trim() === '') {
          i++
          continue
        }

        const linhaFormatada = formatarLinhaComparativoCliente(linhaAnalise)
        html += `<p class="laudo-texto">${linhaFormatada}</p>`
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
  streamedText?: string
  isStreaming?: boolean
  isGenerating: boolean
  tokenUsage?: TokenUsage
  model?: string
  /** Called when the user edits the report (drag-and-drop reorder or inline text edit) */
  onReportChange?: (html: string) => void
}

export function ReportOutput({ report, streamedText, isStreaming, isGenerating, tokenUsage, model, onReportChange }: ReportOutputProps) {
  const t = useTranslations("ReportOutput")
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [blocks, setBlocks] = useState<ReportBlock[]>([])
  const previousReportRef = useRef<string>("")

  // HTML formatado do texto sendo streamed
  const streamingHtml = useMemo(() => {
    if (!streamedText) return ""
    return formatarLaudoHTMLCliente(streamedText)
  }, [streamedText])

  // O laudo final já vem formatado em HTML do backend
  const reportHtml = useMemo(() => {
    if (!report) return ""

    if (report.includes('class="laudo-titulo"') || report.includes('class="laudo-secao"')) {
      return report
    }

    return formatarLaudoHTMLCliente(report)
  }, [report])

  // Parsear blocos quando o report muda
  useEffect(() => {
    if (reportHtml && !isStreaming) {
      setBlocks(parseReportBlocks(reportHtml))
    }
  }, [reportHtml, isStreaming])

  // HTML reordenado (respeita drag-and-drop)
  const reorderedHtml = useMemo(() => {
    if (blocks.length === 0) return reportHtml
    return blocksToHtml(blocks)
  }, [blocks, reportHtml])

  const handleReorder = useCallback((newBlocks: ReportBlock[]) => {
    setBlocks(newBlocks)
    if (onReportChange) {
      onReportChange(blocksToHtml(newBlocks))
    }
  }, [onReportChange])

  const handleBlockUpdate = useCallback((blockId: string, newHtml: string) => {
    setBlocks((prev) => {
      const updated = prev.map((b) => (b.id === blockId ? { ...b, html: newHtml } : b))
      if (onReportChange) {
        onReportChange(blocksToHtml(updated))
      }
      return updated
    })
  }, [onReportChange])

  // Extrair texto puro do HTML (respeita ordem reordenada)
  const plainTextFromHtml = useMemo(() => {
    const sourceHtml = reorderedHtml || reportHtml || streamingHtml
    if (!sourceHtml) return ""
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = sourceHtml
    return tempDiv.textContent || tempDiv.innerText || ""
  }, [reorderedHtml, reportHtml, streamingHtml])

  // Criar HTML completo com estilos inline (respeita ordem reordenada)
  const htmlCompleto = useMemo(() => {
    const sourceHtml = reorderedHtml || reportHtml || streamingHtml
    if (!sourceHtml) return ""

    if (sourceHtml.includes('style=')) {
      return sourceHtml
    }

    const htmlComEstilos = sourceHtml
      .replace(/class="laudo-titulo"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; text-align: center; text-transform: uppercase;"')
      .replace(/class="laudo-urgencia"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-style: italic; text-align: center;"')
      .replace(/class="laudo-secao"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; text-transform: uppercase;"')
      .replace(/class="laudo-texto"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; margin: 0; padding: 0;"')

    return htmlComEstilos
  }, [reorderedHtml, reportHtml, streamingHtml])

  // Texto plano com quebras de linha preservadas
  const plainText = useMemo(() => {
    const sourceHtml = reorderedHtml || reportHtml || streamingHtml
    if (!sourceHtml) return ""

    if (sourceHtml.includes("<") && sourceHtml.includes(">")) {
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = sourceHtml
      return tempDiv.textContent || tempDiv.innerText || ""
    }

    return sourceHtml
  }, [reorderedHtml, reportHtml, streamingHtml])

  // Copiar automaticamente quando um novo laudo é gerado
  useEffect(() => {
    if (!isGenerating && !isStreaming && report && reportHtml && htmlCompleto && !report.includes('class="text-destructive"')) {
      if (previousReportRef.current !== report) {
        const copiarHtmlFormatado = async () => {
          try {
            const htmlBlob = new Blob([htmlCompleto], { type: 'text/html' })
            const plainBlob = new Blob([plainTextFromHtml], { type: 'text/plain' })

            const clipboardItem = new ClipboardItem({
              'text/html': htmlBlob,
              'text/plain': plainBlob,
            })

            await navigator.clipboard.write([clipboardItem])
            setCopiedHtml(true)
            setTimeout(() => setCopiedHtml(false), 5000)
          } catch {
            await navigator.clipboard.writeText(plainTextFromHtml)
            setCopiedHtml(true)
            setTimeout(() => setCopiedHtml(false), 5000)
          }
        }

        copiarHtmlFormatado()
        previousReportRef.current = report
      }
    }
  }, [report, isGenerating, isStreaming, reportHtml, htmlCompleto, plainTextFromHtml])

  const handleCopyHtml = async () => {
    try {
      const htmlBlob = new Blob([htmlCompleto], { type: 'text/html' })
      const plainBlob = new Blob([plainTextFromHtml], { type: 'text/plain' })

      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': plainBlob,
      })

      await navigator.clipboard.write([clipboardItem])
      setCopiedHtml(true)
      setTimeout(() => setCopiedHtml(false), 2000)
    } catch {
      console.error(t("errorCopyHtml"))
      await navigator.clipboard.writeText(plainTextFromHtml)
      setCopiedHtml(true)
      setTimeout(() => setCopiedHtml(false), 2000)
    }
  }

  const isError = report.includes('class="text-destructive"') || report.includes('text-destructive')

  const costInfo = useMemo(() => {
    if (!tokenUsage || !model) return null;
    return calcularCusto(tokenUsage.inputTokens, tokenUsage.outputTokens, model);
  }, [tokenUsage, model])

  const hasContent = !!(report || streamedText)
  const showContent = isGenerating || isStreaming || !!report
  const pulseClass = isGenerating && !isStreaming ? "animate-pulse" : ""

  return (
    <section>
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={handleCopyHtml}
            disabled={!hasContent || isError}
            className="gap-2 bg-muted text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {copiedHtml ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            {copiedHtml ? t("copied") : t("copy")}
          </Button>
        </div>
      </div>

      {/* Always-visible squircle card */}
      <SquircleCard className={`p-8 min-h-[200px] ${isError ? "text-destructive" : ""}`}>
        <AnimatePresence mode="wait">
          {isStreaming && streamedText ? (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-foreground [&_.laudo-texto]:mb-0 [&_.laudo-texto+br]:block"
            >
              <div dangerouslySetInnerHTML={{ __html: streamingHtml }} />
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
              } pl-6`}
            >
              {blocks.length > 0 && !isError ? (
                <DraggableReport blocks={blocks} onReorder={handleReorder} onBlockUpdate={handleBlockUpdate} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
              )}
            </motion.div>
          )           : (
            /* Static skeleton placeholder — animates only when generating */
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Título centrado */}
              <div className="flex flex-col items-center gap-2">
                <div className={`h-3 w-48 rounded-full bg-muted/40 ${pulseClass}`} />
                <div className={`h-2.5 w-28 rounded-full bg-muted/30 ${pulseClass}`} />
              </div>
              {/* Seção 1 */}
              <div className="space-y-2 pt-2">
                <div className={`h-2.5 w-20 rounded-full bg-muted/40 ${pulseClass}`} />
                <div className={`h-2 w-full rounded-full bg-muted/20 ${pulseClass}`} />
                <div className={`h-2 w-4/5 rounded-full bg-muted/20 ${pulseClass}`} />
              </div>
              {/* Seção 2 */}
              <div className="space-y-2 pt-1">
                <div className={`h-2.5 w-16 rounded-full bg-muted/40 ${pulseClass}`} />
                <div className={`h-2 w-full rounded-full bg-muted/20 ${pulseClass}`} />
                <div className={`h-2 w-11/12 rounded-full bg-muted/20 ${pulseClass}`} />
                <div className={`h-2 w-full rounded-full bg-muted/20 ${pulseClass}`} />
                <div className={`h-2 w-3/4 rounded-full bg-muted/20 ${pulseClass}`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SquircleCard>

      {costInfo && (
        <div className="mt-4 flex items-center justify-end text-xs text-muted-foreground/60">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground/50">{formatarCusto(costInfo.totalCost)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
