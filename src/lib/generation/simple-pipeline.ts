/**
 * Trip generation pipeline — one-shot Claude call producing a rich itinerary
 */

import { callClaudeJSON } from '../claude';
import { supabaseServer as supabase } from '../supabase';

/* ── Rich Itinerary Types ────────────────────────────────── */

export interface ActivityLocation {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ItineraryActivity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'meal' | 'transport' | 'experience' | 'rest';
  duration: string;
  location: ActivityLocation;
  info: string;            // Opening hours, closure days
  tips?: string;           // Actionable pre-visit advice
  estimatedCost?: string;  // e.g. "€16"
  reservationStatus: 'REQUIRED' | 'RECOMMENDED' | 'WALK_IN_OK';
  priority: number;        // 1-5, higher = more important
  guideNarration?: string; // Tour-guide-style text for priority >= 4
  transitFromPrev?: string; // e.g. "12 min walk" or "8 min metro"
  isOutdoor?: boolean;
  rainyDayAlternative?: string; // Name of indoor backup if outdoor
  bookingUrl?: string;     // Direct booking link if known
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme: string;
  neighborhood?: string;
  activities: ItineraryActivity[];
  narration?: string;
  dailyBudget?: { activities: number; meals: number; total: number };
}

export interface HotelRecommendation {
  name: string;
  area: string;
  priceRange: string;
  why: string;
  bookingUrl?: string;
  starRating?: number;
}

export interface LocalFind {
  name: string;
  type: 'tasting' | 'shop' | 'street' | 'market' | 'workshop' | 'experience';
  description: string;
  location?: ActivityLocation;
  estimatedCost?: string;
}

export interface SimpleItinerary {
  summary: string;
  highlights: string[];
  days: ItineraryDay[];
  hotelRecommendations?: HotelRecommendation[];
  budgetEstimate?: {
    perDay: string;
    total: string;
    breakdown: string;
    activitiesTotal: number;
    mealsTotal: number;
    hotelsTotal: number;
  };
  practicalTips?: string[];
  localFinds?: LocalFind[];
  climateNote?: string;
}

/* ── Traveler Profile Builder ───────────────────────────── */

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

/* ── Prompt Builder ─────────────────────────────────────── */

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

Real venue names, geographic clustering. Concise descriptions (1 sentence max). Return ONLY valid JSON (no markdown).

CRITICAL RULES:
1. EVERY activity MUST have "location" with "lat" and "lng" (decimal degrees). No exceptions.
2. EVERY activity MUST have "info" with opening hours and closure days. Account for holidays — NEVER schedule on closed days.
3. EVERY activity MUST have "reservationStatus": "REQUIRED" (must book ahead), "RECOMMENDED" (walk-ins risky), or "WALK_IN_OK".
4. EVERY activity MUST have "priority": 1-5. Top 2-3 attractions per day get 4-5; meals get 2-3.
5. Activities with priority >= 4 MUST have "guideNarration": 2-3 sentences of engaging, tour-guide-style narration adapted to the traveler profile.
6. EVERY activity (except the first of each day) MUST have "transitFromPrev": e.g. "8 min walk", "15 min metro", "~20 min bus".
7. Outdoor activities MUST have "isOutdoor": true and "rainyDayAlternative": name of a nearby indoor alternative.
8. REQUIRED/RECOMMENDED items should have "bookingUrl" if known (official site or constructed search URL).
9. Tips must be ACTIONABLE PRE-VISIT advice. Scheduling and tips must be consistent.
10. Include "dailyBudget" per day: {"activities": N, "meals": N, "total": N} as numbers in ${trip.currency || 'EUR'}.
11. Include "localFinds": 5-10 local tastings, shops, markets, workshops, or beautiful streets worth exploring.
12. Include "climateNote": 1 sentence about typical weather for this destination during the trip dates.

JSON structure:
{
  "summary": "1 sentence",
  "highlights": ["4 items"],
  "climateNote": "Weather summary for these dates",
  "days": [
    {"dayNumber": 1, "date": "${trip.start_date}", "theme": "short theme", "neighborhood": "area",
     "dailyBudget": {"activities": 50, "meals": 60, "total": 110},
     "activities": [
       {"time": "09:00", "name": "Colosseum", "description": "Iconic Roman amphitheatre", "type": "attraction", "duration": "2h",
        "location": {"name": "Colosseum", "address": "Piazza del Colosseo", "lat": 41.8902, "lng": 12.4922},
        "info": "Open 9:00-19:00 daily. Last entry 1h before.", "tips": "Book at coopculture.it to skip queue",
        "estimatedCost": "€16", "reservationStatus": "REQUIRED", "priority": 5, "bookingUrl": "https://www.coopculture.it",
        "guideNarration": "Step through the same arches gladiators used 2000 years ago. This 50,000-seat arena hosted spectacles from dawn to dusk.",
        "isOutdoor": true, "rainyDayAlternative": "Palazzo Doria Pamphilj"},
       {"time": "12:00", "name": "Roscioli", "description": "Famous Roman pasta", "type": "meal", "duration": "1h",
        "location": {"name": "Roscioli", "address": "Via dei Giubbonari 21", "lat": 41.8955, "lng": 12.4730},
        "info": "Lunch 12:30-14:30, Dinner 19:00-23:00. Closed Sun.", "tips": "Reserve 2 days ahead",
        "estimatedCost": "€25", "reservationStatus": "RECOMMENDED", "priority": 3, "transitFromPrev": "12 min walk"}
     ],
     "narration": "1 short sentence about the day"
    }
  ],
  "hotelRecommendations": [{"name": "Hotel Eden", "area": "Via Veneto", "priceRange": "€200-350", "why": "brief reason", "starRating": 5, "bookingUrl": "https://booking.com/search?ss=Hotel+Eden+Rome"}],
  "budgetEstimate": {"perDay": "€X", "total": "€Y", "breakdown": "summary", "activitiesTotal": 200, "mealsTotal": 300, "hotelsTotal": 1000},
  "practicalTips": ["3-4 tips"],
  "localFinds": [{"name": "Supplizio", "type": "tasting", "description": "Best supplì in Rome", "location": {"name": "Supplizio", "lat": 41.8986, "lng": 12.4733}, "estimatedCost": "€5"}]
}

5 activities per day. 2 hotel options. Keep strings SHORT. Every field listed above is REQUIRED — omitting any field is invalid.`;
}

/* ── Generation Function ────────────────────────────────── */

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
      maxTokens: 12000,
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
