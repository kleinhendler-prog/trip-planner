/**
 * Authentication Middleware
 * Protects all routes except /login and /api/auth/*
 * Redirects unauthenticated users to login page
 */

import { auth } from '@/app/api/auth/config';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect routes
 * Public routes: /login, /api/auth/*, static files
 * Protected routes: everything else
 */
export async function middleware(request: NextRequest) {
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
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }

  // Check for session
  const session = await auth();

  // Redirect to login if no session
  if (!session) {
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
