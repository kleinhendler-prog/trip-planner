import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/config';
import { listMembers } from '@/lib/family';
import { AppShell } from '@/components/layout/app-shell';
import { FamilyManager } from './family-manager';

export default async function FamilyPage() {
  const session = await auth();

  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const members = await listMembers();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-heading font-extrabold">Family</h1>
        <p className="mb-8 text-[var(--color-on-surface-variant)]">
          Only these email addresses can sign in. Adding someone lets them use their
          own Google account; removing them blocks future sign-ins but keeps their trips.
        </p>
        <FamilyManager initialMembers={members} currentUserId={session.user.id} />
      </div>
    </AppShell>
  );
}
