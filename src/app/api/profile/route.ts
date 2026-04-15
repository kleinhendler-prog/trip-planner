/**
 * Profile API Route
 * GET: Retrieve user's profile (or empty if none exists)
 * POST: Upsert user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/config';
import { supabaseServer } from '@/lib/supabase';
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

    // Fetch profile from Supabase
    const { data, error } = await (supabaseServer as any)
      .from('user_profiles')
      .select('profile')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error)
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    const profile = data?.profile as UserProfile | null;

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
    const { data, error } = await (supabaseServer as any)
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          profile,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

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
