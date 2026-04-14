'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import type { Trip } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
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
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiClient.get<Trip[]>('/trips');
      if (response.success && response.data) {
        setTrips(response.data);
      } else {
        setError('Failed to load trips');
      }
    } catch (err) {
      setError('Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tripId: string) => {
    try {
      setIsDeleting(true);
      const response = await apiClient.delete(`/trips/${tripId}`);
      if (response.success) {
        setTrips(trips.filter((t) => t.id !== tripId));
        setDeleteConfirmId(null);
      } else {
        setError('Failed to delete trip');
      }
    } catch (err) {
      setError('Failed to delete trip');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (trip: Trip) => {
    try {
      const response = await apiClient.post<Trip>('/trips', {
        title: `${trip.title} (Copy)`,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        tripType: trip.tripType,
        preferences: trip.preferences,
      });
      if (response.success && response.data) {
        setTrips([...trips, response.data]);
      } else {
        setError('Failed to duplicate trip');
      }
    } catch (err) {
      setError('Failed to duplicate trip');
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${start} - ${end}`;
  };

  const getDayCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (status === 'loading' || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading your trips...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Trips</h1>
              <p className="mt-1 text-gray-600">Plan and manage your adventures</p>
            </div>
            <Button
              onClick={() => router.push('/trips/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              New Trip
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {trips.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">✈️</div>
                <h3 className="text-lg font-semibold text-gray-900">No trips yet</h3>
                <p className="mt-2 text-gray-600">
                  Create your first trip to get started planning with AI
                </p>
                <Button
                  onClick={() => router.push('/trips/new')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Create Your First Trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Placeholder for destination photo */}
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl">
                    📍
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{(trip as any).profile?.title || `Trip to ${typeof trip.destination === 'string' ? trip.destination : (trip.destination as any)?.name || 'Destination'}`}</CardTitle>
                    <CardDescription>{typeof trip.destination === 'string' ? trip.destination : (trip.destination as any)?.name}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Dates:</span>
                        <span className="font-medium">
                          {formatDateRange((trip as any).start_date || trip.startDate, (trip as any).end_date || trip.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <Badge>
                          {getDayCount((trip as any).start_date || trip.startDate, (trip as any).end_date || trip.endDate)} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="secondary">
                          {trip.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/trips/${trip.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(trip)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmId(trip.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
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
