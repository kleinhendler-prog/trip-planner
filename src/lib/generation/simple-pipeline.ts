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
      location?: { name: string; address?: string; lat?: number; lng?: number };
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

function buildTravelerProfileSection(userProfile: any): string {
  if (!userProfile || Object.keys(userProfile).length === 0) {
    return '';
  }

  const parts: string[] = [];

  const addIfExists = (key: string, label: string, value: any) => {
    if (!value) return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'string' && value.trim() === '') return;

    if (Array.isArray(value)) {
      parts.push(`  - ${label}: ${value.join(', ')}`);
    } else if (typeof value === 'string') {
      parts.push(`  - ${label}: ${value}`);
    } else {
      parts.push(`  - ${label}: ${String(value)}`);
    }
  };

  addIfExists('art', 'Art', userProfile.art);
  addIfExists('music', 'Music', userProfile.music);
  addIfExists('performingArts', 'Performing Arts', userProfile.performingArts);
  addIfExists('visualArt', 'Visual Art', userProfile.visualArt);
  addIfExists('cuisinesLoved', 'Loves cuisines', userProfile.cuisinesLoved);
  addIfExists('cuisinesAvoided', 'Avoid cuisines', userProfile.cuisinesAvoided);
  addIfExists('diningStyle', 'Dining style', userProfile.diningStyle);
  addIfExists('dietary', 'Dietary', userProfile.dietary);
  addIfExists('drinks', 'Drinks', userProfile.drinks);
  if (userProfile.foodAdventurousness) {
    parts.push(`  - Food adventurousness: ${userProfile.foodAdventurousness}/5`);
  }
  addIfExists('historyEras', 'History eras', userProfile.historyEras);
  addIfExists('historySites', 'History sites', userProfile.historySites);
  addIfExists('historyDepth', 'History engagement', userProfile.historyDepth);
  addIfExists('hikingLevel', 'Hiking level', userProfile.hikingLevel);
  addIfExists('waterActivities', 'Water activities', userProfile.waterActivities);
  addIfExists('landscapes', 'Landscapes', userProfile.landscapes);
  addIfExists('wildlife', 'Wildlife', userProfile.wildlife);
  addIfExists('gardens', 'Gardens', userProfile.gardens);
  addIfExists('funAttractions', 'Attractions', userProfile.funAttractions);
  addIfExists('shopping', 'Shopping', userProfile.shopping);
  addIfExists('wellness', 'Wellness', userProfile.wellness);
  addIfExists('sportsWatching', 'Sports to watch', userProfile.sportsWatching);
  addIfExists('sportsDoing', 'Sports to do', userProfile.sportsDoing);
  addIfExists('nightlife', 'Nightlife', userProfile.nightlife);
  addIfExists('tourStyle', 'Tour style', userProfile.tourStyle);
  addIfExists('transportPreferred', 'Transport', userProfile.transportPreferred);
  addIfExists('accessibility', 'Accessibility', userProfile.accessibility);
  addIfExists('pace', 'Pace', userProfile.pace);
  addIfExists('chronotype', 'Chronotype', userProfile.chronotype);
  addIfExists('planningStyle', 'Planning style', userProfile.planningStyle);
  addIfExists('budgetBand', 'Budget band', userProfile.budgetBand);
  addIfExists('splurgeOn', 'Splurges on', userProfile.splurgeOn);
  addIfExists('pastTripBest', 'Best past trip', userProfile.pastTripBest);
  addIfExists('pastTripWorst', 'Worst past trip', userProfile.pastTripWorst);
  addIfExists('bucketList', 'Bucket list', userProfile.bucketList);
  addIfExists('additionalNotes', 'Notes', userProfile.additionalNotes);

  if (parts.length === 0) return '';

  return 'Traveler Profile:\n' + parts.join('\n') + '\n\n';
}

function buildPrompt(trip: any, userProfile?: any): string {
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
  const tripType = trip.trip_type || 'single_city';

  const travelerProfileSection = buildTravelerProfileSection(userProfile);

  // Trip-type-specific context
  let tripContext = '';
  if (tripType === 'area') {
    const lodging = trip.trip_overrides?.lodgingPattern || 'hub';
    const selectedStays = trip.trip_overrides?.selectedStays || [];
    tripContext = `This is an AREA trip across a region (not a single city). Lodging pattern: ${lodging}. ${selectedStays.length > 0 ? 'Selected overnight bases: ' + selectedStays.map((s: any) => `${s.location} (${s.nights}n)`).join(', ') + '. Cluster each day around the base where you sleep that night.' : 'Propose 2-3 overnight bases with drive times between them.'}`;
  } else if (tripType === 'road_trip') {
    const start = trip.trip_overrides?.startPoint || trip.destination;
    const end = trip.trip_overrides?.endPoint || '';
    const maxDriveHours = trip.trip_overrides?.maxDriveHours || 4;
    tripContext = `This is a ROAD TRIP from ${start} to ${end}. Max ${maxDriveHours} driving hours/day. Plan daily legs with scenic stops en route. Each day should have a clear start→overnight location with stops along the way. Provide driving times and distances between waypoints.`;
  }

  return `Create a ${days}-day itinerary for ${trip.destination} (${trip.start_date} to ${trip.end_date}).
Travelers: ${profile.travelers || 2} · Type: ${profile.tripType || 'cultural'} · Hotel: ${prefs.hotelPreference || 'comfort'}
Interests: ${interests} · Avoid: ${dislikes} · Currency: ${trip.currency || 'EUR'}
${tripContext ? '\n' + tripContext + '\n' : ''}
${travelerProfileSection}Use this detailed traveler profile to tailor venue choices, pacing, dining recommendations, and activity intensity.

Real venue names, geographic clustering. Concise descriptions (max 1 sentence each). Include approximate lat/lng for each activity (decimal degrees). Return ONLY valid JSON (no markdown):

{
  "summary": "1 sentence",
  "highlights": ["4 short items"],
  "days": [
    {"dayNumber": 1, "date": "${trip.start_date}", "theme": "2-3 word theme", "neighborhood": "main area", "activities": [{"time": "09:00", "name": "real venue", "description": "1 short sentence", "type": "attraction", "duration": "2h", "location": {"name": "venue", "lat": 41.8902, "lng": 12.4922}, "tips": "brief tip", "estimatedCost": "€X"}], "narration": "1 short sentence"}
  ],
  "hotelRecommendations": [{"name": "real hotel", "area": "area", "priceRange": "€X-Y", "why": "brief"}],
  "budgetEstimate": {"perDay": "€X", "total": "€Y", "breakdown": "food/activities/transport"},
  "practicalTips": ["3 tips"]
}

5 activities per day. 2 hotel options. Keep strings SHORT to fit token limit. lat/lng required for every activity.`;
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
    // Fetch user profile
    const { data: profileRow } = await (supabase as any)
      .from('user_profiles')
      .select('profile')
      .eq('user_id', trip.user_id)
      .single();

    const userProfile = profileRow?.profile || {};

    const prompt = buildPrompt(trip, userProfile);
    const itinerary = await callClaudeJSON<SimpleItinerary>(prompt, {
      maxTokens: 8000,
      temperature: 0.5,
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
