'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DestinationSuggestion {
  name: string;
  country: string;
  lat?: number;
  lng?: number;
}

interface StepDestinationProps {
  destination: string;
  startDate: string;
  endDate: string;
  onDestinationChange: (destination: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onNext: () => void;
  suggestions?: DestinationSuggestion[];
}

const StepDestination: React.FC<StepDestinationProps> = ({
  destination,
  startDate,
  endDate,
  onDestinationChange,
  onStartDateChange,
  onEndDateChange,
  onNext,
  suggestions = [
    { name: 'Paris', country: 'France' },
    { name: 'Tokyo', country: 'Japan' },
    { name: 'Barcelona', country: 'Spain' },
    { name: 'New York', country: 'USA' },
    { name: 'London', country: 'UK' },
  ],
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<DestinationSuggestion[]>([]);

  useEffect(() => {
    if (destination.length > 0) {
      const filtered = suggestions.filter((s) =>
        `${s.name} ${s.country}`.toLowerCase().includes(destination.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [destination, suggestions]);

  const handleSuggestionClick = (suggestion: DestinationSuggestion) => {
    onDestinationChange(`${suggestion.name}, ${suggestion.country}`);
    setShowSuggestions(false);
  };

  const isValid = destination.length > 0 && startDate && endDate && new Date(endDate) > new Date(startDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Where are you going?</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Destination Input */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Destination
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search cities, regions, or countries..."
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="w-full"
              autoFocus
            />

            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.name}-${suggestion.country}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                  >
                    <span className="font-medium text-gray-900">{suggestion.name}</span>
                    <span className="text-gray-600 ml-2">{suggestion.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Trip Duration Summary */}
        {startDate && endDate && new Date(endDate) > new Date(startDate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-900">
              <span className="font-semibold">
                {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
              {' '}
              from {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' '}
              to {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Validation Messages */}
        {destination.length > 0 && (!startDate || !endDate) && (
          <div className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg p-3">
            Please select both start and end dates.
          </div>
        )}

        {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
            End date must be after start date.
          </div>
        )}

        {/* Next Button */}
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full"
          size="lg"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
};

export { StepDestination };
