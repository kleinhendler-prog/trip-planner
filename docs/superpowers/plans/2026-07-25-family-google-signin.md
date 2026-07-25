# Family Accounts with Google Sign-In — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded username/password login with Google sign-in restricted to an invite list Eyal manages in the app, so each family member has their own account and sees only their own trips.

**Architecture:** A new `users` table is the allow-list. NextAuth keeps its current JWT session strategy — no database adapter, no extra adapter tables. A `signIn` callback looks the Google email up in `users` and refuses anyone absent, so signing in can never create an account. Trip privacy is enforced by one shared helper that loads a trip filtered by both trip id and owner id, collapsing "not yours" and "doesn't exist" into an identical 404.

**Tech Stack:** Next.js 16 (App Router), NextAuth v5 beta (`5.0.0-beta.31`), Drizzle ORM + Neon Postgres, Tailwind CSS 4, Vitest (added by Task 2).

**Design spec:** `docs/superpowers/specs/2026-07-25-family-google-signin-design.md`

---

## Before you start — blocking human prerequisite

**Task 4 cannot be verified until Eyal has created Google OAuth credentials.** He must do this himself; credentials must not pass through an assistant.

1. Go to <https://console.cloud.google.com/> → create a project (any name).
2. **APIs & Services → OAuth consent screen** → External → fill in app name and support email → add himself as a Test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
4. Under **Authorised redirect URIs**, add **both** of these exactly:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://trip-planner-omega-three.vercel.app/api/auth/callback/google`
5. Copy the Client ID and Client secret into `.env.local`:
   ```
   AUTH_GOOGLE_ID=<client id>
   AUTH_GOOGLE_SECRET=<client secret>
   ```
6. Add the same two variables in the Vercel project settings (Production), before Task 8.

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are the names NextAuth v5 detects automatically — do not rename them.

Tasks 1–3 and 6 can be built and tested before this is done.

## Global Constraints

- **Signing in must never create a user row.** Access requires a pre-existing row in `users` matched on email. This is the whole security boundary — no code path may auto-provision.
- **A trip that belongs to someone else must return 404**, never 401 and never 403. The app must not confirm that another person's trip exists.
- **User identity always comes from the server-side session** (`await auth()`), never from a request body, query string, or header.
- **Emails are compared lowercased and trimmed** everywhere — on seed, on invite, and on sign-in lookup.
- **Do not add a NextAuth database adapter.** Session strategy stays `'jwt'`.
- **Do not add `trustHost`.** The app stays on Vercel, which sets host trust automatically. (It would be required behind a Cloudflare Tunnel — see CLAUDE.md Gotchas — but that migration is deferred.)
- **Never commit `.env.local` or the `API/` folder.**
- **Schema changes are applied with `npx drizzle-kit push`, which hits the live Neon database immediately.** Production and local share one database. Confirm with Eyal before running it.
- **`npm run lint` has ~470 pre-existing errors.** A red lint run does not mean your change broke something — only check the files you touched.
- **Ignore the `trip-planner/` folder entirely.** It is a stale duplicate; scope all searches to `src/`.
- Every commit message uses Conventional Commits and ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/access-decision.ts` | Pure function: given an email, its verified flag, and a user row (or null), decide allow/deny and why. No database, no framework — the testable core of the security rule. |
| `src/lib/access-decision.test.ts` | Vitest tests for the above. |
| `src/lib/family.ts` | Database side of the allow-list: look up a member by email, record a successful login, list/add/remove members. |
| `src/lib/trip-access.ts` | `requireTripAccess(tripId)` — the single ownership gate every `/api/trips/[id]/*` route calls. |
| `src/types/next-auth.d.ts` | Type augmentation adding `id` and `role` to the session user. |
| `src/app/invite-only/page.tsx` | The "you're not on the list" page. |
| `src/app/family/page.tsx` | Admin screen: list, add, remove family members. |
| `src/app/api/family/route.ts` | `GET` list members, `POST` add member. Admin only. |
| `src/app/api/family/[id]/route.ts` | `DELETE` remove a member. Admin only. |
| `scripts/seed-admin.mjs` | One-off: insert Eyal's email as the first admin. |
| `vitest.config.ts` | Test runner config, excluding the stale `trip-planner/` duplicate. |

**Modified:**

| File | Change |
|---|---|
| `src/lib/db/schema.ts` | Add the `users` table. |
| `src/lib/auth.ts` | Add Google provider + allow-list `signIn` callback; carry `role` through JWT and session; Task 8 removes the Credentials provider. |
| `src/proxy.ts:29-32` | Allow `/invite-only` without a session. |
| `src/app/login/page.tsx` | Replace the username/password form with a "Continue with Google" button. |
| `src/components/layout/header.tsx:26-31` | Add a "Family" nav link, visible to admins only. |
| 9 live trip routes under `src/app/api/trips/[id]/` | Replace the repeated ownership block with `requireTripAccess`. |
| `package.json` | Add `vitest` + `test` script; Task 8 removes `bcryptjs`. |

**Deliberately untouched:** the four 501 stub routes (`apply-weather-swaps`, `export-pdf`, `regenerate-day`, `weather-refresh`). They return "not implemented" before touching data, so they carry no privacy risk. Rebuilding them is separate work.

---

## Task 1: Add the `users` table and seed the admin

**Files:**
- Modify: `src/lib/db/schema.ts` (append after `user_profiles`, around line 58)
- Create: `scripts/seed-admin.mjs`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: the `users` table with columns `id` (uuid), `email` (text, unique), `name`, `image`, `google_sub` (text, unique), `role` (`'admin' | 'member'`), `status` (`'invited' | 'active'`), `created_at`, `last_login_at`. Drizzle export name is `users`.

- [ ] **Step 1: Add the table to the schema**

In `src/lib/db/schema.ts`, add after the `user_profiles` block:

```ts
/**
 * The family allow-list. A Google account can only sign in if its email
 * already has a row here — signing in never creates one.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  google_sub: text('google_sub').unique(),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('invited'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
});
```

`uuid`, `text`, and `timestamp` are already imported at the top of the file.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean, no output.

- [ ] **Step 3: Ask Eyal before touching the live database**

`npx drizzle-kit push` applies immediately to the shared production database. Confirm with him, then run:

Run: `npx drizzle-kit push`
Expected: reports creating table `users`.

- [ ] **Step 4: Write the admin seed script**

Create `scripts/seed-admin.mjs`, modelled on the existing `scripts/db-seed.mjs`:

```js
/**
 * Seed the first admin into the users table.
 * Usage: node scripts/seed-admin.mjs you@gmail.com
 *
 * Must be run BEFORE the first Google sign-in, otherwise the allow-list
 * check refuses everyone and nobody can get in.
 */

