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
  const nights = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const days = nights + 1;

  return `You are an expert travel planner. Create a complete, detailed, personalized itinerary for this trip:

Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date} (${days} days)
Travelers: ${profile.travelers || 2} adults
Trip type: ${profile.tripType || 'cultural'}
Interests: ${interests}
Avoid: ${dislikes}
Hotel preference: ${prefs.hotelPreference || 'comfort'}
Currency: ${trip.currency || 'EUR'}

Create a day-by-day itinerary with specific times (morning/afternoon/evening or HH:MM), real attraction names, restaurants, and local experiences. Include practical tips, typical costs, and walking/transit advice. Group activities geographically to minimize travel time.

Respond with ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence trip overview",
  "highlights": ["5-7 key highlights"],
  "days": [
    {
      "dayNumber": 1,
      "date": "${trip.start_date}",
      "theme": "short day theme",
      "neighborhood": "main neighborhood for the day",
      "activities": [
        {
          "time": "09:00",
          "name": "specific attraction or restaurant name",
          "description": "2-3 sentence description with what to see/do/eat",
          "type": "attraction|meal|transport|experience|rest",
          "duration": "e.g. 2 hours",
          "location": {"name": "exact name", "address": "neighborhood or street"},
          "tips": "specific insider tip",
          "estimatedCost": "e.g. €15-20 per person"
        }
      ],
      "narration": "3-4 sentences painting a picture of the day's flow"
    }
  ],
  "hotelRecommendations": [
    {"name": "real hotel name", "area": "neighborhood", "priceRange": "e.g. €150-250/night", "why": "why it fits"}
  ],
  "budgetEstimate": {
    "perDay": "e.g. €150-250 per person per day",
    "total": "total for the trip",
    "breakdown": "rough breakdown"
  },
  "practicalTips": ["5-8 specific tips"]
}

Include 5-7 activities per day including meals. Use real, existing venue names. Return ONLY the JSON, no preamble or markdown.`;
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
      maxTokens: 8000,
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
      error: err?.message || 'Generation failed',
    });

    throw err;
  }
}
