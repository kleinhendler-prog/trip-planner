/**
 * Trip generation pipeline — one-shot Claude call producing a rich itinerary
 */

import { callClaudeJSON } from '../claude';
import { supabaseServer as supabase } from '../supabase';
import { validateItinerary } from './qa-simulator';

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
  parkingSuggestion?: string; // e.g. "Garage Ponte Vecchio - €20/day, Via dei Benci 8"
  segmentLabel?: string;     // e.g. "Rome" or "Tuscany Road Trip" for multi-segment trips
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
  dayNumber?: number; // Which day this find is near
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

/* ── Segment Type ───────────────────────────────────────── */

export interface TripSegment {
  type: 'single_city' | 'area' | 'road_trip';
  destination: string;
  startDate: string;
  endDate: string;
  startPoint?: string;   // road_trip only
  endPoint?: string;     // road_trip only
  maxDriveHours?: number; // road_trip only
}

/* ── Prompt Builder ─────────────────────────────────────── */

function buildCriticalRules(currency: string, daysUntilTrip: number): string {
  const weatherRule = daysUntilTrip <= 14
    ? `12. Include "climateNote": Since this trip is within 2 weeks, provide a SPECIFIC weather forecast. Include expected temperature range, chance of rain, and whether conditions are suitable for beach/outdoor activities. Be precise — e.g. "Expect 19-23°C with partly cloudy skies and light chance of rain. Good for outdoor walks but too cool for comfortable beach swimming."`
    : `12. Include "climateNote": 1 sentence about typical weather for this destination during the trip dates.`;

  return `CRITICAL RULES:
1. EVERY activity MUST have "location" with "lat" and "lng" (decimal degrees). No exceptions.
2. EVERY activity MUST have "info" with opening hours and closure days. Account for holidays — NEVER schedule on closed days.
3. EVERY activity MUST have "reservationStatus": "REQUIRED" (must book ahead), "RECOMMENDED" (walk-ins risky), or "WALK_IN_OK".
4. EVERY activity MUST have "priority": 1-5. Top 2-3 attractions per day get 4-5; meals get 2-3.
5. Activities with priority >= 4 MUST have "guideNarration": 2-3 sentences of engaging, tour-guide-style narration adapted to the traveler profile.
6. EVERY activity (except the first of each day) MUST have "transitFromPrev": e.g. "8 min walk", "15 min metro", "~20 min bus".
7. Outdoor activities MUST have "isOutdoor": true and "rainyDayAlternative": name of a nearby indoor alternative.
8. REQUIRED/RECOMMENDED items should have "bookingUrl" if known (official site or constructed search URL).
9. Tips must be ACTIONABLE PRE-VISIT advice. Scheduling and tips must be consistent.
10. Include "dailyBudget" per day: {"activities": N, "meals": N, "total": N} as numbers in ${currency}.
11. Include "localFinds": 2-3 local finds PER DAY, each with "dayNumber" matching the day they're near. These should be hidden gems near that day's activities — tastings, shops, markets, workshops, or beautiful streets the traveler can discover while already in the area.
${weatherRule}
13. For days involving DRIVING to a city/town, include "parkingSuggestion" on the day: name of a convenient parking spot with approximate cost and location.

ACCURACY RULES (VERY IMPORTANT):
14. ONLY suggest places that DEFINITELY EXIST and are WELL-ESTABLISHED. Never invent or guess venue names. If unsure whether a place exists, choose a different well-known venue instead.
15. For restaurants and cafes: ONLY suggest places with an excellent reputation (would have 4.5+ stars on Google Maps). Prefer locally beloved spots over tourist traps. Use local food guides (TimeOut, local blogs, Secret guides) as mental references.
16. Restaurant booking advice must reflect LOCAL customs. For example: Tel Aviv popular restaurants need 3-7 days advance booking, not 1-2 days. Rome trattorias may need 2 days. Research the local norms.
17. Use locally-relevant sources and knowledge. For Israel: TimeOut Tel Aviv, Secret Tel Aviv, local food bloggers. For Italy: Gambero Rosso, local guides. Always prioritize authentic local knowledge over generic tourist recommendations.
18. Venue names must be EXACT official names. Do not approximate or combine names. "Cafe Xenia" is wrong if the place is called "Cafe Jenia" or doesn't exist at all.`;
}

