'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const SlideOver = React.forwardRef<HTMLDivElement, SlideOverProps>(
  ({ open, onClose, title, children, className }, ref) => {
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          onClose();
        }
      };

      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [open, onClose]);

    if (!open) return null;

    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Slide-over panel */}
        <div
          ref={ref}
          className={cn(
            'fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[var(--color-surface-container-lowest)] shadow-level-2 z-50 transform transition-transform duration-300 ease-out overflow-y-auto',
            open ? 'translate-x-0' : 'translate-x-full',
            className
          )}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-outline-variant)]">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
              <button
                onClick={onClose}
                className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </>
    );
  }
);

SlideOver.displayName = 'SlideOver';

export { SlideOver };
