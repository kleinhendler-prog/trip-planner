import React from 'react';
import { cn } from '@/lib/utils';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  minDate?: string;
  maxDate?: string;
  error?: boolean;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, minDate, maxDate, error = false, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          min={minDate}
          max={maxDate}
          className={cn(
            'flex h-11 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-variant)] disabled:text-[var(--color-outline)] cursor-pointer transition-all',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error-container)]',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export { DatePicker };
