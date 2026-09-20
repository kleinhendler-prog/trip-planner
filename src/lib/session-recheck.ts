/**
 * The revocation mechanism for an already-issued Google session, kept free
 * of NextAuth and database code so it can be tested directly. Modelled on
 * access-decision.ts: no database, no NextAuth imports, no clock reads in
 * here — `now` is always passed in.
 *
 * src/lib/auth.ts drives these two pure decisions from the `jwt` callback.
 * The `findMemberByEmail` lookup and the try/catch that keeps a transient
 * database error from signing everyone out stay in auth.ts — that is error
 * handling, not a decision.
 */

import type { FamilyMember } from '@/lib/access-decision';

export type RecheckOutcome =
  | { kind: 'refresh'; id: string; role: 'admin' | 'member'; checkedAt: number }
  | { kind: 'revoke' };

/**
 * Should this token's allow-list membership be looked up again right now?
 *
 * Only a Google-provider token is governed by the allow-list — a
 * credentials-provider session has no `users` row, so re-checking one would
 * incorrectly sign it out. A token with no `checkedAt` at all is treated as
 * checked at time 0, so it is always due.
 */
export function shouldRecheckSession(input: {
  provider: string | undefined;
  checkedAt: number | undefined;
  now: number;
  intervalMs: number;
}): boolean {
  if (input.provider !== 'google') {
    return false;
  }
  const checkedAt = typeof input.checkedAt === 'number' ? input.checkedAt : 0;
  return input.now - checkedAt >= input.intervalMs;
}

/**
 * What should happen to the token's claims, given what the allow-list
 * lookup found?
 *
 * - Member still on the list -> 'refresh': set id, role and checkedAt to now.
 * - Member gone (removed) -> 'revoke': the caller drops id and role and
 *   deliberately leaves checkedAt untouched (this outcome carries no
 *   checkedAt to overwrite it with), so that re-inviting the person takes
 *   effect on their very next request instead of waiting out the recheck
 *   interval.
 */
export function decideRecheckOutcome(member: FamilyMember | null, now: number): RecheckOutcome {
  if (member) {
    return { kind: 'refresh', id: member.id, role: member.role, checkedAt: now };
  }
  return { kind: 'revoke' };
}
