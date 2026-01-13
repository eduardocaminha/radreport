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

export async function gerarLaudo(texto: string, modoPS: boolean): Promise<ResultadoLaudo> {
  const systemPrompt = montarSystemPrompt(modoPS);
  
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: texto }
    ],
  });
  
  const resposta = message.content[0].type === 'text' ? message.content[0].text : '';
  
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
      laudo: resposta,
      sugestoes: [],
      erro: null,
    };
  }
}