import nextEnv from '@next/env';
import { Pool, neonConfig } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;

// Node 22+ ships a global WebSocket implementation
neonConfig.webSocketConstructor = globalThis.WebSocket;

loadEnvConfig(process.cwd());

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/seed-admin.mjs <google-email>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const { rows } = await pool.query(
    `insert into users (email, role, status)
     values ($1, 'admin', 'invited')
     on conflict (email) do update set role = 'admin'
     returning id, email, role, status`,
    [email]
  );
  console.log('Admin seeded:', rows[0]);
} finally {
  await pool.end();
}
```

- [ ] **Step 5: Run it with Eyal's Google email**

Run: `node scripts/seed-admin.mjs <eyal's google email>`
Expected: `Admin seeded: { id: '<uuid>', email: '...', role: 'admin', status: 'invited' }`

The email is an input Eyal provides — do not hardcode it. The repo is public.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts scripts/seed-admin.mjs
git commit -m "feat: add users table as the family allow-list

Signing in will check this table and never create rows in it. Includes a
one-off seed script for the first admin, which must run before the first
Google sign-in or the allow-list check locks everyone out.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Add Vitest and the access-decision rule (TDD)

The allow/deny rule is the security boundary, so it is extracted as a pure function and tested first. The project has no test framework yet; this task adds one.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/access-decision.ts`
- Test: `src/lib/access-decision.test.ts`
- Modify: `package.json` (add `vitest` devDependency and `test` script)

**Interfaces:**
- Consumes: nothing from Task 1 at runtime (types only, redeclared locally)
- Produces:
  - `type FamilyMember = { id: string; email: string; role: 'admin' | 'member'; status: 'invited' | 'active' }`
  - `type AccessDecision = { allowed: true; userId: string; role: 'admin' | 'member' } | { allowed: false; reason: 'no_email' | 'email_unverified' | 'not_invited' }`
  - `function decideAccess(input: { email: string | null | undefined; emailVerified: boolean | undefined; member: FamilyMember | null }): AccessDecision`
  - `function normaliseEmail(email: string | null | undefined): string`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: installs without peer-dependency errors.

- [ ] **Step 2: Add the test config and script**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // trip-planner/ is a stale duplicate of this project — never scan it.
    exclude: ['node_modules/**', 'trip-planner/**', '.next/**'],
  },
});
```

In `package.json`, add to `scripts`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/access-decision.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideAccess, normaliseEmail, type FamilyMember } from './access-decision';

const member: FamilyMember = {
  id: 'user-uuid-1',
  email: 'family@example.com',
  role: 'member',
  status: 'invited',
};

