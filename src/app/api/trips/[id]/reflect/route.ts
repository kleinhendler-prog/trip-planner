/**
 * Trip Reflection API Route
 * POST: Create/update trip reflection and extract preferences
 */

import { db, trip_reflections, user_preferences } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { callClaudeJSON } from '@/lib/claude';
import { v4 as uuidv4 } from 'uuid';
import { requireTripAccess } from '@/lib/trip-access';


interface ReflectionRequest {
  loved: string[];
  disappointed: string[];
  notes?: string;
}

/**
 * POST /api/trips/[id]/reflect
 * Save trip reflection and extract user preferences
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const access = await requireTripAccess(id);
    if (!access.ok) return access.response;

    const { loved, disappointed, notes } = await request.json() as ReflectionRequest;

    if (!Array.isArray(loved) || !Array.isArray(disappointed)) {
      return Response.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Extract preferences from reflection using Claude
    const extractedPreferences = await extractPreferencesFromReflection(
      loved,
      disappointed,
      notes
    );

    // Check if reflection already exists
    const existingRows = await db
      .select({ id: trip_reflections.id })
      .from(trip_reflections)
      .where(eq(trip_reflections.trip_id, id));
    const existingReflection = existingRows[0];

    let reflectionId = uuidv4();
    const reflectionData = {
      trip_id: id,
      user_id: access.userId,
      loved,
      disappointed,
      notes: notes || null,
      extracted_preferences: extractedPreferences || {},
      updated_at: new Date(),
    };

    if (existingReflection) {
      // Update existing reflection
      await db
        .update(trip_reflections)
        .set(reflectionData)
        .where(eq(trip_reflections.id, existingReflection.id));
      reflectionId = existingReflection.id;
    } else {
      // Insert new reflection
      await db.insert(trip_reflections).values({
        ...reflectionData,
        id: reflectionId,
      });
    }

    // Update user preferences if extracted
    if (extractedPreferences && Object.keys(extractedPreferences).length > 0) {
      await updateUserPreferences(
        access.userId,
        extractedPreferences
      );
    }

    return Response.json({
      success: true,
      reflection_id: reflectionId,
      extracted_preferences: extractedPreferences,
    });
  } catch (error) {
    console.error(`POST /api/trips/[id]/reflect error:`, error);
    return Response.json(
      { error: 'Failed to save reflection' },
      { status: 500 }
    );
  }
}

/**
 * Extract user preferences from reflection text using Claude
 */
async function extractPreferencesFromReflection(
  loved: string[],
  disappointed: string[],
  notes?: string
): Promise<any> {
  try {
    const prompt = `Analyze this trip reflection and extract travel preferences.

Things they loved:
${loved.map(l => `- ${l}`).join('\n')}

Things they were disappointed by:
${disappointed.map(d => `- ${d}`).join('\n')}

${notes ? `Additional notes:\n${notes}` : ''}

Return a JSON object with extracted preferences:
{
  "newInterests": ["interest1", "interest2"],
  "newDislikes": ["dislike1", "dislike2"],
  "pace": "relaxed|moderate|packed" (if evident),
  "budgetLevel": "budget|moderate|luxury" (if evident),
  "hotelPreference": "budget|comfort|luxury|boutique" (if evident),
  "insights": "Brief summary of preferences"
}`;
    const extractedPrefs = await callClaudeJSON(prompt);

    return extractedPrefs;
  } catch (error) {
    console.error('Error extracting preferences:', error);
    return {};
  }
}

/**
 * Merge extracted preferences into user preferences
 */
async function updateUserPreferences(
  userId: string,
  extractedPreferences: any
): Promise<void> {
  try {
    // Get or create user preferences
    const existingRows = await db
      .select()
      .from(user_preferences)
      .where(eq(user_preferences.user_id, userId));
    const existingPrefs: any = existingRows[0];

    const mergedPrefs = {
      user_id: userId,
      interests: Array.from(new Set([
        ...((existingPrefs?.interests as string[]) || []),
        ...(extractedPreferences.newInterests || []),
      ])),
      dislikes: Array.from(new Set([
        ...((existingPrefs?.dislikes as string[]) || []),
        ...(extractedPreferences.newDislikes || []),
      ])),
      pace: extractedPreferences.pace || existingPrefs?.pace,
      budget_level: extractedPreferences.budgetLevel || existingPrefs?.budget_level,
      hotel_preference: extractedPreferences.hotelPreference || existingPrefs?.hotel_preference,
      updated_at: new Date(),
    };

    if (existingPrefs) {
      await db
        .update(user_preferences)
        .set(mergedPrefs)
        .where(eq(user_preferences.user_id, userId));
    } else {
      await db.insert(user_preferences).values(mergedPrefs);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    // Non-fatal error
  }
}
