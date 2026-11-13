import { initializationError } from './diagnostics.js';

export async function openStore({ hosted = false, env = process.env } = {}) {
  if (env.DATABASE_URL) {
    const { postgresStore, createPostgresPool } = await import('./postgres-store.js');
    return postgresStore(createPostgresPool(env.DATABASE_URL));
  }
  if (hosted || env.VERCEL) throw initializationError('DATABASE_URL_MISSING');
  const { openDatabase } = await import('./db.js');
  const { sqliteStore } = await import('./sqlite-store.js');
  return sqliteStore(openDatabase(env.DB_PATH));
}
