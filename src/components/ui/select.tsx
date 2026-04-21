import React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean;
  options: Array<{ value: string | number; label: string }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error = false, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-variant)] disabled:text-[var(--color-outline)] appearance-none cursor-pointer transition-all',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error-container)]',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
