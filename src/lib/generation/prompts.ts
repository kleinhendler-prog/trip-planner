import type { Trip, UserPreference, WeatherData, DestinationSourceInfo } from '@/types/index';

/**
 * All Claude prompt templates for trip planning
 */

export function generateDestinationAnalysisPrompt(
  trip: Trip,
  weatherData: WeatherData[],
  sources: DestinationSourceInfo[]
): string {
  const weatherSummary = weatherData.slice(0, 3)
    .map((w) => `${w.date}: ${w.highTemp}°C, ${w.condition}, ${w.precipitation}mm rain`)
    .join('\n');

  const sourcesList = sources.slice(0, 5)
    .map((s) => `- ${s.sourceName || s.domain} (${s.focus || 'general'}, trust: ${s.trustRating})`)
    .join('\n');

  return `You are a travel planning expert. Analyze this destination for the upcoming trip.

DESTINATION: ${trip.destination}
DATES: ${trip.startDate} to ${trip.endDate}
TRAVELERS: ${trip.travelers}
TRIP TYPE: ${trip.tripType}

TRAVELER PREFERENCES:
- Budget: ${trip.preferences.budget || 'moderate'}
- Pace: ${trip.preferences.pace || 'moderate'}
- Interests: ${trip.preferences.interests?.join(', ') || 'general'}
- Dietary restrictions: ${trip.preferences.mealDietaryRestrictions?.join(', ') || 'none'}
- Mobility needs: ${trip.preferences.mobilityNeeds || 'none'}
- Hotel preference: ${trip.preferences.hotelPreference || 'comfort'}

EXPECTED WEATHER:
${weatherSummary || 'Normal conditions expected'}

RECOMMENDED SOURCES:
${sourcesList}

Please provide:
1. 2-3 key highlights for this destination that match the travelers' interests
2. Best neighborhoods or areas to stay in
3. Main transportation methods to use
4. Any special tips or warnings for this season
5. General vibe and atmosphere of the destination

Format your response as a detailed analysis that will help with itinerary planning.`;
}

export function generateDailyActivitiesPrompt(
  trip: Trip,
  dayNumber: number,
  date: string,
  weather: WeatherData,
  highlights: string[]
): string {
  return `You are a travel planner creating a daily itinerary.

DESTINATION: ${trip.destination}
DAY: ${dayNumber} of ${Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))}
DATE: ${date}
TRAVELERS: ${trip.travelers} people

WEATHER FORECAST:
- High: ${weather.highTemp}°C, Low: ${weather.lowTemp}°C
- Condition: ${weather.condition}
- Rain: ${weather.precipitation}mm

TRAVELER PREFERENCES:
- Interests: ${trip.preferences.interests?.join(', ') || 'general'}
- Pace: ${trip.preferences.pace || 'moderate'}
- Budget: ${trip.preferences.budget || 'moderate'}
- Trip type: ${trip.tripType}

DESTINATION HIGHLIGHTS TO INCORPORATE:
${highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Please create a detailed daily itinerary with:
1. Morning activity (8-12)
2. Lunch location/time
3. Afternoon activity (1-5pm)
4. Dinner location/time
5. Evening activity (6-10pm)

For each activity/meal, provide:
- Title and brief description
- Duration (in minutes)
- Estimated cost
- Why it's good for this group
- Any booking tips

Consider the weather, travelers' interests, and available time. Make it balanced and achievable.`;
}

export function generateRestaurantRecommendationsPrompt(
  destination: string,
  dayNumber: number,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  preferences: UserPreference,
  budget: string
): string {
  const budgetGuide = {
    budget: '€5-15 per person',
    moderate: '€15-40 per person',
    luxury: '€40+ per person',
  };

  return `You are a culinary expert recommending restaurants in ${destination}.

MEAL: ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} on Day ${dayNumber}
BUDGET PER PERSON: ${budgetGuide[budget as keyof typeof budgetGuide] || '€15-40'}

DIETARY REQUIREMENTS:
${preferences.mealDietaryRestrictions?.length ? preferences.mealDietaryRestrictions.join('\n') : 'No restrictions'}

PREFERENCES:
- Local cuisine preference: ${preferences.interests?.includes('food') ? 'yes' : 'open to options'}
- Cuisine types of interest: ${preferences.interests?.join(', ') || 'any'}

Please recommend 3 restaurant options that:
1. Match the budget and dietary needs
2. Are authentic to the destination
3. Suit the meal type and time
4. Are accessible and have good reviews

For each, provide:
- Restaurant name and type of cuisine
- Estimated cost per person
- Why you'd recommend it
- Best time to visit
- Booking tip or walk-in friendly note
- Approximate distance from city center

Make recommendations that balance tourist favorites with local gems.`;
}

export function generateAccommodationPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  travelers: number,
  preference: string,
  budget: string
): string {
  const budgetGuide = {
    budget: '€30-80 per night',
    moderate: '€80-150 per night',
    luxury: '€150+ per night',
  };

  return `You are a hotel booking expert recommending accommodations in ${destination}.

TRIP DETAILS:
- Check-in: ${startDate}
- Check-out: ${endDate}
- Guests: ${travelers}
- Preference: ${preference}

BUDGET: ${budgetGuide[budget as keyof typeof budgetGuide] || '€80-150 per night'}

Please recommend 3 accommodation options that:
1. Match the budget and travelers' count
2. Are in convenient locations near attractions
3. Have good reviews and reliable service
4. Match the hotel preference (${preference})

For each, provide:
- Hotel/accommodation name and category
- Location and neighborhood description
- Average price per night
- Key amenities and features
- Suitability for this type of traveler
- Booking platform recommendation
- Alternative suggestions if fully booked

Consider proximity to public transport, dining, and attractions.`;
}

