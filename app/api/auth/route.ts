import { NextResponse } from 'next/server';
import { verificarSenha, criarSessao, encerrarSessao } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { senha } = await request.json();
    
    if (!senha) {
      return NextResponse.json(
        { erro: 'Senha não fornecida' },
        { status: 400 }
      );
    }
    
    const senhaValida = await verificarSenha(senha);
    
    if (!senhaValida) {
      return NextResponse.json(
        { erro: 'Senha incorreta' },
        { status: 401 }
      );
    }
    
    await criarSessao();
    
    return NextResponse.json({ sucesso: true });
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await encerrarSessao();
    return NextResponse.json({ sucesso: true });
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao encerrar sessão' },
      { status: 500 }
    );
  }
}
