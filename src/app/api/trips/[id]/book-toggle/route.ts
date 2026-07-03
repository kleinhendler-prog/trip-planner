/**
 * Book Toggle API Route
 * POST: Toggle booking status for an item
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';


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
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select('booked_items')
      .eq('id', id)
      .eq('userId', session.user.id)
      .single();

    if (tripError || !trip) {
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
    const { error: updateError } = await (supabase as any)
      .from('trips')
      .update({
        booked_items: updatedBookedItems,
        updatedAt: new Date(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({ success: true, booked_items: updatedBookedItems });
  } catch (error) {
    console.error(`POST /api/trips/[id]/book-toggle error:`, error);
    return Response.json(
      { error: 'Failed to toggle booking' },
      { status: 500 }
    );
  }
}