describe('normaliseEmail', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmail('  Family@Example.COM ')).toBe('family@example.com');
  });

  it('returns empty string for missing input', () => {
    expect(normaliseEmail(null)).toBe('');
    expect(normaliseEmail(undefined)).toBe('');
  });
});

describe('decideAccess', () => {
  it('allows a verified email that is on the list', () => {
    const result = decideAccess({
      email: 'family@example.com',
      emailVerified: true,
      member,
    });
    expect(result).toEqual({ allowed: true, userId: 'user-uuid-1', role: 'member' });
  });

  it('carries the admin role through', () => {
    const result = decideAccess({
      email: 'boss@example.com',
      emailVerified: true,
      member: { ...member, id: 'admin-uuid', role: 'admin' },
    });
    expect(result).toEqual({ allowed: true, userId: 'admin-uuid', role: 'admin' });
  });

  it('refuses an email that is not on the list', () => {
    const result = decideAccess({
      email: 'stranger@example.com',
      emailVerified: true,
      member: null,
    });
    expect(result).toEqual({ allowed: false, reason: 'not_invited' });
  });

  it('refuses when Google has not verified the email', () => {
    const result = decideAccess({
      email: 'family@example.com',
      emailVerified: false,
      member,
    });
    expect(result).toEqual({ allowed: false, reason: 'email_unverified' });
  });

  it('refuses when no email is supplied', () => {
    const result = decideAccess({
      email: null,
      emailVerified: true,
      member,
    });
    expect(result).toEqual({ allowed: false, reason: 'no_email' });
  });

  it('refuses an unverified email that is also not on the list', () => {
    const result = decideAccess({
      email: 'stranger@example.com',
      emailVerified: false,
      member: null,
    });
    expect(result.allowed).toBe(false);
  });
});
```

- [ ] **Step 4: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './access-decision'`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/access-decision.ts`:

```ts
/**
 * The allow/deny rule for signing in, kept free of database and framework
 * code so it can be tested directly. Task 3 supplies the `member` lookup.
 *
 * The rule: a Google account may sign in only if its verified email already
 * exists in the users table. Nothing here creates a user.
 */

export type FamilyMember = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'invited' | 'active';
};

export type AccessDecision =
  | { allowed: true; userId: string; role: 'admin' | 'member' }
  | { allowed: false; reason: 'no_email' | 'email_unverified' | 'not_invited' };

