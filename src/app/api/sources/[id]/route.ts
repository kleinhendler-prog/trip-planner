/**
 * Single Source API Routes
 * PATCH: Update source (trust_rating, active)
 * DELETE: Delete source
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';


/**
 * PATCH /api/sources/[id]
 * Update source trust rating and active status
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json() as any;

    // Verify source exists
    const { data: source, error: fetchError } = await (supabase as any)
      .from('destination_sources')
      .select('createdBy')
      .eq('id', id)
      .single();

    if (fetchError || !source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    // Only creator can update
    if (source.createdBy !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.trust_rating !== undefined) {
      updateData.trust_rating = Math.max(0, Math.min(10, body.trust_rating));
    }

    if (body.active !== undefined) {
      updateData.active = body.active;
    }

    const { data, error: updateError } = await (supabase as any)
      .from('destination_sources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return Response.json(data);
  } catch (error) {
    console.error(`PATCH /api/sources/[id] error:`, error);
    return Response.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sources/[id]
 * Delete a destination source
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify source belongs to user
    const { data: source, error: fetchError } = await (supabase as any)
      .from('destination_sources')
      .select('createdBy')
      .eq('id', id)
      .single();

    if (fetchError || !source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    if (source.createdBy !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { error: deleteError } = await (supabase as any)
      .from('destination_sources')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/sources/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}
