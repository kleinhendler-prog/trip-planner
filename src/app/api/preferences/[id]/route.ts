/**
 * Single Preference API Route
 * DELETE: Deactivate a preference
 */

import { auth } from '@/app/api/auth/config';
import { db, user_preferences } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * DELETE /api/preferences/[id]
 * Deactivate a preference (soft delete by setting active=false)
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    // Verify preference belongs to user
    const rows = await db
      .select({ user_id: user_preferences.user_id })
      .from(user_preferences)
      .where(eq(user_preferences.id, id));
    const pref = rows[0];

    if (!pref) {
      return Response.json(
        { error: 'Preference not found' },
        { status: 404 }
      );
    }

    if (pref.user_id !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete by setting active=false
    await db
      .update(user_preferences)
      .set({ active: false, updated_at: new Date() })
      .where(eq(user_preferences.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/preferences/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete preference' },
      { status: 500 }
    );
  }
}
