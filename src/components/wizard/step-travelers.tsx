'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TravelerInfo {
  adults: number;
  children: Array<{ age: number }>;
  notes?: string;
}

interface StepTravelersProps {
  travelers: TravelerInfo;
  onTravelersChange: (travelers: TravelerInfo) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const StepTravelers: React.FC<StepTravelersProps> = ({
  travelers,
  onTravelersChange,
  onNext,
  onPrevious,
}) => {
  const [childAgeInputs, setChildAgeInputs] = useState<string[]>(
    travelers.children.map((c) => c.age.toString())
  );

  const handleAdultsChange = (count: number) => {
    onTravelersChange({
      ...travelers,
      adults: Math.max(1, count),
    });
  };

  const handleAddChild = () => {
    const newChildren = [...travelers.children, { age: 5 }];
    onTravelersChange({ ...travelers, children: newChildren });
    setChildAgeInputs([...childAgeInputs, '5']);
  };

  const handleRemoveChild = (index: number) => {
    const newChildren = travelers.children.filter((_, i) => i !== index);
    const newInputs = childAgeInputs.filter((_, i) => i !== index);
    onTravelersChange({ ...travelers, children: newChildren });
    setChildAgeInputs(newInputs);
  };

  const handleChildAgeChange = (index: number, age: string) => {
    const ageNum = parseInt(age) || 0;
    const newInputs = [...childAgeInputs];
    newInputs[index] = age;
    setChildAgeInputs(newInputs);

    const newChildren = [...travelers.children];
    newChildren[index] = { age: Math.max(0, ageNum) };
    onTravelersChange({ ...travelers, children: newChildren });
  };

  const handleNotesChange = (notes: string) => {
    onTravelersChange({ ...travelers, notes });
  };

  const totalTravelers = travelers.adults + travelers.children.length;
  const isValid = totalTravelers > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Who's traveling?</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Adults */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Number of Adults
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-[var(--color-outline-variant)] rounded-[12px] p-1">
              <button
                onClick={() => handleAdultsChange(travelers.adults - 1)}
                disabled={travelers.adults <= 1}
                className="px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="px-4 font-semibold text-lg">{travelers.adults}</span>
              <button
                onClick={() => handleAdultsChange(travelers.adults + 1)}
                className="px-3 py-1"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-[var(--color-on-surface)]">
              Children (optional)
            </label>
            {travelers.children.length > 0 && (
              <Badge variant="secondary">{travelers.children.length} child{travelers.children.length !== 1 ? 'ren' : ''}</Badge>
            )}
          </div>

          {travelers.children.length > 0 && (
            <div className="space-y-2 mb-3">
              {travelers.children.map((child, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="18"
                    value={childAgeInputs[index]}
                    onChange={(e) => handleChildAgeChange(index, e.target.value)}
                    placeholder="Age"
                    className="flex-1"
                  />
                  <span className="text-sm text-[var(--color-on-surface-variant)]">years old</span>
                  <button
                    onClick={() => handleRemoveChild(index)}
                    className="px-3 py-2 text-[var(--color-error)] hover:bg-[var(--color-error-container)] rounded-[12px] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleAddChild}
            className="w-full"
          >
            + Add Child
          </Button>
        </div>

        {/* Special Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
            Special Notes (optional)
          </label>
          <textarea
            value={travelers.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Mobility needs, dietary restrictions, language preferences, etc."
            className="w-full px-3 py-2 border border-[var(--color-outline-variant)] rounded-[12px] text-sm text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Summary */}
        <div className="bg-[var(--color-primary-fixed)] border border-[var(--color-primary-fixed)] rounded-[12px] p-4">
          <p className="text-sm text-[var(--color-on-surface)]">
            <span className="font-semibold">{totalTravelers}</span> traveler{totalTravelers !== 1 ? 's' : ''} total
            {travelers.children.length > 0 && (
              <>
                : {travelers.adults} adult{travelers.adults !== 1 ? 's' : ''} + {travelers.children.length} child{travelers.children.length !== 1 ? 'ren' : ''}
              </>
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

export { StepTravelers };
