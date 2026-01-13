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

export async function gerarLaudo(texto: string, modoPS: boolean): Promise<ResultadoLaudo> {
  const systemPrompt = montarSystemPrompt(modoPS);
  
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: texto }
    ],
  });
  
  const respostaRaw = message.content[0].type === 'text' ? message.content[0].text : '';
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
}