/** Emails are compared lowercased and trimmed, everywhere. */
export function normaliseEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function decideAccess(input: {
  email: string | null | undefined;
  emailVerified: boolean | undefined;
  member: FamilyMember | null;
}): AccessDecision {
  if (!normaliseEmail(input.email)) {
    return { allowed: false, reason: 'no_email' };
  }

  // Checked before the allow-list so an unverified address can never be used
  // to impersonate an invited one.
  if (input.emailVerified !== true) {
    return { allowed: false, reason: 'email_unverified' };
  }

  if (!input.member) {
    return { allowed: false, reason: 'not_invited' };
  }

  return {
    allowed: true,
    userId: input.member.id,
    role: input.member.role,
  };
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS — 8 tests.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/lib/access-decision.ts src/lib/access-decision.test.ts package.json package-lock.json
git commit -m "feat: add tested access-decision rule for the family allow-list

Extracts the allow/deny logic as a pure function so the security boundary
has direct test coverage, and adds Vitest as the project's first test
runner. Unverified emails are rejected before the allow-list is consulted,
so an unverified address cannot be used to impersonate an invited one.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Look up family members in the database

**Files:**
- Create: `src/lib/family.ts`

**Interfaces:**
- Consumes: `users` table from Task 1; `FamilyMember` and `normaliseEmail` from Task 2
- Produces:
  - `findMemberByEmail(email: string): Promise<FamilyMember | null>`
  - `recordSuccessfulLogin(userId: string, profile: { name?: string | null; image?: string | null; googleSub?: string | null }): Promise<void>`
  - `listMembers(): Promise<FamilyMemberDetail[]>` where `FamilyMemberDetail = FamilyMember & { name: string | null; image: string | null; last_login_at: Date | null }`
  - `addMember(email: string): Promise<FamilyMemberDetail>`
  - `removeMember(id: string): Promise<void>`

- [ ] **Step 1: Write the module**

Create `src/lib/family.ts`:

```ts
/**
 * Database side of the family allow-list. The allow/deny rule itself lives
 * in access-decision.ts; this module only reads and writes rows.
 */

import { db, users } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { normaliseEmail, type FamilyMember } from '@/lib/access-decision';

export type FamilyMemberDetail = FamilyMember & {
  name: string | null;
  image: string | null;
  last_login_at: Date | null;
};

function toMember(row: typeof users.$inferSelect): FamilyMemberDetail {
  return {
    id: row.id,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'member',
    status: row.status === 'active' ? 'active' : 'invited',
    name: row.name,
    image: row.image,
    last_login_at: row.last_login_at,
  };
}

export async function findMemberByEmail(email: string): Promise<FamilyMember | null> {
  const wanted = normaliseEmail(email);
  if (!wanted) return null;

  const rows = await db.select().from(users).where(eq(users.email, wanted));
  return rows[0] ? toMember(rows[0]) : null;
}

/** Fills in the Google profile on first sign-in and marks the row active. */
export async function recordSuccessfulLogin(
  userId: string,
  profile: { name?: string | null; image?: string | null; googleSub?: string | null }
): Promise<void> {
  await db
    .update(users)
    .set({
      name: profile.name ?? null,
      image: profile.image ?? null,
      google_sub: profile.googleSub ?? null,
      status: 'active',
      last_login_at: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function listMembers(): Promise<FamilyMemberDetail[]> {
  const rows = await db.select().from(users).orderBy(asc(users.email));
  return rows.map(toMember);
}

export async function addMember(email: string): Promise<FamilyMemberDetail> {
  const wanted = normaliseEmail(email);
  if (!wanted) throw new Error('Email is required');

  const rows = await db
    .insert(users)
    .values({ email: wanted, role: 'member', status: 'invited' })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (rows[0]) return toMember(rows[0]);

  // Already invited — return the existing row so adding twice is harmless.
  const existing = await db.select().from(users).where(eq(users.email, wanted));
  return toMember(existing[0]);
}

export async function removeMember(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Verify the lookup against the real database**

Create a throwaway script `scripts/_check-family.mjs`:

```js
import nextEnv from '@next/env';
import { Pool, neonConfig } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;
neonConfig.webSocketConstructor = globalThis.WebSocket;
loadEnvConfig(process.cwd());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query('select id, email, role, status from users order by email');
  console.log('users rows:', rows.length);
  for (const r of rows) console.log(` - ${r.email} | ${r.role} | ${r.status}`);
} finally {
  await pool.end();
}
```

Run: `node scripts/_check-family.mjs`
Expected: exactly one row — Eyal's email, `admin`, `invited`.

Then delete it: `rm scripts/_check-family.mjs`

- [ ] **Step 4: Commit**

```bash
git add src/lib/family.ts
git commit -m "feat: add database lookups for the family allow-list

Separates row access from the allow/deny rule so the decision logic stays
testable without a database. Adding an already-invited email is a no-op
rather than an error.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Wire up Google sign-in

The Credentials provider stays in place for now — it is removed in Task 8, only after Google sign-in is proven working on production. **Requires the Google OAuth credentials from the prerequisite section.**

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/app/invite-only/page.tsx`
- Modify: `src/proxy.ts:29-32`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `decideAccess`, `normaliseEmail` (Task 2); `findMemberByEmail`, `recordSuccessfulLogin` (Task 3)
- Produces: a session whose `user.id` is the `users.id` UUID and whose `user.role` is `'admin' | 'member'`

- [ ] **Step 1: Add the session type augmentation**

Create `src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'member';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'admin' | 'member';
  }
}
```

- [ ] **Step 2: Add the Google provider and the allow-list check**

In `src/lib/auth.ts`, add the import at the top:

```ts
import Google from 'next-auth/providers/google';
import { decideAccess } from '@/lib/access-decision';
import { findMemberByEmail, recordSuccessfulLogin } from '@/lib/family';
```

Add `Google` to the `providers` array (keep `Credentials` for now), immediately before the closing `]` on line 60:

```ts
    Google({
      // Ask Google for the profile and email only — nothing else.
      authorization: {
        params: { scope: 'openid email profile', prompt: 'select_account' },
      },
    }),
```

Replace the whole `signIn` callback (lines 62-70) with:

```ts
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
```

Replace the `jwt` callback (lines 75-82) with a version that resolves the real
user id itself:

```ts
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
```

Update the `session` callback (lines 87-94):

```ts
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as 'admin' | 'member') ?? 'member';
      }
      return session;
    },
```

- [ ] **Step 3: Create the invite-only page**

Create `src/app/invite-only/page.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InviteOnlyPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-background)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Trip Builder is invite-only</CardTitle>
          <CardDescription>
            That Google account isn&apos;t on the family list yet. Ask Eyal to add it,
            then try signing in again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="secondary">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Let the invite-only page load without a session**

In `src/proxy.ts`, change the public-route check (currently line 30):

```ts
  // Allow login page
  if (pathname === '/login' || pathname === '/' || pathname === '/invite-only') {
    return NextResponse.next();
  }
```

