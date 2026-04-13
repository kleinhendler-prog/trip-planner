'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ChipProps {
  options: Array<{ value: string | number; label: string }>;
  selectedValues: (string | number)[];
  onChange: (selectedValues: (string | number)[]) => void;
  className?: string;
  disabled?: boolean;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ options, selectedValues, onChange, className, disabled = false }, ref) => {
    const handleToggle = (value: string | number) => {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap gap-2', className)}
      >
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-blue-600 text-white focus-visible:ring-blue-600'
                  : 'bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200 focus-visible:ring-gray-400'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
);

Chip.displayName = 'Chip';

export { Chip };
