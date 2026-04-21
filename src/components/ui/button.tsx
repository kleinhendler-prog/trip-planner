import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-primary-gradient text-white rounded-full shadow-level-2 hover:opacity-90 hover:scale-[0.98] focus-visible:ring-[#4648d4]',
      destructive: 'bg-[#ba1a1a] text-white rounded-full shadow-level-1 hover:bg-[#ffdad6] hover:text-[#93000a] focus-visible:ring-[#ba1a1a]',
      outline: 'border border-[var(--color-outline)] bg-white text-[var(--color-primary)] rounded-full hover:bg-[var(--color-surface-container-low)] focus-visible:ring-[var(--color-outline)]',
      secondary: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-container-highest)] focus-visible:ring-[var(--color-outline)]',
      ghost: 'text-[var(--color-on-surface-variant)] rounded-full hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-lowest)] focus-visible:ring-[var(--color-outline)]',
      link: 'text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-primary)]',
    };

    const sizes = {
      default: 'h-10 px-6 py-2 text-sm',
      sm: 'h-8 px-4 text-xs',
      lg: 'h-12 px-8 text-base',
      icon: 'h-10 w-10 p-0 rounded-full',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
