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
