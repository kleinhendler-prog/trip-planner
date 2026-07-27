/**
 * NextAuth v5 Configuration
 * Credentials provider with JWT sessions and bcrypt password hashing
 */

import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { decideAccess } from '@/lib/access-decision';
import { findMemberByEmail, recordSuccessfulLogin } from '@/lib/family';

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
    Google({
      // Ask Google for the profile and email only — nothing else.
      authorization: {
        params: { scope: 'openid email profile', prompt: 'select_account' },
      },
    }),
  ],
  callbacks: {
    /**
     * The security boundary. A Google account may sign in only if its
     * verified email already exists in the users table. This never creates
     * a user — that is what keeps strangers out.
     *
     * Returning a string redirects there instead of showing the error page.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        // Credentials provider — removed in a later change.
        return Boolean(user?.id && user?.email);
      }

      const member = await findMemberByEmail(profile?.email ?? user?.email ?? '');
      const decision = decideAccess({
        email: profile?.email ?? user?.email,
        emailVerified: profile?.email_verified as boolean | undefined,
        member,
      });

      if (!decision.allowed) {
        console.warn(`[auth] refused sign-in (${decision.reason})`);
        return '/invite-only';
      }

      await recordSuccessfulLogin(decision.userId, {
        name: profile?.name ?? user?.name,
        image: profile?.picture as string | undefined,
        googleSub: profile?.sub,
      });

      return true;
    },

    /**
     * Runs once at sign-in with `account` and `profile` present, then on every
     * later request with only `token`.
     *
     * The allow-list is queried again here rather than having signIn hand the
     * id over on the `user` object: NextAuth only documents `account` as a
     * shared reference between the two callbacks, so relying on `user`
     * mutations would be depending on an implementation detail. One extra
     * query at sign-in is a fair price for not breaking on an upgrade.
     */
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google') {
        const member = await findMemberByEmail(profile?.email ?? user?.email ?? '');

        // signIn already refused anyone not on the list, so this should always
        // find a row. If it somehow does not, leave the id unset — every route
        // then treats the request as unauthenticated, which fails safe.
        if (member) {
          token.id = member.id;
          token.email = member.email;
          token.name = profile?.name ?? user?.name ?? member.email;
          token.role = member.role;
        }
      } else if (user) {
        // Credentials provider — removed in a later change.
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = 'member';
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
        session.user.role = (token.role as 'admin' | 'member') ?? 'member';
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
    // 1 day: removing someone from the allow-list takes effect within a day
    // without checking the database on every request.
    maxAge: 24 * 60 * 60, // 1 day
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 1 day
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default authConfig;
