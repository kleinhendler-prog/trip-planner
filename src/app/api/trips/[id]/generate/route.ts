import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { generateTripItinerary } from '@/lib/generation/simple-pipeline';

export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: trip } = await (supabase as any)
      .from('trips')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!trip) return Response.json({ error: 'not found' }, { status: 404 });
    if (trip.user_id !== session.user.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (trip.status === 'ready') {
      return Response.json({ ok: true, alreadyReady: true });
    }

    // Mark generation start time so we can detect stale/orphaned generations
    await (supabase as any)
      .from('trips')
      .update({ generation_started_at: new Date().toISOString() })
      .eq('id', id);

    await generateTripItinerary(id);
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('generate error:', error);

    // Best-effort: mark trip as failed even if the function is about to die
    const { id } = await params;
    try {
      await (supabase as any)
        .from('trips')
        .update({ status: 'failed' })
        .eq('id', id);
    } catch (e) {
      console.error('Failed to mark trip as failed:', e);
    }

    return Response.json(
      { error: 'Generation failed', message: String(error?.message || error).substring(0, 300) },
      { status: 500 }
    );
  }
}
