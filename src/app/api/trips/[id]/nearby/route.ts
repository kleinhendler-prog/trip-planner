/**
 * What's Nearby API
 * POST: Get 2-3 nearby suggestions for a specific activity
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';
import type { SimpleItinerary } from '@/lib/generation/simple-pipeline';

interface NearbyRequest {
  day_index: number;
  activity_index: number;
}

interface NearbySuggestion {
  name: string;
  type: string;
  description: string;
  distance: string;      // e.g. "3 min walk"
  estimatedCost?: string;
  location?: { lat: number; lng: number };
  whyRelevant: string;   // e.g. "Great for art lovers"
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { day_index, activity_index } = (await request.json()) as NearbyRequest;

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
    const activity = itinerary?.days?.[day_index]?.activities?.[activity_index];
    if (!activity) {
      return Response.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Fetch user profile
    const { data: profileRow } = await (supabase as any)
      .from('user_profiles')
      .select('profile')
      .eq('user_id', trip.user_id)
      .single();

    const userProfile = profileRow?.profile || {};
    const profileHints = Object.entries(userProfile)
      .filter(([_, v]) => v && (typeof v === 'string' || (Array.isArray(v) && v.length > 0)))
      .slice(0, 8)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(', ');

    // Existing activity names to avoid duplicates
    const existingNames = itinerary.days
      .flatMap((d) => (d.activities || []).map((a) => a.name))
      .filter(Boolean);

    const prompt = `Suggest 3 nearby points of interest near "${activity.name}" (${activity.location?.address || activity.location?.name}) in ${trip.destination}.
The traveler will be here at ${activity.time} for ${activity.duration}.
${profileHints ? `Traveler interests: ${profileHints}` : ''}

DO NOT suggest any of these (already in the trip): ${existingNames.join(', ')}

Return ONLY valid JSON (no markdown):
{"suggestions": [
  {"name": "Place Name", "type": "cafe|shop|viewpoint|gallery|park|monument|market", "description": "1 sentence", "distance": "3 min walk", "estimatedCost": "€5 or Free", "location": {"lat": 0.0, "lng": 0.0}, "whyRelevant": "1 sentence explaining why this fits the traveler"}
]}

Suggestions should be REAL places within 5 minutes walk. Diverse types preferred.`;

    const result = await callClaudeJSON<{ suggestions: NearbySuggestion[] }>(prompt, {
      maxTokens: 1200,
      temperature: 0.6,
    });

    return Response.json({
      suggestions: result.suggestions || [],
      forActivity: {
        name: activity.name,
        dayIndex: day_index,
        activityIndex: activity_index,
      },
    });
  } catch (error) {
    console.error('POST /api/trips/[id]/nearby error:', error);
    return Response.json({ error: 'Failed to get nearby suggestions' }, { status: 500 });
  }
}
