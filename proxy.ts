import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const isPublicRoute = createRouteMatcher([
  '/(pt-BR|en-US)/landing',
  '/(pt-BR|en-US)/login',
  '/landing',
  '/login',
  '/api/webhook(.*)',
])

export const proxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  // API routes — protect non-public ones
  if (pathname.startsWith('/api/')) {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
    return
  }

  const { userId } = await auth()

  // Extract locale
  const localePattern = /^\/(pt-BR|en-US)(\/|$)/
  const match = pathname.match(localePattern)
  const locale = match?.[1] || routing.defaultLocale
  const pathWithoutLocale = match
    ? pathname.replace(localePattern, '/') || '/'
    : pathname

  // Authenticated user visiting login → redirect to home
  if (userId && pathWithoutLocale === '/login') {
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  // Public routes — allow access
  if (isPublicRoute(request)) {
    return intlMiddleware(request)
  }

  // Protected routes — redirect to landing if not authenticated
  if (!userId) {
    return NextResponse.redirect(new URL(`/${locale}/landing`, request.url))
  }

  return intlMiddleware(request)
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.mp4).*)',
    '/(api|trpc)(.*)',
  ],
}
