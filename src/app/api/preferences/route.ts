/**
 * User Preferences API Routes
 * GET: List active user preferences
 * POST: Create new preference
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/preferences
 * List all active preferences for the user
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('userId', session.user.id)
      .eq('active', true);

    if (error) {
      throw error;
    }

    return Response.json(preferences || []);
  } catch (error) {
    console.error('GET /api/preferences error:', error);
    return Response.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/preferences
 * Create a new user preference
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as any;

    const preferenceData = {
      id: uuidv4(),
      userId: session.user.id,
      interests: body.interests || [],
      dislikes: body.dislikes || [],
      hotelPreference: body.hotelPreference,
      pace: body.pace,
      budgetLevel: body.budgetLevel,
      mealDietaryRestrictions: body.mealDietaryRestrictions || [],
      mobilityNeeds: body.mobilityNeeds,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await (supabase as any)
      .from('user_preferences')
      .insert([preferenceData as any])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/preferences error:', error);
    return Response.json(
      { error: 'Failed to create preference' },
      { status: 500 }
    );
  }
}
