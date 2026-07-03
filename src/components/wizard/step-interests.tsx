'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import type { Interest, Dislike } from '@/types';
import { INTERESTS, DISLIKES } from '@/lib/constants';

interface StepInterestsProps {
  interests: Interest[];
  dislikes: Dislike[];
  otherNotes?: string;
  onInterestsChange: (interests: Interest[]) => void;
  onDislikesChange: (dislikes: Dislike[]) => void;
  onNotesChange?: (notes: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const StepInterests: React.FC<StepInterestsProps> = ({
  interests,
  dislikes,
  otherNotes = '',
  onInterestsChange,
  onDislikesChange,
  onNotesChange,
  onNext,
  onPrevious,
}) => {
  const interestOptions = Object.entries(INTERESTS).map(([key, value]) => ({
    value: key as Interest,
    label: `${value.icon} ${value.label}`,
  }));

  const dislikeOptions = Object.entries(DISLIKES).map(([key, value]) => ({
    value: key as Dislike,
    label: `${value.icon} ${value.label}`,
  }));

  const isValid = interests.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">What are your interests?</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Help us tailor your itinerary to your preferences
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Interests Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            What interests you?
          </label>
          <Chip
            options={interestOptions}
            selectedValues={interests}
            onChange={(selected) => onInterestsChange(selected as Interest[])}
          />
          {interests.length === 0 && (
            <p className="text-xs text-gray-600 mt-2">
              Please select at least one interest.
            </p>
          )}
        </div>

        {/* Dislikes Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            What would you like to avoid?
          </label>
          <Chip
            options={dislikeOptions}
            selectedValues={dislikes}
            onChange={(selected) => onDislikesChange(selected as Dislike[])}
          />
          {dislikes.length > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              {dislikes.length} preference{dislikes.length !== 1 ? 's' : ''} noted
            </p>
          )}
        </div>

        {/* Additional Notes */}
        {onNotesChange && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Anything else we should know? (optional)
            </label>
            <textarea
              value={otherNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g., Must-see spots, specific restaurants, travel style..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{interests.length}</span> interest{interests.length !== 1 ? 's' : ''} selected
            {dislikes.length > 0 && (
              <>, <span className="font-semibold">{dislikes.length}</span> dislikes noted</>
            )}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { StepInterests };
