/**
 * NextAuth v5 Configuration
 * Credentials provider with JWT sessions and bcrypt password hashing
 */

import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

/**
 * NextAuth configuration with Credentials provider
 * Single-user auth using environment variables (AUTH_USERNAME + AUTH_PASSWORD_HASH)
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
        email: { label: 'Username', type: 'text', placeholder: 'username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing username or password');
        }

        const expectedUsername = process.env.AUTH_USERNAME;
        const expectedHash = process.env.AUTH_PASSWORD_HASH;

        if (!expectedUsername || !expectedHash) {
          throw new Error('Auth not configured');
        }

        // Compare username
        if (credentials.email !== expectedUsername) {
          throw new Error('Invalid credentials');
        }

        // Compare password with bcrypt hash
        const isPasswordValid = await compare(
          credentials.password as string,
          expectedHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: '1',
          email: expectedUsername,
          name: expectedUsername,
        };
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
