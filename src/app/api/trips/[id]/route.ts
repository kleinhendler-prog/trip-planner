/**
 * Single Trip API Routes
 * GET: Fetch single trip by ID
 * DELETE: Delete trip
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase, deleteTrip } from '@/lib/supabase';

/**
 * GET /api/trips/[id]
 * Fetch a single trip with all related data
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: trip, error } = await (supabase as any)
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json(
          { error: 'Trip not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Detect stale/orphaned generations: if generating for >2.5 minutes, auto-fail
    if (trip.status === 'generating' && trip.generation_started_at) {
      const startedAt = new Date(trip.generation_started_at).getTime();
      const elapsed = Date.now() - startedAt;
      const STALE_THRESHOLD_MS = 150_000; // 2.5 minutes

      if (elapsed > STALE_THRESHOLD_MS) {
        console.warn(`[Stale Generation] Trip ${id} has been generating for ${Math.round(elapsed / 1000)}s — marking as failed`);
        await (supabase as any)
          .from('trips')
          .update({ status: 'failed' })
          .eq('id', id);
        trip.status = 'failed';
      }
    }

    return Response.json(trip);
  } catch (error) {
    console.error(`GET /api/trips/[id] error:`, error);
    return Response.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[id]
 * Delete a trip and all related data
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

    // Verify trip belongs to user
    const { data: trip, error: fetchError } = await (supabase as any)
      .from('trips')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    if (trip.user_id !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    // Delete trip and all related data
    await deleteTrip(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/trips/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
