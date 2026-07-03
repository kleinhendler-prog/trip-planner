'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TRIP_TYPES, HOTEL_PREFERENCES, INTERESTS, DISLIKES } from '@/lib/constants';
import type { Interest, Dislike, TripType, HotelPreference } from '@/types';

interface ReviewState {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: Array<{ age: number }>;
  interests: Interest[];
  dislikes: Dislike[];
  otherNotes?: string;
  tripType?: TripType;
  hotelPreference?: HotelPreference;
  currency?: 'USD' | 'EUR';
  budget?: 'budget' | 'moderate' | 'luxury';
}

interface StepReviewProps {
  data: ReviewState;
  onGenerate: (data: ReviewState) => void;
  onPrevious: () => void;
  isGenerating?: boolean;
}

const StepReview: React.FC<StepReviewProps> = ({
  data,
  onGenerate,
  onPrevious,
  isGenerating = false,
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const totalTravelers = data.adults + data.children.length;
  const tripDays = Math.ceil(
    (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const handleGenerate = () => {
    if (agreedToTerms) {
      onGenerate(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Review Your Trip</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Make sure everything looks right before we generate your itinerary
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trip Basics */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Trip Basics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Destination</p>
              <p className="font-medium text-gray-900">{data.destination}</p>
            </div>
            <div>
              <p className="text-gray-600">Duration</p>
              <p className="font-medium text-gray-900">{tripDays} days</p>
            </div>
            <div>
              <p className="text-gray-600">Travelers</p>
              <p className="font-medium text-gray-900">
                {totalTravelers} ({data.adults} adult{data.adults !== 1 ? 's' : ''}
                {data.children.length > 0 && `, ${data.children.length} child${data.children.length !== 1 ? 'ren' : ''}`})
              </p>
            </div>
            <div>
              <p className="text-gray-600">Dates</p>
              <p className="font-medium text-gray-900">
                {new Date(data.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                -{' '}
                {new Date(data.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Your Preferences</h3>
          <div className="flex flex-wrap gap-2">
            {data.tripType && (
              <Badge>{TRIP_TYPES[data.tripType].icon} {TRIP_TYPES[data.tripType].label}</Badge>
            )}
            {data.hotelPreference && (
              <Badge>{HOTEL_PREFERENCES[data.hotelPreference].icon} {HOTEL_PREFERENCES[data.hotelPreference].label}</Badge>
            )}
            {data.budget && (
              <Badge variant="secondary">
                {data.budget === 'budget' ? '💰' : data.budget === 'luxury' ? '💎' : '💵'} {data.budget}
              </Badge>
            )}
            {data.currency && (
              <Badge variant="secondary">
                {data.currency === 'USD' ? '🇺🇸' : '🇪🇺'} {data.currency}
              </Badge>
            )}
          </div>
        </div>

        {/* Interests */}
        {data.interests.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Interests ({data.interests.length})</h3>
            <div className="flex flex-wrap gap-2">
              {data.interests.map((interest) => (
                <Badge key={interest} variant="default">
                  {INTERESTS[interest].icon} {INTERESTS[interest].label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Dislikes */}
        {data.dislikes.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Things to Avoid ({data.dislikes.length})</h3>
            <div className="flex flex-wrap gap-2">
              {data.dislikes.map((dislike) => (
                <Badge key={dislike} variant="warning">
                  {DISLIKES[dislike].icon} {DISLIKES[dislike].label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Other Notes */}
        {data.otherNotes && (
          <div className="bg-purple-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Additional Notes</h3>
            <p className="text-sm text-gray-700">{data.otherNotes}</p>
          </div>
        )}

        {/* Terms Agreement */}
        <div className="border border-gray-300 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I understand this itinerary is AI-generated and I should verify all bookings and details before traveling.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isGenerating}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!agreedToTerms || isGenerating}
            isLoading={isGenerating}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate Itinerary'}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p>
            ℹ️ We'll create a personalized day-by-day itinerary with activities, restaurants, and hotels tailored to your preferences. This typically takes 2-3 minutes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export { StepReview };
