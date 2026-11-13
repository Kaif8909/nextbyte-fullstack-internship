import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { events as demoEvents } from '../assets/js/data.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
export const databasePath = process.env.DB_PATH || path.join(directory, 'data', 'eventease.sqlite');

const columns = `id, title, description, category, city, venue, date, organizer,
  price, capacity, image, popularity, duration, highlights, schedule`;

export function openDatabase(filePath = databasePath) {
  if (filePath !== ':memory:') mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      venue TEXT NOT NULL,
      date TEXT NOT NULL,
      organizer TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      capacity INTEGER NOT NULL CHECK (capacity >= 1),
      image TEXT NOT NULL,
      popularity INTEGER NOT NULL DEFAULT 0,
      duration TEXT NOT NULL DEFAULT '3 hours',
      highlights TEXT NOT NULL DEFAULT '[]',
      schedule TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL REFERENCES events(id),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, email)
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      payment TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      fee INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS booking_items (
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      type TEXT NOT NULL CHECK (type IN ('early', 'general', 'vip')),
      quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
      price INTEGER NOT NULL CHECK (price >= 0),
      PRIMARY KEY (booking_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_booking_event ON bookings(event_id);
    CREATE INDEX IF NOT EXISTS idx_registration_event ON registrations(event_id);
  `);
  if (filePath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  // Seed the exact same fictional events used by the frontend. Never overwrite edits.
  const insert = db.prepare(`INSERT OR IGNORE INTO events (${columns}) VALUES (${Array(15).fill('?').join(', ')})`);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const event of demoEvents) {
      insert.run(event.id, event.title, event.description, event.category, event.city,
        event.venue, event.date, event.organizer, event.price, event.capacity,
        event.image, event.popularity, event.duration,
        JSON.stringify(event.highlights), JSON.stringify(event.schedule));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    db.close();
    throw err;
  }
  return db;
}

export function eventFromRow(row) {
  if (!row) return null;
  const { highlights, schedule, ...rest } = row;
  return { ...rest, highlights: JSON.parse(highlights), schedule: JSON.parse(schedule) };
}

export function getEvent(db, id) {
  const row = db.prepare(`SELECT ${columns} FROM events WHERE id = ?`).get(id);
  return eventFromRow(row);
}

export function listEvents(db) {
  return db.prepare(`SELECT ${columns} FROM events ORDER BY date ASC, title ASC`).all().map(eventFromRow);
}

export function ticketPools(event) {
  const early = Math.min(20, event.capacity);
  const vip = Math.min(15, Math.max(0, event.capacity - 20));
  return [
    { id: 'early', name: 'Early Bird', price: Math.round(event.price * 0.8), capacity: early },
    { id: 'general', name: 'General Admission', price: event.price, capacity: event.capacity - early - vip },
    { id: 'vip', name: 'VIP Experience', price: Math.round(event.price * 1.75), capacity: vip }
  ];
}

export function availability(db, event) {
  const rows = db.prepare(`
    SELECT bi.type AS id, SUM(bi.quantity) AS sold
    FROM booking_items bi JOIN bookings b ON b.id = bi.booking_id
    WHERE b.event_id = ? GROUP BY bi.type
  `).all(event.id);
  const booked = new Map(rows.map(row => [row.id, row.sold]));
  const registrations = db.prepare('SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?').get(event.id).count;
  const pools = ticketPools(event).map(pool => ({
    ...pool,
    remaining: Math.max(0, pool.capacity - (booked.get(pool.id) || 0))
  }));
  // Simple registrations take general seats first, then other available seats.
  // This keeps registration + ticket bookings below the total event capacity.
  let unallocated = registrations;
  for (const id of ['general', 'early', 'vip']) {
    const pool = pools.find(item => item.id === id);
    const used = Math.min(pool.remaining, unallocated);
    pool.remaining -= used;
    unallocated -= used;
  }
  return pools;
}

export function withinTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
