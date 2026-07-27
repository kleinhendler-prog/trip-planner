/**
 * What's Nearby API
 * POST: Get 2-3 nearby suggestions for a specific activity
 */

import { db, user_profiles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { callClaudeJSON } from '@/lib/claude';
import type { SimpleItinerary } from '@/lib/generation/simple-pipeline';
import { requireTripAccess } from '@/lib/trip-access';

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
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;

    const trip: any = access.trip;
    const { day_index, activity_index } = (await request.json()) as NearbyRequest;

    const itinerary = trip.itinerary as SimpleItinerary;
    const activity = itinerary?.days?.[day_index]?.activities?.[activity_index];
    if (!activity) {
      return Response.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Fetch user profile
    const profileRows = await db
      .select({ profile: user_profiles.profile })
      .from(user_profiles)
      .where(eq(user_profiles.user_id, trip.user_id));

    const userProfile = (profileRows[0]?.profile as any) || {};
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
