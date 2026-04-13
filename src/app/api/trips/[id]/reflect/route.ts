/**
 * Trip Reflection API Route
 * POST: Create/update trip reflection and extract preferences
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { callClaudeJSON } from '@/lib/claude';
import { v4 as uuidv4 } from 'uuid';


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
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { loved, disappointed, notes } = await request.json() as ReflectionRequest;

    if (!Array.isArray(loved) || !Array.isArray(disappointed)) {
      return Response.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Verify trip belongs to user
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('userId', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Extract preferences from reflection using Claude
    const extractedPreferences = await extractPreferencesFromReflection(
      loved,
      disappointed,
      notes
    );

    // Check if reflection already exists
    const { data: existingReflection, error: fetchError } = await (supabase as any)
      .from('trip_reflections')
      .select('id')
      .eq('tripId', id)
      .single();

    let reflectionId = uuidv4();
    const reflectionData = {
      tripId: id,
      userId: session.user.id,
      loved,
      disappointed,
      notes: notes || null,
      extractedPreferences: extractedPreferences || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingReflection) {
      // Update existing reflection
      const { error: updateError } = await (supabase as any)
        .from('trip_reflections')
        .update({
          ...reflectionData,
          id: existingReflection.id,
          updatedAt: new Date(),
        })
        .eq('id', existingReflection.id);

      if (updateError) {
        throw updateError;
      }
      reflectionId = existingReflection.id;
    } else {
      // Insert new reflection
      const { error: insertError } = await (supabase as any)
        .from('trip_reflections')
        .insert([{
          ...reflectionData,
          id: reflectionId,
        } as any]);

      if (insertError) {
        throw insertError;
      }
    }

    // Update user preferences if extracted
    if (extractedPreferences && Object.keys(extractedPreferences).length > 0) {
      await updateUserPreferences(
        session.user.id,
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
    const { data: existingPrefs, error: fetchError } = await (supabase as any)
      .from('user_preferences')
      .select('*')
      .eq('userId', userId)
      .single();

    const mergedPrefs = {
      userId,
      interests: Array.from(new Set([
        ...(existingPrefs?.interests || []),
        ...(extractedPreferences.newInterests || []),
      ])),
      dislikes: Array.from(new Set([
        ...(existingPrefs?.dislikes || []),
        ...(extractedPreferences.newDislikes || []),
      ])),
      pace: extractedPreferences.pace || existingPrefs?.pace,
      budgetLevel: extractedPreferences.budgetLevel || existingPrefs?.budgetLevel,
      hotelPreference: extractedPreferences.hotelPreference || existingPrefs?.hotelPreference,
      updatedAt: new Date(),
    };

    if (existingPrefs) {
      await (supabase as any)
        .from('user_preferences')
        .update(mergedPrefs as any)
        .eq('userId', userId);
    } else {
      await (supabase as any)
        .from('user_preferences')
        .insert([mergedPrefs as any]);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    // Non-fatal error
  }
}
