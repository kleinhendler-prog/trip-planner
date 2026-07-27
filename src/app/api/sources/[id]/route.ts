/**
 * Single Source API Routes
 * PATCH: Update source (trust rating, active)
 * DELETE: Delete source
 */

import { auth } from '@/app/api/auth/config';
import { db, destination_sources } from '@/lib/db';
import { and, eq } from 'drizzle-orm';

/**
 * PATCH /api/sources/[id]
 * Update source trust rating and active status
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json() as any;

    // Verify source exists and was created by this user — filtered by BOTH
    // id and creator so a source belonging to someone else is
    // indistinguishable from one that does not exist (both 404, never 401).
    const rows = await db
      .select({ created_by: destination_sources.created_by })
      .from(destination_sources)
      .where(and(eq(destination_sources.id, id), eq(destination_sources.created_by, session.user.id)));
    const source = rows[0];

    if (!source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    const trustRating = body.trust_rating ?? body.trustRating;
    if (trustRating !== undefined) {
      updateData.trust_rating = trustRating;
    }

    if (body.active !== undefined) {
      updateData.active = body.active;
    }

    const updated = await db
      .update(destination_sources)
      .set(updateData)
      .where(eq(destination_sources.id, id))
      .returning();

    return Response.json(updated[0]);
  } catch (error) {
    console.error(`PATCH /api/sources/[id] error:`, error);
    return Response.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sources/[id]
 * Delete a destination source
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

    // Verify source belongs to user — filtered by BOTH id and creator so a
    // source belonging to someone else is indistinguishable from one that
    // does not exist (both 404, never 401).
    const rows = await db
      .select({ created_by: destination_sources.created_by })
      .from(destination_sources)
      .where(and(eq(destination_sources.id, id), eq(destination_sources.created_by, session.user.id)));
    const source = rows[0];

    if (!source) {
      return Response.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    await db.delete(destination_sources).where(eq(destination_sources.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/sources/[id] error:`, error);
    return Response.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}
