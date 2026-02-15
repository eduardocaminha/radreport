import Anthropic from '@anthropic-ai/sdk';
import { montarSystemPrompt } from './prompts';
import { formatarLaudoHTML } from './formatador';
import type { TokenUsage } from './tokens';
import { criarCatalogoResumido, buscarTemplatesPorArquivos, identificarContextoExame, loadTemplateFromDB } from './templates';

// Default client using env var; per-user clients created on demand
const defaultClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getClient(userApiKey?: string): Anthropic {
  if (userApiKey) {
    return new Anthropic({ apiKey: userApiKey });
  }
  return defaultClient;
}

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export interface ResultadoLaudo {
  laudo: string | null;
  sugestoes: string[];
  erro: string | null;
  tokenUsage?: TokenUsage;
  model?: string;
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

const METADATA_DELIMITER = '---METADATA---';

function parseStreamedResponse(text: string): {
  laudo: string | null;
  sugestoes: string[];
  erro: string | null;
} {
  const delimIdx = text.indexOf(METADATA_DELIMITER);

  if (delimIdx !== -1) {
    const laudoText = text.substring(0, delimIdx).trim();
    const metadataText = text.substring(delimIdx + METADATA_DELIMITER.length).trim();

    try {
      const metadata = JSON.parse(limparRespostaJSON(metadataText));
      return {
        laudo: laudoText || null,
        sugestoes: metadata.sugestoes || [],
        erro: metadata.erro || null,
      };
    } catch {
      return { laudo: laudoText || null, sugestoes: [], erro: null };
    }
  }

  // Fallback: tentar parsear como JSON antigo
  try {
    const limpo = limparRespostaJSON(text);
    const resultado = JSON.parse(limpo);
    return {
      laudo: resultado.laudo || null,
      sugestoes: resultado.sugestoes || [],
      erro: resultado.erro || null,
    };
  } catch {
    // Texto plano sem metadata
    return { laudo: text.trim() || null, sugestoes: [], erro: null };
  }
}

function getRadiopaediaTools(): Anthropic.Tool[] {
  return [{
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
  }];
}

async function resolveToolsNonStreaming(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  maxRetries = 3,
  config?: { apiKey?: string; model?: string }
): Promise<void> {
  const client = getClient(config?.apiKey);
  const model = config?.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let response = await client.messages.create({
        model, max_tokens: 4096, system: systemPrompt,
        messages, tools,
      });

      while (response.stop_reason === 'tool_use' && response.content) {
        const toolUses = response.content.filter(
          (item) => item.type === 'tool_use'
        ) as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>;

        if (toolUses.length === 0) break;

        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUses) {
          if (toolUse.name === 'pesquisar_radiopaedia') {
            const termo = toolUse.input.termo as string;
            console.log(`Pesquisando Radiopaedia para: ${termo}`);
            const resultado = await pesquisarRadiopaedia(termo);
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: resultado });
          }
        }

        messages.push({ role: 'user', content: toolResults });

        response = await client.messages.create({
          model, max_tokens: 4096, system: systemPrompt,
          messages, tools,
        });
      }

      // Tools resolvidas — NÃO adicionamos a resposta final às messages
      // para que a chamada streaming gere texto fresco
      return;
    } catch (error) {
      const statusCode = (error as { status?: number }).status;
      if ((statusCode === 529 || statusCode === 429) && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`API sobrecarregada (tools), retry em ${waitTime/1000}s`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
}

type ReportMode = 'ps' | 'eletivo' | 'comparativo';

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Classify report mode from user text using regex first, Haiku LLM fallback.
 * Returns: 'ps' | 'eletivo' | 'comparativo'
 */
export async function classificarModo(texto: string): Promise<ReportMode> {
  const lower = texto.toLowerCase();

  // Layer A: regex — high-confidence patterns
  if (/\b(ps|pronto.?socorro|urg[eê]ncia|emerg[eê]ncia)\b/.test(lower)) {
    return 'ps';
  }
  if (/\b(comparativ[oa]|compar[ae]|controle)\b/.test(lower)) {
    return 'comparativo';
  }

  // Short text with no mode keywords → eletivo (most common case)
  if (texto.length < 500) {
    return 'eletivo';
  }

  // Layer B: Long text without explicit keywords — could be a pasted prior report.
  // Use cheap LLM to classify.
  try {
    const msg = await defaultClient.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 10,
      system: 'Responda APENAS com uma palavra: ps, eletivo, ou comparativo.',
      messages: [{
        role: 'user',
        content: `Classifique o modo deste texto de laudo radiológico:
- "ps" se mencionar urgência, pronto-socorro, emergência
- "comparativo" se contiver um laudo anterior colado para comparação
- "eletivo" caso contrário (padrão)

Texto:
${texto.slice(0, 1000)}`,
      }],
    });

    const raw = (msg.content[0] as { type: 'text'; text: string }).text.trim().toLowerCase();
    if (raw === 'ps' || raw === 'comparativo') return raw;
    return 'eletivo';
  } catch (err) {
    console.error('[classificarModo] Haiku fallback failed:', err);
    return 'eletivo';
  }
}

