import { describe, expect, it } from 'vitest';
import { shouldRecheckSession, decideRecheckOutcome } from './session-recheck';
import type { FamilyMember } from './access-decision';

const member: FamilyMember = {
  id: 'user-uuid-1',
  email: 'family@example.com',
  role: 'member',
  status: 'active',
};

const FIFTEEN_MIN = 15 * 60 * 1000;

describe('shouldRecheckSession', () => {
  it('never re-checks a non-Google (credentials) token, even with no checkedAt', () => {
    const result = shouldRecheckSession({
      provider: 'credentials',
      checkedAt: undefined,
      now: 1_000_000,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(false);
  });

  it('never re-checks a non-Google token even when its checkedAt is ancient', () => {
    const result = shouldRecheckSession({
      provider: 'credentials',
      checkedAt: 0,
      now: 1_000_000_000,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(false);
  });

  it('does not re-check a Google token checked less than the interval ago', () => {
    const now = 1_000_000;
    const result = shouldRecheckSession({
      provider: 'google',
      checkedAt: now - (FIFTEEN_MIN - 1),
      now,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(false);
  });

  it('re-checks a Google token checked exactly the interval ago', () => {
    const now = 1_000_000;
    const result = shouldRecheckSession({
      provider: 'google',
      checkedAt: now - FIFTEEN_MIN,
      now,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(true);
  });

  it('re-checks a Google token checked more than the interval ago', () => {
    const now = 1_000_000;
    const result = shouldRecheckSession({
      provider: 'google',
      checkedAt: now - FIFTEEN_MIN - 1,
      now,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(true);
  });

  it('re-checks a Google token with no checkedAt at all', () => {
    const result = shouldRecheckSession({
      provider: 'google',
      checkedAt: undefined,
      now: 1_000_000,
      intervalMs: FIFTEEN_MIN,
    });
    expect(result).toBe(true);
  });
});

describe('decideRecheckOutcome', () => {
  it('refreshes id, role and checkedAt when the member is still on the allow-list', () => {
    const now = 1_700_000_000_000;
    const result = decideRecheckOutcome(member, now);
    expect(result).toEqual({
      kind: 'refresh',
      id: 'user-uuid-1',
      role: 'member',
      checkedAt: now,
    });
  });

  it('carries the admin role through a refresh', () => {
    const now = 1_700_000_000_000;
    const result = decideRecheckOutcome({ ...member, role: 'admin' }, now);
    expect(result).toEqual({
      kind: 'refresh',
      id: 'user-uuid-1',
      role: 'admin',
      checkedAt: now,
    });
  });

  it('signals revoke (drop id/role, leave checkedAt untouched) when the member is gone', () => {
    const now = 1_700_000_000_000;
    const result = decideRecheckOutcome(null, now);
    expect(result).toEqual({ kind: 'revoke' });
  });

  it('a revoke outcome carries no checkedAt field to overwrite the stale one', () => {
    const result = decideRecheckOutcome(null, Date.now());
    expect(result).not.toHaveProperty('checkedAt');
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('role');
  });
});
