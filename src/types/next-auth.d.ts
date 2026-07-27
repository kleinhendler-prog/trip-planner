import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      /**
       * The users.id UUID. Optional on purpose: a session whose member was
       * removed from the allow-list keeps its cookie but loses this claim, so
       * every caller must still check it before trusting the session.
       */
      id?: string;
      role: 'admin' | 'member';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'admin' | 'member';
    /** Which provider issued this token; only Google tokens are re-checked. */
    provider?: 'google' | 'credentials';
    /** Epoch ms of the last allow-list check. Token-internal, never exposed. */
    checkedAt?: number;
  }
}
