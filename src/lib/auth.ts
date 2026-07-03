/**
 * NextAuth v5 Configuration
 * Credentials provider with JWT sessions and bcrypt password hashing
 */

import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getUserByEmail } from '@/lib/supabase';

/**
 * NextAuth configuration with Credentials provider
 * Uses JWT sessions for stateless authentication
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login?error=true',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'john@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        try {
          // Get user from database
          const user = await getUserByEmail(credentials.email as string);

          if (!user) {
            throw new Error('User not found');
          }

          // Compare password with hash
          // Note: In production, passwords should be stored as bcrypt hashes
          // This requires updating the users table to include a passwordHash field
          const userWithHash = user as any;
          if (!userWithHash.passwordHash) {
            throw new Error('User account not properly configured');
          }

          const isPasswordValid = await compare(
            credentials.password as string,
            userWithHash.passwordHash
          );

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          return {
            id: userWithHash.id,
            email: userWithHash.email,
            name: userWithHash.name || undefined,
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Control whether a user is allowed to sign in
     */
    async signIn({ user }) {
      if (user?.id && user?.email) {
        return true;
      }
      return false;
    },

    /**
     * Control what is returned in the JWT token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    /**
     * Control what is exposed in the session
     */
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },

    /**
     * Handle redirect after signin
     */
    async redirect({ url, baseUrl }) {
      // Allow redirects to relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow redirects to the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default authConfig;
