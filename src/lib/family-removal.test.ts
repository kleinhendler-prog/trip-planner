import { describe, expect, it } from 'vitest';
import { decideMemberRemoval } from './family-removal';

const ADMIN_ID = 'a1b2c3d4-1111-2222-3333-444455556666';
const OTHER_ID = 'f9e8d7c6-9999-8888-7777-666655554444';

describe('decideMemberRemoval', () => {
  it('allows removing someone else', () => {
    const result = decideMemberRemoval({ targetId: OTHER_ID, sessionUserId: ADMIN_ID });
    expect(result).toEqual({ allowed: true });
  });

  it('refuses removing yourself', () => {
    const result = decideMemberRemoval({ targetId: ADMIN_ID, sessionUserId: ADMIN_ID });
    expect(result).toEqual({ allowed: false, reason: 'self_removal' });
  });

  it('refuses self-removal even when the id is spelled in a different case', () => {
    // Postgres uuid columns compare case-insensitively; the guard must too,
    // or an uppercased spelling of the admin's own id slips past it.
    const result = decideMemberRemoval({
      targetId: ADMIN_ID.toUpperCase(),
      sessionUserId: ADMIN_ID,
    });
    expect(result).toEqual({ allowed: false, reason: 'self_removal' });
  });

  it('refuses self-removal when only the session id is a different case', () => {
    const result = decideMemberRemoval({
      targetId: ADMIN_ID,
      sessionUserId: ADMIN_ID.toUpperCase(),
    });
    expect(result).toEqual({ allowed: false, reason: 'self_removal' });
  });

  it('treats surrounding whitespace on the target id as insignificant', () => {
    const result = decideMemberRemoval({
      targetId: `  ${ADMIN_ID}  `,
      sessionUserId: ADMIN_ID,
    });
    expect(result).toEqual({ allowed: false, reason: 'self_removal' });
  });

  it('rejects a target id that is not a well-formed UUID', () => {
    const result = decideMemberRemoval({ targetId: 'not-a-uuid', sessionUserId: ADMIN_ID });
    expect(result).toEqual({ allowed: false, reason: 'invalid_id' });
  });

  it('rejects an empty target id', () => {
    const result = decideMemberRemoval({ targetId: '', sessionUserId: ADMIN_ID });
    expect(result).toEqual({ allowed: false, reason: 'invalid_id' });
  });

  it('checks id shape before the self-removal comparison', () => {
    // A malformed id should read as invalid_id, not (accidentally) as an
    // allowed removal just because it happens to differ from the session id.
    const result = decideMemberRemoval({ targetId: 'garbage', sessionUserId: ADMIN_ID });
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('invalid_id');
  });

  it('allows removing a well-formed, different, lowercase uuid', () => {
    const result = decideMemberRemoval({
      targetId: OTHER_ID.toUpperCase(),
      sessionUserId: ADMIN_ID,
    });
    expect(result).toEqual({ allowed: true });
  });
});
