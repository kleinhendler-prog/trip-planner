/**
 * Duplicate Trip API Route
 * POST: Duplicate trip as a new copy
 *
 * Rewritten 2026-07-04 for the JSONB itinerary model — the original version
 * copied rows from days/activities/meals tables that no longer exist.
 */

import { auth } from '@/app/api/auth/config';
import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/trips/[id]/duplicate
 * Create a copy of the trip (itinerary included if one exists)
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify trip belongs to user and get full row
    const rows = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.user_id, session.user.id)));
    const trip: any = rows[0];

    if (!trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    const newTripId = uuidv4();
    const profile = (trip.profile as any) || {};

    await db.insert(trips).values({
      id: newTripId,
      user_id: session.user.id,
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
