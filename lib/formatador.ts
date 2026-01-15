/**
 * Formata texto de laudo em HTML com estilos padronizados
 */
export function formatarLaudoHTML(texto: string): string {
  if (!texto) return '';
  
  // Se já tem HTML formatado, retorna como está
  if (texto.includes('<h1 class="laudo-titulo">') || texto.includes('<p class="laudo-')) {
    return texto;
  }
  
  // Remove HTML existente se houver (caso venha mal formatado)
  let textoLimpo = texto;
  if (texto.includes('<p>') || texto.includes('<br>')) {
    // Remove tags HTML mas preserva quebras de linha
    textoLimpo = texto
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '');
  }
  
  // Remove linhas vazias múltiplas e normaliza quebras
  const linhas = textoLimpo
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  if (linhas.length === 0) return '';
  
  let html = '';
  let i = 0;
  let emAnalise = false;
  
  // Título (primeira linha - geralmente começa com TOMOGRAFIA ou TC)
  if (i < linhas.length) {
    const primeiraLinha = linhas[i];
    const primeiraLinhaUpper = primeiraLinha.toUpperCase();
    
    // Se não começa com TOMOGRAFIA/TC, assume que é título mesmo assim
    if (primeiraLinhaUpper.includes('TOMOGRAFIA') || 
        primeiraLinhaUpper.includes('TC ') ||
        primeiraLinhaUpper.includes('ANGIOTOMOGRAFIA')) {
      html += `<h1 class="laudo-titulo">${primeiraLinha.toUpperCase()}</h1>`;
    } else {
      // Se não parece título, mantém como está mas em maiúsculas
      html += `<h1 class="laudo-titulo">${primeiraLinha.toUpperCase()}</h1>`;
    }
    i++;
  }
  
  // Linha de urgência (se existir)
  if (i < linhas.length) {
    const linha = linhas[i].toLowerCase();
    if (linha.includes('urgência') || linha.includes('urgencia') || linha.includes('eletivo')) {
      html += `<p class="laudo-urgencia">${linhas[i]}</p>`;
      i++;
    }
  }
  
  // Espaçamento após título/urgência
  html += '<br>';
  
  // Processar seções
  while (i < linhas.length) {
    const linha = linhas[i];
    const linhaUpper = linha.toUpperCase().trim();
    
    // Seção TÉCNICA
    if (linhaUpper.startsWith('TÉCNICA:') || linhaUpper.startsWith('TECNICA:')) {
      html += `<p class="laudo-secao">TÉCNICA:</p>`;
      i++;
      emAnalise = false;
      
      // Coletar todo o texto da técnica (pode ter múltiplas linhas)
      const linhasTecnica: string[] = [];
      while (i < linhas.length) {
        const linhaTecnica = linhas[i];
        const linhaTecnicaUpper = linhaTecnica.toUpperCase().trim();
        
        // Se encontrar outra seção, para
        if (linhaTecnicaUpper.startsWith('ANÁLISE:') || 
            linhaTecnicaUpper.startsWith('ANALISE:') ||
            linhaTecnicaUpper.startsWith('OBSERVAÇÃO:') ||
            linhaTecnicaUpper.startsWith('OBSERVACAO:') ||
            linhaTecnicaUpper.startsWith('ACHADOS ADICIONAIS:')) {
          break;
        }
        
        linhasTecnica.push(linhaTecnica);
        i++;
      }
      
      // Formatar técnica: primeira parte normal, problemas técnicos em itálico
      const textoTecnicaCompleto = formatarTextoTecnica(linhasTecnica.join(' '));
      html += `<p class="laudo-texto">${textoTecnicaCompleto}</p>`;
      
      html += '<br>';
    } 
    // Seção ANÁLISE
    else if (linhaUpper.startsWith('ANÁLISE:') || linhaUpper.startsWith('ANALISE:')) {
      html += `<p class="laudo-secao">ANÁLISE:</p>`;
      i++;
      emAnalise = true;
      
      // Todas as linhas seguintes são parágrafos da análise
      while (i < linhas.length) {
        const linhaAnalise = linhas[i];
        const linhaAnaliseUpper = linhaAnalise.toUpperCase().trim();
        
        // Se encontrar outra seção, para
        if (linhaAnaliseUpper.startsWith('TÉCNICA:') || 
            linhaAnaliseUpper.startsWith('TECNICA:') ||
            linhaAnaliseUpper.startsWith('ANÁLISE:') ||
            linhaAnaliseUpper.startsWith('ANALISE:') ||
            linhaAnaliseUpper.startsWith('OBSERVAÇÃO:') ||
            linhaAnaliseUpper.startsWith('OBSERVACAO:') ||
            linhaAnaliseUpper.startsWith('ACHADOS ADICIONAIS:')) {
          break;
        }
        
        // Detectar frases do modo comparativo que precisam estar em negrito
        const linhaFormatada = formatarLinhaComparativo(linhaAnalise);
        
        html += `<p class="laudo-texto">${linhaFormatada}</p>`;
        
        // Adicionar linha de espaço após frase de "evidencia:"
        if (linhaAnaliseUpper.includes('EVIDENCIA:') || linhaAnaliseUpper.includes('EVIDÊNCIA:')) {
          html += '<br>';
        }
        
        i++;
      }
    }
    // Seção Observação
    else if (linhaUpper.startsWith('OBSERVAÇÃO:') || linhaUpper.startsWith('OBSERVACAO:')) {
      html += '<br>'; // Linha de espaço antes
      const textoObservacao = linha.substring(linha.indexOf(':') + 1).trim();
      html += `<p class="laudo-texto"><em>Observação: ${textoObservacao}</em></p>`;
      i++;
    }
    // Seção Achados adicionais
    else if (linhaUpper.startsWith('ACHADOS ADICIONAIS:')) {
      html += '<br>'; // Linha de espaço antes
      const textoAchados = linha.substring(linha.indexOf(':') + 1).trim();
      html += `<p class="laudo-texto"><em>Achados adicionais: ${textoAchados}</em></p>`;
      i++;
    }
    // Linha normal - se já estamos em análise, trata como parágrafo
    else if (emAnalise) {
      html += `<p class="laudo-texto">${linha}</p>`;
      i++;
    }
    // Linha antes de qualquer seção (não deveria acontecer, mas trata como texto)
    else {
      html += `<p class="laudo-texto">${linha}</p>`;
      i++;
    }
  }
  
  return html;
}

