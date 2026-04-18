'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

const ItineraryMap = dynamic(() => import('@/components/map/itinerary-map'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-50 rounded-lg border flex items-center justify-center text-gray-500">Loading map...</div>,
});

/* ── Types ──────────────────────────────────────────────── */

interface ActivityLocation {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface Activity {
  time: string;
  name: string;
  description: string;
  type: string;
  duration: string;
  location?: ActivityLocation;
  info?: string;
  tips?: string;
  estimatedCost?: string;
  reservationStatus?: 'REQUIRED' | 'RECOMMENDED' | 'WALK_IN_OK';
  priority?: number;
  guideNarration?: string;
  transitFromPrev?: string;
  isOutdoor?: boolean;
  rainyDayAlternative?: string;
  bookingUrl?: string;
}

interface DayBudget {
  activities: number;
  meals: number;
  total: number;
}

interface Day {
  dayNumber: number;
  date: string;
  theme: string;
  neighborhood?: string;
  activities: Activity[];
  narration?: string;
  dailyBudget?: DayBudget;
}

interface HotelRec {
  name: string;
  area: string;
  priceRange: string;
  why: string;
  bookingUrl?: string;
  starRating?: number;
}

interface LocalFind {
  name: string;
  type: string;
  description: string;
  location?: ActivityLocation;
  estimatedCost?: string;
}

interface Itinerary {
  summary: string;
  highlights: string[];
  days: Day[];
  hotelRecommendations?: HotelRec[];
  budgetEstimate?: {
    perDay: string;
    total: string;
    breakdown: string;
    activitiesTotal?: number;
    mealsTotal?: number;
    hotelsTotal?: number;
  };
  practicalTips?: string[];
  localFinds?: LocalFind[];
  climateNote?: string;
}

interface TripRecord {
  id: string;
  destination: any;
  start_date: string;
  end_date: string;
  status: string;
  profile: any;
  itinerary: Itinerary | null;
  currency: string;
}

/* ── Constants ──────────────────────────────────────────── */

const DAY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

const TYPE_EMOJI: Record<string, string> = {
  attraction: '\u{1F3DB}\uFE0F',
  meal: '\u{1F37D}\uFE0F',
  transport: '\u{1F697}',
  experience: '\u2728',
  rest: '\u2615',
};

const FIND_EMOJI: Record<string, string> = {
  tasting: '\u{1F37D}\uFE0F',
  shop: '\u{1F6CD}\uFE0F',
  street: '\u{1F6B6}',
  market: '\u{1F3EA}',
  workshop: '\u{1F3A8}',
  experience: '\u2728',
};

const RES_BADGE: Record<string, { label: string; color: string }> = {
  REQUIRED: { label: 'Must Book', color: 'bg-red-100 text-red-800 border-red-200' },
  RECOMMENDED: { label: 'Book Ahead', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  WALK_IN_OK: { label: 'Walk-in OK', color: 'bg-green-100 text-green-800 border-green-200' },
};

/* ── Page Component ─────────────────────────────────────── */

export default function TripViewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [guideOpen, setGuideOpen] = useState<{ name: string; text: string } | null>(null);
  const [visibleDays, setVisibleDays] = useState<Set<number>>(new Set());
  const [dayNotes, setDayNotes] = useState<Record<number, string>>({});
  const [budgetCollapsed, setBudgetCollapsed] = useState(true);

  // Suggest-alternative state
  const [altLoading, setAltLoading] = useState<string | null>(null); // "dayIdx-actIdx"
  const [altSuggestion, setAltSuggestion] = useState<{
    dayIndex: number;
    activityIndex: number;
    suggestion: Activity & { whySuggested?: string };
    attempt: number;
  } | null>(null);

  const fetchTrip = useCallback(async () => {
    try {
      const response = await apiClient.get<TripRecord>(`/trips/${tripId}`);
      if (response.success && response.data) {
        setTrip(response.data);
        // Initialize visible days for map filter
        if (response.data.itinerary?.days) {
          setVisibleDays(new Set(response.data.itinerary.days.map(d => d.dayNumber)));
        }
      } else {
        setError('Failed to load trip');
      }
    } catch {
      setError('Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    let generationTriggered = false;
    const doFetch = async () => {
      const response = await apiClient.get<TripRecord>(`/trips/${tripId}`);
      if (response.success && response.data) {
        setTrip(response.data);
        if (response.data.itinerary?.days) {
          setVisibleDays(new Set(response.data.itinerary.days.map(d => d.dayNumber)));
        }
        if (!generationTriggered && response.data.status === 'generating' && !response.data.itinerary) {
          generationTriggered = true;
          apiClient.post(`/trips/${tripId}/generate`, {}).then(() => fetchTrip()).catch(() => fetchTrip());
        }
      }
      setIsLoading(false);
    };
    doFetch();
    const interval = setInterval(() => {
      setTrip((prev) => {
        if (prev && prev.status === 'generating') fetchTrip();
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [tripId, fetchTrip]);

  const toggleDay = (n: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const toggleDayFilter = (n: number) => {
    setVisibleDays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  /* ── Suggest Alternative Handlers ─────────────────────── */

  const requestAlternative = async (dayIdx: number, actIdx: number, attempt = 1) => {
    const key = `${dayIdx}-${actIdx}`;
    setAltLoading(key);
    setAltSuggestion(null);
    try {
      const res = await apiClient.post<{
        suggestion: Activity & { whySuggested?: string };
        attempt: number;
      }>(`/trips/${tripId}/swap-activity`, {
        day_index: dayIdx,
        activity_index: actIdx,
        attempt,
      });
      if (res.success && res.data) {
        setAltSuggestion({
          dayIndex: dayIdx,
          activityIndex: actIdx,
          suggestion: res.data.suggestion,
          attempt: res.data.attempt,
        });
      } else {
        alert('Failed to get suggestion. Please try again.');
      }
    } catch {
      alert('Failed to get suggestion. Please try again.');
    } finally {
      setAltLoading(null);
    }
  };

  const approveAlternative = async () => {
    if (!altSuggestion) return;
    setAltLoading(`${altSuggestion.dayIndex}-${altSuggestion.activityIndex}`);
    try {
      const res = await apiClient.put(`/trips/${tripId}/swap-activity`, {
        day_index: altSuggestion.dayIndex,
        activity_index: altSuggestion.activityIndex,
        replacement: altSuggestion.suggestion,
      });
      if (res.success) {
        setAltSuggestion(null);
        await fetchTrip(); // Refresh to see the updated itinerary
      } else {
        alert('Failed to apply alternative.');
      }
    } catch {
      alert('Failed to apply alternative.');
    } finally {
      setAltLoading(null);
    }
  };

  const denyAlternative = () => {
    setAltSuggestion(null);
  };

  const reSuggestAlternative = () => {
    if (!altSuggestion || altSuggestion.attempt >= 3) return;
    requestAlternative(
      altSuggestion.dayIndex,
      altSuggestion.activityIndex,
      altSuggestion.attempt + 1
    );
  };

  /* ── Loading / Error / Generating States ──────────────── */

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-center text-gray-500">Loading trip...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !trip) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 mb-4">{error || 'Trip not found'}</p>
              <Button onClick={() => router.push('/')}>Back to Trips</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const destination = typeof trip.destination === 'string' ? trip.destination : trip.destination?.name || 'Trip';

  if (trip.status === 'generating') {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Generating your trip to {destination}...</CardTitle>
              <CardDescription>Our AI is crafting a personalized itinerary. This usually takes 30-90 seconds.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="mt-4 text-sm text-gray-500">This page will refresh automatically when your itinerary is ready.</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (trip.status === 'failed') {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Generation failed</CardTitle>
              <CardDescription>Something went wrong while generating your itinerary for {destination}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/trips/new')}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const itin = trip.itinerary;
  if (!itin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No itinerary yet.</p>
              <Button onClick={() => router.push('/')}>Back to Trips</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  /* ── Collect urgent booking items ─────────────────────── */
  const urgentItems: Array<Activity & { dayNumber: number }> = [];
  itin.days.forEach((day) => {
    day.activities.forEach((a) => {
      if (a.reservationStatus === 'REQUIRED' || a.reservationStatus === 'RECOMMENDED') {
        urgentItems.push({ ...a, dayNumber: day.dayNumber });
      }
    });
  });
  const mustBookItems = urgentItems.filter(a => a.reservationStatus === 'REQUIRED');

  /* ── Filter map days ──────────────────────────────────── */
  const filteredDays = itin.days.filter(d => visibleDays.has(d.dayNumber));

  /* ── Render ───────────────────────────────────────────── */
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              &larr; Back
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Export PDF
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold">{destination}</h1>
          <p className="text-gray-600">
            {trip.start_date} &rarr; {trip.end_date} &middot; {trip.profile?.travelers || 2} travelers
          </p>
        </div>

        {/* Must-Book-Now Banner */}
        {mustBookItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">&#9888;&#65039;</span>
              <h3 className="font-bold text-red-800">{mustBookItems.length} attraction{mustBookItems.length > 1 ? 's' : ''} require advance booking</h3>
            </div>
            <div className="space-y-2">
              {mustBookItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded p-2 border border-red-100">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-gray-500 ml-2">Day {item.dayNumber}</span>
                  </div>
                  {item.bookingUrl ? (
                    <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">Book Now</Button>
                    </a>
                  ) : (
                    <a href={`https://www.google.com/search?q=book+tickets+${encodeURIComponent(item.name)}+${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Search Tickets</Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Climate Note */}
        {itin.climateNote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <span className="text-xl">&#127780;&#65039;</span>
            <p className="text-sm text-blue-800">{itin.climateNote}</p>
          </div>
        )}

        {/* Overview */}
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-700">{itin.summary}</p>
            {itin.highlights && itin.highlights.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Highlights</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {itin.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel Recommendations */}
        {itin.hotelRecommendations && itin.hotelRecommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Hotel Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {itin.hotelRecommendations.map((h, i) => (
                <div key={i} className="p-3 rounded border hover:bg-gray-50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{h.name}</h4>
                      {h.starRating && <Badge variant="outline">{'★'.repeat(h.starRating)}</Badge>}
                    </div>
                    <Badge>{h.priceRange}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{h.area}</p>
                  <p className="text-sm text-gray-700 mt-1">{h.why}</p>
                  <div className="mt-2 flex gap-2">
                    {h.bookingUrl && (
                      <a href={h.bookingUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">Book on Booking.com</Button>
                      </a>
                    )}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + destination)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">View on Map</Button>
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Budget Panel */}
        {itin.budgetEstimate && (
          <Card>
            <button onClick={() => setBudgetCollapsed(!budgetCollapsed)} className="w-full text-left">
              <CardHeader className="hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle>Budget Estimate</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{itin.budgetEstimate.total} total</Badge>
                    <span className="text-gray-400">{budgetCollapsed ? '\u25BC' : '\u25B2'}</span>
                  </div>
                </div>
              </CardHeader>
            </button>
            {!budgetCollapsed && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {itin.budgetEstimate.activitiesTotal != null && (
                    <div className="bg-blue-50 rounded p-3 text-center">
                      <div className="text-sm text-gray-600">Activities</div>
                      <div className="font-bold text-lg">&euro;{itin.budgetEstimate.activitiesTotal}</div>
                    </div>
                  )}
                  {itin.budgetEstimate.mealsTotal != null && (
                    <div className="bg-green-50 rounded p-3 text-center">
                      <div className="text-sm text-gray-600">Meals</div>
                      <div className="font-bold text-lg">&euro;{itin.budgetEstimate.mealsTotal}</div>
                    </div>
                  )}
                  {itin.budgetEstimate.hotelsTotal != null && (
                    <div className="bg-purple-50 rounded p-3 text-center">
                      <div className="text-sm text-gray-600">Hotels</div>
                      <div className="font-bold text-lg">&euro;{itin.budgetEstimate.hotelsTotal}</div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per day</span>
                  <span className="font-medium">{itin.budgetEstimate.perDay}</span>
                </div>
                <p className="text-sm text-gray-600">{itin.budgetEstimate.breakdown}</p>
                <p className="text-xs text-gray-400 italic">Estimates only — actual prices may vary.</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Map with Day Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>Numbered markers show order within each day. Colors indicate different days.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Day filter checkboxes */}
            <div className="flex flex-wrap gap-2 mb-3">
              {itin.days.map((day) => {
                const color = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
                const active = visibleDays.has(day.dayNumber);
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => toggleDayFilter(day.dayNumber)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${active ? 'opacity-100' : 'opacity-40'}`}
                    style={{ borderColor: color, backgroundColor: active ? color + '20' : 'transparent', color: active ? color : '#999' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    Day {day.dayNumber}
                  </button>
                );
              })}
            </div>
            <ItineraryMap days={filteredDays} />
          </CardContent>
        </Card>

        {/* Day-by-Day Itinerary */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Itinerary</h2>
          {itin.days.map((day) => {
            const expanded = expandedDays.has(day.dayNumber);
            const dayColor = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
            return (
              <Card key={day.dayNumber}>
                <button onClick={() => toggleDay(day.dayNumber)} className="w-full text-left">
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: dayColor }}>
                          {day.dayNumber}
                        </div>
                        <div>
                          <CardTitle>Day {day.dayNumber} &middot; {day.theme}</CardTitle>
                          <CardDescription>
                            {day.date}{day.neighborhood ? ` \u00B7 ${day.neighborhood}` : ''}
                            {day.dailyBudget ? ` \u00B7 ~\u20AC${day.dailyBudget.total}` : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <span className="text-gray-400">{expanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </CardHeader>
                </button>
                {expanded && (
                  <CardContent className="space-y-3">
                    {day.narration && (
                      <p className="text-gray-600 italic border-l-4 border-blue-200 pl-3 py-1">{day.narration}</p>
                    )}

                    {/* Daily budget breakdown */}
                    {day.dailyBudget && (
                      <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <span>Activities: &euro;{day.dailyBudget.activities}</span>
                        <span>Meals: &euro;{day.dailyBudget.meals}</span>
                        <span className="font-medium text-gray-700">Total: &euro;{day.dailyBudget.total}</span>
                      </div>
                    )}

                    {/* Activities */}
                    <div className="space-y-2">
                      {day.activities.map((a, i) => {
                        const markerNum = i + 1;
                        const resBadge = a.reservationStatus ? RES_BADGE[a.reservationStatus] : null;
                        return (
                          <div key={i}>
                            {/* Transit indicator */}
                            {a.transitFromPrev && (
                              <div className="flex items-center gap-2 py-1 pl-10 text-xs text-gray-400">
                                <div className="flex-1 border-t border-dashed border-gray-200" />
                                <span>&rarr; {a.transitFromPrev}</span>
                                <div className="flex-1 border-t border-dashed border-gray-200" />
                              </div>
                            )}
                            <div className="flex gap-3 p-3 rounded-lg border hover:bg-gray-50">
                              {/* Marker + emoji */}
                              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                <div
                                  style={{ backgroundColor: dayColor }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow"
                                  title={`Map marker ${markerNum}`}
                                >
                                  {markerNum}
                                </div>
                                <span className="text-lg" title={a.type}>{TYPE_EMOJI[a.type] || '\u{1F4CD}'}</span>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-sm font-mono text-blue-600">{a.time}</span>
                                  <span className="font-semibold">{a.name}</span>
                                  {a.duration && <Badge variant="outline">{a.duration}</Badge>}
                                  {a.estimatedCost && <Badge variant="secondary">{a.estimatedCost}</Badge>}
                                  {resBadge && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${resBadge.color}`}>
                                      {resBadge.label}
                                    </span>
                                  )}
                                  {a.priority && a.priority >= 4 && (
                                    <span className="text-xs text-yellow-600">{'★'.repeat(a.priority)}</span>
                                  )}
                                </div>
                                <p className="text-gray-700 mt-1 text-sm">{a.description}</p>

                                {a.location && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    &#x1F4CD; {a.location.name}{a.location.address ? ` \u00B7 ${a.location.address}` : ''}
                                  </p>
                                )}

                                {/* Info (opening hours) */}
                                {a.info && (
                                  <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2 rounded">
                                    &#x1F552; {a.info}
                                  </p>
                                )}

                                {/* Tips */}
                                {a.tips && (
                                  <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 p-2 rounded">
                                    &#x1F4A1; {a.tips}
                                  </p>
                                )}

                                {/* Rainy day alternative */}
                                {a.isOutdoor && a.rainyDayAlternative && (
                                  <p className="text-xs text-purple-700 mt-1.5 bg-purple-50 p-2 rounded">
                                    &#x1F326;&#xFE0F; Rainy day backup: {a.rainyDayAlternative}
                                  </p>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {a.location?.lat && a.location?.lng && (
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${a.location.lat},${a.location.lng}`} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="ghost" className="text-xs h-7">Open in Maps</Button>
                                    </a>
                                  )}
                                  {a.bookingUrl && (
                                    <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="text-xs h-7">Book Tickets</Button>
                                    </a>
                                  )}
                                  {a.guideNarration && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 text-blue-600 border-blue-200"
                                      onClick={(e) => { e.stopPropagation(); setGuideOpen({ name: a.name, text: a.guideNarration! }); }}
                                    >
                                      &#x1F4D6; Read Guide
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-orange-600 border-orange-200"
                                    disabled={altLoading === `${itin.days.indexOf(day)}-${i}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestAlternative(itin.days.indexOf(day), i);
                                    }}
                                  >
                                    {altLoading === `${itin.days.indexOf(day)}-${i}` ? (
                                      <span className="animate-spin inline-block mr-1">&#x21BB;</span>
                                    ) : '&#x1F504; '}
                                    Suggest Alternative
                                  </Button>
                                </div>

                                {/* Suggestion Panel (inline) */}
                                {altSuggestion &&
                                  altSuggestion.dayIndex === itin.days.indexOf(day) &&
                                  altSuggestion.activityIndex === i && (
                                  <div className="mt-3 p-3 rounded-lg border-2 border-orange-300 bg-orange-50 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-orange-800 text-sm">
                                        Suggested Alternative (Attempt {altSuggestion.attempt}/3)
                                      </h4>
                                    </div>
                                    <div className="bg-white rounded p-3 border">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-mono text-blue-600">{altSuggestion.suggestion.time}</span>
                                        <span className="font-semibold">{altSuggestion.suggestion.name}</span>
                                        {altSuggestion.suggestion.duration && <Badge variant="outline">{altSuggestion.suggestion.duration}</Badge>}
                                        {altSuggestion.suggestion.estimatedCost && <Badge variant="secondary">{altSuggestion.suggestion.estimatedCost}</Badge>}
                                        {altSuggestion.suggestion.reservationStatus && (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${RES_BADGE[altSuggestion.suggestion.reservationStatus]?.color || ''}`}>
                                            {RES_BADGE[altSuggestion.suggestion.reservationStatus]?.label}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-gray-700 mt-1 text-sm">{altSuggestion.suggestion.description}</p>
                                      {altSuggestion.suggestion.whySuggested && (
                                        <p className="text-xs text-orange-700 mt-1 italic">&#x1F4A1; {altSuggestion.suggestion.whySuggested}</p>
                                      )}
                                      {altSuggestion.suggestion.info && (
                                        <p className="text-xs text-gray-600 mt-1">&#x1F552; {altSuggestion.suggestion.info}</p>
                                      )}
                                      {altSuggestion.suggestion.tips && (
                                        <p className="text-xs text-blue-700 mt-1">&#x1F4A1; {altSuggestion.suggestion.tips}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                        onClick={(e) => { e.stopPropagation(); approveAlternative(); }}
                                        disabled={!!altLoading}
                                      >
                                        {altLoading ? 'Applying...' : '&#x2705; Approve'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={(e) => { e.stopPropagation(); denyAlternative(); }}
                                      >
                                        &#x274C; Deny
                                      </Button>
                                      {altSuggestion.attempt < 3 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs text-orange-600 border-orange-200"
                                          onClick={(e) => { e.stopPropagation(); reSuggestAlternative(); }}
                                          disabled={!!altLoading}
                                        >
                                          &#x1F504; Re-suggest ({3 - altSuggestion.attempt} left)
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Notes */}
                    <div className="mt-3 pt-3 border-t">
                      <textarea
                        className="w-full text-sm border rounded p-2 resize-none"
                        rows={2}
                        placeholder="Add a personal note for this day..."
                        value={dayNotes[day.dayNumber] || ''}
                        onChange={(e) => setDayNotes(prev => ({ ...prev, [day.dayNumber]: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Local Finds: Special Tastings, Shops & Experiences */}
        {itin.localFinds && itin.localFinds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Local Finds &amp; Special Tastings</CardTitle>
              <CardDescription>Hidden gems, tastings, shops, and unique experiences worth exploring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {itin.localFinds.map((find, i) => (
                  <div key={i} className="p-3 rounded border hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{FIND_EMOJI[find.type] || '\u{1F4CD}'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{find.name}</span>
                          {find.estimatedCost && <Badge variant="secondary" className="text-xs">{find.estimatedCost}</Badge>}
                        </div>
                        <p className="text-xs text-gray-600">{find.description}</p>
                      </div>
                    </div>
                    {find.location?.lat && find.location?.lng && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${find.location.lat},${find.location.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline ml-7">
                        View on map &#x2197;
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Practical Tips */}
        {itin.practicalTips && itin.practicalTips.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Practical Tips</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {itin.practicalTips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Post-trip Reflection Link */}
        <div className="text-center py-4">
          <Button variant="ghost" onClick={() => router.push(`/trips/${tripId}/reflect`)}>
            How was this trip? Leave feedback &#x2192;
          </Button>
        </div>
      </div>

      {/* Guide Narration Slide-Over */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setGuideOpen(null)}>
          <div className="fixed inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{guideOpen.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setGuideOpen(null)}>&#x2715;</Button>
            </div>
            <div className="p-6 prose prose-sm max-w-none">
              {guideOpen.text.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
