/**
 * Day Reorder API
 * PUT: Swap two days in the itinerary and update dates/day numbers
 */

import { auth } from '@/app/api/auth/config';
import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import type { SimpleItinerary } from '@/lib/generation/simple-pipeline';

interface ReorderRequest {
  from_index: number;  // 0-based day index
  to_index: number;    // 0-based day index
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { from_index, to_index } = (await request.json()) as ReorderRequest;

    if (typeof from_index !== 'number' || typeof to_index !== 'number') {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch trip
    const tripRows = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.user_id, session.user.id)));
    const trip: any = tripRows[0];

    if (!trip) {
      return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    const itinerary = trip.itinerary as SimpleItinerary;
    if (!itinerary?.days || from_index < 0 || to_index < 0 || from_index >= itinerary.days.length || to_index >= itinerary.days.length) {
      return Response.json({ error: 'Invalid day index' }, { status: 400 });
    }

    // Clone and reorder
    const newDays = [...itinerary.days];
    const [moved] = newDays.splice(from_index, 1);
    newDays.splice(to_index, 0, moved);

    // Reassign day numbers and dates based on the trip start date
    const startDate = new Date(trip.start_date);
    for (let i = 0; i < newDays.length; i++) {
      newDays[i] = { ...newDays[i] };
      newDays[i].dayNumber = i + 1;
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      newDays[i].date = d.toISOString().split('T')[0];
    }

    // Build warnings for activities that might conflict with new dates
    // (e.g., a "closed on Sunday" activity now falls on a Sunday)
    const warnings: string[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    newDays.forEach((day) => {
      const dayOfWeek = dayNames[new Date(day.date).getDay()];
      (day.activities || []).forEach((a) => {
        if (a.info) {
          const infoLower = a.info.toLowerCase();
          const closedDay = `closed ${dayOfWeek.toLowerCase()}`;
          if (infoLower.includes(closedDay)) {
            warnings.push(
              `Day ${day.dayNumber} (${dayOfWeek}): "${a.name}" info says "${a.info}" — this venue may be closed on the new date!`
            );
          }
        }
      });
    });

    const updatedItinerary = { ...itinerary, days: newDays };

    await db
      .update(trips)
      .set({ itinerary: updatedItinerary, updated_at: new Date() })
      .where(eq(trips.id, id));

    return Response.json({
      success: true,
      days: newDays,
      warnings,
    });
  } catch (error) {
    console.error('PUT /api/trips/[id]/reorder-days error:', error);
    return Response.json({ error: 'Failed to reorder days' }, { status: 500 });
  }
}
