import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-label-mono text-[var(--color-on-surface-variant)] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-[12px] border border-[var(--color-outline)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-fixed)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-variant)] disabled:text-[var(--color-outline)] transition-all',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error-container)]',
            className
          )}
          {...props}
        />
        {error && props['aria-describedby'] && (
          <p className="text-sm text-[var(--color-error)] mt-1">{props['aria-label']}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
