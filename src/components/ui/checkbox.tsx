import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <>
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer',
          className
        )}
        {...props}
      />
      {label && (
        <label className="text-sm text-gray-700 cursor-pointer ml-2">
          {label}
        </label>
      )}
    </>
  )
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
