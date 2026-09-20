'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { FamilyMemberDetail } from '@/lib/family';

export function FamilyManager({
  initialMembers,
  currentUserId,
}: {
  initialMembers: FamilyMemberDetail[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not add that address');
        return;
      }
      setMembers((prev) =>
        prev.some((m) => m.id === data.member.id) ? prev : [...prev, data.member]
      );
      setEmail('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    setRemovingId(id);
    try {
      const res = await fetch(`/api/family/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not remove that person');
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="their-google-email@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" isLoading={busy}>
          Add
        </Button>
      </form>

      {error && (
        <div className="rounded-[12px] bg-[var(--color-error-container)] p-4">
          <p className="text-sm text-[var(--color-on-error-container)]">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold">{m.name || m.email}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {m.email} · {m.role} ·{' '}
                  {m.status === 'active' ? 'signed in before' : 'not signed in yet'}
                </p>
              </div>
              {m.id !== currentUserId && (
                <Button
                  variant="secondary"
                  isLoading={removingId === m.id}
                  onClick={() => remove(m.id)}
                >
                  Remove
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
