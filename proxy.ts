import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'radreport_auth';

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isLandingPage = request.nextUrl.pathname === '/landing';
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');
  
  // Permitir acesso à landing, login e API de auth sem autenticação
  if (isLoginPage || isLandingPage || isApiAuth) {
    // Se já está logado e tentando acessar login, redireciona para home
    if (isLoginPage && authCookie?.value) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  
  // Verificar se está autenticado
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
