import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'meuslaudos_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export async function verificarSenha(senha: string): Promise<boolean> {
  return senha === process.env.APP_PASSWORD;
}

export async function criarSessao(): Promise<void> {
  const cookieStore = await cookies();
  const token = Buffer.from(`${Date.now()}:${process.env.AUTH_SECRET}`).toString('base64');
  
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function verificarSessao(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME);
  
  if (!token?.value) return false;
  
  try {
    const decoded = Buffer.from(token.value, 'base64').toString();
    return decoded.includes(process.env.AUTH_SECRET || '');
  } catch {
    return false;
  }
}

export async function encerrarSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