export function generateTransitPlanPrompt(
  destination: string,
  activities: Array<{ title: string; time: string; location?: string }>,
  localTransit: string
): string {
  return `You are a travel logistics expert planning daily transit in ${destination}.

ACTIVITIES TODAY:
${activities.map((a, i) => `${i + 1}. ${a.title} at ${a.time} (${a.location || 'city center'})`).join('\n')}

LOCAL TRANSIT OPTIONS:
${localTransit}

Please provide:
1. Recommended transit between each activity
2. Estimated travel times (walk/public transit/taxi)
3. Cost estimates for transport
4. Tickets/passes to buy (e.g., day passes)
5. Transit tips specific to this destination
6. Backup options in case of delays

Consider:
- Whether walking is feasible
- Peak transit times to avoid
- Safety considerations
- Language/navigation challenges
- Luggage handling if applicable

Format as a step-by-step guide for the day.`;
}

export function generateItinerarySummaryPrompt(
  trip: Trip,
  dailyThemes: string[],
  totalEstimatedCost: number
): string {
  return `You are reviewing a complete trip itinerary for ${trip.destination}.

TRIP OVERVIEW:
- Duration: ${Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
- Travelers: ${trip.travelers}
- Budget tier: ${trip.preferences.budget || 'moderate'}

DAILY THEMES:
${dailyThemes.map((t, i) => `Day ${i + 1}: ${t}`).join('\n')}

ESTIMATED TOTAL COST: €${totalEstimatedCost}

Please provide:
1. Overall assessment of the itinerary (pacing, variety, balance)
2. Highlights and best moments planned
3. Any logistical concerns or improvements
4. Budget breakdown and whether it aligns with expectations
5. Alternative suggestions if the itinerary feels too packed/loose
6. Final trip summary (what travelers should expect)

Be honest about whether this is a well-balanced, achievable itinerary for the group.`;
}

export function generateQAReviewPrompt(
  itinerary: string,
  tripDetails: {
    days: number;
    travelers: number;
    budget: string;
    interests: string[];
  }
): string {
  return `Review this trip itinerary for quality and completeness.

TRIP ITINERARY:
${itinerary}

TRIP DETAILS:
- Duration: ${tripDetails.days} days
- Travelers: ${tripDetails.travelers}
- Budget: ${tripDetails.budget}
- Key interests: ${tripDetails.interests.join(', ')}

Check for:
1. Are there any days with no activities planned?
2. Are meals scheduled at appropriate times?
3. Are there realistic travel times between activities?
4. Is there a good balance of activity and rest?
5. Do activities match travelers' stated interests?
6. Are there any obvious logical gaps or conflicts?
7. Is the pace appropriate (too rushed/too slow)?
8. Are costs distributed reasonably across the trip?
9. Are there backup options for weather-dependent activities?
10. Is there any redundancy or overlapping activities?

Provide a checklist of issues found (if any) with specific recommendations for fixes.`;
}

export function getRegenerateDayPrompt(
  trip: any,
  dayToRegenerate: any,
  allDays: any[],
  dayIndex: number
): string {
  const previousDay = dayIndex > 0 ? allDays[dayIndex - 1] : null;
  const nextDay = dayIndex < allDays.length - 1 ? allDays[dayIndex + 1] : null;

  return `Regenerate the daily itinerary for Day ${dayIndex + 1} of a trip to ${trip.destination}.

Trip Context:
- Destination: ${trip.destination}
- Total Days: ${allDays.length}
- Travelers: ${trip.travelers?.length || 1} people
- Total Budget: $${trip.budget?.total || 0}
- Interests: ${trip.preferences?.interests?.join(', ') || 'various'}

${previousDay ? `Previous Day (Day ${dayIndex}) ending location/hotel: ${previousDay.location || 'Not specified'}` : ''}
${nextDay ? `Next Day (Day ${dayIndex + 2}) starting location: ${nextDay.location || 'Not specified'}` : ''}

Current Day ${dayIndex + 1} Activities to Keep/Improve:
${dayToRegenerate.activities?.map((a: any) => `- ${a.title} (${a.duration})`).join('\n') || 'No activities currently planned'}

Current Meals:
${dayToRegenerate.meals?.map((m: any) => `- ${m.mealType}: ${m.restaurantName}`).join('\n') || 'No meals planned'}

Please regenerate a complete day itinerary with:
1. Morning activities (9 AM - 12 PM)
2. Lunch recommendation (12 PM - 1 PM)
3. Afternoon activities (1 PM - 5 PM)
4. Dinner recommendation (6 PM - 8 PM)
5. Evening activities (8 PM - 10 PM)

Each activity should include: title, duration, location, description, estimated cost, local tips.
Ensure smooth transitions between locations considering travel times.
Match activities to traveler interests and budget constraints.`;
}
