/**
 * The self-removal guardrail for the Family admin screen, kept free of
 * database and NextAuth code so it can be tested directly. Modelled on
 * access-decision.ts / session-recheck.ts: a pure decision the route calls,
 * not something re-derived inline where it can't be tested.
 *
 * Removing the signed-in admin's own row would lock them out of the only
 * screen that can grant access back, so it is refused outright. Two
 * separate failure reasons map to two different problems: `invalid_id` is a
 * malformed request (the id was never a real row to begin with), while
 * `self_removal` is the guardrail actually firing.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RemovalDecision =
  | { allowed: true }
  | { allowed: false; reason: 'invalid_id' | 'self_removal' };

/**
 * Postgres `uuid` columns compare case-insensitively (and are commonly
 * rendered in either case), so the guard normalises both sides the same way
 * before comparing — a `===` on the raw strings would let an uppercased
 * spelling of the admin's own id slip past it.
 */
function normaliseId(id: string): string {
  return id.trim().toLowerCase();
}

export function decideMemberRemoval(input: {
  targetId: string;
  sessionUserId: string;
}): RemovalDecision {
  const targetId = normaliseId(input.targetId);

  // Checked before the self-removal comparison: a malformed id is never a
  // real row, so it should read as invalid_id rather than (by accident)
  // slipping through as "allowed" just because it doesn't textually match.
  if (!UUID_RE.test(targetId)) {
    return { allowed: false, reason: 'invalid_id' };
  }

  if (targetId === normaliseId(input.sessionUserId)) {
    return { allowed: false, reason: 'self_removal' };
  }

  return { allowed: true };
}
