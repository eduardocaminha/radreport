import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const AUTH_COOKIE_NAME = 'radreport_auth';

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale handling for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Extract locale-less path for auth checks
  const localePattern = /^\/(pt-BR|en-US)(\/|$)/;
  const match = pathname.match(localePattern);
  const locale = match?.[1] || routing.defaultLocale;
  const pathWithoutLocale = match ? pathname.replace(localePattern, '/') || '/' : pathname;

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isLoginPage = pathWithoutLocale === '/login';
  const isLandingPage = pathWithoutLocale === '/landing';

  // Allow access to landing, login without auth
  if (isLoginPage || isLandingPage) {
    // If already logged in and trying to access login, redirect to home
    if (isLoginPage && authCookie?.value) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
    return intlMiddleware(request);
  }

  // Check auth for all other pages
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL(`/${locale}/landing`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.mp4).*)'],
};