- [ ] **Step 5: Replace the login form with a Google button**

Rewrite `src/app/login/page.tsx` entirely:

```tsx
'use client';

import React, { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const hasError = searchParams.get('error');

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-background)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in with Google to plan your trips</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError && (
            <div className="rounded-[12px] bg-[var(--color-error-container)] p-4">
              <p className="text-sm text-[var(--color-on-error-container)]">
                Sign-in is temporarily unavailable. Please try again.
              </p>
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => signIn('google', { callbackUrl })}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
```

- [ ] **Step 6: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 7: Verify sign-in works locally**

Run: `npm run dev`

Then, in the browser:
1. Open `http://localhost:3000/login` → a single "Continue with Google" button, no username or password fields.
2. Click it, choose Eyal's Google account → lands on the trips page, signed in.
3. Confirm the seeded row flipped to active:

```bash
node -e "
import('@next/env').then(async (m) => {
  m.loadEnvConfig(process.cwd());
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query('select email, role, status, google_sub is not null as has_sub from users');
  console.log(rows);
  await pool.end();
});"
```

Expected: `status: 'active'`, `has_sub: true`.

4. Sign out, then sign in with a **different** Google account that is not on the list.
   Expected: redirected to `/invite-only`, and re-running the query above still shows exactly one row — no row was created for the stranger.

**If step 4 creates a row, stop.** That is the security boundary failing, and nothing else in this plan matters until it holds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts src/app/invite-only/page.tsx src/proxy.ts src/app/login/page.tsx
git commit -m "feat: add Google sign-in gated by the family allow-list

A Google account may sign in only if its verified email already exists in
the users table; anyone else is sent to an invite-only page and no row is
created for them. The session now carries the real user id and role.

The credentials provider is left in place until Google sign-in is verified
on production, so there is no window without a working login.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Centralise the trip ownership check

The nine live trip routes each repeat the same load-then-compare block, and they answer 401 when a trip belongs to someone else — which reveals that the trip exists. One helper replaces all of it and returns 404 for both cases.

**Files:**
- Create: `src/lib/trip-access.ts`
- Modify (9 routes under `src/app/api/trips/[id]/`): `route.ts`, `book-toggle/route.ts`, `duplicate/route.ts`, `generate/route.ts`, `nearby/route.ts`, `reflect/route.ts`, `reorder-days/route.ts`, `status/route.ts`, `swap-activity/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/app/api/auth/config`; `db`, `trips` from `@/lib/db`
- Produces: `requireTripAccess(tripId: string): Promise<{ ok: true; userId: string; trip: typeof trips.$inferSelect } | { ok: false; response: Response }>`

- [ ] **Step 1: Write the helper**

Create `src/lib/trip-access.ts`:

```ts
/**
 * The single ownership gate for every /api/trips/[id]/* route.
 *
 * The trip is fetched filtered by BOTH id and owner, so a trip belonging to
 * someone else is indistinguishable from one that does not exist — both are
 * a plain 404. Returning 401 here would confirm that the trip is real.
 */

import { auth } from '@/app/api/auth/config';
import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';

export type TripAccessResult =
  | { ok: true; userId: string; trip: typeof trips.$inferSelect }
  | { ok: false; response: Response };

export async function requireTripAccess(tripId: string): Promise<TripAccessResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.user_id, session.user.id)));

  const trip = rows[0];
  if (!trip) {
    return {
      ok: false,
      response: Response.json({ error: 'Trip not found' }, { status: 404 }),
    };
  }

  return { ok: true, userId: session.user.id, trip };
}
```

- [ ] **Step 2: Convert one route and confirm the shape works**

In `src/app/api/trips/[id]/status/route.ts`, replace lines 16-45 (the session check, the trip lookup, and both rejections) with:

```ts
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;
```

Add the import and drop the now-unused ones:

```ts
import { requireTripAccess } from '@/lib/trip-access';
```

`auth` and `trips` may become unused in this file — remove them from the imports if so. Leave `db`, `generation_jobs`, `desc`, and `eq`, which the SSE loop still uses.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Convert the other eight routes the same way**

For each of `route.ts`, `book-toggle/route.ts`, `duplicate/route.ts`, `generate/route.ts`, `nearby/route.ts`, `reflect/route.ts`, `reorder-days/route.ts`, `swap-activity/route.ts`:

1. Import `requireTripAccess` from `@/lib/trip-access`.
2. Replace the `await auth()` check, the trip lookup, and the `trip.user_id !== session.user.id` rejection with the four-line block from Step 2.
3. Where the route later uses the trip row, use `access.trip`. Where it used `session.user.id`, use `access.userId`.
4. Remove imports that are now unused.

