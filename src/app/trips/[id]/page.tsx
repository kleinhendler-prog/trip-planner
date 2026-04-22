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
  loading: () => <div className="h-[500px] bg-[var(--color-surface-container)] rounded-lg border flex items-center justify-center text-[var(--color-on-surface-variant)]">Loading map...</div>,
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
  parkingSuggestion?: string;
  segmentLabel?: string;
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
  REQUIRED: { label: 'Must Book', color: 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)] border-[var(--color-error-container)]' },
  RECOMMENDED: { label: 'Book Ahead', color: 'bg-[#fef08a] text-[#854d0e] border-[#fef08a]' },
  WALK_IN_OK: { label: 'Walk-in OK', color: 'bg-[#bbf7d0] text-[#166534] border-[#bbf7d0]' },
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

  // What's Nearby state
  const [nearbyLoading, setNearbyLoading] = useState<string | null>(null);
  const [nearbySuggestions, setNearbySuggestions] = useState<{
    dayIndex: number;
    activityIndex: number;
    suggestions: Array<{ name: string; type: string; description: string; distance: string; estimatedCost?: string; whyRelevant: string; location?: { lat: number; lng: number } }>;
  } | null>(null);

  // Day reorder state
  const [reorderLoading, setReorderLoading] = useState(false);

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

  const [generationElapsed, setGenerationElapsed] = useState(0);
  const GENERATION_TIMEOUT_SEC = 180; // 3 minutes failsafe

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

  // Generation timeout failsafe: count elapsed seconds and force-fail after 3 minutes
  useEffect(() => {
    if (trip?.status !== 'generating') {
      setGenerationElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setGenerationElapsed((prev) => {
        const next = prev + 1;
        if (next >= GENERATION_TIMEOUT_SEC) {
          // Force the UI to show failed state
          setTrip((t) => t ? { ...t, status: 'failed' } : t);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [trip?.status]);

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

  /* ── What's Nearby Handlers ──────────────────────────── */

  const requestNearby = async (dayIdx: number, actIdx: number) => {
    const key = `${dayIdx}-${actIdx}`;
    setNearbyLoading(key);
    setNearbySuggestions(null);
    try {
      const res = await apiClient.post<{
        suggestions: Array<{ name: string; type: string; description: string; distance: string; estimatedCost?: string; whyRelevant: string; location?: { lat: number; lng: number } }>;
      }>(`/trips/${tripId}/nearby`, { day_index: dayIdx, activity_index: actIdx });
      if (res.success && res.data) {
        setNearbySuggestions({ dayIndex: dayIdx, activityIndex: actIdx, suggestions: res.data.suggestions });
      }
    } catch { /* ignore */ }
    setNearbyLoading(null);
  };

  /* ── Day Reorder Handlers ──────────────────────────────── */

  const moveDay = async (fromIdx: number, toIdx: number) => {
    if (!trip?.itinerary?.days) return;
    if (toIdx < 0 || toIdx >= trip.itinerary.days.length) return;
    setReorderLoading(true);
    try {
      const res = await apiClient.put<{ success: boolean; warnings: string[] }>(`/trips/${tripId}/reorder-days`, {
        from_index: fromIdx,
        to_index: toIdx,
      });
      if (res.success && res.data) {
        if (res.data.warnings && res.data.warnings.length > 0) {
          alert('Reorder done, but note:\n\n' + res.data.warnings.join('\n'));
        }
        await fetchTrip();
      }
    } catch { /* ignore */ }
    setReorderLoading(false);
  };

  /* ── Loading / Error / Generating States ──────────────── */

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-center text-[var(--color-on-surface-variant)]">Loading trip...</div>
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
              <p className="text-[var(--color-error)] mb-4">{error || 'Trip not found'}</p>
              <Button onClick={() => router.push('/')}>Back to Trips</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const destination = typeof trip.destination === 'string' ? trip.destination : trip.destination?.name || 'Trip';

  if (trip.status === 'generating') {
    const progressPct = Math.min(95, (generationElapsed / GENERATION_TIMEOUT_SEC) * 100);
    const mins = Math.floor(generationElapsed / 60);
    const secs = generationElapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Generating your trip to {destination}...</CardTitle>
              <CardDescription>Our AI is crafting a personalized itinerary. This usually takes 60-90 seconds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-2 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                <div className="h-full bg-primary-gradient rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-on-surface-variant)]">This page will refresh automatically when your itinerary is ready.</p>
                <span className="text-label-mono text-xs text-[var(--color-outline)]">{timeStr}</span>
              </div>
              {generationElapsed > 90 && (
                <div className="rounded-[12px] bg-[var(--color-surface-container)] p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[var(--color-tertiary)] text-[18px] mt-0.5">hourglass_top</span>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    Taking longer than usual — complex itineraries can take up to 2-3 minutes. Hang tight!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (trip.status === 'failed') {
    const handleRetry = async () => {
      setTrip((t) => t ? { ...t, status: 'generating' } : t);
      setGenerationElapsed(0);
      try {
        await apiClient.post(`/trips/${tripId}/generate`, {});
        fetchTrip();
      } catch {
        fetchTrip();
      }
    };

    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[var(--color-error)]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <CardTitle className="text-[var(--color-error)]">Generation failed</CardTitle>
              </div>
              <CardDescription>Something went wrong while generating your itinerary for {destination}. This can happen if the AI takes too long or encounters an error.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleRetry}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
                Retry Generation
              </Button>
              <Button variant="outline" onClick={() => router.push('/trips/new')}>Start Over</Button>
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
              <p className="text-[var(--color-on-surface-variant)] mb-4">No itinerary yet.</p>
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
          <h1 className="text-h2 text-[var(--color-on-surface)]">{destination}</h1>
          <p className="text-[var(--color-on-surface-variant)]">
            {trip.start_date} &rarr; {trip.end_date} &middot; {trip.profile?.travelers || 2} travelers
          </p>
        </div>

        {/* Must-Book-Now Banner */}
        {mustBookItems.length > 0 && (
          <div className="bg-[var(--color-error-container)] border border-[var(--color-error-container)] rounded-[16px] p-4 shadow-level-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[var(--color-error)]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div>
                <p className="text-label-mono text-[var(--color-error)] font-bold uppercase tracking-wider text-xs">Must Book Now</p>
                <h3 className="font-heading font-bold text-[var(--color-on-error-container)]">{mustBookItems.length} attraction{mustBookItems.length > 1 ? 's' : ''} require advance booking</h3>
              </div>
            </div>
            <div className="space-y-2">
              {mustBookItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white/80 rounded-[12px] p-3 border border-[var(--color-error-container)]">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-[var(--color-on-surface-variant)] ml-2">Day {item.dayNumber}</span>
                  </div>
                  {item.bookingUrl ? (
                    <a href={item.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-[var(--color-error)] hover:opacity-90 text-white">Book Now</Button>
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
          <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-surface-container-high)] rounded-[16px] p-4 flex items-start gap-3 shadow-level-1">
            <span className="material-symbols-outlined text-[var(--color-primary)] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>cloud</span>
            <div>
              <p className="text-label-mono text-[var(--color-primary)] font-bold uppercase tracking-wider text-xs mb-1">Weather Alert</p>
              <p className="text-sm text-[var(--color-on-surface)]">{itin.climateNote}</p>
            </div>
          </div>
        )}

        {/* Overview */}
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent>
            <p className="text-[var(--color-on-surface)]">{itin.summary}</p>
            {itin.highlights && itin.highlights.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Highlights</h3>
                <ul className="list-disc list-inside space-y-1 text-[var(--color-on-surface)]">
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
                <div key={i} className="p-4 rounded-[12px] border border-[var(--color-surface-dim)] hover:shadow-level-1 transition-shadow">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{h.name}</h4>
                      {h.starRating && <Badge variant="outline">{'★'.repeat(h.starRating)}</Badge>}
                    </div>
                    <Badge>{h.priceRange}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-on-surface-variant)]">{h.area}</p>
                  <p className="text-sm text-[var(--color-on-surface)] mt-1">{h.why}</p>
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
              <CardHeader className="hover:bg-[var(--color-surface-container-low)] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle>Budget Estimate</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{itin.budgetEstimate.total} total</Badge>
                    <span className="text-[var(--color-outline)]">{budgetCollapsed ? '\u25BC' : '\u25B2'}</span>
                  </div>
                </div>
              </CardHeader>
            </button>
            {!budgetCollapsed && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {itin.budgetEstimate.activitiesTotal != null && (
                    <div className="bg-[var(--color-primary-fixed)] rounded-[12px] p-3 text-center">
                      <div className="text-label-mono text-[var(--color-on-surface-variant)] text-xs">Activities</div>
                      <div className="font-heading font-bold text-lg text-[var(--color-primary)]">&euro;{itin.budgetEstimate.activitiesTotal}</div>
                    </div>
                  )}
                  {itin.budgetEstimate.mealsTotal != null && (
                    <div className="bg-[var(--color-secondary-fixed)] rounded-[12px] p-3 text-center">
                      <div className="text-label-mono text-[var(--color-on-surface-variant)] text-xs">Meals</div>
                      <div className="font-heading font-bold text-lg text-[var(--color-secondary)]">&euro;{itin.budgetEstimate.mealsTotal}</div>
                    </div>
                  )}
                  {itin.budgetEstimate.hotelsTotal != null && (
                    <div className="bg-[var(--color-tertiary-fixed)] rounded-[12px] p-3 text-center">
                      <div className="text-label-mono text-[var(--color-on-surface-variant)] text-xs">Hotels</div>
                      <div className="font-heading font-bold text-lg text-[var(--color-tertiary)]">&euro;{itin.budgetEstimate.hotelsTotal}</div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-on-surface-variant)]">Per day</span>
                  <span className="font-medium">{itin.budgetEstimate.perDay}</span>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{itin.budgetEstimate.breakdown}</p>
                <p className="text-xs text-[var(--color-outline)] italic">Estimates only — actual prices may vary.</p>
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
          <h2 className="text-h3 text-[var(--color-on-surface)]">Your Itinerary</h2>
          {itin.days.map((day) => {
            const expanded = expandedDays.has(day.dayNumber);
            const dayColor = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
            return (
              <Card key={day.dayNumber}>
                <button onClick={() => toggleDay(day.dayNumber)} className="w-full text-left">
                  <CardHeader className="hover:bg-[var(--color-surface-container-low)] transition-colors border-b border-[var(--color-surface-variant)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-heading font-bold text-lg shadow-sm" style={{ backgroundColor: dayColor }}>
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
                      <div className="flex items-center gap-1">
                        {/* Day reorder arrows */}
                        <button
                          className="p-1 rounded-full text-[var(--color-outline)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] disabled:opacity-30 transition-all"
                          disabled={reorderLoading || itin.days.indexOf(day) === 0}
                          onClick={(e) => { e.stopPropagation(); moveDay(itin.days.indexOf(day), itin.days.indexOf(day) - 1); }}
                          title="Move day up"
                        >
                          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
                        </button>
                        <button
                          className="p-1 rounded-full text-[var(--color-outline)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] disabled:opacity-30 transition-all"
                          disabled={reorderLoading || itin.days.indexOf(day) === itin.days.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveDay(itin.days.indexOf(day), itin.days.indexOf(day) + 1); }}
                          title="Move day down"
                        >
                          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                        </button>
                        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] ml-1 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {expanded && (
                  <CardContent className="space-y-3">
                    {/* Segment label for multi-segment trips */}
                    {day.segmentLabel && (
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">&#x1F517; {day.segmentLabel}</Badge>
                      </div>
                    )}

                    {day.narration && (
                      <p className="text-[var(--color-on-surface-variant)] italic border-l-4 border-[var(--color-primary-fixed)] pl-3 py-1">{day.narration}</p>
                    )}

                    {/* Parking suggestion */}
                    {day.parkingSuggestion && (
                      <div className="flex items-start gap-3 bg-[var(--color-tertiary-fixed)] rounded-[12px] p-3 shadow-sm">
                        <span className="material-symbols-outlined text-[var(--color-tertiary)] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>local_parking</span>
                        <div>
                          <p className="text-label-mono text-[var(--color-tertiary)] font-bold uppercase tracking-wider text-xs mb-0.5">Parking Tip</p>
                          <p className="text-sm text-[var(--color-on-surface)]">{day.parkingSuggestion}</p>
                        </div>
                      </div>
                    )}

                    {/* Daily budget breakdown */}
                    {day.dailyBudget && (
                      <div className="flex gap-4 text-xs text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container)] rounded p-2">
                        <span>Activities: &euro;{day.dailyBudget.activities}</span>
                        <span>Meals: &euro;{day.dailyBudget.meals}</span>
                        <span className="font-medium text-[var(--color-on-surface)]">Total: &euro;{day.dailyBudget.total}</span>
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
                              <div className="flex items-center gap-4 py-2 pl-14">
                                <div className="w-2 h-2 rounded-full bg-[var(--color-outline)]" />
                                <div className="flex-1 border-t-2 border-dashed border-[var(--color-outline-variant)] relative">
                                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-surface-container-lowest)] px-2 text-[var(--color-outline)] font-mono-accent text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">directions_walk</span>
                                    {a.transitFromPrev}
                                  </span>
                                </div>
                                <div className="w-2 h-2 rounded-full border-2 border-[var(--color-outline)]" />
                              </div>
                            )}
                            <div className="flex gap-4 group/activity">
                              {/* Timeline marker */}
                              <div className="flex-shrink-0 flex flex-col items-center w-12 mt-2">
                                <div
                                  style={{ backgroundColor: dayColor }}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-mono-accent font-bold text-sm border-4 border-[var(--color-surface-container-lowest)] shadow-sm z-10"
                                  title={`Map marker ${markerNum}`}
                                >
                                  {markerNum}
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 bg-white border border-[var(--color-surface-variant)] rounded-[12px] p-4 shadow-sm group-hover/activity:shadow-level-1 transition-shadow duration-200">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-mono-accent text-sm text-[var(--color-primary)] bg-[var(--color-primary-fixed)] px-2 py-0.5 rounded">{a.time}</span>
                                  <span className="font-heading font-bold">{a.name}</span>
                                  {a.duration && <Badge variant="outline">{a.duration}</Badge>}
                                  {a.estimatedCost && <Badge variant="secondary">{a.estimatedCost}</Badge>}
                                  {resBadge && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${resBadge.color}`}>
                                      {resBadge.label}
                                    </span>
                                  )}
                                  {a.priority && a.priority >= 4 && (
                                    <span className="text-xs text-[var(--color-tertiary)]">{'★'.repeat(a.priority)}</span>
                                  )}
                                </div>
                                <p className="text-[var(--color-on-surface)] mt-1 text-sm">{a.description}</p>

                                {a.location && (
                                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                                    &#x1F4CD; {a.location.name}{a.location.address ? ` \u00B7 ${a.location.address}` : ''}
                                  </p>
                                )}

                                {/* Info (opening hours) */}
                                {a.info && (
                                  <div className="text-xs mt-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[8px] p-3 flex gap-2 items-start">
                                    <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-[16px] mt-0.5">schedule</span>
                                    <span className="text-[var(--color-on-surface-variant)]">{a.info}</span>
                                  </div>
                                )}

                                {/* Tips */}
                                {a.tips && (
                                  <div className="text-xs mt-2 bg-[rgba(225,224,255,0.3)] border border-[var(--color-primary-fixed)] rounded-[8px] p-3 flex gap-2 items-start">
                                    <span className="material-symbols-outlined text-[var(--color-primary)] text-[16px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                                    <span className="text-[var(--color-on-surface)]">{a.tips}</span>
                                  </div>
                                )}

                                {/* Rainy day alternative */}
                                {a.isOutdoor && a.rainyDayAlternative && (
                                  <div className="text-xs mt-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[8px] p-3 flex gap-2 items-start border-dashed">
                                    <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-[16px] mt-0.5">water_drop</span>
                                    <div>
                                      <span className="font-mono-accent text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Weather Backup</span>
                                      <span className="text-[var(--color-on-surface)]">{a.rainyDayAlternative}</span>
                                    </div>
                                  </div>
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
                                      className="text-xs h-7 text-[var(--color-primary)] border-[var(--color-primary-fixed)]"
                                      onClick={(e) => { e.stopPropagation(); setGuideOpen({ name: a.name, text: a.guideNarration! }); }}
                                    >
                                      &#x1F4D6; Read Guide
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-[var(--color-secondary)] border-[var(--color-secondary-fixed)]"
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-[var(--color-primary)] border-[var(--color-primary-fixed-dim)]"
                                    disabled={nearbyLoading === `${itin.days.indexOf(day)}-${i}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestNearby(itin.days.indexOf(day), i);
                                    }}
                                  >
                                    {nearbyLoading === `${itin.days.indexOf(day)}-${i}` ? (
                                      <span className="animate-spin inline-block mr-1">&#x21BB;</span>
                                    ) : '&#x1F4CD; '}
                                    What&apos;s Nearby
                                  </Button>
                                </div>

                                {/* Suggestion Panel (inline) */}
                                {altSuggestion &&
                                  altSuggestion.dayIndex === itin.days.indexOf(day) &&
                                  altSuggestion.activityIndex === i && (
                                  <div className="mt-3 p-4 rounded-[16px] border border-[var(--color-secondary)] bg-[var(--color-surface-container-lowest)] shadow-level-1 space-y-3 relative">
                                    <div className="absolute -top-3 right-4 bg-[var(--color-surface-container-lowest)] px-2">
                                      <span className="font-mono-accent text-[12px] text-[var(--color-secondary)] font-bold">{altSuggestion.attempt}/3 Suggestions</span>
                                    </div>
                                    <h4 className="font-heading font-bold text-[var(--color-on-surface)] text-sm flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[var(--color-secondary)]">alt_route</span>
                                      Alternative Suggestion
                                    </h4>
                                    <div className="bg-[var(--color-surface-container-low)] rounded-[12px] p-3 border border-[var(--color-surface-variant)]">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-mono text-[var(--color-primary)]">{altSuggestion.suggestion.time}</span>
                                        <span className="font-semibold">{altSuggestion.suggestion.name}</span>
                                        {altSuggestion.suggestion.duration && <Badge variant="outline">{altSuggestion.suggestion.duration}</Badge>}
                                        {altSuggestion.suggestion.estimatedCost && <Badge variant="secondary">{altSuggestion.suggestion.estimatedCost}</Badge>}
                                        {altSuggestion.suggestion.reservationStatus && (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${RES_BADGE[altSuggestion.suggestion.reservationStatus]?.color || ''}`}>
                                            {RES_BADGE[altSuggestion.suggestion.reservationStatus]?.label}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[var(--color-on-surface)] mt-1 text-sm">{altSuggestion.suggestion.description}</p>
                                      {altSuggestion.suggestion.whySuggested && (
                                        <p className="text-xs text-[var(--color-secondary)] mt-1 italic">&#x1F4A1; {altSuggestion.suggestion.whySuggested}</p>
                                      )}
                                      {altSuggestion.suggestion.info && (
                                        <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">&#x1F552; {altSuggestion.suggestion.info}</p>
                                      )}
                                      {altSuggestion.suggestion.tips && (
                                        <p className="text-xs text-[var(--color-primary)] mt-1">&#x1F4A1; {altSuggestion.suggestion.tips}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-[var(--color-secondary)] text-white text-xs hover:opacity-90"
                                        onClick={(e) => { e.stopPropagation(); approveAlternative(); }}
                                        disabled={!!altLoading}
                                      >
                                        {altLoading ? 'Applying...' : 'Approve'}
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
                                          className="text-xs text-[var(--color-secondary)] border-[var(--color-secondary-fixed)]"
                                          onClick={(e) => { e.stopPropagation(); reSuggestAlternative(); }}
                                          disabled={!!altLoading}
                                        >
                                          &#x1F504; Re-suggest ({3 - altSuggestion.attempt} left)
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* What's Nearby Panel */}
                                {nearbySuggestions &&
                                  nearbySuggestions.dayIndex === itin.days.indexOf(day) &&
                                  nearbySuggestions.activityIndex === i && (
                                  <div className="mt-3 p-4 rounded-[16px] bg-[rgba(192,193,255,0.2)] border border-[var(--color-primary-fixed-dim)] shadow-level-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-heading font-bold text-[var(--color-on-surface)] text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">explore</span>
                                        What&apos;s Nearby
                                      </h4>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setNearbySuggestions(null); }}
                                        className="text-[var(--color-primary)] text-xs hover:underline"
                                      >
                                        Dismiss
                                      </button>
                                    </div>
                                    {nearbySuggestions.suggestions.map((ns, ni) => (
                                      <div key={ni} className="bg-[var(--color-surface-container-lowest)] rounded-[12px] p-3 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-xl flex-shrink-0">
                                          {ns.type === 'cafe' ? '\u2615' : ns.type === 'shop' ? '\u{1F6CD}\uFE0F' : ns.type === 'viewpoint' ? '\u{1F304}' : ns.type === 'gallery' ? '\u{1F3A8}' : ns.type === 'park' ? '\u{1F333}' : ns.type === 'market' ? '\u{1F3EA}' : '\u{1F4CD}'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="font-medium text-sm">{ns.name}</span>
                                            <span className="text-xs text-[var(--color-on-surface-variant)]">{ns.distance}</span>
                                            {ns.estimatedCost && <Badge variant="secondary" className="text-xs">{ns.estimatedCost}</Badge>}
                                          </div>
                                          <p className="text-xs text-[var(--color-on-surface)]">{ns.description}</p>
                                          <p className="text-xs text-[var(--color-primary)] italic mt-0.5">{ns.whyRelevant}</p>
                                          {ns.location?.lat && ns.location?.lng && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${ns.location.lat},${ns.location.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline">
                                              View on map &#x2197;
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Notes */}
                    <div className="mt-4 pt-4 border-t border-[var(--color-surface-variant)]">
                      <textarea
                        className="w-full text-sm border border-[var(--color-outline)] rounded-[12px] bg-[var(--color-background)] p-3 resize-none focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] transition-all"
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
                  <div key={i} className="p-4 rounded-[12px] bg-[var(--color-tertiary-fixed)] border border-[var(--color-tertiary-fixed-dim)] hover:shadow-level-1 transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{FIND_EMOJI[find.type] || '\u{1F4CD}'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{find.name}</span>
                          {find.estimatedCost && <Badge variant="secondary" className="text-xs">{find.estimatedCost}</Badge>}
                        </div>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">{find.description}</p>
                      </div>
                    </div>
                    {find.location?.lat && find.location?.lng && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${find.location.lat},${find.location.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline ml-7">
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
              <ul className="list-disc list-inside space-y-1 text-[var(--color-on-surface)]">
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
            className="relative w-full max-w-md bg-[var(--color-surface-container-lowest)] shadow-[-8px_0_24px_rgba(26,26,46,0.1)] border-l border-[var(--color-surface-variant)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--color-surface-container)] border-b border-[var(--color-surface-variant)] p-4 flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-[var(--color-on-surface)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)]">headphones</span>
                {guideOpen.name}
              </h3>
              <button onClick={() => setGuideOpen(null)} className="p-2 hover:bg-[var(--color-surface-variant)] rounded-full transition-colors text-[var(--color-outline)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 text-body-lg leading-relaxed text-[var(--color-on-surface)]">
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
