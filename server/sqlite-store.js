import { availability, getEvent, listEvents } from './db.js';

// Offline local development only; never imported by the Vercel entry point.
export function sqliteStore(db) {
  let pending = Promise.resolve();
  const store = {
    kind: 'sqlite',
    health: async () => { db.prepare('SELECT 1').get(); },
    listEvents: async () => listEvents(db),
    getEvent: async id => getEvent(db, id),
    availability: async event => availability(db, event),
    createEvent: event => store.transaction(event.id, async () => {
      const keys = ['id', 'title', 'description', 'category', 'city', 'venue', 'date', 'organizer',
        'price', 'capacity', 'image', 'popularity', 'duration', 'highlights', 'schedule'];
      db.prepare(`INSERT INTO events (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .run(...keys.map(key => ['highlights', 'schedule'].includes(key) ? JSON.stringify(event[key]) : event[key]));
    }),
    registrationExists: async (eventId, email) => !!db.prepare('SELECT id FROM registrations WHERE event_id = ? AND email = ?').get(eventId, email),
    addRegistration: async (eventId, person) => Number(db.prepare('INSERT INTO registrations (event_id, full_name, email) VALUES (?, ?, ?)')
      .run(eventId, person.name, person.email).lastInsertRowid),
    listRegistrations: async eventId => db.prepare('SELECT id AS registration_id, event_id, full_name, email FROM registrations WHERE event_id = ? ORDER BY id').all(eventId),
    addBooking: async booking => {
      db.prepare('INSERT INTO bookings (id,event_id,name,email,phone,payment,subtotal,fee,total,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(booking.id, booking.eventId, booking.customer.name, booking.customer.email, booking.customer.phone,
          booking.payment, booking.subtotal, booking.fee, booking.total, booking.createdAt);
      const insert = db.prepare('INSERT INTO booking_items (booking_id,type,quantity,price) VALUES (?,?,?,?)');
      for (const item of booking.items) insert.run(booking.id, item.id, item.quantity, item.price);
    },
    getBooking: async id => db.prepare('SELECT * FROM bookings WHERE id = ?').get(id),
    bookingItems: async id => db.prepare('SELECT type AS id,quantity,price FROM booking_items WHERE booking_id = ?').all(id),
    transaction(eventId, fn) {
      // Async route code must not interleave SQLite transactions on one connection.
      const run = pending.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try { const value = await fn(store); db.exec('COMMIT'); return value; }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      });
      pending = run.catch(() => {});
      return run;
    },
    close: async () => { await pending; db.close(); }
  };
  return store;
}
