/**
 * Single Family Member API Route
 * DELETE: Remove a family member from the allow-list
 *
 * Admin only. Removing a row only blocks future sign-ins — it never touches
 * that member's trips. An admin can never remove themselves, which is what
 * prevents locking yourself out of the only screen that can grant access
 * back.
 */

import { auth } from '@/app/api/auth/config';
import { removeMember } from '@/lib/family';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      // Not found rather than forbidden — non-admins need not learn this exists.
      return Response.json({ error: 'not found' }, { status: 404 });
    }

    const { id } = await params;

    // Guardrail: removing yourself would lock you out of this very screen.
    if (id === session.user.id) {
      return Response.json({ error: 'You cannot remove your own admin account' }, { status: 400 });
    }

    await removeMember(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/family/[id] error:', error);
    return Response.json({ error: 'Failed to remove that person' }, { status: 500 });
  }
}
