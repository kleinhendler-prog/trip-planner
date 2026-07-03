/**
 * Source Vote API Route
 * POST: Increment upvotes/downvotes and auto-adjust trust
 */

import { supabaseServer as supabase } from '@/lib/supabase';


interface VoteRequest {
  vote: 'up' | 'down';
}

/**
 * POST /api/sources/[id]/vote
 * Vote on a source (up or down)
 * Auto-degrades trust if net downvotes >= 3
 * Auto-deactivates if net downvotes >= 6
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { vote } = await request.json() as VoteRequest;

    if (!['up', 'down'].includes(vote)) {
      return Response.json(
        { error: 'Vote must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Get current source
    const { data: source, error: fetchError } = await (supabase as any)
      .from('destination_sources')
      .select('upvotes, downvotes, trust_rating, active')
      .eq('id', id)
      .single();

    if (fetchError || !source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    const currentUpvotes = source.upvotes || 0;
    const currentDownvotes = source.downvotes || 0;

    // Update votes
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (vote === 'up') {
      updateData.upvotes = currentUpvotes + 1;
    } else {
      updateData.downvotes = currentDownvotes + 1;
    }

    // Calculate net downvotes
    const netDownvotes = updateData.downvotes - updateData.upvotes;

    // Auto-adjust trust based on net downvotes
    if (netDownvotes >= 6) {
      // Auto-deactivate
      updateData.active = false;
      updateData.trust_rating = 0;
    } else if (netDownvotes >= 3) {
      // Auto-degrade trust
      updateData.trust_rating = Math.max(0, (source.trust_rating || 5) - 1);
    }

    // Perform update
    const { data, error: updateError } = await (supabase as any)
      .from('destination_sources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      success: true,
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      trust_rating: data.trust_rating,
      active: data.active,
    });
  } catch (error) {
    console.error(`POST /api/sources/[id]/vote error:`, error);
    return Response.json(
      { error: 'Failed to vote on source' },
      { status: 500 }
    );
  }
}
