/**
 * Trips API Routes
 * POST: Create a new trip
 * GET: List user's trips
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
// generation is triggered by a separate endpoint after trip creation
import type { CreateTripInput } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300;

// Rate limiting: max 10 trips per hour per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/trips
 * List all trips for the authenticated user
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

    const { data: trips, error } = await (supabase as any)
      .from('trips')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json(trips || []);
  } catch (error) {
    console.error('GET /api/trips error:', error);
    return Response.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips
 * Create a new trip and start generation pipeline
 * Rate limit: 10 trips per hour
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

    const body = await request.json() as CreateTripInput;

    // Validate input
    if (!body.title || !body.destination || !body.startDate || !body.endDate || !body.travelers || !body.tripType) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const { data: recentTrips, error: rateLimitError } = await (supabase as any)
      .from('trips')
      .select('id')
      .eq('user_id', session.user.id)
      .gte('created_at', oneHourAgo.toISOString());

    if (rateLimitError) {
      throw rateLimitError;
    }

    if ((recentTrips?.length ?? 0) >= RATE_LIMIT_MAX) {
      return Response.json(
        { error: 'Rate limit exceeded: maximum 10 trips per hour' },
        { status: 429 }
      );
    }

    const tripId = uuidv4();
    const now = new Date();

    // Create trip with status='generating'
    const body2 = body as any;
    const tripData = {
      id: tripId,
      user_id: session.user.id,
      destination: body.destination,
      start_date: body.startDate,
      end_date: body.endDate,
      profile: {
        title: body.title,
        travelers: body.travelers,
        tripType: body.tripType,
        preferences: body.preferences || {},
      },
      trip_type: body2.tripStyle || 'single_city',
      trip_overrides: body2.tripOverrides || {},
      status: 'generating',
    };

    const { error: insertError } = await (supabase as any)
      .from('trips')
      .insert([tripData as any]);

    if (insertError) {
      throw insertError;
    }

    // Return immediately - generation will be triggered by the trip page
    return Response.json({ id: tripId, trip_id: tripId }, { status: 201 });
  } catch (error) {
    console.error('POST /api/trips error:', error);
    return Response.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}
