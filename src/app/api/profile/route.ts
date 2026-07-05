/**
 * Profile API Route
 * GET: Retrieve user's profile (or empty if none exists)
 * POST: Upsert user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/config';
import { db, user_profiles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { UserProfile } from '@/types/profile';

interface ProfileResponse {
  profile: UserProfile | null;
  completed: boolean;
}

/**
 * GET /api/profile
 * Returns the authenticated user's profile and completion status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch profile (no row = no profile yet, not an error)
    const rows = await db
      .select({ profile: user_profiles.profile })
      .from(user_profiles)
      .where(eq(user_profiles.user_id, userId));

    const profile = (rows[0]?.profile as UserProfile | undefined) ?? null;

    // Check if profile is completed (has >= 5 non-empty keys)
    const completed = profile ? countNonEmptyKeys(profile) >= 5 : false;

    return NextResponse.json<ProfileResponse>({
      profile,
      completed,
    });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile
 * Upsert the user's profile
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const profile = (await request.json()) as UserProfile;

    // Upsert the profile
    const row = {
      user_id: userId,
      profile,
      updated_at: new Date(),
    };
    await db
      .insert(user_profiles)
      .values(row)
      .onConflictDoUpdate({ target: user_profiles.user_id, set: row });

    const completed = countNonEmptyKeys(profile) >= 5;

    return NextResponse.json<ProfileResponse>(
      {
        profile,
        completed,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/profile error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Count non-empty keys in a profile object
 * Empty arrays and undefined/null values don't count
 */
function countNonEmptyKeys(profile: UserProfile): number {
  return Object.entries(profile).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }).length;
}
