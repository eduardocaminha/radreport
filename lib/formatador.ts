const ESTILOS = {
  container: 'font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6;',
  titulo: 'font-weight: bold; text-align: center; margin: 0 0 10px 0;',
  subtitulo: 'font-weight: bold; margin: 15px 0 5px 0;',
  paragrafo: 'margin: 5px 0; text-align: justify;',
};

export function textoParaHTML(texto: string): string {
  if (!texto) return '';
  
  const linhas = texto.split('\n');
  let html = `<div style="${ESTILOS.container}">`;
  
  for (const linha of linhas) {
    const linhaTrimmed = linha.trim();
    
    if (!linhaTrimmed) {
      continue;
    }
    
    // Títulos principais (TOMOGRAFIA COMPUTADORIZADA...)
    if (linhaTrimmed.startsWith('TOMOGRAFIA') || linhaTrimmed.startsWith('TC ')) {
      html += `<p style="${ESTILOS.titulo}">${linhaTrimmed}</p>`;
    }
    // Subtítulos (TÉCNICA:, ANÁLISE:, etc.)
    else if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]+:/.test(linhaTrimmed)) {
      html += `<p style="${ESTILOS.subtitulo}">${linhaTrimmed}</p>`;
    }
    // Linha de urgência
    else if (linhaTrimmed.includes('caráter de urgência') || linhaTrimmed.includes('caráter eletivo')) {
      html += `<p style="${ESTILOS.titulo}">${linhaTrimmed}</p>`;
    }
    // Parágrafos normais
    else {
      html += `<p style="${ESTILOS.paragrafo}">${linhaTrimmed}</p>`;
    }
  }
  
  html += '</div>';
  return html;
}

export function removerFormatacao(texto: string): string {
  if (!texto) return '';
  
  // Remove tags HTML se houver
  let limpo = texto.replace(/<[^>]*>/g, '');
  
  // Remove múltiplas quebras de linha
  limpo = limpo.replace(/\n{3,}/g, '\n\n');
  
  return limpo.trim();
}
