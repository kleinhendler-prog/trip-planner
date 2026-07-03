/**
 * Swap Activity API Route
 * POST: Replace an activity and recalculate transit times
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';
import { getTransitTime } from '@/lib/transit';


interface SwapActivityRequest {
  day_index: number;
  activity_index: number;
}

/**
 * POST /api/trips/[id]/swap-activity
 * Get replacement activity from shortlist via Claude and update trip
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
    const { day_index, activity_index } = await request.json() as SwapActivityRequest;

    if (typeof day_index !== 'number' || typeof activity_index !== 'number') {
      return Response.json(
        { error: 'Invalid parameters' },
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

    // Get the day
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

    const day = days[day_index];

    // Get activities for this day
    const { data: activities, error: activitiesError } = await (supabase as any)
      .from('activities')
      .select('*')
      .eq('dayId', day.id)
      .order('order', { ascending: true });

    if (activitiesError || !activities || !activities[activity_index]) {
      return Response.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activityToReplace = activities[activity_index];

    // Get attraction shortlist from destination sources
    const shortlist = await getAttractionShortlist(trip.destination, trip.preferences);

    // Use Claude to pick a replacement
    const replacement = await callClaudeJSON(`You are selecting a replacement activity for a trip to ${trip.destination}.

Current activity being replaced:
- Title: ${activityToReplace.title}
- Type: ${activityToReplace.type}
- Start time: ${activityToReplace.startTime}

Available alternatives from the destination:
${shortlist.map((a: any) => `- ${a.name} (${a.type}): ${a.description}`).join('\n')}

Return a JSON object with the best replacement activity matching the original's timing and type:
{
  "name": "Activity Name",
  "description": "Description",
  "type": "activity type",
  "estimatedCost": number,
  "location": {
    "name": "Location Name",
    "lat": number,
    "lng": number
  }
}`) as any;

    // Update the activity
    const { error: updateError } = await (supabase as any)
      .from('activities')
      .update({
        title: replacement.name,
        description: replacement.description,
        type: replacement.type,
        estimatedCost: replacement.estimatedCost,
        location: replacement.location,
      })
      .eq('id', activityToReplace.id);

    if (updateError) {
      throw updateError;
    }

    // Recalculate transit times for neighboring activities
    if (activity_index > 0) {
      const prevActivity = activities[activity_index - 1];
      const transit = await getTransitTime(
        prevActivity.location?.lat || 0,
        prevActivity.location?.lng || 0,
        replacement.location?.lat || 0,
        replacement.location?.lng || 0
      );

      // You could store transit time as a separate entity or update activity notes
      await (supabase as any)
        .from('activities')
        .update({
          notes: `Transit time from previous: ${transit.durationMinutes} minutes`,
        })
        .eq('id', activityToReplace.id);
    }

    if (activity_index < activities.length - 1) {
      const nextActivity = activities[activity_index + 1];
      const transit = await getTransitTime(
        replacement.location?.lat || 0,
        replacement.location?.lng || 0,
        nextActivity.location?.lat || 0,
        nextActivity.location?.lng || 0
      );

      // Store transit info
      await (supabase as any)
        .from('activities')
        .update({
          notes: `Transit time to next: ${transit.durationMinutes} minutes`,
        })
        .eq('id', nextActivity.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(`POST /api/trips/[id]/swap-activity error:`, error);
    return Response.json(
      { error: 'Failed to swap activity' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get attraction shortlist from destination sources
 */
async function getAttractionShortlist(destination: string, preferences: any) {
  try {
    const { data: sources, error } = await (supabase as any)
      .from('destination_sources')
      .select('content')
      .eq('destination_key', destination.toLowerCase().replace(/\s+/g, '-'))
      .eq('active', true)
      .order('trust_rating', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching sources:', error);
      return [];
    }

    // Parse attractions from sources
    const attractions: any[] = [];
    if (sources) {
      for (const source of sources) {
        const parsed = typeof source.content === 'string'
          ? JSON.parse(source.content)
          : source.content;
        if (parsed.attractions) {
          attractions.push(...parsed.attractions.slice(0, 3));
        }
      }
    }

    return attractions.slice(0, 10);
  } catch (error) {
    console.error('Error getting attraction shortlist:', error);
    return [];
  }
}
