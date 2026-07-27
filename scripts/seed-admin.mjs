/**
 * Seed the first admin into the users table.
 * Usage: node scripts/seed-admin.mjs you@gmail.com
 *
 * Must be run BEFORE the first Google sign-in, otherwise the allow-list
 * check refuses everyone and nobody can get in.
 */

import nextEnv from '@next/env';
import { Pool, neonConfig } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;

// Node 22+ ships a global WebSocket implementation
neonConfig.webSocketConstructor = globalThis.WebSocket;

loadEnvConfig(process.cwd());

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/seed-admin.mjs <google-email>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const { rows } = await pool.query(
    `insert into users (email, role, status)
     values ($1, 'admin', 'invited')
     on conflict (email) do update set role = 'admin'
     returning id, email, role, status`,
    [email]
  );
  console.log('Admin seeded:', rows[0]);
} finally {
  await pool.end();
}
