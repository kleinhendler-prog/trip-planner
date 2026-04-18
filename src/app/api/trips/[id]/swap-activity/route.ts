/**
 * Suggest Alternative Activity API
 * POST: Get a Claude-generated alternative for a specific activity
 * PUT:  Apply (approve) a suggested alternative into the itinerary
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';
import type { SimpleItinerary, ItineraryActivity } from '@/lib/generation/simple-pipeline';

interface SuggestRequest {
  day_index: number;
  activity_index: number;
  attempt?: number; // 1-3, for re-suggest tracking
}

interface ApproveRequest {
  day_index: number;
  activity_index: number;
  replacement: ItineraryActivity;
}

/**
 * POST /api/trips/[id]/swap-activity
 * Suggest an alternative activity (does NOT auto-apply)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { day_index, activity_index, attempt = 1 } = (await request.json()) as SuggestRequest;

    if (typeof day_index !== 'number' || typeof activity_index !== 'number') {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (attempt > 3) {
      return Response.json({ error: 'Maximum 3 re-suggestions allowed' }, { status: 400 });
    }

    // Fetch trip
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    const itinerary = trip.itinerary as SimpleItinerary;
    if (!itinerary?.days?.[day_index]) {
      return Response.json({ error: 'Day not found' }, { status: 404 });
    }

    const day = itinerary.days[day_index];
    const activity = day.activities?.[activity_index];
    if (!activity) {
      return Response.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Collect ALL existing activity names across the entire trip to avoid duplicates
    const existingNames = itinerary.days
      .flatMap((d) => (d.activities || []).map((a) => a.name))
      .filter(Boolean);

    // Fetch user profile for personalization
    const { data: profileRow } = await (supabase as any)
      .from('user_profiles')
      .select('profile')
      .eq('user_id', trip.user_id)
      .single();

    const userProfile = profileRow?.profile || {};
    const profileHints = Object.entries(userProfile)
      .filter(([_, v]) => v && (typeof v === 'string' || (Array.isArray(v) && v.length > 0)))
      .slice(0, 10)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');

    // Build the prompt for Claude
    const prevActivity = activity_index > 0 ? day.activities[activity_index - 1] : null;
    const nextActivity = activity_index < day.activities.length - 1 ? day.activities[activity_index + 1] : null;

    const prompt = `Suggest ONE alternative activity to replace "${activity.name}" in a trip to ${trip.destination}.

Day ${day.dayNumber} (${day.date}), theme: "${day.theme}", neighborhood: ${day.neighborhood || 'flexible'}
Time slot: ${activity.time}, Duration: ${activity.duration}, Type: ${activity.type}
${prevActivity ? `Previous activity: "${prevActivity.name}" at ${prevActivity.location?.address || prevActivity.location?.name}` : 'This is the first activity of the day.'}
${nextActivity ? `Next activity: "${nextActivity.name}" at ${nextActivity.location?.address || nextActivity.location?.name}` : 'This is the last activity of the day.'}

${profileHints ? `Traveler preferences:\n${profileHints}\n` : ''}

CRITICAL RULES:
1. The alternative MUST NOT be any of these (already in the trip): ${existingNames.join(', ')}
2. It should fit the same time slot and approximate duration.
3. It should be geographically close to the surrounding activities.
4. It must be a REAL place with accurate coordinates and opening hours.
5. Include all required fields exactly as specified below.
6. This is attempt ${attempt}/3 — ${attempt > 1 ? 'suggest something DIFFERENT from previous suggestions.' : 'pick the best match.'}

Return ONLY valid JSON (no markdown):
{
  "time": "${activity.time}",
  "name": "Place Name",
  "description": "1 sentence",
  "type": "${activity.type}",
  "duration": "${activity.duration}",
  "location": {"name": "Place Name", "address": "Full address", "lat": 0.0, "lng": 0.0},
  "info": "Opening hours and closure days",
  "tips": "Actionable pre-visit advice",
  "estimatedCost": "€X",
  "reservationStatus": "REQUIRED|RECOMMENDED|WALK_IN_OK",
  "priority": ${activity.priority || 3},
  "guideNarration": "2-3 engaging sentences about this place",
  "transitFromPrev": "${prevActivity ? 'X min walk/metro' : ''}",
  "isOutdoor": false,
  "rainyDayAlternative": "Indoor backup name",
  "bookingUrl": "URL if applicable",
  "whySuggested": "1 sentence explaining why this is a good alternative"
}`;

    const suggestion = await callClaudeJSON<ItineraryActivity & { whySuggested?: string }>(prompt, {
      maxTokens: 1500,
      temperature: 0.7 + (attempt - 1) * 0.1, // Slightly more creative on re-suggests
    });

    return Response.json({
      suggestion,
      attempt,
      maxAttempts: 3,
      replacing: {
        name: activity.name,
        dayIndex: day_index,
        activityIndex: activity_index,
      },
    });
  } catch (error) {
    console.error('POST /api/trips/[id]/swap-activity error:', error);
    return Response.json({ error: 'Failed to suggest alternative' }, { status: 500 });
  }
}

/**
 * PUT /api/trips/[id]/swap-activity
 * Apply (approve) a suggested alternative into the itinerary
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { day_index, activity_index, replacement } = (await request.json()) as ApproveRequest;

    if (typeof day_index !== 'number' || typeof activity_index !== 'number' || !replacement) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch trip
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    const itinerary = trip.itinerary as SimpleItinerary;
    if (!itinerary?.days?.[day_index]?.activities?.[activity_index]) {
      return Response.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Remove whySuggested before saving (it's UI-only)
    const { whySuggested, ...cleanReplacement } = replacement as any;

    // Replace the activity in the itinerary
    const updatedItinerary = { ...itinerary };
    updatedItinerary.days = [...itinerary.days];
    updatedItinerary.days[day_index] = { ...itinerary.days[day_index] };
    updatedItinerary.days[day_index].activities = [...itinerary.days[day_index].activities];
    updatedItinerary.days[day_index].activities[activity_index] = cleanReplacement;

    // Recalculate daily budget if we have cost info
    const dayActivities = updatedItinerary.days[day_index].activities;
    const actCost = dayActivities
      .filter((a: ItineraryActivity) => a.type !== 'meal')
      .reduce((s: number, a: ItineraryActivity) => s + parseCostNum(a.estimatedCost), 0);
    const mealCost = dayActivities
      .filter((a: ItineraryActivity) => a.type === 'meal')
      .reduce((s: number, a: ItineraryActivity) => s + parseCostNum(a.estimatedCost), 0);

    updatedItinerary.days[day_index].dailyBudget = {
      activities: actCost,
      meals: mealCost,
      total: actCost + mealCost,
    };

    // Save updated itinerary
    const { error: updateError } = await (supabase as any)
      .from('trips')
      .update({ itinerary: updatedItinerary })
      .eq('id', id);

    if (updateError) throw updateError;

    return Response.json({
      success: true,
      updatedDay: updatedItinerary.days[day_index],
    });
  } catch (error) {
    console.error('PUT /api/trips/[id]/swap-activity error:', error);
    return Response.json({ error: 'Failed to apply alternative' }, { status: 500 });
  }
}

/** Parse cost string like "€16" to number */
function parseCostNum(c: string | undefined): number {
  if (!c) return 0;
  const n = parseFloat(c.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
