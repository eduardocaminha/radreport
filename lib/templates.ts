import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Mascara {
  arquivo: string;
  tipo: string;
  contraste: string;
  urgencia_padrao: boolean;
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
      contraste: data.contraste || '',
      urgencia_padrao: data.urgencia_padrao ?? true,
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

export function formatarTemplatesParaPrompt(): string {
  const mascaras = carregarMascaras();
  const achados = carregarAchados();
  
  let prompt = '## MÁSCARAS DISPONÍVEIS\n\n';
  
  for (const mascara of mascaras) {
    prompt += `### ${mascara.arquivo}\n`;
    prompt += `- Tipo: ${mascara.tipo}\n`;
    prompt += `- Contraste: ${mascara.contraste}\n`;
    prompt += `- Urgência padrão: ${mascara.urgencia_padrao ? 'sim' : 'não'}\n\n`;
    prompt += '```\n' + mascara.conteudo + '\n```\n\n';
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
