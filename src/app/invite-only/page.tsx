import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InviteOnlyPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-background)' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Trip Builder is invite-only</CardTitle>
          <CardDescription>
            That Google account isn&apos;t on the family list yet. Ask Eyal to add it,
            then try signing in again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="secondary">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
