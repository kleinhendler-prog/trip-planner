/**
 * Source Vote API Route
 * POST: Increment upvotes/downvotes and auto-adjust trust
 */

import { db, destination_sources } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface VoteRequest {
  vote: 'up' | 'down';
}

/** Trust tiers are text: degrade one step per threshold */
function degradeTrust(tier: string | null): string {
  if (tier === 'high') return 'medium';
  if (tier === 'medium') return 'low';
  return 'low';
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
    const rows = await db
      .select({
        upvotes: destination_sources.upvotes,
        downvotes: destination_sources.downvotes,
        trust_rating: destination_sources.trust_rating,
        active: destination_sources.active,
      })
      .from(destination_sources)
      .where(eq(destination_sources.id, id));
    const source = rows[0];

    if (!source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    const upvotes = (source.upvotes || 0) + (vote === 'up' ? 1 : 0);
    const downvotes = (source.downvotes || 0) + (vote === 'down' ? 1 : 0);

    const updateData: Record<string, unknown> = {
      upvotes,
      downvotes,
      updated_at: new Date(),
    };

    // Auto-adjust trust based on net downvotes
    const netDownvotes = downvotes - upvotes;
    if (netDownvotes >= 6) {
      updateData.active = false;
      updateData.trust_rating = 'low';
    } else if (netDownvotes >= 3) {
      updateData.trust_rating = degradeTrust(source.trust_rating);
    }

    const updated = await db
      .update(destination_sources)
      .set(updateData)
      .where(eq(destination_sources.id, id))
      .returning();
    const data = updated[0];

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
