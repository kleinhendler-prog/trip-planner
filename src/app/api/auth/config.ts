/**
 * NextAuth Configuration Export
 * Centralized auth config for use in middleware and API routes
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

const nextAuthConfig = NextAuth(authConfig);

export const { handlers, auth, signIn, signOut } = nextAuthConfig;
