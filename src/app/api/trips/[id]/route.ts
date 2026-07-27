/**
 * Single Trip API Routes
 * GET: Fetch single trip by ID
 * DELETE: Delete trip
 */

import { db, trips } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireTripAccess } from '@/lib/trip-access';

/**
 * GET /api/trips/[id]
 * Fetch a single trip with all related data
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;

    const trip: any = access.trip;

    // Detect stale/orphaned generations: if generating for >2.5 minutes, auto-fail
    if (trip.status === 'generating' && trip.generation_started_at) {
      const startedAt = new Date(trip.generation_started_at).getTime();
      const elapsed = Date.now() - startedAt;
      const STALE_THRESHOLD_MS = 150_000; // 2.5 minutes

      if (elapsed > STALE_THRESHOLD_MS) {
        console.warn(`[Stale Generation] Trip ${id} has been generating for ${Math.round(elapsed / 1000)}s — marking as failed`);
        await db.update(trips).set({ status: 'failed' }).where(eq(trips.id, id));
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
 * Delete a trip and all related data (child tables cascade via FK)
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;

    // Delete trip; related rows cascade
    await db.delete(trips).where(eq(trips.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/trips/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
