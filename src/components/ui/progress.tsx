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
            <label className="text-sm font-medium text-gray-900">{label}</label>
            <span className="text-sm text-gray-600">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
