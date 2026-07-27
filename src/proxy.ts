/**
 * Authentication Proxy (Next.js 16 rename of middleware)
 * Protects all routes except /login and /api/auth/*
 * Redirects unauthenticated users to login page
 */

import { auth } from '@/app/api/auth/config';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy to protect routes
 * Public routes: /login, /api/auth/*, static files
 * Protected routes: everything else
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes and static files
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|ico|webp|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/login' || pathname === '/' || pathname === '/invite-only') {
    return NextResponse.next();
  }

  // Check for session
  const session = await auth();

  // Redirect to login unless the session carries a usable user id. @auth/core
  // returns a session object for any token that decodes, so checking the
  // session alone would let a token whose member was removed from the
  // allow-list through to a broken, half-rendered page.
  if (!session?.user?.id) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except static files and public routes
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
