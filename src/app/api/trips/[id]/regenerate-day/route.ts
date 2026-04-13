/**
 * Regenerate Day API Route
 * POST: Re-runs scheduling + narration for a specific day
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';
import * as prompts from '@/lib/generation/prompts';


/**
 * POST /api/trips/[id]/regenerate-day
 * Regenerate activities and itinerary for a single day
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
    const { day_index } = await request.json() as { day_index: number };

    if (typeof day_index !== 'number' || day_index < 0) {
      return Response.json(
        { error: 'Invalid day_index' },
        { status: 400 }
      );
    }

    // Verify trip belongs to user
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('userId', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Get days for this trip
    const { data: days, error: daysError } = await (supabase as any)
      .from('days')
      .select('*')
      .eq('tripId', id)
      .order('dayNumber', { ascending: true });

    if (daysError || !days || !days[day_index]) {
      return Response.json(
        { error: 'Day not found' },
        { status: 404 }
      );
    }

    const dayToRegenerate = days[day_index];

    // Use Claude to regenerate day activities with context
    const regenerationPrompt = prompts.getRegenerateDayPrompt(
      trip,
      dayToRegenerate,
      days,
      day_index
    );

    const regeneratedDay = await callClaudeJSON(regenerationPrompt) as any;

    // Parse response and update activities
    if (regeneratedDay && regeneratedDay.activities) {
      // Delete existing activities for this day
      await (supabase as any)
        .from('activities')
        .delete()
        .eq('dayId', dayToRegenerate.id);

      // Insert new activities
      const activitiesToInsert = regeneratedDay.activities.map((activity: any, index: number) => ({
        id: `${dayToRegenerate.id}-activity-${index}`,
        dayId: dayToRegenerate.id,
        title: activity.title,
        description: activity.description,
        type: activity.type,
        location: activity.location,
        googlePlacesId: activity.googlePlacesId,
        startTime: activity.startTime,
        endTime: activity.endTime,
        duration: activity.duration,
        estimatedCost: activity.estimatedCost,
        notes: activity.notes,
        bookingUrl: activity.bookingUrl,
        externalLinks: activity.externalLinks,
        order: index,
      }));

      const { error: insertError } = await (supabase as any)
        .from('activities')
        .insert(activitiesToInsert as any);

      if (insertError) {
        throw insertError;
      }
    }

    // Update day with new summary if provided
    if (regeneratedDay?.summary) {
      const { error: updateError } = await (supabase as any)
        .from('days')
        .update({ notes: regeneratedDay.summary })
        .eq('id', dayToRegenerate.id);

      if (updateError) {
        throw updateError;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(`POST /api/trips/[id]/regenerate-day error:`, error);
    return Response.json(
      { error: 'Failed to regenerate day' },
      { status: 500 }
    );
  }
}
