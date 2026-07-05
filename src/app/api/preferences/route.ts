/**
 * User Preferences API Routes
 * GET: List active user preferences
 * POST: Create new preference
 *
 * DB rows are snake_case; API responses are mapped to the camelCase shape
 * the profile page renders (hotelPreference, budgetLevel, ...).
 */

import { auth } from '@/app/api/auth/config';
import { db, user_preferences } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function toApiShape(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    interests: row.interests || [],
    dislikes: row.dislikes || [],
    hotelPreference: row.hotel_preference,
    pace: row.pace,
    budgetLevel: row.budget_level,
    mealDietaryRestrictions: row.meal_dietary_restrictions || [],
    mobilityNeeds: row.mobility_needs,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

    const rows = await db
      .select()
      .from(user_preferences)
      .where(
        and(
          eq(user_preferences.user_id, session.user.id),
          eq(user_preferences.active, true)
        )
      );

    return Response.json(rows.map(toApiShape));
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

    const inserted = await db
      .insert(user_preferences)
      .values({
        id: uuidv4(),
        user_id: session.user.id,
        interests: body.interests || [],
        dislikes: body.dislikes || [],
        hotel_preference: body.hotelPreference,
        pace: body.pace,
        budget_level: body.budgetLevel,
        meal_dietary_restrictions: body.mealDietaryRestrictions || [],
        mobility_needs: body.mobilityNeeds,
        active: true,
      })
      .returning();

    return Response.json(toApiShape(inserted[0]), { status: 201 });
  } catch (error) {
    console.error('POST /api/preferences error:', error);
    return Response.json(
      { error: 'Failed to create preference' },
      { status: 500 }
    );
  }
}
