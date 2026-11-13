import { readFile } from 'node:fs/promises';
import { createPostgresPool } from '../server/postgres-store.js';

let pool, client;
try {
  pool = createPostgresPool(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL);
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(53209117)");
  await client.query(await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'));
  await client.query('COMMIT');
  console.log('PostgreSQL schema is ready.');
} catch {
  if (client) await client.query('ROLLBACK');
  console.error('Migration failed. Check database access and migration permissions.');
  process.exitCode = 1;
} finally { client?.release(); await pool?.end(); }
