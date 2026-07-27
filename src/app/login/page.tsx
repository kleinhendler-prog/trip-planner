'use client';

import React, { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const hasError = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);

  // signIn navigates away, so this is never reset — that is the point: the
  // button stays disabled instead of firing a second sign-in on a double click.
  const handleSignIn = () => {
    setIsLoading(true);
    signIn('google', { callbackUrl });
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-background)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in with Google to plan your trips</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError && (
            <div className="rounded-[12px] bg-[var(--color-error-container)] p-4">
              <p className="text-sm text-[var(--color-on-error-container)]">
                Sign-in is temporarily unavailable. Please try again.
              </p>
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleSignIn}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
