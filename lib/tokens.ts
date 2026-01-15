/**
 * Calcula custos baseado nos tokens utilizados e modelo do Claude
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

// Taxa de câmbio USD para BRL (pode ser ajustada conforme necessário)
const TAXA_CAMBIO_USD_BRL = 5.5;

// Tabela de preços por modelo (preços por milhão de tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4.5': { input: 5, output: 25 },
  'claude-opus-4.1': { input: 15, output: 75 },
  'claude-opus-4': { input: 15, output: 75 },
  'claude-opus-3': { input: 15, output: 75 },
  'claude-sonnet-4.5': { input: 3, output: 15 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-sonnet-3.7': { input: 3, output: 15 },
  'claude-haiku-4.5': { input: 1, output: 5 },
  'claude-haiku-3.5': { input: 0.80, output: 4 },
  'claude-haiku-3': { input: 0.25, output: 1.25 },
};

/**
 * Identifica o modelo a partir do nome completo
 */
function identificarModelo(modelName: string): string {
  const lower = modelName.toLowerCase();
  
  if (lower.includes('opus-4.5') || lower.includes('opus4.5')) return 'claude-opus-4.5';
  if (lower.includes('opus-4.1') || lower.includes('opus4.1')) return 'claude-opus-4.1';
  if (lower.includes('opus-4') || lower.includes('opus4')) return 'claude-opus-4';
  if (lower.includes('opus-3') || lower.includes('opus3')) return 'claude-opus-3';
  if (lower.includes('sonnet-4.5') || lower.includes('sonnet4.5')) return 'claude-sonnet-4.5';
  if (lower.includes('sonnet-4') || lower.includes('sonnet4')) return 'claude-sonnet-4';
  if (lower.includes('sonnet-3.7') || lower.includes('sonnet3.7')) return 'claude-sonnet-3.7';
  if (lower.includes('haiku-4.5') || lower.includes('haiku4.5')) return 'claude-haiku-4.5';
  if (lower.includes('haiku-3.5') || lower.includes('haiku3.5')) return 'claude-haiku-3.5';
  if (lower.includes('haiku-3') || lower.includes('haiku3')) return 'claude-haiku-3';
  
  // Default para sonnet 4.5 (modelo padrão)
  return 'claude-sonnet-4.5';
}

/**
 * Calcula o custo baseado nos tokens e modelo (em reais brasileiros)
 */
export function calcularCusto(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): CostInfo {
  const model = identificarModelo(modelName);
  const pricing = PRICING[model] || PRICING['claude-sonnet-4.5'];
  
  // Converter tokens para milhões e calcular custo em USD
  const inputCostUSD = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.output;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  
  // Converter de USD para BRL
  const inputCost = inputCostUSD * TAXA_CAMBIO_USD_BRL;
  const outputCost = outputCostUSD * TAXA_CAMBIO_USD_BRL;
  const totalCost = totalCostUSD * TAXA_CAMBIO_USD_BRL;
  
  return {
    inputCost,
    outputCost,
    totalCost,
    model: modelName,
  };
}

/**
 * Formata número para exibição em reais brasileiros (com casas decimais apropriadas)
 */
export function formatarCusto(valor: number): string {
  if (valor < 0.0001) {
    return '< R$ 0,00';
  }
  if (valor < 0.01) {
    return `R$ ${valor.toFixed(4).replace('.', ',')}`;
  }
  if (valor < 1) {
    return `R$ ${valor.toFixed(3).replace('.', ',')}`;
  }
  // Para valores >= 1, usar 2 casas decimais e separador decimal brasileiro
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/**
 * Formata número de tokens para exibição
 */
export function formatarTokens(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}
