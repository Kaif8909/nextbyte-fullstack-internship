import pg from 'pg';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { remainingPools } from './inventory.js';
import { normalizeCaCertificate, parseDatabaseUrl } from './postgres-config.js';
import { initializationError } from './diagnostics.js';

const columns = 'id,title,description,category,city,venue,date,organizer,price,capacity,image,popularity,duration,highlights,schedule';
export function createPostgresPool(connectionString) {
  const url = parseDatabaseUrl(connectionString);
  // Hosted connections require certificate verification, including provider CA support.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const localCertificate = fileURLToPath(new URL('../supabase-ca.crt', import.meta.url));
  const certificateFile = process.env.DATABASE_CA_CERT_FILE ||
    (!process.env.VERCEL && existsSync(localCertificate) ? localCertificate : undefined);
  let certificate = process.env.DATABASE_CA_CERT;
  if (!certificate && certificateFile) {
    try { certificate = readFileSync(certificateFile, 'utf8'); }
    catch { throw initializationError('DATABASE_CA_FILE_UNREADABLE'); }
  }
  const ca = normalizeCaCertificate(certificate);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const pool = new pg.Pool({
    connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000, allowExitOnIdle: true,
    ssl: local ? false : { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) }
  });
  // Never print connection URLs or driver errors containing connection details.
  pool.on('error', () => console.error('An idle database connection failed.'));
  return pool;
}

export function postgresStore(pool, connection = pool) {
  const query = (sql, values = []) => connection.query(sql, values);
  return {
    kind: 'postgresql',
    health: async () => { await query('SELECT 1'); },
    listEvents: async () => (await query(`SELECT ${columns} FROM eventease.events ORDER BY date::timestamptz,title`)).rows,
    getEvent: async id => (await query(`SELECT ${columns} FROM eventease.events WHERE id=$1`, [id])).rows[0] || null,
    createEvent: async event => {
      const keys = columns.split(',');
      await query(`INSERT INTO eventease.events (${columns}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')})`,
        keys.map(key => ['highlights', 'schedule'].includes(key) ? JSON.stringify(event[key]) : event[key]));
    },
    availability: async event => {
      const sales = (await query(`SELECT bi.type AS id,SUM(bi.quantity) AS sold FROM eventease.booking_items bi
        JOIN eventease.bookings b ON b.id=bi.booking_id WHERE b.event_id=$1 GROUP BY bi.type`, [event.id])).rows;
      const registrations = (await query('SELECT COUNT(*) AS count FROM eventease.registrations WHERE event_id=$1', [event.id])).rows[0].count;
      return remainingPools(event, sales, registrations);
    },
    registrationExists: async (eventId, email) => !!(await query('SELECT id FROM eventease.registrations WHERE event_id=$1 AND email=$2', [eventId, email])).rowCount,
    addRegistration: async (eventId, person) => (await query('INSERT INTO eventease.registrations (event_id,full_name,email) VALUES ($1,$2,$3) RETURNING id', [eventId, person.name, person.email])).rows[0].id,
    listRegistrations: async eventId => (await query('SELECT id AS registration_id,event_id,full_name,email FROM eventease.registrations WHERE event_id=$1 ORDER BY id', [eventId])).rows,
    addBooking: async booking => {
      await query('INSERT INTO eventease.bookings (id,event_id,name,email,phone,payment,subtotal,fee,total,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [booking.id, booking.eventId, booking.customer.name, booking.customer.email, booking.customer.phone,
          booking.payment, booking.subtotal, booking.fee, booking.total, booking.createdAt]);
      for (const item of booking.items) await query('INSERT INTO eventease.booking_items (booking_id,type,quantity,price) VALUES ($1,$2,$3,$4)', [booking.id, item.id, item.quantity, item.price]);
    },
    getBooking: async id => (await query('SELECT * FROM eventease.bookings WHERE id=$1', [id])).rows[0],
    bookingItems: async id => (await query('SELECT type AS id,quantity,price FROM eventease.booking_items WHERE booking_id=$1 ORDER BY type', [id])).rows,
    async transaction(eventId, fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '8s'");
        await client.query("SET LOCAL statement_timeout = '15s'");
        // All inventory writers lock the same event before reading counts or inserting.
        await client.query('SELECT id FROM eventease.events WHERE id=$1 FOR UPDATE', [eventId]);
        const result = await fn(postgresStore(pool, client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    close: () => pool.end()
  };
}
