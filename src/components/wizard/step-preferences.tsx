'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import type { TripType, HotelPreference } from '@/types';
import { TRIP_TYPES, HOTEL_PREFERENCES } from '@/lib/constants';

interface PreferencesState {
  tripType?: TripType;
  hotelPreference?: HotelPreference;
  currency?: 'USD' | 'EUR';
  budget?: 'budget' | 'moderate' | 'luxury';
}

interface StepPreferencesProps {
  preferences: PreferencesState;
  onPreferencesChange: (preferences: PreferencesState) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const StepPreferences: React.FC<StepPreferencesProps> = ({
  preferences,
  onPreferencesChange,
  onNext,
  onPrevious,
}) => {
  const tripTypeOptions = Object.entries(TRIP_TYPES).map(([key, value]) => ({
    value: key as TripType,
    label: `${value.icon} ${value.label}`,
  }));

  const hotelOptions = Object.entries(HOTEL_PREFERENCES).map(([key, value]) => ({
    value: key as HotelPreference,
    label: `${value.icon} ${value.label}`,
  }));

  const budgetOptions = [
    { value: 'budget', label: '💰 Budget-Friendly' },
    { value: 'moderate', label: '💵 Moderate' },
    { value: 'luxury', label: '💎 Luxury' },
  ];

  const currencyOptions = [
    { value: 'USD', label: '🇺🇸 USD ($)' },
    { value: 'EUR', label: '🇪🇺 EUR (€)' },
  ];

  const isValid = preferences.tripType && preferences.hotelPreference && preferences.currency && preferences.budget;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Trip Preferences</CardTitle>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-2">
          Tell us about your travel style and budget
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trip Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
            Trip Type
          </label>
          <div className="space-y-2">
            {tripTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  onPreferencesChange({
                    ...preferences,
                    tripType: option.value,
                  })
                }
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  preferences.tripType === option.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed)]'
                    : 'border-[var(--color-outline-variant)] hover:border-[var(--color-outline-variant)]'
                }`}
              >
                <p className="font-medium text-[var(--color-on-surface)]">{option.label}</p>
                {preferences.tripType === option.value && (
                  <p className="text-xs text-[var(--color-primary)] mt-1">✓ Selected</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Hotel Preference */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Hotel Preference
          </label>
          <Chip
            options={hotelOptions}
            selectedValues={preferences.hotelPreference ? [preferences.hotelPreference] : []}
            onChange={(selected) =>
              onPreferencesChange({
                ...preferences,
                hotelPreference: (selected[0] as HotelPreference) || undefined,
              })
            }
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Budget Level
          </label>
          <Chip
            options={budgetOptions}
            selectedValues={preferences.budget ? [preferences.budget] : []}
            onChange={(selected) =>
              onPreferencesChange({
                ...preferences,
                budget: (selected[0] as 'budget' | 'moderate' | 'luxury') || undefined,
              })
            }
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Currency
          </label>
          <Chip
            options={currencyOptions}
            selectedValues={preferences.currency ? [preferences.currency] : []}
            onChange={(selected) =>
              onPreferencesChange({
                ...preferences,
                currency: (selected[0] as 'USD' | 'EUR') || undefined,
              })
            }
          />
        </div>

        {/* Summary */}
        {isValid && (
          <div className="bg-[#bbf7d0] border border-[#166534] rounded-[12px] p-4">
            <p className="text-sm text-[var(--color-on-surface)]">
              <span className="font-semibold">Ready to generate!</span>
              <br />
              {preferences.tripType && TRIP_TYPES[preferences.tripType].label}
              {' '} • {' '}
              {preferences.hotelPreference && HOTEL_PREFERENCES[preferences.hotelPreference].label}
              {' '} • {' '}
              {preferences.budget}
            </p>
          </div>
        )}

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

export { StepPreferences };
