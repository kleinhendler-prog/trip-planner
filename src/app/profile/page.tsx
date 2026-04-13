'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { INTERESTS, DISLIKES, HOTEL_PREFERENCES } from '@/lib/constants';

interface UserPreference {
  id: string;
  interests: string[];
  dislikes: string[];
  hotelPreference: string;
  sourceLink?: string;
  createdAt: Date;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPreferences();
    }
  }, [status]);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiClient.get<UserPreference[]>('/profile/preferences');
      if (response.success && response.data) {
        setPreferences(response.data);
      } else {
        setError('Failed to load preferences');
      }
    } catch (err) {
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (preferenceId: string) => {
    try {
      setIsDeleting(true);
      const response = await apiClient.delete(`/profile/preferences/${preferenceId}`);
      if (response.success) {
        setPreferences(preferences.filter((p) => p.id !== preferenceId));
        setDeleteConfirmId(null);
      } else {
        setError('Failed to delete preference');
      }
    } catch (err) {
      setError('Failed to delete preference');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              My Profile
            </h1>
            <p className="mt-2 text-gray-600">Manage your travel preferences and history</p>
          </div>

          {/* User Info Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-600">EMAIL</p>
                <p className="text-lg font-medium text-gray-900">{session?.user?.email}</p>
              </div>
              {session?.user?.name && (
                <div>
                  <p className="text-xs font-semibold text-gray-600">NAME</p>
                  <p className="text-lg font-medium text-gray-900">{session.user.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Travel Preferences Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Your Travel Preferences
              </h2>
              <p className="text-gray-600 mb-4">
                Preferences accumulated from your trip reflections
              </p>

              {preferences.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-lg font-semibold text-gray-900">No preferences yet</h3>
                    <p className="mt-2 text-gray-600">
                      Complete trip reflections to build your preference profile
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {preferences.map((pref) => (
                    <Card key={pref.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              Preference #{preferences.indexOf(pref) + 1}
                            </CardTitle>
                            {pref.sourceLink && (
                              <CardDescription>
                                From reflection:{' '}
                                <a href={pref.sourceLink} className="text-blue-600 hover:underline">
                                  View trip
                                </a>
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirmId(pref.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Interests */}
                        {pref.interests && pref.interests.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">INTERESTS</p>
                            <div className="flex flex-wrap gap-2">
                              {pref.interests.map((interest) => (
                                <Badge key={interest}>
                                  {INTERESTS[interest as keyof typeof INTERESTS]?.label || interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dislikes */}
                        {pref.dislikes && pref.dislikes.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">DISLIKES</p>
                            <div className="flex flex-wrap gap-2">
                              {pref.dislikes.map((dislike) => (
                                <Badge key={dislike} variant="warning">
                                  {DISLIKES[dislike as keyof typeof DISLIKES]?.label || dislike}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hotel Preference */}
                        {pref.hotelPreference && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              HOTEL PREFERENCE
                            </p>
                            <Badge variant="secondary">
                              {HOTEL_PREFERENCES[pref.hotelPreference as keyof typeof HOTEL_PREFERENCES]?.label || pref.hotelPreference}
                            </Badge>
                          </div>
                        )}

                        {/* Created Date */}
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          Added: {new Date(pref.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Accumulated Profile Summary */}
          {preferences.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Your Travel Profile</CardTitle>
                <CardDescription>Summary of all your preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Most Common Interests */}
                {(() => {
                  const interestCounts: Record<string, number> = {};
                  preferences.forEach((pref) => {
                    pref.interests?.forEach((interest) => {
                      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
                    });
                  });

                  const topInterests = Object.entries(interestCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);

                  return (
                    topInterests.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-3">
                          Your Top Interests
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {topInterests.map(([interest, count]) => (
                            <Badge key={interest} variant="default">
                              {INTERESTS[interest as keyof typeof INTERESTS]?.label || interest}{' '}
                              <span className="ml-1 text-xs opacity-75">({count})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}

                {/* Most Common Dislikes */}
                {(() => {
                  const dislikeCounts: Record<string, number> = {};
                  preferences.forEach((pref) => {
                    pref.dislikes?.forEach((dislike) => {
                      dislikeCounts[dislike] = (dislikeCounts[dislike] || 0) + 1;
                    });
                  });

                  const topDislikes = Object.entries(dislikeCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);

                  return (
                    topDislikes.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-3">
                          Things to Avoid
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {topDislikes.map(([dislike, count]) => (
                            <Badge key={dislike} variant="warning">
                              {DISLIKES[dislike as keyof typeof DISLIKES]?.label || dislike}{' '}
                              <span className="ml-1 text-xs opacity-75">({count})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}

                {/* Preferred Hotel Type */}
                {(() => {
                  const hotelCounts: Record<string, number> = {};
                  preferences.forEach((pref) => {
                    if (pref.hotelPreference) {
                      hotelCounts[pref.hotelPreference] = (hotelCounts[pref.hotelPreference] || 0) + 1;
                    }
                  });

                  const favorite = Object.entries(hotelCounts).sort(([, a], [, b]) => b - a)[0];

                  return (
                    favorite && (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-3">
                          Preferred Hotel Style
                        </p>
                        <Badge variant="secondary" className="text-base">
                          {HOTEL_PREFERENCES[favorite[0] as keyof typeof HOTEL_PREFERENCES]?.label || favorite[0]}
                        </Badge>
                      </div>
                    )
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Preference</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this preference? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeleting}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
