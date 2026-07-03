'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            Trip Planner
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/sources"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sources
          </Link>
        </div>

        {/* Sign Out Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => signOut({ redirectTo: '/' })}
        >
          Sign Out
        </Button>
      </nav>
    </header>
  );
};

export { Header };
