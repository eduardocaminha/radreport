import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Mascara {
  arquivo: string;
  tipo: string;
  subtipo?: string;
  contraste: string;
  urgencia_padrao: boolean;
  palavras_chave?: string[];
  conteudo: string;
}

export interface Achado {
  arquivo: string;
  regiao: string;
  palavras_chave: string[];
  requer?: string[];
  opcional?: string[];
  medida_default?: string;
  conteudo: string;
}

export interface ContextoExame {
  tipo?: string;
  subtipo?: string;
  contraste?: 'com' | 'sem';
  regioesRelevantes?: string[];
}

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

export function carregarMascaras(): Mascara[] {
  const mascarasDir = path.join(TEMPLATES_DIR, 'mascaras');
  
  if (!fs.existsSync(mascarasDir)) {
    return [];
  }
  
  const arquivos = fs.readdirSync(mascarasDir).filter(f => f.endsWith('.md'));
  
  return arquivos.map(arquivo => {
    const conteudoCompleto = fs.readFileSync(path.join(mascarasDir, arquivo), 'utf-8');
    const { data, content } = matter(conteudoCompleto);
    
    return {
      arquivo,
      tipo: data.tipo || '',
      subtipo: data.subtipo,
      contraste: data.contraste || '',
      urgencia_padrao: data.urgencia_padrao ?? true,
      palavras_chave: data.palavras_chave || [],
      conteudo: content.trim(),
    };
  });
}

export function carregarAchados(): Achado[] {
  const achadosDir = path.join(TEMPLATES_DIR, 'achados');
  
  if (!fs.existsSync(achadosDir)) {
    return [];
  }
  
  const achados: Achado[] = [];
  
  function lerDiretorio(dir: string) {
    const itens = fs.readdirSync(dir);
    
    for (const item of itens) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        lerDiretorio(itemPath);
      } else if (item.endsWith('.md')) {
        const conteudoCompleto = fs.readFileSync(itemPath, 'utf-8');
        const { data, content } = matter(conteudoCompleto);
        const relativePath = path.relative(achadosDir, itemPath);
        
        achados.push({
          arquivo: relativePath,
          regiao: data.regiao || '',
          palavras_chave: data.palavras_chave || [],
          requer: data.requer,
          opcional: data.opcional,
          medida_default: data.medida_default,
          conteudo: content.trim(),
        });
      }
    }
  }
  
  lerDiretorio(achadosDir);
  return achados;
}

export function identificarContextoExame(texto: string): ContextoExame {
  const textoLower = texto.toLowerCase();
  const contexto: ContextoExame = {};
  
  // Identificar tipo de exame
  if (textoLower.match(/\b(tc|tomo|tomografia)\s*(abdome|abd[oô]men|abdominal)\b/)) {
    contexto.tipo = 'tc-abdome';
    contexto.regioesRelevantes = ['rins', 'apendice', 'rim', 'pelve', 'bexiga', 'colon', 'intestino', 'figado', 'vesicula-biliar'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(tor[áa]x|t[óo]rax)\b/)) {
    contexto.tipo = 'tc-torax';
    contexto.regioesRelevantes = [];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(cr[âa]nio|cranio)\b/)) {
    contexto.tipo = 'tc-cranio';
    contexto.regioesRelevantes = [];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(mast[oó]ides|mastoides)\b/)) {
    contexto.tipo = 'tc-mastoides';
    contexto.regioesRelevantes = ['mastoides'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(coluna|vertebral)\s*(cervical)\b/)) {
    contexto.tipo = 'tc-coluna-cervical';
    contexto.regioesRelevantes = ['coluna-cervical'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(coluna|vertebral)\s*(tor[áa]cica|toracica)\b/)) {
    contexto.tipo = 'tc-coluna-toracica';
    contexto.regioesRelevantes = ['coluna-toracica'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(coluna|vertebral)\s*(lombar)\b/)) {
    contexto.tipo = 'tc-coluna-lombar';
    contexto.regioesRelevantes = ['coluna-lombar'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(pesco[çc]o|pescoco|colo)\b/)) {
    contexto.tipo = 'tc-pescoco';
    contexto.regioesRelevantes = ['pescoco'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(seios|face)\b/)) {
    contexto.tipo = 'tc-seios-face';
    contexto.regioesRelevantes = ['seios-face'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(pelve|p[ée]lvis)\b/)) {
    contexto.tipo = 'tc-pelve';
    contexto.regioesRelevantes = ['pelve', 'bexiga'];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(bacia)\b/)) {
    contexto.tipo = 'tc-bacia';
    contexto.regioesRelevantes = [];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(quadril)\b/)) {
    contexto.tipo = 'tc-quadril';
    contexto.regioesRelevantes = [];
  } else if (textoLower.match(/\b(tc|tomo|tomografia)\s*(joelho)\b/)) {
    contexto.tipo = 'tc-joelho';
    contexto.regioesRelevantes = [];
  } else if (textoLower.match(/\b(angio|angiotomografia)\s*(aorta)\b/)) {
    contexto.tipo = 'angio-aorta';
    contexto.regioesRelevantes = [];
  }
  
  // Identificar subtipos
  if (textoLower.match(/\b(tep|tromboembolismo|embolia)\s*(pulmonar)?\b/)) {
    contexto.subtipo = 'tep';
    contexto.tipo = 'tc-torax';
  } else if (textoLower.match(/\b(idoso|idosa)\b/)) {
    contexto.subtipo = 'idoso';
    if (!contexto.tipo) contexto.tipo = 'tc-cranio';
  }
  
  // Identificar contraste
  if (textoLower.match(/\b(com|contrastado|contraste)\b/)) {
    contexto.contraste = 'com';
  } else if (textoLower.match(/\b(sem|sem\s+contraste)\b/)) {
    contexto.contraste = 'sem';
  }
  
  return contexto;
}

