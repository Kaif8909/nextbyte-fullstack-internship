import { events } from '../assets/js/data.js';
import { createPostgresPool } from '../server/postgres-store.js';

let pool, client;
try {
  pool = createPostgresPool(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL);
  client = await pool.connect();
  await client.query('BEGIN');
  const keys = ['id','title','description','category','city','venue','date','organizer','price','capacity','image','popularity','duration','highlights','schedule'];
  for (const event of events) {
    await client.query(`INSERT INTO eventease.events (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) ON CONFLICT(id) DO NOTHING`,
      keys.map(key => ['highlights','schedule'].includes(key) ? JSON.stringify(event[key]) : event[key]));
  }
  await client.query('COMMIT');
  console.log('Seeded the fictional event catalog without overwriting existing events. No registrations or bookings were created.');
} catch {
  if (client) await client.query('ROLLBACK');
  console.error('Seeding failed. Run db:migrate first and check database access.');
  process.exitCode = 1;
} finally { client?.release(); await pool?.end(); }
