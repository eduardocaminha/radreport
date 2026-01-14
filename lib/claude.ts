import Anthropic from '@anthropic-ai/sdk';
import { montarSystemPrompt } from './prompts';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ResultadoLaudo {
  laudo: string | null;
  sugestoes: string[];
  erro: string | null;
}

function limparRespostaJSON(resposta: string): string {
  // Remove markdown code blocks se existirem
  let limpo = resposta.trim();
  
  // Remove ```json no início
  if (limpo.startsWith('```json')) {
    limpo = limpo.slice(7);
  } else if (limpo.startsWith('```')) {
    limpo = limpo.slice(3);
  }
  
  // Remove ``` no final
  if (limpo.endsWith('```')) {
    limpo = limpo.slice(0, -3);
  }
  
  return limpo.trim();
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function chamarClaudeComRetry(
  systemPrompt: string, 
  texto: string, 
  maxRetries = 3
): Promise<Anthropic.Message> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: texto }
        ],
      });
    } catch (error) {
      lastError = error as Error;
      
      // Verifica se é erro de overload (529) ou rate limit (429)
      const statusCode = (error as { status?: number }).status;
      if (statusCode === 529 || statusCode === 429) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`API sobrecarregada, tentando novamente em ${waitTime/1000}s (tentativa ${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }
      
      // Se não for erro recuperável, lança imediatamente
      throw error;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError;
}

export async function gerarLaudo(
  texto: string, 
  modoPS: boolean, 
  usarPesquisa: boolean = false
): Promise<ResultadoLaudo> {
  const systemPrompt = montarSystemPrompt(modoPS, usarPesquisa);
  
  try {
    const message = await chamarClaudeComRetry(systemPrompt, texto);
    
    // Extrair texto da resposta final
    let respostaRaw = '';
    for (const content of message.content) {
      if (content.type === 'text') {
        respostaRaw = content.text;
        break;
      }
    }
    
    const resposta = limparRespostaJSON(respostaRaw);
    
    // Tentar parsear como JSON
    try {
      const resultado = JSON.parse(resposta);
      return {
        laudo: resultado.laudo || null,
        sugestoes: resultado.sugestoes || [],
        erro: resultado.erro || null,
      };
    } catch {
      // Se não for JSON válido, assume que é o laudo direto
      return {
        laudo: respostaRaw,
        sugestoes: [],
        erro: null,
      };
    }
  } catch (error) {
    const statusCode = (error as { status?: number }).status;
    
    if (statusCode === 529 || statusCode === 429) {
      return {
        laudo: null,
        sugestoes: [],
        erro: 'API do Claude está sobrecarregada. Tente novamente em alguns segundos.',
      };
    }
    
    // Re-lança outros erros
    throw error;
  }
}
