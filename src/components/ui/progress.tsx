import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  label?: string;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, label, max = 100, ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {label && (
          <div className="flex justify-between items-center mb-2">
            <label className="text-label-mono text-[var(--color-on-surface-variant)]">{label}</label>
            <span className="text-label-mono text-[var(--color-primary)] font-bold">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="w-full h-2 bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-gradient rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
