/**
 * Seed the Neon database with the destination-sources starter data.
 * Usage: node scripts/db-seed.mjs
 * Idempotent-ish: skips seeding if destination_sources already has rows.
 */

import { readFileSync } from 'node:fs';
import nextEnv from '@next/env';
import { Pool, neonConfig } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;

// Node 22+ ships a global WebSocket implementation
neonConfig.webSocketConstructor = globalThis.WebSocket;

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const existing = await pool.query('SELECT count(*)::int AS n FROM destination_sources');
if (existing.rows[0].n > 0) {
  console.log(`destination_sources already has ${existing.rows[0].n} rows — skipping seed.`);
  await pool.end();
  process.exit(0);
}

for (const file of [
  'supabase/migrations/002_seed_universal_sources.sql',
  'supabase/migrations/003_seed_italy_sources.sql',
]) {
  const sql = readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log(`applied ${file}`);
}

const after = await pool.query('SELECT count(*)::int AS n FROM destination_sources');
console.log(`destination_sources now has ${after.rows[0].n} rows.`);
await pool.end();
