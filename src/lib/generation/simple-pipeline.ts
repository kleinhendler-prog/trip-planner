/**
 * Simple one-shot trip generation pipeline
 * Calls Claude once with all trip params to get a complete itinerary
 */

import { callClaudeJSON } from '../claude';
import { supabaseServer as supabase } from '../supabase';

export interface SimpleItinerary {
  summary: string;
  highlights: string[];
  days: Array<{
    dayNumber: number;
    date: string;
    theme: string;
    neighborhood?: string;
    activities: Array<{
      time: string;
      name: string;
      description: string;
      type: 'attraction' | 'meal' | 'transport' | 'experience' | 'rest';
      duration: string;
      location?: { name: string; address?: string };
      tips?: string;
      estimatedCost?: string;
    }>;
    narration?: string;
  }>;
  hotelRecommendations?: Array<{
    name: string;
    area: string;
    priceRange: string;
    why: string;
  }>;
  budgetEstimate?: {
    perDay: string;
    total: string;
    breakdown: string;
  };
  practicalTips?: string[];
}

function buildPrompt(trip: any): string {
  const profile = trip.profile || {};
  const prefs = profile.preferences || {};
  const interests = (prefs.interests || []).join(', ') || 'general sightseeing';
  const dislikes = (prefs.dislikes || []).join(', ') || 'none';
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const days = nights + 1;

  return `Create a ${days}-day itinerary for ${trip.destination} (${trip.start_date} to ${trip.end_date}).
Travelers: ${profile.travelers || 2} · Type: ${profile.tripType || 'cultural'} · Hotel: ${prefs.hotelPreference || 'comfort'}
Interests: ${interests} · Avoid: ${dislikes} · Currency: ${trip.currency || 'EUR'}

Real venue names, geographic clustering, specific times. Return ONLY this JSON (no markdown):

{
  "summary": "2 sentences",
  "highlights": ["5 items"],
  "days": [
    {
      "dayNumber": 1,
      "date": "${trip.start_date}",
      "theme": "short theme",
      "neighborhood": "main area",
      "activities": [
        {"time": "09:00", "name": "real venue", "description": "1-2 sentences", "type": "attraction|meal|experience|rest", "duration": "2 hours", "location": {"name": "venue", "address": "area"}, "tips": "one tip", "estimatedCost": "€X"}
      ],
      "narration": "2 sentences about the day"
    }
  ],
  "hotelRecommendations": [
    {"name": "real hotel", "area": "neighborhood", "priceRange": "€X-Y", "why": "one sentence"}
  ],
  "budgetEstimate": {"perDay": "€X", "total": "€Y", "breakdown": "food X, activities Y, transport Z"},
  "practicalTips": ["4 specific tips"]
}

Include 5-6 activities per day (breakfast/lunch/dinner + 2-3 attractions). 3 hotel recommendations.`;
}

export async function generateTripItinerary(tripId: string): Promise<SimpleItinerary> {
  // Fetch trip
  const { data: trip, error } = await (supabase as any)
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error || !trip) throw new Error('Trip not found');

  // Record job start
  await (supabase as any).from('generation_jobs').insert({
    trip_id: tripId,
    step: 'generating_itinerary',
    status: 'running',
  });

  try {
    const prompt = buildPrompt(trip);
    const itinerary = await callClaudeJSON<SimpleItinerary>(prompt, {
      maxTokens: 6000,
      temperature: 0.7,
    });

    // Save to trip
    await (supabase as any)
      .from('trips')
      .update({
        itinerary: itinerary,
        status: 'ready',
      })
      .eq('id', tripId);

    await (supabase as any).from('generation_jobs').insert({
      trip_id: tripId,
      step: 'generating_itinerary',
      status: 'completed',
    });

    return itinerary;
  } catch (err: any) {
    await (supabase as any)
      .from('trips')
      .update({ status: 'failed' })
      .eq('id', tripId);

    await (supabase as any).from('generation_jobs').insert({
      trip_id: tripId,
      step: 'generating_itinerary',
      status: 'failed',
      error: String(err?.message || err).substring(0, 500),
    });

    throw err;
  }
}
