import { NextResponse } from 'next/server';
import { gerarLaudo } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const { texto, modoPS } = await request.json();
    
    if (!texto || typeof texto !== 'string' || texto.trim() === '') {
      return NextResponse.json(
        { erro: 'Digite ou cole um texto para gerar o laudo', laudo: null, sugestoes: [] },
        { status: 400 }
      );
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { erro: 'Chave da API não configurada', laudo: null, sugestoes: [] },
        { status: 500 }
      );
    }
    
    const resultado = await gerarLaudo(texto.trim(), modoPS ?? false);
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao gerar laudo:', error);
    
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    
    if (mensagem.includes('timeout') || mensagem.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { erro: 'Tempo esgotado. Tente novamente', laudo: null, sugestoes: [] },
        { status: 504 }
      );
    }
    
    if (mensagem.includes('401') || mensagem.includes('authentication')) {
      return NextResponse.json(
        { erro: 'Chave da API inválida', laudo: null, sugestoes: [] },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { erro: 'Erro ao processar. Tente novamente', laudo: null, sugestoes: [] },
      { status: 500 }
    );
  }
}
