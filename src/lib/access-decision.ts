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
