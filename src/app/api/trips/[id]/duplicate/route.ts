/**
 * Duplicate Trip API Route
 * POST: Duplicate trip as a new copy
 *
 * Rewritten 2026-07-04 for the JSONB itinerary model — the original version
 * copied rows from days/activities/meals tables that no longer exist.
 */

import { db, trips } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireTripAccess } from '@/lib/trip-access';

/**
 * POST /api/trips/[id]/duplicate
 * Create a copy of the trip (itinerary included if one exists)
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;

    const trip: any = access.trip;
    const newTripId = uuidv4();
    const profile = (trip.profile as any) || {};

    await db.insert(trips).values({
      id: newTripId,
      user_id: access.userId,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      profile: {
        ...profile,
        title: profile.title ? `${profile.title} (Copy)` : 'Trip (Copy)',
      },
      itinerary: trip.itinerary,
      status: trip.itinerary ? 'ready' : 'draft',
      trip_type: trip.trip_type,
      trip_overrides: trip.trip_overrides,
      weather_tier: trip.weather_tier,
      weather_data: trip.weather_data,
      currency: trip.currency,
      daily_budget_target: trip.daily_budget_target,
      booked_items: [],
      generation_log: [],
    });

    return Response.json({
      success: true,
      trip_id: newTripId,
    }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/trips/[id]/duplicate error:`, error);
    return Response.json(
      { error: 'Failed to duplicate trip' },
      { status: 500 }
    );
  }
}
