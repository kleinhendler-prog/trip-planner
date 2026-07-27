import { db, trips } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { generateTripItinerary } from '@/lib/generation/simple-pipeline';
import { requireTripAccess } from '@/lib/trip-access';

export const maxDuration = 300; // Vercel's Hobby ceiling; the old 120 was a 60s-era holdover

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Set only once requireTripAccess confirms ownership — guards the catch block's
  // best-effort failure write below so it can never touch a trip whose ownership
  // was never verified (e.g. the gate itself threw instead of returning 401/404).
  let ownerId: string | null = null;

  try {
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;
    ownerId = access.userId;

    if (access.trip.status === 'ready') {
      return Response.json({ ok: true, alreadyReady: true });
    }

    // Mark generation start time so we can detect stale/orphaned generations
    await db
      .update(trips)
      .set({ generation_started_at: new Date() })
      .where(eq(trips.id, id));

    await generateTripItinerary(id);
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('generate error:', error);

    // Best-effort: mark trip as failed even if the function is about to die —
    // but only if ownership was confirmed above; otherwise skip (see comment at top).
    if (ownerId) {
      const { id } = await params;
      try {
        await db
          .update(trips)
          .set({ status: 'failed' })
          .where(and(eq(trips.id, id), eq(trips.user_id, ownerId)));
      } catch (e) {
        console.error('Failed to mark trip as failed:', e);
      }
    }

    return Response.json(
      { error: 'Generation failed', message: String(error?.message || error).substring(0, 300) },
      { status: 500 }
    );
  }
}
