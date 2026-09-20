/**
 * NextAuth v5 Configuration
 * Credentials provider with JWT sessions and bcrypt password hashing
 */

import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { decideAccess, normaliseEmail } from '@/lib/access-decision';
import { shouldRecheckSession, decideRecheckOutcome } from '@/lib/session-recheck';
import { findMemberByEmail, recordSuccessfulLogin } from '@/lib/family';

/**
 * How stale a session's allow-list check may become before it is verified again.
 *
 * `maxAge` alone does not bound this: @auth/core re-issues the JWT and re-sets
 * the cookie on every session read, so a session that is being used rolls
 * forward indefinitely and never reaches its expiry. Without a re-check,
 * deleting someone from the users table would not lock them out at all.
 *
 * Fifteen minutes is the trade-off: at most four extra one-row queries per
 * hour per active session, against a removed member keeping access for at
 * most fifteen minutes.
 */
const ALLOW_LIST_RECHECK_MS = 15 * 60 * 1000;

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
        // The address is logged because the first question about a refusal is
        // always "which account?".
        const attempted = normaliseEmail(profile?.email ?? user?.email);
        console.warn(
          `[auth] refused sign-in for ${attempted || '(no email)'} (${decision.reason})`
        );
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
     *
     * On later requests the allow-list is re-checked once the last check is
     * older than ALLOW_LIST_RECHECK_MS, so that removing a member actually
     * ends their session instead of waiting for an expiry that never comes.
     */
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google') {
        const member = await findMemberByEmail(profile?.email ?? user?.email ?? '');

        // signIn already refused anyone not on the list, so this should always
        // find a row. If it somehow does not, leave the id unset — the proxy
        // and every API route reject a session without an id, which fails safe.
        if (member) {
          token.id = member.id;
          token.email = member.email;
          token.name = profile?.name ?? user?.name ?? member.email;
          token.role = member.role;
          token.checkedAt = Date.now();
        }
        token.provider = 'google';
        return token;
      }

      if (user) {
        // Credentials provider — removed in a later change.
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = 'member';
        token.provider = 'credentials';
        return token;
      }

      // An existing session. Whether it is due for another allow-list check
      // is a pure decision — see session-recheck.ts — that only Google
      // sessions can even be subject to: a credentials session is governed
      // by the env password and has no users row to re-check, so
      // re-checking one would sign it out.
      const tokenProvider = typeof token.provider === 'string' ? token.provider : undefined;
      const tokenCheckedAt = typeof token.checkedAt === 'number' ? token.checkedAt : undefined;

      if (
        !shouldRecheckSession({
          provider: tokenProvider,
          checkedAt: tokenCheckedAt,
          now: Date.now(),
          intervalMs: ALLOW_LIST_RECHECK_MS,
        })
      ) {
        return token;
      }

      try {
        const member = await findMemberByEmail(token.email ?? '');
        const outcome = decideRecheckOutcome(member, Date.now());

        if (outcome.kind === 'refresh') {
          token.id = outcome.id;
          token.role = outcome.role;
          token.checkedAt = outcome.checkedAt;
        } else {
          // Removed from the allow-list. Dropping these claims is what ends
          // the session; the timestamp is deliberately left stale so a
          // re-invite takes effect on the very next request.
          delete token.id;
          delete token.role;
        }
      } catch (error) {
        // A transient database failure — a Neon cold start is realistic here —
        // must never sign everyone out. Keep the existing claims and the old
        // timestamp so the next call simply tries again.
        console.warn('[auth] allow-list re-check failed; keeping the session', error);
      }

      return token;
    },

    /**
     * Control what is exposed in the session
     *
     * `id` is intentionally left undefined when the token has none, so that
     * the proxy and the API routes reject the request.
     */
    async session({ session, token }) {
      if (session?.user) {
        // The casts are only to satisfy the callback's parameter type, which is
        // a union of the database-strategy and JWT-strategy shapes and so
        // narrows `user.id` to a required string here. Assigning undefined is
        // deliberate: `Session['user'].id` is optional for exactly this case.
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
    // 1 day. This bounds an *idle* session only: @auth/core re-issues the JWT
    // on every session read, so a session in active use never reaches this
    // expiry. Revocation is bounded by ALLOW_LIST_RECHECK_MS above, not here.
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
