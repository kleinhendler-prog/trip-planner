import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--color-primary-fixed)] text-[var(--color-primary)]',
      secondary: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
      destructive: 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]',
      outline: 'border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] bg-white',
      warning: 'bg-[#fef08a] text-[#854d0e]',
      success: 'bg-[#bbf7d0] text-[#166534]',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors tracking-wide',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