Note for `generate/route.ts`: its `catch` block re-reads `params` to mark the trip failed. Leave that behaviour as it is — only the ownership block changes.

- [ ] **Step 4: Confirm no route still answers 401 for someone else's trip**

Run: `grep -rn "user_id !== session" src/app/api/trips/`
Expected: no matches.

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 5: Confirm the trip list is scoped too**

Read `src/app/api/trips/route.ts` and confirm the `GET` filters with `eq(trips.user_id, session.user.id)`, and that `POST` sets `user_id` from the session rather than from the request body. It already did at the time of writing — this step is a check, not a change. If either is missing, fix it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trip-access.ts "src/app/api/trips/[id]"
git commit -m "refactor: enforce trip ownership through one shared gate

The nine live trip routes each repeated the same load-then-compare block,
and answered 401 when a trip belonged to another user — which confirmed the
trip existed. requireTripAccess filters by id AND owner, so someone else's
trip and a missing trip are both a plain 404.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: The Family admin screen

**Files:**
- Create: `src/app/api/family/route.ts`
- Create: `src/app/api/family/[id]/route.ts`
- Create: `src/app/family/page.tsx`
- Modify: `src/components/layout/header.tsx`

**Interfaces:**
- Consumes: `listMembers`, `addMember`, `removeMember` (Task 3); session `role` (Task 4)
- Produces: `GET/POST /api/family`, `DELETE /api/family/[id]`, and the `/family` page

- [ ] **Step 1: Write the list and add route**

Create `src/app/api/family/route.ts`:

```ts
/**
 * Family allow-list management. Admin only.
 */

import { auth } from '@/app/api/auth/config';
import { addMember, listMembers } from '@/lib/family';
import { normaliseEmail } from '@/lib/access-decision';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, response: Response.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'admin') {
    // Not found rather than forbidden — non-admins need not learn this exists.
    return { ok: false as const, response: Response.json({ error: 'not found' }, { status: 404 }) };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const members = await listMembers();
  return Response.json({ members });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const email = normaliseEmail(body?.email);

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  const member = await addMember(email);
  return Response.json({ member });
}
```

- [ ] **Step 2: Write the remove route**

Create `src/app/api/family/[id]/route.ts`:

```ts
import { auth } from '@/app/api/auth/config';
import { removeMember } from '@/lib/family';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  const { id } = await params;

  // Guardrail: removing yourself would lock you out of this very screen.
  if (id === session.user.id) {
    return Response.json({ error: 'You cannot remove your own admin account' }, { status: 400 });
  }

  await removeMember(id);
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Write the Family page**

Create `src/app/family/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/config';
import { listMembers } from '@/lib/family';
import { FamilyManager } from './family-manager';

export default async function FamilyPage() {
  const session = await auth();

  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const members = await listMembers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-heading font-extrabold">Family</h1>
      <p className="mb-8 text-[var(--color-on-surface-variant)]">
        Only these email addresses can sign in. Adding someone lets them use their
        own Google account; removing them blocks future sign-ins but keeps their trips.
      </p>
      <FamilyManager initialMembers={members} currentUserId={session.user.id} />
    </div>
  );
}
```

Create `src/app/family/family-manager.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { FamilyMemberDetail } from '@/lib/family';