/**
 * Formata linha da análise detectando frases do modo comparativo para negrito
 */
function formatarLinhaComparativo(linha: string): string {
  const linhaUpper = linha.toUpperCase();
  
  // Detectar "Exame comparativo com a tomografia de [data] evidencia:"
  if (linhaUpper.includes('EXAME COMPARATIVO') && linhaUpper.includes('EVIDENCIA:')) {
    // Separar a parte "Exame comparativo... evidencia:" do resto
    const indiceEvidencia = linhaUpper.indexOf('EVIDENCIA:');
    const parteInicial = linha.substring(0, linha.toLowerCase().indexOf('evidencia:') + 'evidencia:'.length);
    const parteFinal = linha.substring(linha.toLowerCase().indexOf('evidencia:') + 'evidencia:'.length).trim();
    
    let resultado = `<strong>${parteInicial}</strong>`;
    if (parteFinal) {
      resultado += ` ${parteFinal}`;
    }
    return resultado;
  }
  
  // Detectar "Restante permanece sem alterações evolutivas significativas:"
  if (linhaUpper.includes('RESTANTE PERMANECE SEM ALTERAÇÕES EVOLUTIVAS SIGNIFICATIVAS:') || 
      linhaUpper.includes('RESTANTE PERMANECE SEM ALTERACOES EVOLUTIVAS SIGNIFICATIVAS:')) {
    // Separar a parte da frase até os dois pontos do resto
    const indiceDoisPontos = linha.indexOf(':');
    if (indiceDoisPontos !== -1) {
      const parteInicial = linha.substring(0, indiceDoisPontos + 1);
      const parteFinal = linha.substring(indiceDoisPontos + 1).trim();
      
      let resultado = `<strong>${parteInicial}</strong>`;
      if (parteFinal) {
        resultado += ` ${parteFinal}`;
      }
      return resultado;
    }
    return `<strong>${linha}</strong>`;
  }
  
  // Se não for frase comparativa, retorna como está
  return linha;
}

