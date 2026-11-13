export async function openStore({ hosted = false, env = process.env } = {}) {
  if (env.DATABASE_URL) {
    const { postgresStore, createPostgresPool } = await import('./postgres-store.js');
    return postgresStore(createPostgresPool(env.DATABASE_URL));
  }
  if (hosted || env.VERCEL) throw new Error('DATABASE_URL must be configured for Vercel.');
  const { openDatabase } = await import('./db.js');
  const { sqliteStore } = await import('./sqlite-store.js');
  return sqliteStore(openDatabase(env.DB_PATH));
}
