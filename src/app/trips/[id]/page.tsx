'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

const ItineraryMap = dynamic(() => import('@/components/map/itinerary-map'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-50 rounded-lg border flex items-center justify-center text-gray-500">Loading map…</div>,
});

interface SimpleActivity {
  time: string;
  name: string;
  description: string;
  type: string;
  duration: string;
  location?: { name: string; address?: string };
  tips?: string;
  estimatedCost?: string;
}

interface SimpleDay {
  dayNumber: number;
  date: string;
  theme: string;
  neighborhood?: string;
  activities: SimpleActivity[];
  narration?: string;
}

interface SimpleItinerary {
  summary: string;
  highlights: string[];
  days: SimpleDay[];
  hotelRecommendations?: Array<{ name: string; area: string; priceRange: string; why: string }>;
  budgetEstimate?: { perDay: string; total: string; breakdown: string };
  practicalTips?: string[];
}

interface TripRecord {
  id: string;
  destination: any;
  start_date: string;
  end_date: string;
  status: string;
  profile: any;
  itinerary: SimpleItinerary | null;
  currency: string;
}

const TYPE_EMOJI: Record<string, string> = {
  attraction: '🏛️',
  meal: '🍽️',
  transport: '🚗',
  experience: '✨',
  rest: '☕',
};

const DAY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export default function TripViewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    let generationTriggered = false;
    const doFetch = async () => {
      const response = await apiClient.get<TripRecord>(`/trips/${tripId}`);
      if (response.success && response.data) {
        setTrip(response.data);
        // If the trip was just created and has no itinerary, trigger generation
        if (!generationTriggered && response.data.status === 'generating' && !response.data.itinerary) {
          generationTriggered = true;
          // Fire and forget - don't block UI
          apiClient.post(`/trips/${tripId}/generate`, {}).then(() => {
            fetchTrip();
          }).catch(() => fetchTrip());
        }
      }
      setIsLoading(false);
    };
    doFetch();
    const interval = setInterval(() => {
      setTrip((prev) => {
        if (prev && prev.status === 'generating') {
          fetchTrip();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const response = await apiClient.get<TripRecord>(`/trips/${tripId}`);
      if (response.success && response.data) {
        setTrip(response.data);
      } else {
        setError('Failed to load trip');
      }
    } catch {
      setError('Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (n: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-center text-gray-500">Loading trip…</div>
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
              <CardTitle>Generating your trip to {destination}…</CardTitle>
              <CardDescription>
                Our AI is crafting a personalized itinerary. This usually takes 30–90 seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                </div>
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

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              ← Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{destination}</h1>
          <p className="text-gray-600">
            {trip.start_date} → {trip.end_date} · {trip.profile?.travelers || 2} travelers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
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

        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>Numbered markers show the order within each day. Colors indicate different days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ItineraryMap days={itin.days} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your itinerary</h2>
          {itin.days.map((day) => {
            const expanded = expandedDays.has(day.dayNumber);
            return (
              <Card key={day.dayNumber}>
                <button
                  onClick={() => toggleDay(day.dayNumber)}
                  className="w-full text-left"
                >
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Day {day.dayNumber} · {day.theme}</CardTitle>
                        <CardDescription>
                          {day.date}{day.neighborhood ? ` · ${day.neighborhood}` : ''}
                        </CardDescription>
                      </div>
                      <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
                    </div>
                  </CardHeader>
                </button>
                {expanded && (
                  <CardContent className="space-y-4">
                    {day.narration && (
                      <p className="text-gray-600 italic border-l-4 border-blue-200 pl-3 py-1">
                        {day.narration}
                      </p>
                    )}
                    <div className="space-y-3">
                      {day.activities.map((a, i) => {
                        const dayColor = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
                        const markerNum = i + 1;
                        return (
                        <div key={i} className="flex gap-3 p-3 rounded-lg border hover:bg-gray-50">
                          <div className="flex-shrink-0 flex flex-col items-center gap-1">
                            <div
                              style={{ backgroundColor: dayColor }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow"
                              title={`Map marker ${markerNum}`}
                            >
                              {markerNum}
                            </div>
                            <span className="text-lg" title={a.type}>{TYPE_EMOJI[a.type] || '📍'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-mono text-blue-600">{a.time}</span>
                              <span className="font-semibold">{a.name}</span>
                              {a.duration && <Badge variant="outline">{a.duration}</Badge>}
                              {a.estimatedCost && <Badge variant="secondary">{a.estimatedCost}</Badge>}
                            </div>
                            <p className="text-gray-700 mt-1 text-sm">{a.description}</p>
                            {a.location && (
                              <p className="text-xs text-gray-500 mt-1">
                                📍 {a.location.name}{a.location.address ? ` · ${a.location.address}` : ''}
                              </p>
                            )}
                            {a.tips && (
                              <p className="text-xs text-blue-700 mt-2 bg-blue-50 p-2 rounded">
                                💡 {a.tips}
                              </p>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {itin.hotelRecommendations && itin.hotelRecommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hotel recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {itin.hotelRecommendations.map((h, i) => (
                <div key={i} className="p-3 rounded border">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-semibold">{h.name}</h4>
                    <Badge>{h.priceRange}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{h.area}</p>
                  <p className="text-sm text-gray-700 mt-1">{h.why}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {itin.budgetEstimate && (
          <Card>
            <CardHeader>
              <CardTitle>Budget estimate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Per day:</strong> {itin.budgetEstimate.perDay}</p>
              <p><strong>Total:</strong> {itin.budgetEstimate.total}</p>
              <p className="text-sm text-gray-600">{itin.budgetEstimate.breakdown}</p>
            </CardContent>
          </Card>
        )}

        {itin.practicalTips && itin.practicalTips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Practical tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {itin.practicalTips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