/**
 * Formata texto da técnica: palavras estrangeiras e problemas técnicos em itálico
 */
function formatarTextoTecnica(texto: string): string {
  // Palavras estrangeiras comuns em laudos
  const palavrasEstrangeiras = [
    'multislice',
    'multidetector',
    'helical',
    'spiral',
    'contrast',
    'enhancement',
    'attenuation',
    'hounsfield',
    'mip',
    'mpr',
    'vr',
    '3d',
  ];
  
  let resultado = texto;
  
  // Aplicar itálico a palavras estrangeiras primeiro
  for (const palavra of palavrasEstrangeiras) {
    const regex = new RegExp(`\\b${palavra}\\b`, 'gi');
    resultado = resultado.replace(regex, (match) => `<em>${match}</em>`);
  }
  
  // Detectar problemas técnicos - palavras-chave que indicam problemas
  const palavrasProblemaTecnico = [
    'artefato',
    'artefatos',
    'limitação',
    'limitações',
    'problema',
    'problemas',
    'dificuldade',
    'dificuldades',
    'movimento',
    'ruído',
    'ruido',
    'noise',
    'limitando',
    'limitado',
    'artefact',
    'artifacts',
  ];
  
  // Encontrar onde começa o problema técnico (após vírgula ou ponto)
  // E aplicar itálico a partir daí
  let indiceProblema = -1;
  const textoLower = resultado.toLowerCase();
  
  for (const palavra of palavrasProblemaTecnico) {
    const indice = textoLower.indexOf(palavra.toLowerCase());
    if (indice !== -1 && (indiceProblema === -1 || indice < indiceProblema)) {
      indiceProblema = indice;
    }
  }
  
  // Se encontrou problema técnico, aplicar itálico a partir da vírgula/ponto anterior
  if (indiceProblema !== -1) {
    // Procurar vírgula ou ponto antes do problema
    const antesProblema = resultado.substring(0, indiceProblema);
    const depoisProblema = resultado.substring(indiceProblema);
    
    // Encontrar última vírgula ou ponto antes do problema
    const ultimaVirgula = antesProblema.lastIndexOf(',');
    const ultimoPonto = antesProblema.lastIndexOf('.');
    const divisor = Math.max(ultimaVirgula, ultimoPonto);
    
    if (divisor !== -1) {
      // Separar em parte normal e parte problema (em itálico)
      const parteNormal = resultado.substring(0, divisor + 1);
      const parteProblema = resultado.substring(divisor + 1).trim();
      
      // Aplicar itálico à parte do problema, mas preservar itálico já aplicado
      // Remover tags <em> temporariamente para aplicar novo
      const parteProblemaSemItalico = parteProblema.replace(/<em>/g, '').replace(/<\/em>/g, '');
      resultado = parteNormal + ' ' + `<em>${parteProblemaSemItalico}</em>`;
    } else {
      // Se não há vírgula/ponto antes, aplicar itálico a partir do problema
      const antesProblemaLimpo = antesProblema.trim();
      const parteProblema = depoisProblema.replace(/<em>/g, '').replace(/<\/em>/g, '');
      resultado = antesProblemaLimpo + ' ' + `<em>${parteProblema}</em>`;
    }
  }
  
  return resultado;
}

/**
 * Formata texto colocando palavras estrangeiras em itálico (função legada - mantida para compatibilidade)
 */
function formatarTextoComItalico(texto: string): string {
  return formatarTextoTecnica(texto);
}

/**
 * Remove formatação HTML e retorna texto plano
 */
export function removerFormatacao(texto: string): string {
  if (!texto) return '';
  
  // Remove tags HTML se houver
  let limpo = texto.replace(/<[^>]*>/g, '');
  
  // Remove múltiplas quebras de linha
  limpo = limpo.replace(/\n{3,}/g, '\n\n');
  
  return limpo.trim();
}
