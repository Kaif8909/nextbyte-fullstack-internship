import { DatabaseSync } from 'node:sqlite';
import { createPostgresPool } from '../server/postgres-store.js';

// Explicit one-time import. Never invoked by a deployment or request handler.
const source = process.argv[2];
if (!source) throw new Error('Usage: npm.cmd run db:import -- <absolute SQLite path>');
let sqlite, pool, client;
try {
  sqlite = new DatabaseSync(source, { readOnly: true });
  pool = createPostgresPool(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL);
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('LOCK TABLE eventease.events,eventease.registrations,eventease.bookings,eventease.booking_items IN ACCESS EXCLUSIVE MODE');
  const existing = await client.query('SELECT (SELECT COUNT(*) FROM eventease.registrations) + (SELECT COUNT(*) FROM eventease.bookings) AS count');
  if (Number(existing.rows[0].count)) throw new Error('Destination already has attendee data.');
  // The source is authoritative; run this before opening the hosted site to writes.
  const tables = {
    events: 'id,title,description,category,city,venue,date,organizer,price,capacity,image,popularity,duration,highlights,schedule,created_at',
    registrations: 'id,event_id,full_name,email,created_at',
    bookings: 'id,event_id,name,email,phone,payment,subtotal,fee,total,created_at',
    booking_items: 'booking_id,type,quantity,price'
  };
  for (const [table, columns] of Object.entries(tables)) {
    const keys = columns.split(',');
    for (const row of sqlite.prepare(`SELECT ${columns} FROM ${table}`).all()) {
      const conflict = table === 'events' ? ` ON CONFLICT(id) DO UPDATE SET ${keys.filter(key => key !== 'id').map(key => `${key}=EXCLUDED.${key}`).join(',')}` : '';
      await client.query(`INSERT INTO eventease.${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')})${conflict}`, keys.map(key => row[key]));
    }
  }
  await client.query("SELECT setval(pg_get_serial_sequence('eventease.registrations','id'), COALESCE(MAX(id),1), COUNT(*) > 0) FROM eventease.registrations");
  await client.query('COMMIT');
  console.log('Imported SQLite events, registrations and bookings. No attendee details were logged.');
} catch {
  if (client) await client.query('ROLLBACK');
  console.error('Import rolled back. Ensure the destination has no attendee data and the schema is migrated.');
  process.exitCode = 1;
} finally { sqlite?.close(); client?.release(); await pool?.end(); }
