/**
 * Single Preference API Route
 * DELETE: Deactivate a preference
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';

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
    const { data: pref, error: fetchError } = await (supabase as any)
      .from('user_preferences')
      .select('userId')
      .eq('id', id)
      .single();

    if (fetchError || !pref) {
      return Response.json(
        { error: 'Preference not found' },
        { status: 404 }
      );
    }

    if (pref.userId !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete by setting active=false
    const { error: updateError } = await (supabase as any)
      .from('user_preferences')
      .update({
        active: false,
        updatedAt: new Date(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/preferences/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete preference' },
      { status: 500 }
    );
  }
}
