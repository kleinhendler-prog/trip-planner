'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, side = 'top', className }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
      top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
      right: 'left-full ml-2 top-1/2 -translate-y-1/2',
      bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
      left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    };

    return (
      <div
        ref={ref}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div
            className={cn(
              'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md whitespace-nowrap pointer-events-none transition-opacity duration-200',
              positionClasses[side],
              className
            )}
          >
            {content}
            <div
              className={cn(
                'absolute w-2 h-2 bg-gray-900 transform rotate-45',
                side === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1',
                side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 mt-1',
                side === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1',
                side === 'right' && 'right-full top-1/2 -translate-y-1/2 ml-1'
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export { Tooltip };