interface SelecaoTemplates {
  mascara: string;
  achados: string[];
  modo?: ReportMode;
}

async function selecionarTemplates(
  texto: string,
  catalogo: ReturnType<typeof criarCatalogoResumido>
): Promise<SelecaoTemplates> {
  const catalogoTexto = `
## MÁSCARAS DISPONÍVEIS (escolha UMA):

${catalogo.mascaras.map((m, i) => {
  let linha = `${i + 1}. ${m.arquivo}`;
  linha += ` - Tipo: ${m.tipo}`;
  if (m.subtipo) linha += `, Subtipo: ${m.subtipo}`;
  linha += `, Contraste: ${m.contraste}`;
  if (m.palavras_chave && m.palavras_chave.length > 0) {
    linha += `, Palavras-chave: ${m.palavras_chave.join(', ')}`;
  }
  return linha;
}).join('\n')}

## ACHADOS DISPONÍVEIS (escolha os relevantes, pode ser zero ou mais):

${catalogo.achados.map((a, i) => {
  let linha = `${i + 1}. ${a.arquivo}`;
  linha += ` - Região: ${a.regiao}`;
  linha += `, Palavras-chave: ${a.palavras_chave.join(', ')}`;
  if (a.requer && a.requer.length > 0) {
    linha += `, Requer: ${a.requer.join(', ')}`;
  }
  return linha;
}).join('\n')}
`;

  const promptSelecao = `Você é um assistente que analisa texto ditado de laudos de tomografia e seleciona quais templates usar, e também classifica o modo do laudo.

Analise o texto abaixo e retorne APENAS um JSON válido no formato:
{
  "mascara": "nome-do-arquivo.md",
  "achados": ["achado1.md", "achado2.md"],
  "modo": "eletivo"
}

REGRAS:
1. Escolha EXATAMENTE UMA máscara baseada no tipo de exame e contraste mencionado
2. Escolha zero ou mais achados baseados nas alterações mencionadas
3. Use apenas os arquivos listados no catálogo
4. Se não encontrar achado relevante, deixe o array "achados" vazio
5. Classifique o "modo":
   - "ps" se o texto mencionar urgência, pronto-socorro, emergência, ps
   - "comparativo" se o texto contiver um laudo anterior colado ou mencionar comparativo/controle
   - "eletivo" caso contrário (padrão)

TEXTO DITADO:
${texto}

${catalogoTexto}

Retorne APENAS o JSON, sem explicações adicionais.`;

  try {
    const message = await defaultClient.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 1024,
      system: 'Você é um assistente que retorna apenas JSON válido, sem explicações.',
      messages: [
        { role: 'user', content: promptSelecao }
      ],
    });

    let respostaRaw = '';
    for (const content of message.content) {
      if (content.type === 'text') {
        respostaRaw = content.text;
        break;
      }
    }

    const respostaLimpa = limparRespostaJSON(respostaRaw);
    const resultado = JSON.parse(respostaLimpa) as SelecaoTemplates;

    // Validar que a máscara foi escolhida
    if (!resultado.mascara) {
      throw new Error('Nenhuma máscara foi selecionada');
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao selecionar templates:', error);
    // Fallback: retornar primeira máscara e nenhum achado
    return {
      mascara: catalogo.mascaras[0]?.arquivo || '',
      achados: [],
    };
  }
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
  maxRetries = 3,
  config?: { apiKey?: string; model?: string }
): Promise<Anthropic.Message> {
  const client = getClient(config?.apiKey);
  const modelId = config?.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
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
        model: modelId, max_tokens: 4096, system: systemPrompt,
        messages, tools,
      });

      // Processar tool calls se houver
      while (currentMessage.stop_reason === 'tool_use' && currentMessage.content) {
        const toolUses = currentMessage.content.filter(
          (item) => item.type === 'tool_use'
        ) as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>;

        if (toolUses.length === 0) break;

        messages.push({ role: 'assistant', content: currentMessage.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUses) {
          if (toolUse.name === 'pesquisar_radiopaedia') {
            const termo = toolUse.input.termo as string;
            console.log(`Pesquisando Radiopaedia para: ${termo}`);
            const resultado = await pesquisarRadiopaedia(termo);
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: resultado });
          }
        }

        messages.push({ role: 'user', content: toolResults });

        currentMessage = await client.messages.create({
          model: modelId, max_tokens: 4096, system: systemPrompt,
          messages, tools,
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

export async function gerarLaudoStream(
  texto: string,
  usarPesquisa: boolean = false,
  config?: { apiKey?: string; model?: string },
  templateId?: number
): Promise<ReadableStream<Uint8Array>> {
  const usarOtimizacao = process.env.ENABLE_TEMPLATE_OPTIMIZATION === 'true';

  let systemPrompt: string;
  let modo: ReportMode;

  if (templateId) {
    // Load template from database + classify mode separately
    const [dbTemplates, inferredMode] = await Promise.all([
      loadTemplateFromDB(templateId),
      classificarModo(texto),
    ]);
    modo = inferredMode;
    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto, dbTemplates);
  } else if (usarOtimizacao) {
    const contexto = identificarContextoExame(texto);
    const catalogo = criarCatalogoResumido(contexto);
    const selecao = await selecionarTemplates(texto, catalogo);
    modo = selecao.modo || await classificarModo(texto);
    const templatesEscolhidos = buscarTemplatesPorArquivos([selecao.mascara, ...selecao.achados]);
    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto, templatesEscolhidos);
  } else {
    modo = await classificarModo(texto);
    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto);
  }

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: texto }];
  const encoder = new TextEncoder();

  const streamClient = getClient(config?.apiKey);
  const streamModel = config?.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  // Resolver tools se necessário (non-streaming)
  if (usarPesquisa) {
    const tools = getRadiopaediaTools();
    await resolveToolsNonStreaming(systemPrompt, messages, tools, 3, config);
  }

  return new ReadableStream({
    async start(controller) {
      try {
        const messageStream = streamClient.messages.stream({
          model: streamModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
          // Sem tools — força geração de texto
        });

        let accumulatedText = '';
        let buffer = '';
        let metadataStarted = false;

        messageStream.on('text', (textDelta) => {
          accumulatedText += textDelta;

          if (metadataStarted) return;

          buffer += textDelta;

          // Detectar delimitador
          const delimIdx = buffer.indexOf(METADATA_DELIMITER);
          if (delimIdx !== -1) {
            metadataStarted = true;
            const toEmit = buffer.substring(0, delimIdx);
            if (toEmit.trimEnd()) {
              controller.enqueue(encoder.encode(
                JSON.stringify({ type: 'text_delta', text: toEmit }) + '\n'
              ));
            }
            buffer = '';
            return;
          }

          // Buffer de segurança para delimitador parcial
          if (buffer.length > METADATA_DELIMITER.length) {
            const safe = buffer.substring(0, buffer.length - METADATA_DELIMITER.length);
            buffer = buffer.substring(buffer.length - METADATA_DELIMITER.length);
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: 'text_delta', text: safe }) + '\n'
            ));
          }
        });

        const finalMsg = await messageStream.finalMessage();

        // Flush buffer restante
        if (!metadataStarted && buffer.trimEnd()) {
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'text_delta', text: buffer }) + '\n'
          ));
        }

        // Parsear metadata
        const parsed = parseStreamedResponse(accumulatedText);

        const tokenUsage: TokenUsage = {
          inputTokens: finalMsg.usage.input_tokens,
          outputTokens: finalMsg.usage.output_tokens,
          totalTokens: finalMsg.usage.input_tokens + finalMsg.usage.output_tokens,
        };

        controller.enqueue(encoder.encode(
          JSON.stringify({
            type: 'done',
            sugestoes: parsed.sugestoes,
            erro: parsed.erro,
            tokenUsage,
            model: finalMsg.model,
          }) + '\n'
        ));
        controller.close();
      } catch (error) {
        const statusCode = (error as { status?: number }).status;
        let message = 'Erro ao processar. Tente novamente';

        if (statusCode === 529 || statusCode === 429) {
          message = 'API do Claude está sobrecarregada. Tente novamente em alguns segundos.';
        } else if (statusCode === 401) {
          message = 'Chave da API inválida';
        }

        controller.enqueue(encoder.encode(
          JSON.stringify({ type: 'error', message }) + '\n'
        ));
        controller.close();
      }
    }
  });
}

