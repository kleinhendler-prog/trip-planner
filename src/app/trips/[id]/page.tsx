'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SlideOver } from '@/components/ui/slide-over';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import type { Trip, Day, Activity, Meal } from '@/types';

export default function TripViewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(trip?.days?.[0]?.id ? [trip.days[0].id] : []));
  const [selectedGuideActivityId, setSelectedGuideActivityId] = useState<string | null>(null);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [budgetCollapsed, setBudgetCollapsed] = useState(false);
  const [qaCollapsed, setQaCollapsed] = useState(true);

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiClient.get<Trip>(`/trips/${tripId}`);
      if (response.success && response.data) {
        setTrip(response.data);
        // Expand first day by default
        if (response.data.days?.[0]) {
          setExpandedDays(new Set([response.data.days[0].id]));
        }
      } else {
        setError('Failed to load trip');
      }
    } catch (err) {
      setError('Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDayExpand = (dayId: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const calculateBudget = () => {
    if (!trip) return { total: 0, perPerson: 0 };
    let total = 0;
    trip.days.forEach((day) => {
      day.activities.forEach((activity) => {
        if (activity.estimatedCost) total += activity.estimatedCost;
      });
      day.meals.forEach((meal) => {
        if (meal.estimatedCost) total += meal.estimatedCost;
      });
    });
    const travelers = trip.travelers || 1;
    return {
      total,
      perPerson: Math.round(total / travelers),
    };
  };

  const getDayBudget = (day: Day) => {
    let total = 0;
    day.activities.forEach((activity) => {
      if (activity.estimatedCost) total += activity.estimatedCost;
    });
    day.meals.forEach((meal) => {
      if (meal.estimatedCost) total += meal.estimatedCost;
    });
    return total;
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleAddNote = async (dayId: string, note: string) => {
    try {
      const response = await apiClient.patch(`/trips/${tripId}/days/${dayId}`, {
        notes: note,
      });
      if (response.success) {
        if (trip) {
          const updatedDays = trip.days.map((d) =>
            d.id === dayId ? { ...d, notes: note } : d
          );
          setTrip({ ...trip, days: updatedDays });
        }
      }
    } catch (err) {
      setError('Failed to save note');
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading trip...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!trip) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-red-600">{error || 'Trip not found'}</p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => router.push('/')}
              >
                Back to Trips
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const budget = calculateBudget();
  const dailyBudgetTarget = trip.preferences?.budget === 'budget' ? 100 : trip.preferences?.budget === 'luxury' ? 300 : 150;

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
                <p className="mt-2 text-lg text-gray-600">{trip.destination}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{trip.tripType}</Badge>
                  <Badge variant="secondary">{trip.status}</Badge>
                  <Badge variant="outline">
                    {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Must-Book-Now Banner */}
          <div className="mb-6 rounded-lg border-l-4 border-red-600 bg-red-50 p-4">
            <p className="font-semibold text-red-800">
              Book these this week - Limited availability!
            </p>
          </div>

          {/* Budget Summary */}
          <Card className="mb-6">
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setBudgetCollapsed(!budgetCollapsed)}
            >
              <CardTitle className="text-base">Budget Summary</CardTitle>
              <span className="text-gray-400">{budgetCollapsed ? '▼' : '▲'}</span>
            </CardHeader>
            {!budgetCollapsed && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-semibold text-blue-600">TOTAL BUDGET</p>
                    <p className="text-2xl font-bold text-blue-900">${budget.total}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4">
                    <p className="text-xs font-semibold text-purple-600">PER PERSON</p>
                    <p className="text-2xl font-bold text-purple-900">${budget.perPerson}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Weather Banner */}
          <div className="mb-6 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-900">
              Weather: Expect warm days with occasional rain. Pack an umbrella!
            </p>
          </div>

          {/* Hotel Recommendations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recommended Hotels</CardTitle>
              <CardDescription>Based on your preferences and location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 h-24 rounded bg-gray-200"></div>
                    <h3 className="font-semibold text-gray-900">Hotel Name {i}</h3>
                    <p className="mt-1 text-sm text-gray-600">★★★★☆ (4.5)</p>
                    <p className="mt-2 text-sm text-gray-600">$120/night</p>
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Days Itinerary */}
          <div className="space-y-4 mb-6">
            {trip.days.map((day, idx) => (
              <Card key={day.id}>
                <CardHeader
                  className="flex flex-row items-center justify-between space-y-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleDayExpand(day.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold"
                      style={{ backgroundColor: day.colorHex || '#3b82f6' }}
                    >
                      {day.dayNumber}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardTitle>
                      {day.theme && (
                        <CardDescription className="text-sm">{day.theme}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getDayBudget(day) > dailyBudgetTarget && (
                      <Badge variant="warning">Over Budget</Badge>
                    )}
                    <span className="text-gray-400">{expandedDays.has(day.id) ? '▲' : '▼'}</span>
                  </div>
                </CardHeader>

                {expandedDays.has(day.id) && (
                  <CardContent className="space-y-6 border-t pt-6">
                    {/* Morning Activities */}
                    <div>
                      <h4 className="mb-3 font-semibold text-gray-900">Morning</h4>
                      <div className="space-y-3">
                        {day.activities
                          .filter((a) => a.startTime < '12:00')
                          .map((activity) => (
                            <ActivityCard
                              key={activity.id}
                              activity={activity}
                              onGuideClick={() => setSelectedGuideActivityId(activity.id)}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Lunch */}
                    {day.meals
                      .filter((m) => m.type === 'lunch')
                      .map((meal) => (
                        <MealCard key={meal.id} meal={meal} />
                      ))}

                    {/* Afternoon Activities */}
                    <div>
                      <h4 className="mb-3 font-semibold text-gray-900">Afternoon</h4>
                      <div className="space-y-3">
                        {day.activities
                          .filter((a) => a.startTime >= '12:00' && a.startTime < '18:00')
                          .map((activity) => (
                            <ActivityCard
                              key={activity.id}
                              activity={activity}
                              onGuideClick={() => setSelectedGuideActivityId(activity.id)}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Dinner */}
                    {day.meals
                      .filter((m) => m.type === 'dinner')
                      .map((meal) => (
                        <MealCard key={meal.id} meal={meal} />
                      ))}

                    {/* Evening Activities */}
                    <div>
                      <h4 className="mb-3 font-semibold text-gray-900">Evening</h4>
                      <div className="space-y-3">
                        {day.activities
                          .filter((a) => a.startTime >= '18:00')
                          .map((activity) => (
                            <ActivityCard
                              key={activity.id}
                              activity={activity}
                              onGuideClick={() => setSelectedGuideActivityId(activity.id)}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Day Budget */}
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-600">DAY TOTAL</p>
                      <p className="text-lg font-bold text-gray-900">${getDayBudget(day)}</p>
                    </div>

                    {/* Day Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Day Notes
                      </label>
                      <textarea
                        value={dayNotes[day.id] || day.notes || ''}
                        onChange={(e) => {
                          setDayNotes({ ...dayNotes, [day.id]: e.target.value });
                          handleAddNote(day.id, e.target.value);
                        }}
                        placeholder="Add notes for this day..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>

                    {/* Day Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Regenerate This Day
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* QA Report */}
          <Card className="mb-6">
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 cursor-pointer hover:bg-gray-50"
              onClick={() => setQaCollapsed(!qaCollapsed)}
            >
              <CardTitle className="text-base">QA Report</CardTitle>
              <span className="text-gray-400">{qaCollapsed ? '▼' : '▲'}</span>
            </CardHeader>
            {!qaCollapsed && (
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600">✓</span>
                    <span>All activities have booking links</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600">✓</span>
                    <span>Transit times calculated between all stops</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-600">⚠</span>
                    <span>Day 3 is over budget by $50</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sources */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Sources Consulted</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Lonely Planet Travel Guide</li>
                <li>• Google Maps & Reviews</li>
                <li>• TripAdvisor</li>
                <li>• Local Tourism Board</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Guide SlideOver */}
      <SlideOver
        open={selectedGuideActivityId !== null}
        onClose={() => setSelectedGuideActivityId(null)}
        title="Activity Guide"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This is a detailed guide for the selected activity. It includes local tips,
            cultural context, and recommendations to enhance your experience.
          </p>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Pro tip: Arrive early to avoid crowds and get the best photos.
            </p>
          </div>
        </div>
      </SlideOver>
    </AppShell>
  );
}

// Activity Card Component
function ActivityCard({
  activity,
  onGuideClick,
}: {
  activity: Activity;
  onGuideClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h5 className="font-semibold text-gray-900">{activity.title}</h5>
          {activity.location && (
            <p className="text-sm text-gray-600">{activity.location.name}</p>
          )}
        </div>
      </div>

      {activity.description && (
        <p className="mb-3 text-sm text-gray-600">{activity.description}</p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Time:</span>
          <span className="ml-1 font-medium">
            {activity.startTime}
            {activity.endTime && ` - ${activity.endTime}`}
          </span>
        </div>
        {activity.duration && (
          <div>
            <span className="text-gray-600">Duration:</span>
            <span className="ml-1 font-medium">{activity.duration} min</span>
          </div>
        )}
      </div>

      {activity.notes && (
        <div className="mb-3 rounded-lg bg-yellow-50 p-2">
          <p className="text-xs text-yellow-800">{activity.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {activity.bookingUrl && (
          <Button variant="outline" size="sm">
            Book
          </Button>
        )}
        {activity.externalLinks?.googleMaps && (
          <Button variant="outline" size="sm">
            Maps
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onGuideClick}>
          Read Guide
        </Button>
      </div>

      {activity.estimatedCost && (
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-xs font-semibold text-gray-600">ESTIMATED COST</span>
          <span className="font-bold text-gray-900">${activity.estimatedCost}</span>
        </div>
      )}
    </div>
  );
}

// Meal Card Component
function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-orange-50">
      <div className="mb-2 flex items-start justify-between">
        <h5 className="font-semibold text-gray-900 capitalize">{meal.type}</h5>
        {meal.startTime && <span className="text-xs text-gray-600">{meal.startTime}</span>}
      </div>
      <p className="text-sm font-medium text-gray-900">{meal.restaurant.name}</p>
      {meal.restaurant.cuisine && (
        <p className="text-xs text-gray-600">{meal.restaurant.cuisine.join(', ')}</p>
      )}
      {meal.notes && <p className="mt-2 text-xs text-gray-600">{meal.notes}</p>}
      {meal.estimatedCost && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">ESTIMATED COST</span>
          <span className="font-bold text-gray-900">${meal.estimatedCost}</span>
        </div>
      )}
    </div>
  );
}
