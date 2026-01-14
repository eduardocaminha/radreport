import Anthropic from '@anthropic-ai/sdk';
import { montarSystemPrompt } from './prompts';
import { formatarLaudoHTML } from './formatador';

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

async function pesquisarRadiopaedia(termo: string): Promise<string> {
  try {
    // Busca no Google por "radiopaedia [termo]"
    const query = `radiopaedia ${termo}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    // Fazer requisição para buscar resultados
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      return `Não foi possível buscar informações sobre "${termo}" no Radiopaedia.`;
    }
    
    const data = await response.json();
    const html = data.contents || '';
    
    // Extrair links do Radiopaedia dos resultados
    const radiopaediaLinks = html.match(/https?:\/\/radiopaedia\.org\/[^\s"<>]+/gi) || [];
    
    if (radiopaediaLinks.length === 0) {
      return `Nenhum resultado encontrado no Radiopaedia para "${termo}".`;
    }
    
    // Pegar o primeiro link do Radiopaedia
    const radiopaediaUrl = radiopaediaLinks[0];
    
    // Buscar conteúdo da página do Radiopaedia
    const pageResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(radiopaediaUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!pageResponse.ok) {
      return `Encontrado link do Radiopaedia mas não foi possível acessar: ${radiopaediaUrl}`;
    }
    
    const pageData = await pageResponse.json();
    const pageHtml = pageData.contents || '';
    
    // Extrair texto relevante (títulos, descrições, listas)
    // Remover scripts e styles
    let text = pageHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limitar a 2000 caracteres para não sobrecarregar
    if (text.length > 2000) {
      text = text.substring(0, 2000) + '...';
    }
    
    return `Informações do Radiopaedia sobre "${termo}" (${radiopaediaUrl}):\n${text}`;
  } catch (error) {
    console.error('Erro ao pesquisar Radiopaedia:', error);
    return `Erro ao buscar informações no Radiopaedia para "${termo}".`;
  }
}

async function chamarClaudeComRetry(
  systemPrompt: string, 
  texto: string, 
  usarPesquisa: boolean,
  maxRetries = 3
): Promise<Anthropic.Message> {
  let lastError: Error | null = null;
  
  // Tool para pesquisa no Radiopaedia
  const tools = usarPesquisa ? [
    {
      name: 'pesquisar_radiopaedia',
      description: 'Pesquisa informações sobre achados radiológicos no site Radiopaedia.org. Use esta ferramenta quando precisar de informações detalhadas sobre alterações descritas no laudo para fazer sugestões mais precisas. Busca no Google por "radiopaedia [termo]" e acessa o primeiro resultado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          termo: {
            type: 'string',
            description: 'Termo de busca relacionado ao achado radiológico (ex: "humeral fracture", "appendicitis", "pneumonia"). Use termos em inglês para melhor resultado no Radiopaedia.',
          },
        },
        required: ['termo'],
      },
    },
  ] : undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: texto }
      ];

      let currentMessage = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools,
      });

      // Processar tool calls se houver
      while (currentMessage.stop_reason === 'tool_use' && currentMessage.content) {
        const toolUses = currentMessage.content.filter(
          (item) => item.type === 'tool_use'
        ) as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>;

        if (toolUses.length === 0) break;

        // Adicionar tool use à conversa
        messages.push({
          role: 'assistant',
          content: currentMessage.content,
        });

        // Preparar resultados das tools
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUses) {
          if (toolUse.name === 'pesquisar_radiopaedia') {
            const termo = toolUse.input.termo as string;
            console.log(`Pesquisando Radiopaedia para: ${termo}`);
            
            const resultado = await pesquisarRadiopaedia(termo);
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultado,
            });
          }
        }

        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continuar a conversa
        currentMessage = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages,
          tools,
        });
      }

      return currentMessage;
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
  const systemPrompt = montarSystemPrompt(modoPS, usarPesquisa, texto);
  
  try {
    const message = await chamarClaudeComRetry(systemPrompt, texto, usarPesquisa);
    
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
      const laudoTexto = resultado.laudo || null;
      
      // Formatar laudo em HTML se existir
      const laudoFormatado = laudoTexto ? formatarLaudoHTML(laudoTexto) : null;
      
      return {
        laudo: laudoFormatado,
        sugestoes: resultado.sugestoes || [],
        erro: resultado.erro || null,
      };
    } catch {
      // Se não for JSON válido, assume que é o laudo direto e formata
      const laudoFormatado = respostaRaw ? formatarLaudoHTML(respostaRaw) : null;
      
      return {
        laudo: laudoFormatado,
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
