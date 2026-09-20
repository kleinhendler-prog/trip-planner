/**
 * Family Allow-List API Routes
 * GET: List invited family members
 * POST: Invite a new family member by email
 *
 * Admin only. Non-admins get 404 (not 403) so the screen's existence isn't
 * advertised; a missing session gets 401.
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

/**
 * GET /api/family
 * List all invited family members
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const members = await listMembers();
    return Response.json({ members });
  } catch (error) {
    console.error('GET /api/family error:', error);
    return Response.json({ error: 'Failed to load family members' }, { status: 500 });
  }
}

/**
 * POST /api/family
 * Invite a new family member by email. Inviting an address that is already
 * on the list is harmless — it just returns the existing row.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json().catch(() => ({}));
    const rawEmail = body?.email;

    // normaliseEmail calls .trim() unconditionally, which throws on anything
    // that isn't a string (a number, array, or object in the body) — check
    // the type first so a malformed request gets a 400, not a 500. 254 is
    // the maximum email length allowed by RFC 5321.
    if (typeof rawEmail !== 'string' || rawEmail.length === 0 || rawEmail.length > 254) {
      return Response.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const email = normaliseEmail(rawEmail);

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const member = await addMember(email);
    return Response.json({ member });
  } catch (error) {
    console.error('POST /api/family error:', error);
    return Response.json({ error: 'Failed to add that address' }, { status: 500 });
  }
}
