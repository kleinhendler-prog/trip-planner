/**
 * Book Toggle API Route
 * POST: Toggle booking status for an item
 */

import { auth } from '@/app/api/auth/config';
import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';


interface BookToggleRequest {
  item_id: string;
  booked: boolean;
}

/**
 * POST /api/trips/[id]/book-toggle
 * Atomically toggle item in trip's booked_items array
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { item_id, booked } = await request.json() as BookToggleRequest;

    if (!item_id || typeof booked !== 'boolean') {
      return Response.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Verify trip belongs to user
    const rows = await db
      .select({ booked_items: trips.booked_items })
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.user_id, session.user.id)));
    const trip = rows[0];

    if (!trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Get current booked items (default to empty array)
    const currentBookedItems = (trip.booked_items as string[]) || [];

    // Toggle item
    let updatedBookedItems: string[];
    if (booked) {
      // Add to booked items if not already there
      updatedBookedItems = Array.from(new Set([...currentBookedItems, item_id]));
    } else {
      // Remove from booked items
      updatedBookedItems = currentBookedItems.filter(id => id !== item_id);
    }

    // Update trip atomically
    await db
      .update(trips)
      .set({
        booked_items: updatedBookedItems,
        updated_at: new Date(),
      })
      .where(eq(trips.id, id));

    return Response.json({ success: true, booked_items: updatedBookedItems });
  } catch (error) {
    console.error(`POST /api/trips/[id]/book-toggle error:`, error);
    return Response.json(
      { error: 'Failed to toggle booking' },
      { status: 500 }
    );
  }
}
