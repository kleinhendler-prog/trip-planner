/**
 * The single ownership gate for every /api/trips/[id]/* route.
 *
 * The trip is fetched filtered by BOTH id and owner, so a trip belonging to
 * someone else is indistinguishable from one that does not exist — both are
 * a plain 404. Returning 401 here would confirm that the trip is real.
 */

import { auth } from '@/app/api/auth/config';
import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';

export type TripAccessResult =
  | { ok: true; userId: string; trip: typeof trips.$inferSelect }
  | { ok: false; response: Response };

export async function requireTripAccess(tripId: string): Promise<TripAccessResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.user_id, session.user.id)));

  const trip = rows[0];
  if (!trip) {
    return {
      ok: false,
      response: Response.json({ error: 'Trip not found' }, { status: 404 }),
    };
  }

  return { ok: true, userId: session.user.id, trip };
}