export function FamilyManager({
  initialMembers,
  currentUserId,
}: {
  initialMembers: FamilyMemberDetail[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not add that address');
        return;
      }
      setMembers((prev) =>
        prev.some((m) => m.id === data.member.id) ? prev : [...prev, data.member]
      );
      setEmail('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    const res = await fetch(`/api/family/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not remove that person');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="their-google-email@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>

      {error && (
        <div className="rounded-[12px] bg-[var(--color-error-container)] p-4">
          <p className="text-sm text-[var(--color-on-error-container)]">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold">{m.name || m.email}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {m.email} · {m.role} ·{' '}
                  {m.status === 'active' ? 'signed in before' : 'not signed in yet'}
                </p>
              </div>
              {m.id !== currentUserId && (
                <Button variant="secondary" onClick={() => remove(m.id)}>
                  Remove
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link for admins**

`src/components/layout/header.tsx` is a server component only if it does not use hooks — check before editing. Add, after the `/profile-setup` link (currently lines 26-31), a link rendered only when the session role is `admin`:

```tsx
            {isAdmin && (
              <Link
                href="/family"
                className="text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
              >
                Family
              </Link>
            )}
```

If the header is a client component, pass `isAdmin` down from the layout that renders it rather than calling `auth()` inside it.

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 6: Verify in the browser**

With `npm run dev` running and signed in as Eyal:
1. `/family` lists one member — Eyal, admin, "signed in before". No Remove button on his own row.
2. Add a second email → appears immediately as "not signed in yet".
3. Remove it → disappears.
4. `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/family` while signed out → `401`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/family src/app/family src/components/layout/header.tsx
git commit -m "feat: add the Family admin screen for managing the allow-list

Admins can invite a family member by email and remove them; removal blocks
future sign-ins without deleting their trips. Admins cannot remove
themselves, which is what prevents locking yourself out of this screen.
Non-admins get a 404 rather than a 403, so the screen's existence is not
advertised.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Prove the privacy boundary end to end

This is the task that decides whether the feature is finished. Nothing here is a code change — it is evidence. **Do not proceed to Task 8 until every check passes.**

**Files:**
- Create (temporary): `scripts/_verify-privacy.mjs` — deleted at the end

**Interfaces:**
- Consumes: everything from Tasks 1-6

- [ ] **Step 1: Get a second Google account onto the list**

Ask Eyal for a second Google address he controls (or a family member's). Add it through `/family`.

- [ ] **Step 2: Create a trip as Eyal**

Signed in as Eyal, create a trip through the wizard. Let it generate. Note its id from the URL (`/trips/<id>`).

- [ ] **Step 3: Confirm the trip is owned by a real user id**

```bash
node -e "
import('@next/env').then(async (m) => {
  m.loadEnvConfig(process.cwd());
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    'select t.id, t.user_id, u.email from trips t left join users u on u.id = t.user_id'
  );
  console.log(rows);
  await pool.end();
});"
```

Expected: `user_id` is a UUID matching Eyal's `users.id`, and `email` resolves. **If `user_id` is the string `1`, the session is not carrying the real id — stop and fix Task 4.**

- [ ] **Step 4: Confirm the second account cannot see or reach it**

Sign out. Sign in as the second account. Then:

1. The trips list is empty.
2. Navigate directly to `/trips/<eyal's trip id>` → not found, no trip content rendered.
3. In the browser console while signed in as the second account:
   ```js
   await fetch('/api/trips/<eyal-trip-id>').then(r => r.status)
   ```
   Expected: **404** — not 401, not 403, not 200.
4. Same check against `/api/trips/<eyal-trip-id>/status` → **404**.

- [ ] **Step 5: Confirm a stranger cannot sign in and leaves no trace**

Sign out. Attempt to sign in with a Google account that is **not** on the list.

Expected: lands on `/invite-only`, and:

```bash
node -e "
import('@next/env').then(async (m) => {
  m.loadEnvConfig(process.cwd());
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query('select email, role, status from users order by email');
  console.log('rows:', rows.length, rows);
  await pool.end();
});"
```

Expected: still exactly two rows. **A third row means the boundary is broken — stop.**

- [ ] **Step 6: Confirm removal takes effect**

As Eyal, remove the second account via `/family`. Then try to sign in as it again.
Expected: `/invite-only`. Then confirm its trips (if any) still exist in the database — removal hides, it does not delete.

- [ ] **Step 7: Confirm a non-admin cannot reach the admin screen**

Re-add the second account, sign in as it, and open `/family`.
Expected: redirected away. And `fetch('/api/family').then(r => r.status)` → **404**.

- [ ] **Step 8: Record the results**

Write the outcome of every check above into the commit message — pass or fail, with the actual status codes seen. If anything failed, fix it and re-run the whole task rather than proceeding.

```bash
git commit --allow-empty -m "test: verify family privacy boundary end to end

<record each check and its actual result here>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Remove the old password login

**Only after Task 7 passes in full, and after Google sign-in has been verified on the deployed site.**

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `package.json` (remove `bcryptjs`)

- [ ] **Step 1: Deploy and verify Google sign-in on production first**

Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to the Vercel project settings (Production), then push. Wait for the deployment, then sign in with Google at <https://trip-planner-omega-three.vercel.app/login>.

Expected: signs in successfully. **If it does not, stop — do not remove the fallback login.**

- [ ] **Step 2: Remove the Credentials provider**

In `src/lib/auth.ts`:
1. Delete the entire `Credentials({...})` block from the `providers` array, leaving only `Google`.
2. Delete the imports `Credentials` and `compare`.
3. In the `signIn` callback, delete the `if (account?.provider !== 'google')` branch — Google is now the only provider.
4. In the `jwt` callback, delete the `else if (user)` branch for the same reason.
5. Update the file's header comment: it currently says "Credentials provider with JWT sessions and bcrypt password hashing".

- [ ] **Step 3: Remove the unused dependency**

Run: `npm uninstall bcryptjs`
Expected: removed. If `@types/bcryptjs` is present, remove it too.

Run: `grep -rn "bcrypt" src/`
Expected: no matches.

- [ ] **Step 4: Type-check, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all clean.

- [ ] **Step 5: Verify the only way in is Google**

Run `npm run dev`, sign out, and confirm the login page offers only "Continue with Google" — no username or password fields — and that signing in still works.

- [ ] **Step 6: Commit and push**

```bash
git add src/lib/auth.ts package.json package-lock.json
git commit -m "refactor: remove the single-user password login

Google sign-in is verified working on production, so the hand-rolled
credentials provider and bcryptjs are no longer needed. This removes the
class of bugs that came with them: the bcrypt \$-escaping trap in .env.local
and the misleading NextAuth 'Configuration' errors.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
```

- [ ] **Step 7: Tell Eyal what to clean up**

`AUTH_USERNAME` and `AUTH_PASSWORD_HASH` are now dead. He should delete them from the Vercel project settings and from `.env.local`. This is his step — it touches account settings.

---

## Task 9: Update project memory

**Files:**
- Modify: `CLAUDE.md`, `DECISIONS.md`, `FEATURES.md`, `GLOSSARY.md`

- [ ] **Step 1: Move the feature to FEATURES.md**

Add a bullet describing family accounts with Google sign-in and the in-app allow-list.

- [ ] **Step 2: Replace the superseded decision in DECISIONS.md**

The entry "**Cloudflare Access for login, not Neon Auth**" is now wrong — replace it (do not stack a contradiction) with the Google-sign-in decision, noting that Cloudflare Access authenticates at the door without identifying the user to the app, which per-person trip ownership requires. Also update the "Parked / maybe later" note about public multi-user signup.

- [ ] **Step 3: Update CLAUDE.md**

- Current status: the app now has real family accounts.
- Where we left off / Next up.
- Engineering rules: add that every `/api/trips/[id]/*` route must go through `requireTripAccess`, and that signing in must never create a user row.
- Gotchas: remove the bcrypt `$`-escaping entry if `AUTH_PASSWORD_HASH` is gone, and note that the Google OAuth redirect URIs must be registered for both localhost and production.
- External services: add Google OAuth.
- How to test: `npm test` now exists.

- [ ] **Step 4: Add terms to GLOSSARY.md**

"Family member", "allow-list", "admin" as they are used in this app.

- [ ] **Step 5: Commit and push**

```bash
git add CLAUDE.md DECISIONS.md FEATURES.md GLOSSARY.md
git commit -m "docs: record family accounts with Google sign-in

Replaces the superseded Cloudflare Access login decision and records the
ownership rule that every trip route must go through requireTripAccess.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
```

---

## Self-review notes

Checked against the spec:

| Spec requirement | Task |
|---|---|
| `users` table with the listed columns | 1 |
| Admin seeded before first sign-in | 1 (steps 4-5), ordering enforced in the prerequisite section |
| Google sign-in, no passwords | 4 |
| Sign-in never creates a user | 2 (rule), 4 (wiring), 7 step 5 (proof) |
| Allow-list managed in-app | 6 |
| Emails compared lowercased/trimmed | 2 (`normaliseEmail`), used in 3 and 6 |
| `google_sub` recorded on first sign-in | 3 (`recordSuccessfulLogin`), 4 |
| JWT sessions, no adapter | Global constraint; 4 leaves `strategy: 'jwt'` untouched |
| Centralised ownership check | 5 |
| 404 not 401 for someone else's trip | 5, proved in 7 step 4 |
| User id always from the session | Global constraint; 5 step 5 checks the create path |
| Family screen: list, add, remove | 6 |
| Removal is non-destructive | 6 (`removeMember` deletes only the user row), proved in 7 step 6 |
| Admin cannot remove themselves | 6 (API guard + hidden button) |
| Non-admins turned away | 6, proved in 7 step 7 |
| Invite-only error page | 4 |
| "Temporarily unavailable" on config failure | 4 (login page error branch) |
| Rollout order, old login removed last | 8 |
| All five verification checks | 7 |

Two gaps I am flagging rather than hiding:

1. **The "signed in but row removed mid-session" case is only partly handled.** Because sessions are JWTs valid for 30 days, a removed member keeps a working token until it expires. Task 6's removal blocks *future* sign-ins; it does not revoke a live session. Their trips remain theirs and no other member's data is exposed, so this is a delay in eviction rather than a privacy hole — but it does not fully match the spec's error table. Closing it properly means checking the database on each request, which costs a query per page load. **This needs a decision from Eyal before Task 6 is considered done.**

2. **`requireTripAccess` has no automated test**, only the manual checks in Task 7. It depends on both a live session and the database, so testing it in isolation would mean mocking both — brittle enough to give false confidence. The Task 7 checks are the real coverage, and they are manual.
