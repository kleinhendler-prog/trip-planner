/**
 * Apply Weather Swaps API Route
 * POST: Replace outdoor activities with rainy day alternatives
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';


interface WeatherSwapsRequest {
  day_index: number;
  accept: 'all' | string[]; // 'all' or array of activity IDs
}

/**
 * POST /api/trips/[id]/apply-weather-swaps
 * Replace outdoor activities with rainy day alternatives
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
    const { day_index, accept } = await request.json() as WeatherSwapsRequest;

    if (typeof day_index !== 'number' || !accept) {
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

    if (activitiesError || !activities) {
      return Response.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Determine which activities to swap
    const activitiesToSwap = accept === 'all'
      ? activities.filter((a: any) => isOutdoorActivity(a.type))
      : activities.filter((a: any) => typeof accept === 'string' ? false : accept.includes(a.id));

    // For each outdoor activity, get a rainy-day alternative
    for (const activity of activitiesToSwap) {
      try {
        const alternative = await getIndoorAlternative(
          trip.destination,
          activity,
          trip.preferences
        );

        if (alternative) {
          await (supabase as any)
            .from('activities')
            .update({
              title: alternative.name,
              description: alternative.description,
              type: alternative.type,
              location: alternative.location,
              notes: `(Rainy day swap) ${alternative.notes || ''}`,
            })
            .eq('id', activity.id);
        }
      } catch (error) {
        console.error(`Failed to swap activity ${activity.id}:`, error);
      }
    }

    return Response.json({ success: true, swapped_count: activitiesToSwap.length });
  } catch (error) {
    console.error(`POST /api/trips/[id]/apply-weather-swaps error:`, error);
    return Response.json(
      { error: 'Failed to apply weather swaps' },
      { status: 500 }
    );
  }
}

/**
 * Check if activity type is typically outdoor
 */
function isOutdoorActivity(type: string): boolean {
  const outdoorTypes = ['hiking', 'sightseeing', 'beaches', 'sports', 'adventure'];
  return outdoorTypes.some(t => type.toLowerCase().includes(t));
}

/**
 * Get indoor alternative activity via Claude
 */
async function getIndoorAlternative(
  destination: string,
  activity: any,
  preferences: any
): Promise<any> {
  try {
    const alternative = await callClaudeJSON(`Find an indoor alternative for a rainy day in ${destination}.

Original activity:
- Title: ${activity.title}
- Type: ${activity.type}
- Description: ${activity.description || 'N/A'}

Return a JSON object with an indoor alternative:
{
  "name": "Activity Name",
  "type": "activity or dining",
  "description": "Description of the indoor activity",
  "location": {
    "name": "Location Name",
    "lat": 0,
    "lng": 0
  },
  "notes": "Why this is a good rainy day alternative"
}`);

    return alternative;
  } catch (error) {
    console.error('Error getting indoor alternative:', error);
    return null;
  }
}