export async function gerarLaudo(
  texto: string,
  usarPesquisa: boolean = false,
  config?: { apiKey?: string; model?: string },
  templateId?: number
): Promise<ResultadoLaudo> {
  const usarOtimizacao = process.env.ENABLE_TEMPLATE_OPTIMIZATION === 'true';

  let systemPrompt: string;
  let templatesEscolhidos: { mascaras: any[], achados: any[] } | null = null;
  let modo: ReportMode;

  if (templateId) {
    const [dbTemplates, inferredMode] = await Promise.all([
      loadTemplateFromDB(templateId),
      classificarModo(texto),
    ]);
    modo = inferredMode;
    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto, dbTemplates);
  } else if (usarOtimizacao) {
    const contexto = identificarContextoExame(texto);
    const catalogo = criarCatalogoResumido(contexto);
    const selecao = await selecionarTemplates(texto, catalogo);
    modo = selecao.modo || await classificarModo(texto);

    templatesEscolhidos = buscarTemplatesPorArquivos([
      selecao.mascara,
      ...selecao.achados,
    ]);

    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto, templatesEscolhidos);
  } else {
    modo = await classificarModo(texto);
    systemPrompt = montarSystemPrompt(modo === 'ps', modo === 'comparativo', usarPesquisa, texto);
  }
  
  try {
    const message = await chamarClaudeComRetry(systemPrompt, texto, usarPesquisa, 3, config);
    
    // Extrair texto da resposta final
    let respostaRaw = '';
    for (const content of message.content) {
      if (content.type === 'text') {
        respostaRaw = content.text;
        break;
      }
    }
    
    const parsed = parseStreamedResponse(respostaRaw);
    const laudoFormatado = parsed.laudo ? formatarLaudoHTML(parsed.laudo) : null;

    const tokenUsage: TokenUsage | undefined = message.usage ? {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    } : undefined;

    return {
      laudo: laudoFormatado,
      sugestoes: parsed.sugestoes,
      erro: parsed.erro,
      tokenUsage,
      model: message.model,
    };
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
