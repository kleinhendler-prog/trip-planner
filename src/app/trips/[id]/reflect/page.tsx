'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import type { Trip, Activity, Meal } from '@/types';

interface ReflectionData {
  lovedActivities: string[];
  lovedText: string;
  disappointedActivities: string[];
  disappointedText: string;
  rememberedMoments: string;
  localTipsReview: Record<string, 'paid_off' | 'misleading'>;
}

export default function ReflectionPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [reflection, setReflection] = useState<ReflectionData>({
    lovedActivities: [],
    lovedText: '',
    disappointedActivities: [],
    disappointedText: '',
    rememberedMoments: '',
    localTipsReview: {},
  });

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
      } else {
        setError('Failed to load trip');
      }
    } catch (err) {
      setError('Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllActivities = (): Array<{ id: string; title: string }> => {
    if (!trip) return [];
    const activities: Array<{ id: string; title: string }> = [];
    trip.days.forEach((day) => {
      day.activities.forEach((activity) => {
        activities.push({
          id: activity.id,
          title: activity.title,
        });
      });
    });
    return activities;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await apiClient.post(`/trips/${tripId}/reflect`, {
        lovedActivities: reflection.lovedActivities,
        lovedText: reflection.lovedText,
        disappointedActivities: reflection.disappointedActivities,
        disappointedText: reflection.disappointedText,
        rememberedMoments: reflection.rememberedMoments,
        localTipsReview: reflection.localTipsReview,
      });

      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push(`/trips/${tripId}`);
        }, 2000);
      } else {
        setError('Failed to submit reflection');
      }
    } catch (err) {
      setError('Failed to submit reflection');
    } finally {
      setIsSubmitting(false);
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

  const allActivities = getAllActivities();
  const activityOptions = allActivities.map((a) => ({
    value: a.id,
    label: a.title,
  }));

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Trip Reflection
            </h1>
            <p className="mt-2 text-gray-600">
              Share your thoughts about your trip to {trip.destination}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Question 1: What Did You Love? */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">What did you love most?</CardTitle>
              <CardDescription>
                Select activities and experiences that stood out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Activities You Loved
                </label>
                <Chip
                  options={activityOptions}
                  selectedValues={reflection.lovedActivities}
                  onChange={(selected) =>
                    setReflection({
                      ...reflection,
                      lovedActivities: selected as string[],
                    })
                  }
                />
              </div>

              <textarea
                value={reflection.lovedText}
                onChange={(e) =>
                  setReflection({
                    ...reflection,
                    lovedText: e.target.value,
                  })
                }
                placeholder="Tell us more about what made this trip special..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-32"
              />
            </CardContent>
          </Card>

          {/* Question 2: What Disappointed You? */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">What disappointed you?</CardTitle>
              <CardDescription>
                Help us improve future recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Activities or Experiences That Fell Short
                </label>
                <Chip
                  options={activityOptions}
                  selectedValues={reflection.disappointedActivities}
                  onChange={(selected) =>
                    setReflection({
                      ...reflection,
                      disappointedActivities: selected as string[],
                    })
                  }
                />
              </div>

              <textarea
                value={reflection.disappointedText}
                onChange={(e) =>
                  setReflection({
                    ...reflection,
                    disappointedText: e.target.value,
                  })
                }
                placeholder="What could have been better? What should we have skipped?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-32"
              />
            </CardContent>
          </Card>

          {/* Question 3: Anything to Remember? */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Anything else to remember?</CardTitle>
              <CardDescription>
                Tips, insights, or moments that matter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={reflection.rememberedMoments}
                onChange={(e) =>
                  setReflection({
                    ...reflection,
                    rememberedMoments: e.target.value,
                  })
                }
                placeholder="Capture any special memories, tips for next time, or lessons learned..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-32"
              />
            </CardContent>
          </Card>

          {/* Question 4: Local Tips Review */}
          {(() => {
            // Collect all local tips from activities
            const tipsMap: Record<string, string> = {};
            trip.days.forEach((day) => {
              day.activities.forEach((activity) => {
                if (activity.notes) {
                  tipsMap[activity.id] = activity.notes;
                }
              });
            });

            return Object.keys(tipsMap).length > 0 ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Local Tips Review</CardTitle>
                  <CardDescription>
                    Which tips paid off and which were misleading?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(tipsMap).map(([activityId, tipText]) => {
                      const activity = trip.days
                        .flatMap((d) => d.activities)
                        .find((a) => a.id === activityId);
                      return (
                        <div key={activityId} className="rounded-lg border border-gray-200 p-4">
                          <p className="font-medium text-gray-900 mb-2">
                            {activity?.title}
                          </p>
                          <p className="text-sm text-gray-600 mb-3 italic">
                            "{tipText}"
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setReflection({
                                  ...reflection,
                                  localTipsReview: {
                                    ...reflection.localTipsReview,
                                    [activityId]: 'paid_off',
                                  },
                                })
                              }
                              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                reflection.localTipsReview[activityId] === 'paid_off'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Paid Off ✓
                            </button>
                            <button
                              onClick={() =>
                                setReflection({
                                  ...reflection,
                                  localTipsReview: {
                                    ...reflection.localTipsReview,
                                    [activityId]: 'misleading',
                                  },
                                })
                              }
                              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                reflection.localTipsReview[activityId] === 'misleading'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Misleading ✗
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/trips/${tripId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Submit Reflection
            </Button>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you!</DialogTitle>
            <DialogDescription>
              Your reflection has been saved and will help us personalize your future trips.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-5xl mb-2">🎉</div>
            <p className="text-gray-600">Redirecting you back to your trip...</p>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
