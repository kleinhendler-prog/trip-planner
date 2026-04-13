'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
import type { DestinationSourceInfo } from '@/types';

type TrustRating = 'high' | 'medium' | 'low';

export default function SourcesPage() {
  const [sources, setSources] = useState<DestinationSourceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    destination: '',
    audienceType: '',
    trustRating: '',
  });
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingTrustRating, setEditingTrustRating] = useState<TrustRating>('medium');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiClient.get<DestinationSourceInfo[]>('/sources');
      if (response.success && response.data) {
        setSources(response.data);
      } else {
        setError('Failed to load sources');
      }
    } catch (err) {
      setError('Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTrustRating = async (sourceId: string) => {
    try {
      setIsUpdating(true);
      const response = await apiClient.patch(`/sources/${sourceId}`, {
        trustRating: editingTrustRating,
      });
      if (response.success) {
        setSources(
          sources.map((s) =>
            s.id === sourceId ? { ...s, trustRating: editingTrustRating } : s
          )
        );
        setEditingSourceId(null);
      } else {
        setError('Failed to update source');
      }
    } catch (err) {
      setError('Failed to update source');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (sourceId: string, currentActive: boolean) => {
    try {
      const response = await apiClient.patch(`/sources/${sourceId}`, {
        active: !currentActive,
      });
      if (response.success) {
        setSources(
          sources.map((s) =>
            s.id === sourceId ? { ...s, active: !currentActive } : s
          )
        );
      } else {
        setError('Failed to toggle source');
      }
    } catch (err) {
      setError('Failed to toggle source');
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      setIsDeleting(true);
      const response = await apiClient.delete(`/sources/${sourceId}`);
      if (response.success) {
        setSources(sources.filter((s) => s.id !== sourceId));
        setDeleteConfirmId(null);
      } else {
        setError('Failed to delete source');
      }
    } catch (err) {
      setError('Failed to delete source');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSources = sources.filter((source) => {
    if (filters.destination && !source.destinationKey.includes(filters.destination)) {
      return false;
    }
    if (filters.audienceType && source.audienceType !== filters.audienceType) {
      return false;
    }
    if (filters.trustRating && source.trustRating !== filters.trustRating) {
      return false;
    }
    return true;
  });

  const trustRatingColors = {
    high: 'success',
    medium: 'warning',
    low: 'destructive',
  } as const;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading sources...</p>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Source Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage destination information sources and trust ratings
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Input
                label="Destination"
                placeholder="Search destination..."
                value={filters.destination}
                onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
              />

              <Select
                label="Audience Type"
                value={filters.audienceType}
                onChange={(e) => setFilters({ ...filters, audienceType: e.target.value })}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'local', label: 'Local' },
                  { value: 'tourist', label: 'Tourist' },
                  { value: 'business', label: 'Business' },
                ]}
              />

              <Select
                label="Trust Rating"
                value={filters.trustRating}
                onChange={(e) => setFilters({ ...filters, trustRating: e.target.value })}
                options={[
                  { value: '', label: 'All Ratings' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ destination: '', audienceType: '', trustRating: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sources Table */}
          <Card>
            <CardContent className="p-0">
              {filteredSources.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-600">No sources found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Source Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Destination
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Audience
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Trust Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSources.map((source) => (
                        <tr key={source.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{source.sourceName}</p>
                              <p className="text-xs text-gray-600">{source.domain}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline">{source.destinationKey}</Badge>
                          </td>
                          <td className="px-6 py-4 capitalize text-sm text-gray-600">
                            {source.audienceType}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={trustRatingColors[source.trustRating]}>
                              {source.trustRating}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleActive(source.id, source.active)}
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                source.active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {source.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingSourceId(source.id);
                                  setEditingTrustRating(source.trustRating);
                                }}
                              >
                                Edit Rating
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteConfirmId(source.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Trust Rating Dialog */}
      <Dialog
        open={editingSourceId !== null}
        onOpenChange={(open) => !open && setEditingSourceId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trust Rating</DialogTitle>
            <DialogDescription>Update the trust rating for this source</DialogDescription>
          </DialogHeader>

          <Select
            label="Trust Rating"
            value={editingTrustRating}
            onChange={(e) => setEditingTrustRating(e.target.value as TrustRating)}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSourceId(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={isUpdating}
              onClick={() => editingSourceId && handleUpdateTrustRating(editingSourceId)}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this source? This action cannot be undone.
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
