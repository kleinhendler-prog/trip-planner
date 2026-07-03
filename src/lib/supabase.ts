/**
 * Supabase Database Client
 * Server-side database access with service role key
 * For server-only operations that bypass RLS
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

// ============= Client Configuration =============

// Env vars are read lazily (on first query, not at import time) so that
// `next build` can collect page data without a configured environment.
let serverClient: SupabaseClient<Database> | null = null;

function getServerClient(): SupabaseClient<Database> {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  serverClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return serverClient;
}

/**
 * Server-side Supabase client with service role key
 * Bypasses RLS for server operations
 * Use this for API routes and server-side operations
 */
export const supabaseServer = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getServerClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

/**
 * Client-side Supabase client (for browser operations if needed)
 * Uses anon key and respects RLS; returns null when the anon key is not set
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a trip with all related data
 */
export async function getTripWithDetails(tripId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', userId)
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
    .update(updates)
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
  // Cascade deletes handle child tables (trip_reflections, trip_confirmations, generation_jobs)
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
    queryBuilder = queryBuilder.eq('place_type', placeType);
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
