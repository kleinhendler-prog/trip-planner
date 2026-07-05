/**
 * Neon Postgres Database Client (Drizzle ORM)
 * Server-side database access — replaces the old Supabase client.
 */

import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Env vars are read lazily (on first query, not at import time) so that
// `next build` can collect page data without a configured environment.
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing environment variable: DATABASE_URL');
  }

  dbInstance = drizzle(neon(databaseUrl), { schema });
  return dbInstance;
}

/**
 * Lazily-initialized Drizzle database handle.
 * Usage: db.select().from(trips).where(eq(trips.id, id))
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export * from './schema';
