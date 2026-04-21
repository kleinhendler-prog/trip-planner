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
  const [profileCompleted, setProfileCompleted] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchTrips();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileCompleted(data.completed || false);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

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
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
            <p className="mt-3 text-[var(--color-on-surface-variant)]">Loading your trips...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          {/* Profile Completion Banner */}
          {!profileCompleted && (
            <div className="mb-6 rounded-[16px] bg-[var(--color-primary-fixed)] border border-[var(--color-primary-fixed-dim)] p-4 flex items-center justify-between shadow-level-1">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <p className="text-sm text-[var(--color-on-surface)]">
                  <span className="font-bold">Complete your travel profile</span> to get more personalized trips
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/profile-setup')}
              >
                Set Up Profile
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-h2 text-[var(--color-on-surface)]">My Trips</h1>
              <p className="mt-1 text-[var(--color-on-surface-variant)]">Plan and manage your adventures</p>
            </div>
            <Button
              onClick={() => router.push('/trips/new')}
            >
              New Trip
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-[16px] bg-[var(--color-error-container)] p-4 flex items-start gap-3 shadow-level-1">
              <span className="material-symbols-outlined text-[var(--color-error)]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <div>
                <p className="text-sm font-bold text-[var(--color-on-error-container)]">Something went wrong</p>
                <p className="text-sm text-[var(--color-on-error-container)]">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {trips.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--color-outline-variant)] p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">luggage</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--color-on-surface)] mb-2">No trips planned yet</h3>
              <p className="text-[var(--color-on-surface-variant)] mb-6">
                Start building your next adventure with AI
              </p>
              <Button
                onClick={() => router.push('/trips/new')}
              >
                Create Your First Trip
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden hover-lift cursor-pointer group">
                  {/* Gradient placeholder header */}
                  <div className="h-44 bg-primary-gradient relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-[var(--color-primary)] border-0 shadow-sm">
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-heading text-xl font-bold mb-1 drop-shadow-sm">
                        {(trip as any).profile?.title || `Trip to ${typeof trip.destination === 'string' ? trip.destination : (trip.destination as any)?.name || 'Destination'}`}
                      </h3>
                      <p className="text-white/90 text-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        {formatDateRange((trip as any).start_date || trip.startDate, (trip as any).end_date || trip.endDate)}
                      </p>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-tertiary)]">schedule</span>
                        {getDayCount((trip as any).start_date || trip.startDate, (trip as any).end_date || trip.endDate)} days
                      </span>
                      <span className="text-[var(--color-on-surface-variant)]">
                        {typeof trip.destination === 'string' ? trip.destination : (trip.destination as any)?.name}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
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