function buildJsonStructure(startDate: string, currency: string): string {
  return `JSON structure:
{
  "summary": "1 sentence",
  "highlights": ["4 items"],
  "climateNote": "Weather summary for these dates",
  "days": [
    {"dayNumber": 1, "date": "${startDate}", "theme": "short theme", "neighborhood": "area",
     "dailyBudget": {"activities": 50, "meals": 60, "total": 110},
     "parkingSuggestion": "Parking Garage Name - €15/day, address (only if driving this day)",
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
  "budgetEstimate": {"perDay": "${currency === 'EUR' ? '€' : '$'}X", "total": "${currency === 'EUR' ? '€' : '$'}Y", "breakdown": "summary", "activitiesTotal": 200, "mealsTotal": 300, "hotelsTotal": 1000},
  "practicalTips": ["3-4 tips"],
  "localFinds": [{"name": "Supplizio", "type": "tasting", "description": "Best supplì in Rome", "location": {"name": "Supplizio", "lat": 41.8986, "lng": 12.4733}, "estimatedCost": "€5", "dayNumber": 1}]
}

5 activities per day. 2 hotel options. KEEP ALL STRINGS EXTREMELY SHORT (descriptions: max 10 words, tips: max 15 words, guideNarration: max 2 sentences, info: max 15 words). Every field listed above is REQUIRED — omitting any field is invalid.`;
}

