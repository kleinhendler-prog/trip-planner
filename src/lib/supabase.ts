/**
 * Supabase Database Client
 * Server-side database access with service role key
 * For server-only operations that bypass RLS
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

// ============= Client Configuration =============

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Server-side Supabase client with service role key
 * Bypasses RLS for server operations
 * Use this for API routes and server-side operations
 */
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Client-side Supabase client (for browser operations if needed)
 * Uses anon key and respects RLS
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseClient = supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Default export for use in libraries (uses service role for admin operations)
 */
export const supabase = supabaseServer;

// ============= Database Query Helpers =============

/**
 * Get a user by ID
 */
export async function getUserById(userId: string) {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Create a new user
 */
export async function createUser(id: string, email: string, name?: string) {
  const { data, error } = await supabaseServer
    .from('users')
    .insert({
      id,
      email: email.toLowerCase(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all trips for a user
 */
export async function getUserTrips(userId: string) {
  const { data, error } = await supabaseServer
    .from('trips')
    .select(
      `
      id,
      title,
      destination,
      startDate,
      endDate,
      travelers,
      tripType,
      status,
      createdAt,
      updatedAt
    `
    )
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a trip with all related data
 */
export async function getTripWithDetails(tripId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('trips')
    .select(
      `
      *,
      days (
        *,
        activities (
          *,
          restaurant:meals(*)
        ),
        meals (
          *,
          restaurant:restaurants(*)
        )
      )
    `
    )
    .eq('id', tripId)
    .eq('userId', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new trip
 */
export async function createTrip(tripData: any) {
  const { data, error } = await supabaseServer
    .from('trips')
    .insert(tripData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a trip
 */
export async function updateTrip(tripId: string, updates: any) {
  const { data, error } = await (supabaseServer as any)
    .from('trips')
    .update({
      ...updates,
      updatedAt: new Date(),
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a trip and all related data
 */
export async function deleteTrip(tripId: string) {
  // Delete in order due to foreign key constraints
  await (supabaseServer as any).from('trip_reflections').delete().eq('tripId', tripId);
  await (supabaseServer as any).from('trip_confirmations').delete().eq('tripId', tripId);
  await (supabaseServer as any).from('generation_jobs').delete().eq('tripId', tripId);

  // Delete days and their children
  const { data: days } = await (supabaseServer as any)
    .from('days')
    .select('id')
    .eq('tripId', tripId);

  if (days) {
    for (const day of days) {
      await (supabaseServer as any).from('activities').delete().eq('dayId', day.id);
      await (supabaseServer as any).from('meals').delete().eq('dayId', day.id);
    }
  }

  await (supabaseServer as any).from('days').delete().eq('tripId', tripId);

  // Finally delete the trip
  const { error } = await (supabaseServer as any)
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) throw error;
}

/**
 * Search places in cache
 */
export async function searchPlacesCache(
  query: string,
  placeType?: string
) {
  let queryBuilder = supabaseServer
    .from('places_cache')
    .select('*');

  if (placeType) {
    queryBuilder = queryBuilder.eq('placeType', placeType);
  }

  const { data, error } = await queryBuilder
    .or(
      `name.ilike.%${query}%,address.ilike.%${query}%`
    );

  if (error) throw error;
  return data;
}

/**
 * Cache a place
 */
export async function cachePlace(placeData: any) {
  const { data, error } = await supabaseServer
    .from('places_cache')
    .insert({
      ...placeData,
      cached_at: new Date(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get generation job
 */
export async function getGenerationJob(jobId: string) {
  const { data, error } = await supabaseServer
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create generation job
 */
export async function createGenerationJob(jobData: any) {
  const { data, error } = await supabaseServer
    .from('generation_jobs')
    .insert({
      ...jobData,
      startedAt: new Date(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update generation job
 */
export async function updateGenerationJob(jobId: string, updates: any) {
  const { data, error } = await (supabaseServer as any)
    .from('generation_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
