/**
 * Formata texto de laudo em HTML com estilos padronizados
 */
export function formatarLaudoHTML(texto: string): string {
  if (!texto) return '';
  
  // Se já tem HTML formatado, retorna como está
  if (texto.includes('<h1 class="laudo-titulo">') || texto.includes('<p class="laudo-')) {
    return texto;
  }
  
  // Remove linhas vazias múltiplas e normaliza quebras
  const linhas = texto
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
      
      // Próxima linha é o texto da técnica
      if (i < linhas.length) {
        const textoTecnica = formatarTextoComItalico(linhas[i]);
        html += `<p class="laudo-texto">${textoTecnica}</p>`;
        i++;
      }
      
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
            linhaAnaliseUpper.startsWith('ANALISE:')) {
          break;
        }
        
        html += `<p class="laudo-texto">${linhaAnalise}</p>`;
        i++;
      }
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
 * Formata texto colocando palavras estrangeiras em itálico
 */
function formatarTextoComItalico(texto: string): string {
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
  
  for (const palavra of palavrasEstrangeiras) {
    const regex = new RegExp(`\\b${palavra}\\b`, 'gi');
    resultado = resultado.replace(regex, (match) => `<em>${match}</em>`);
  }
  
  return resultado;
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
