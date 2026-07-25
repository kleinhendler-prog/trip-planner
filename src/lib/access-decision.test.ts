import { describe, expect, it } from 'vitest';
import { decideAccess, normaliseEmail, type FamilyMember } from './access-decision';

const member: FamilyMember = {
  id: 'user-uuid-1',
  email: 'family@example.com',
  role: 'member',
  status: 'invited',
};

describe('normaliseEmail', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmail('  Family@Example.COM ')).toBe('family@example.com');
  });

  it('returns empty string for missing input', () => {
    expect(normaliseEmail(null)).toBe('');
    expect(normaliseEmail(undefined)).toBe('');
  });
});

describe('decideAccess', () => {
  it('allows a verified email that is on the list', () => {
    const result = decideAccess({
      email: 'family@example.com',
      emailVerified: true,
      member,
    });
    expect(result).toEqual({ allowed: true, userId: 'user-uuid-1', role: 'member' });
  });

  it('carries the admin role through', () => {
    const result = decideAccess({
      email: 'boss@example.com',
      emailVerified: true,
      member: { ...member, id: 'admin-uuid', role: 'admin' },
    });
    expect(result).toEqual({ allowed: true, userId: 'admin-uuid', role: 'admin' });
  });

  it('refuses an email that is not on the list', () => {
    const result = decideAccess({
      email: 'stranger@example.com',
      emailVerified: true,
      member: null,
    });
    expect(result).toEqual({ allowed: false, reason: 'not_invited' });
  });

  it('refuses when Google has not verified the email', () => {
    const result = decideAccess({
      email: 'family@example.com',
      emailVerified: false,
      member,
    });
    expect(result).toEqual({ allowed: false, reason: 'email_unverified' });
  });

  it('refuses when no email is supplied', () => {
    const result = decideAccess({
      email: null,
      emailVerified: true,
      member,
    });
    expect(result).toEqual({ allowed: false, reason: 'no_email' });
  });

  it('refuses an unverified email that is also not on the list', () => {
    const result = decideAccess({
      email: 'stranger@example.com',
      emailVerified: false,
      member: null,
    });
    expect(result.allowed).toBe(false);
  });
});
