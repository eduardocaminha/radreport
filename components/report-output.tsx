"use client"

import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Copy, FileText, Check, DollarSign } from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"
import { calcularCusto, formatarCusto, formatarTokens, type TokenUsage } from "@/lib/tokens"

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
      // Garantir que não está em ALL CAPS - converter para formato correto
      let textoUrgencia = linhas[i]
      if (textoUrgencia === textoUrgencia.toUpperCase() && textoUrgencia.length > 10) {
        // Se está em ALL CAPS, converter para primeira letra maiúscula
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
    
    // Seção INDICAÇÃO
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
    // Seção TÉCNICA
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
        
        // Verificar se é linha vazia (não adicionar parágrafo)
        if (linhaAnalise.trim() === '') {
          i++
          continue
        }
        
        // Detectar frases do modo comparativo para negrito
        const linhaFormatada = formatarLinhaComparativoCliente(linhaAnalise)
        
        html += `<p class="laudo-texto">${linhaFormatada}</p>`
        
        // NÃO adicionar linha de espaço após "evidencia:" - o próximo parágrafo já terá espaçamento natural
        
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
  tokenUsage?: TokenUsage
  model?: string
}

export function ReportOutput({ report, isGenerating, tokenUsage, model }: ReportOutputProps) {
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

  // Extrair texto puro do HTML formatado
  const plainTextFromHtml = useMemo(() => {
    if (!reportHtml) return ""
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = reportHtml
    return tempDiv.textContent || tempDiv.innerText || ""
  }, [reportHtml])

  // Criar HTML completo com estilos inline para manter formatação ao colar
  const htmlCompleto = useMemo(() => {
    if (!reportHtml) return ""
    
    // Se já tem estilos inline, retorna como está
    if (reportHtml.includes('style=')) {
      return reportHtml
    }
    
    // Adiciona estilos inline baseados nas classes CSS
    let htmlComEstilos = reportHtml
      .replace(/class="laudo-titulo"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; text-align: center; text-transform: uppercase;"')
      .replace(/class="laudo-urgencia"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-style: italic; text-align: center;"')
      .replace(/class="laudo-secao"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; text-transform: uppercase;"')
      .replace(/class="laudo-texto"/g, 'style="font-family: Arial, sans-serif; font-size: 12pt; margin: 0; padding: 0;"')
    
    return htmlComEstilos
  }, [reportHtml])

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

  // Copiar automaticamente quando um novo laudo é gerado
  useEffect(() => {
    // Copia quando a geração termina (isGenerating muda de true para false) e há um novo laudo
    if (!isGenerating && report && reportHtml && htmlCompleto && !report.includes('class="text-destructive"')) {
      // Verifica se é realmente um novo laudo (diferente do anterior)
      if (previousReportRef.current !== report) {
        // Usa a mesma lógica do handleCopyHtml para manter formatação
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
            setTimeout(() => setCopiedHtml(false), 2000)
          } catch (error) {
            // Fallback: se ClipboardItem não for suportado, usa texto simples
            await navigator.clipboard.writeText(plainTextFromHtml)
            setCopiedHtml(true)
            setTimeout(() => setCopiedHtml(false), 2000)
          }
        }
        
        copiarHtmlFormatado()
        previousReportRef.current = report
      }
    }
  }, [report, isGenerating, reportHtml, htmlCompleto, plainTextFromHtml])

  const handleCopyHtml = async () => {
    try {
      // Copia HTML formatado para o clipboard usando ClipboardItem
      // Isso permite que editores que suportam HTML mantenham a formatação
      const htmlBlob = new Blob([htmlCompleto], { type: 'text/html' })
      const plainBlob = new Blob([plainTextFromHtml], { type: 'text/plain' })
      
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': plainBlob,
      })
      
      await navigator.clipboard.write([clipboardItem])
      setCopiedHtml(true)
      setTimeout(() => setCopiedHtml(false), 2000)
    } catch (error) {
      // Fallback: se ClipboardItem não for suportado, usa texto simples
      console.error('Erro ao copiar HTML formatado:', error)
      await navigator.clipboard.writeText(plainTextFromHtml)
      setCopiedHtml(true)
      setTimeout(() => setCopiedHtml(false), 2000)
    }
  }

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(plainText)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  // Verifica se é uma mensagem de erro (começa com tag de erro)
  const isError = report.includes('class="text-destructive"') || report.includes('text-destructive')
  
  // Calcular custo se houver informações de tokens
  const costInfo = useMemo(() => {
    if (!tokenUsage || !model) return null;
    return calcularCusto(tokenUsage.inputTokens, tokenUsage.outputTokens, model);
  }, [tokenUsage, model])

  return (
    <section className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-medium text-muted-foreground">Resultado</h2>
        <AnimatePresence>
          {report && !isError && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyHtml}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {copiedHtml ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copiedHtml ? "Copiado" : "Copiar HTML"}
              </Button>
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
          )}
        </AnimatePresence>
      </div>

      <div className={`min-h-[220px] rounded-xl border p-5 overflow-hidden ${
        isError 
          ? "bg-destructive/5 border-destructive/20" 
          : "bg-muted/30 border-border/40"
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
              <div className="flex gap-1.5">
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-primary/60"
                />
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.15 }}
                  className="w-2 h-2 rounded-full bg-primary/60"
                />
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
                  className="w-2 h-2 rounded-full bg-primary/60"
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
              <span className="text-sm text-muted-foreground/60">O laudo gerado aparecera aqui</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {tokenUsage && costInfo && (
        <div className="mt-5 pt-5 border-t border-border/30">
          <div className="flex items-center justify-end gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Tokens:</span>
              <span className="font-medium text-foreground/70">
                {formatarTokens(tokenUsage.inputTokens)} in + {formatarTokens(tokenUsage.outputTokens)} out = {formatarTokens(tokenUsage.totalTokens)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground/70">{formatarCusto(costInfo.totalCost)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
