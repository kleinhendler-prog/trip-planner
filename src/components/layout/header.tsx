'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[var(--color-surface-dim)] shadow-level-1">
      <nav className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-heading font-extrabold tracking-tight text-[var(--color-primary)] hover:opacity-80 transition-opacity">
            Trip Builder
          </Link>

          {/* Navigation Links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] rounded-full px-3 py-1.5 transition-all duration-200"
            >
              My Trips
            </Link>
            <Link
              href="/profile-setup"
              className="text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] rounded-full px-3 py-1.5 transition-all duration-200"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/trips/new">
            <Button size="sm">
              New Trip
            </Button>
          </Link>
          <button
            onClick={() => signOut({ redirectTo: '/' })}
            className="text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)] rounded-full px-3 py-1.5 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </nav>
    </header>
  );
};

export { Header };
