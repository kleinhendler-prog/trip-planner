'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    } else if (!open && dialogRef.current?.open) {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    onOpenChange?.(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="backdrop:bg-black/50 rounded-[16px] shadow-level-2 max-w-lg w-full max-h-[90vh] overflow-auto border border-[var(--color-surface-variant)]"
    >
      {children}
    </dialog>
  );
};

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn('', className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('font-heading text-xl font-bold leading-none tracking-tight text-[var(--color-on-surface)]', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[var(--color-on-surface-variant)]', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]',
        className
      )}
      {...props}
    >
      {children || 'Close'}
    </button>
  )
);
DialogClose.displayName = 'DialogClose';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
