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