function buildPrompt(trip: any, userProfile?: any): string {
  const profile = trip.profile || {};
  const prefs = profile.preferences || {};
  const interests = (prefs.interests || []).join(', ') || 'general sightseeing';
  const dislikes = (prefs.dislikes || []).join(', ') || 'none';
  const dislikesText = prefs.dislikesText || '';
  const tripSpecificNotes = prefs.tripSpecificNotes || '';
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const days = nights + 1;
  const tripType = trip.trip_type || 'single_city';
  const currency = trip.currency || 'EUR';
  const daysUntilTrip = Math.max(0, Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const travelerProfileSection = buildTravelerProfileSection(userProfile);

  // Trip-specific overrides section
  let tripSpecificSection = '';
  if (tripSpecificNotes || dislikesText) {
    tripSpecificSection = '\nTrip-Specific Notes:\n';
    if (tripSpecificNotes) tripSpecificSection += `  - Special requests: ${tripSpecificNotes}\n`;
    if (dislikesText) tripSpecificSection += `  - Additional dislikes: ${dislikesText}\n`;
    tripSpecificSection += '\n';
  }

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
Today's date: ${new Date().toISOString().split('T')[0]}. Trip starts in ${daysUntilTrip} days.
Travelers: ${profile.travelers || 2} · Type: ${profile.tripType || 'cultural'} · Hotel: ${prefs.hotelPreference || 'comfort'}
Interests: ${interests} · Avoid: ${dislikes} · Currency: ${currency}
${tripContext ? '\n' + tripContext + '\n' : ''}
${travelerProfileSection}${tripSpecificSection}Use this detailed traveler profile to tailor venue choices, pacing, dining recommendations, and activity intensity. Trip-specific notes take priority over general profile preferences.

IMPORTANT: Only recommend REAL, VERIFIED venues. Every restaurant, cafe, and attraction you suggest must be a well-known, established place that definitely exists. Use knowledge from local food/travel guides (TimeOut, Secret guides, local bloggers). Prefer places with excellent reputations (4.5+ star equivalent). Never guess or approximate venue names.

Real venue names, geographic clustering. Concise descriptions (1 sentence max). Return ONLY valid JSON (no markdown).

${buildCriticalRules(currency, daysUntilTrip)}

${buildJsonStructure(trip.start_date, currency)}`;
}

/** Build a prompt for a single segment within a multi-segment trip */
function buildSegmentPrompt(
  segment: TripSegment,
  segIdx: number,
  totalSegments: number,
  dayOffset: number,
  trip: any,
  userProfile?: any
): string {
  const profile = trip.profile || {};
  const prefs = profile.preferences || {};
  const interests = (prefs.interests || []).join(', ') || 'general sightseeing';
  const dislikes = (prefs.dislikes || []).join(', ') || 'none';
  const dislikesText = prefs.dislikesText || '';
  const tripSpecificNotes = prefs.tripSpecificNotes || '';
  const currency = trip.currency || 'EUR';
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(segment.endDate).getTime() - new Date(segment.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const days = nights + 1;
  const daysUntilTrip = Math.max(0, Math.ceil((new Date(segment.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const travelerProfileSection = buildTravelerProfileSection(userProfile);

  let tripSpecificSection = '';
  if (tripSpecificNotes || dislikesText) {
    tripSpecificSection = '\nTrip-Specific Notes:\n';
    if (tripSpecificNotes) tripSpecificSection += `  - Special requests: ${tripSpecificNotes}\n`;
    if (dislikesText) tripSpecificSection += `  - Additional dislikes: ${dislikesText}\n`;
    tripSpecificSection += '\n';
  }

  let segContext = '';
  if (segment.type === 'area') {
    segContext = `This segment is an AREA trip across ${segment.destination}. Propose 2-3 overnight bases with drive times between them. Cluster each day around the base where you sleep that night.`;
  } else if (segment.type === 'road_trip') {
    const start = segment.startPoint || segment.destination;
    const end = segment.endPoint || segment.destination;
    const maxDrive = segment.maxDriveHours || 4;
    segContext = `This segment is a ROAD TRIP from ${start} to ${end}. Max ${maxDrive} driving hours/day. Plan daily legs with scenic stops en route.`;
  } else {
    segContext = `This segment is a SINGLE CITY stay in ${segment.destination}.`;
  }

  return `Create a ${days}-day itinerary for SEGMENT ${segIdx + 1}/${totalSegments}: ${segment.destination} (${segment.startDate} to ${segment.endDate}).
Today's date: ${new Date().toISOString().split('T')[0]}. Segment starts in ${daysUntilTrip} days.
Travelers: ${profile.travelers || 2} · Type: ${profile.tripType || 'cultural'} · Hotel: ${prefs.hotelPreference || 'comfort'}
Interests: ${interests} · Avoid: ${dislikes} · Currency: ${currency}

${segContext}

IMPORTANT: Day numbers start at ${dayOffset + 1} (continuing from previous segments).

${travelerProfileSection}${tripSpecificSection}Use this detailed traveler profile to tailor venue choices, pacing, dining recommendations, and activity intensity. Trip-specific notes take priority over general profile preferences.

IMPORTANT: Only recommend REAL, VERIFIED venues. Every restaurant, cafe, and attraction you suggest must be a well-known, established place that definitely exists. Use knowledge from local food/travel guides (TimeOut, Secret guides, local bloggers). Prefer places with excellent reputations (4.5+ star equivalent). Never guess or approximate venue names.

Real venue names, geographic clustering. Concise descriptions (1 sentence max). Return ONLY valid JSON (no markdown).

${buildCriticalRules(currency, daysUntilTrip)}

${buildJsonStructure(segment.startDate, currency)}`;
}

/* ── Generation Function ────────────────────────────────── */

/** Generate a single-segment (standard) itinerary */
async function generateSingleItinerary(trip: any, userProfile: any): Promise<SimpleItinerary> {
  const prompt = buildPrompt(trip, userProfile);
  return callClaudeJSON<SimpleItinerary>(prompt, {
    maxTokens: 16000,
    temperature: 0.5,
  });
}

/** Generate a multi-segment itinerary by calling Claude once per segment */
async function generateMultiSegmentItinerary(
  segments: TripSegment[],
  trip: any,
  userProfile: any
): Promise<SimpleItinerary> {
  let dayOffset = 0;
  const allDays: ItineraryDay[] = [];
  const allHighlights: string[] = [];
  const allTips: string[] = [];
  const allLocalFinds: LocalFind[] = [];
  const allHotels: HotelRecommendation[] = [];
  const climateNotes: string[] = [];
  let totalActivities = 0;
  let totalMeals = 0;
  let totalHotels = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prompt = buildSegmentPrompt(seg, i, segments.length, dayOffset, trip, userProfile);

    console.log(`[Multi-Segment] Generating segment ${i + 1}/${segments.length}: ${seg.destination} (${seg.type})`);

    const segResult = await callClaudeJSON<SimpleItinerary>(prompt, {
      maxTokens: 16000,
      temperature: 0.5,
    });

    // Label each day with the segment name and renumber
    const segLabel = seg.type === 'road_trip'
      ? `${seg.startPoint} → ${seg.endPoint}`
      : seg.destination;

    for (const day of segResult.days) {
      day.dayNumber = dayOffset + day.dayNumber;
      day.segmentLabel = segLabel;
      allDays.push(day);
    }

    dayOffset += segResult.days.length;

    if (segResult.highlights) allHighlights.push(...segResult.highlights);
    if (segResult.practicalTips) allTips.push(...segResult.practicalTips);
    if (segResult.localFinds) allLocalFinds.push(...segResult.localFinds);
    if (segResult.hotelRecommendations) allHotels.push(...segResult.hotelRecommendations);
    if (segResult.climateNote) climateNotes.push(segResult.climateNote);
    if (segResult.budgetEstimate) {
      totalActivities += segResult.budgetEstimate.activitiesTotal || 0;
      totalMeals += segResult.budgetEstimate.mealsTotal || 0;
      totalHotels += segResult.budgetEstimate.hotelsTotal || 0;
    }
  }

  const currency = trip.currency || 'EUR';
  const sym = currency === 'EUR' ? '€' : '$';
  const grandTotal = totalActivities + totalMeals + totalHotels;

  return {
    summary: `Multi-segment trip: ${segments.map(s => s.destination).join(' → ')}`,
    highlights: allHighlights.slice(0, 8),
    climateNote: climateNotes.join(' | '),
    days: allDays,
    hotelRecommendations: allHotels,
    budgetEstimate: {
      perDay: `${sym}${allDays.length > 0 ? Math.round(grandTotal / allDays.length) : 0}`,
      total: `${sym}${grandTotal}`,
      breakdown: `${segments.length} segments: ${segments.map(s => s.destination).join(', ')}`,
      activitiesTotal: totalActivities,
      mealsTotal: totalMeals,
      hotelsTotal: totalHotels,
    },
    practicalTips: allTips.slice(0, 8),
    localFinds: allLocalFinds.slice(0, 15),
  };
}

/** Append a log entry to the trip's generation_log column */
async function appendLog(tripId: string, message: string) {
  const entry = { t: new Date().toISOString(), msg: message };
  console.log(`[Gen ${tripId}] ${message}`);
  try {
    await (supabase as any).rpc('append_generation_log', { trip_id: tripId, entry: JSON.stringify(entry) }).catch(() => {
      // Fallback: read-modify-write if RPC doesn't exist
      return (supabase as any)
        .from('trips')
        .select('generation_log')
        .eq('id', tripId)
        .single()
        .then(({ data }: any) => {
          const log = Array.isArray(data?.generation_log) ? data.generation_log : [];
          log.push(entry);
          return (supabase as any).from('trips').update({ generation_log: log }).eq('id', tripId);
        });
    });
  } catch {
    // Non-critical — don't let logging failures break generation
  }
}

export async function generateTripItinerary(tripId: string): Promise<SimpleItinerary> {
  // Fetch trip
  await appendLog(tripId, 'Starting generation — fetching trip data');
  const { data: trip, error } = await (supabase as any)
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error || !trip) throw new Error('Trip not found');

  // Clear previous log and record job start
  await (supabase as any).from('trips').update({ generation_log: [] }).eq('id', tripId);
  await (supabase as any).from('generation_jobs').insert({
    trip_id: tripId,
    step: 'generating_itinerary',
    status: 'running',
  });

  try {
    // Fetch user profile
    await appendLog(tripId, 'Loading your travel profile');
    const { data: profileRow } = await (supabase as any)
      .from('user_profiles')
      .select('profile')
      .eq('user_id', trip.user_id)
      .single();

    const userProfile = profileRow?.profile || {};
    const profileKeys = Object.keys(userProfile).filter(k => {
      const v = userProfile[k];
      return v && (Array.isArray(v) ? v.length > 0 : true);
    });
    await appendLog(tripId, profileKeys.length > 0
      ? `Profile loaded (${profileKeys.length} preference categories)`
      : 'No profile found — using trip preferences only');

    // Check if this is a multi-segment trip
    const segments: TripSegment[] | undefined = trip.trip_overrides?.segments;
    let itinerary: SimpleItinerary;

    if (segments && segments.length > 1) {
      await appendLog(tripId, `Multi-segment trip: ${segments.length} segments detected`);
      for (let i = 0; i < segments.length; i++) {
        await appendLog(tripId, `Generating segment ${i + 1}/${segments.length}: ${segments[i].destination}`);
      }
      itinerary = await generateMultiSegmentItinerary(segments, trip, userProfile);
    } else {
      await appendLog(tripId, `Calling AI to generate ${trip.destination} itinerary...`);
      itinerary = await generateSingleItinerary(trip, userProfile);
    }

    await appendLog(tripId, `AI returned ${itinerary.days?.length || 0} days, ${itinerary.days?.reduce((n, d) => n + (d.activities?.length || 0), 0) || 0} activities`);

    // Run QA validation
    await appendLog(tripId, 'Running quality checks');
    const qa = validateItinerary(itinerary);
    console.log(`[QA] Trip ${tripId}: passed=${qa.passed}, issues=${qa.issues.length}, warnings=${qa.warnings.length}`);
    if (qa.issues.length > 0) {
      console.warn(`[QA] Issues:`, qa.issues);
    }
    if (qa.warnings.length > 0) {
      console.log(`[QA] Warnings:`, qa.warnings);
    }

    await appendLog(tripId, qa.passed
      ? `QA passed (${qa.warnings.length} warnings)`
      : `QA found ${qa.issues.length} issues, ${qa.warnings.length} warnings`);

    // Save to trip (include QA results)
    await appendLog(tripId, 'Saving itinerary');
    await (supabase as any)
      .from('trips')
      .update({
        itinerary: {
          ...itinerary,
          qa: {
            passed: qa.passed,
            issues: qa.issues,
            warnings: qa.warnings,
            checkedAt: new Date().toISOString(),
          },
        },
        status: 'ready',
      })
      .eq('id', tripId);

    await appendLog(tripId, 'Done! Your trip is ready.');

    await (supabase as any).from('generation_jobs').insert({
      trip_id: tripId,
      step: 'generating_itinerary',
      status: 'completed',
    });

    return itinerary;
  } catch (err: any) {
    const errMsg = String(err?.message || err).substring(0, 300);
    await appendLog(tripId, `Error: ${errMsg}`);

    await (supabase as any)
      .from('trips')
      .update({ status: 'failed' })
      .eq('id', tripId);

    await (supabase as any).from('generation_jobs').insert({
      trip_id: tripId,
      step: 'generating_itinerary',
      status: 'failed',
      error: errMsg,
    });

    throw err;
  }
}