export function filtrarTemplatesRelevantes(contexto: ContextoExame): {
  mascaras: Mascara[];
  achados: Achado[];
} {
  const todasMascaras = carregarMascaras();
  const todosAchados = carregarAchados();
  
  // Filtrar máscaras
  let mascarasFiltradas = todasMascaras;
  
  if (contexto.tipo) {
    mascarasFiltradas = todasMascaras.filter(m => {
      // Match exato do tipo
      if (m.tipo === contexto.tipo) {
        // Se tem subtipo no contexto, priorizar máscaras com mesmo subtipo
        if (contexto.subtipo) {
          return m.subtipo === contexto.subtipo;
        }
        // Se tem contraste no contexto, priorizar máscaras com mesmo contraste
        if (contexto.contraste) {
          return m.contraste === contexto.contraste;
        }
        return true;
      }
      // Também incluir máscara genérica de musculoesquelética se não encontrou específica
      if (m.tipo === 'tc-musculoesqueletica' && !todasMascaras.some(m2 => m2.tipo === contexto.tipo)) {
        return true;
      }
      return false;
    });
    
    // Se não encontrou match exato, incluir todas para segurança
    if (mascarasFiltradas.length === 0) {
      mascarasFiltradas = todasMascaras;
    }
  }
  
  // Filtrar achados por regiões relevantes
  let achadosFiltrados = todosAchados;
  
  if (contexto.regioesRelevantes && contexto.regioesRelevantes.length > 0) {
    achadosFiltrados = todosAchados.filter(a => 
      contexto.regioesRelevantes!.some(regiao => 
        a.regiao.includes(regiao) || regiao.includes(a.regiao)
      )
    );
    
    // Sempre incluir achados gerais (sem região específica ou de regiões comuns)
    const achadosGerais = todosAchados.filter(a => 
      !a.regiao || 
      ['rins', 'ureteres'].includes(a.regiao) // Achados comuns que podem aparecer em vários exames
    );
    
    achadosFiltrados = [...new Set([...achadosFiltrados, ...achadosGerais])];
    
    // Se for tc-abdome, também incluir achados de pelve (abdome contempla pelve)
    if (contexto.tipo === 'tc-abdome') {
      const achadosPelve = todosAchados.filter(a => 
        a.regiao === 'pelve' || a.regiao === 'bexiga'
      );
      achadosFiltrados = [...new Set([...achadosFiltrados, ...achadosPelve])];
    }
  }
  
  return {
    mascaras: mascarasFiltradas,
    achados: achadosFiltrados,
  };
}

export function formatarTemplatesParaPrompt(contexto?: ContextoExame): string {
  const { mascaras, achados } = contexto 
    ? filtrarTemplatesRelevantes(contexto)
    : { mascaras: carregarMascaras(), achados: carregarAchados() };
  
  let prompt = '## MÁSCARAS DISPONÍVEIS\n\n';
  
  for (const mascara of mascaras) {
    prompt += `### ${mascara.arquivo}\n`;
    prompt += `- Tipo: ${mascara.tipo}\n`;
    if (mascara.subtipo) prompt += `- Subtipo: ${mascara.subtipo}\n`;
    prompt += `- Contraste: ${mascara.contraste}\n`;
    prompt += `- Urgência padrão: ${mascara.urgencia_padrao ? 'sim' : 'não'}\n`;
    if (mascara.palavras_chave && mascara.palavras_chave.length > 0) {
      prompt += `- Palavras-chave: ${mascara.palavras_chave.join(', ')}\n`;
    }
    prompt += '\n```\n' + mascara.conteudo + '\n```\n\n';
  }
  
  prompt += '## ACHADOS DISPONÍVEIS\n\n';
  
  for (const achado of achados) {
    prompt += `### ${achado.arquivo}\n`;
    prompt += `- Região: ${achado.regiao}\n`;
    prompt += `- Palavras-chave: ${achado.palavras_chave.join(', ')}\n`;
    if (achado.requer) prompt += `- Campos obrigatórios: ${achado.requer.join(', ')}\n`;
    if (achado.opcional) prompt += `- Campos opcionais: ${achado.opcional.join(', ')}\n`;
    if (achado.medida_default) prompt += `- Medida padrão: ${achado.medida_default}\n`;
    prompt += '\n```\n' + achado.conteudo + '\n```\n\n';
  }
  
  return prompt;
}
