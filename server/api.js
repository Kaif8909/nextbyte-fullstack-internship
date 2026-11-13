import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, isObject, validateBooking, validateEvent, validatePerson } from './validation.js';
import { availability, eventFromRow, getEvent, listEvents, withinTransaction } from './db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};
const htmlPages = new Set([
  'index.html', 'events.html', 'event.html', 'tickets.html', 'checkout.html',
  'confirmation.html', 'my-tickets.html', 'organizer.html', 'register.html', 'success.html'
]);

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers
  });
  res.end(JSON.stringify(value));
}
function errorBody(err) {
  return { error: {
    code: err.code || 'INTERNAL_ERROR',
    message: err.status ? err.message : 'An unexpected server error occurred.',
    ...(err.details ? { details: err.details } : {})
  } };
}
function methodIs(actual, expected) {
  if (actual !== expected) throw new ApiError(405, 'METHOD_NOT_ALLOWED', `Use ${expected} for this endpoint.`);
}
async function parseJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send application/json.');
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= 64 * 1024) parts.push(chunk);
  }
  if (size > 64 * 1024) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'JSON payload must be 64 KB or less.');
  try {
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
    if (!isObject(body)) throw new Error('Expected object');
    return body;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Provide a valid JSON object.');
  }
}
function eventIsOpen(event) {
  if (new Date(event.date) <= new Date())
    throw new ApiError(409, 'EVENT_ENDED', 'This event has already ended.');
}
function getEventOr404(db, eventId) {
  const event = getEvent(db, eventId);
  if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'The requested event does not exist.');
  return event;
}
function totalFor(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = Math.round(subtotal * 0.05);
  return { subtotal, fee, total: subtotal + fee };
}

async function apiRoute(req, res, db, pathname, searchParams) {
  if (pathname === '/api/health') {
    methodIs(req.method, 'GET');
    return sendJson(res, 200, { status: 'ok', database: 'sqlite', demo: true });
  }
  if (pathname === '/api/events') {
    if (req.method === 'GET') {
      const q = (searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
      const city = (searchParams.get('city') || '').trim().toLowerCase().slice(0, 70);
      const category = (searchParams.get('category') || '').trim().toLowerCase().slice(0, 70);
      const data = listEvents(db).filter(e =>
        (!q || [e.title, e.description, e.city, e.venue].some(v => v.toLowerCase().includes(q))) &&
        (!city || e.city.toLowerCase() === city) &&
        (!category || e.category.toLowerCase() === category)
      );
      return sendJson(res, 200, { events: data, count: data.length });
    }
    methodIs(req.method, 'POST');
    const event = validateEvent(await parseJson(req));
    const id = `host-${randomBytes(8).toString('hex')}`;
    const created = {
      id, ...event,
      image: 'assets/images/hero.jpg', popularity: 0, duration: '3 hours',
      highlights: ['Independent community experience'], schedule: []
    };
    db.prepare(`INSERT INTO events
      (id, title, description, category, city, venue, date, organizer, price, capacity, image, popularity, duration, highlights, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, event.title, event.description, event.category, event.city, event.venue,
        event.date, event.organizer, event.price, event.capacity, created.image,
        created.popularity, created.duration, JSON.stringify(created.highlights), JSON.stringify(created.schedule));
    return sendJson(res, 201, { event: created }, { location: `/api/events/${encodeURIComponent(id)}` });
  }

  const registration = /^\/api\/events\/([^/]+)\/registrations$/.exec(pathname);
  if (registration) {
    methodIs(req.method, 'POST');
    const eventId = decodeURIComponent(registration[1]);
    const body = await parseJson(req);
    const person = validatePerson(body);
    const result = withinTransaction(db, () => {
      const event = getEventOr404(db, eventId);
      eventIsOpen(event);
      const duplicate = db.prepare('SELECT id FROM registrations WHERE event_id = ? AND email = ?').get(eventId, person.email);
      if (duplicate) throw new ApiError(409, 'DUPLICATE_REGISTRATION', 'This email is already registered for the event.');
      const seats = availability(db, event).reduce((n, t) => n + t.remaining, 0);
      if (seats < 1) throw new ApiError(409, 'EVENT_FULL', 'No registration places remain.');
      const inserted = db.prepare('INSERT INTO registrations (event_id, full_name, email) VALUES (?, ?, ?)')
        .run(eventId, person.name, person.email);
      return { registration_id: Number(inserted.lastInsertRowid), event_id: eventId,
        full_name: person.name, email: person.email, message: 'Registration successful' };
    });
    return sendJson(res, 201, result);
  }
  const eventMatch = /^\/api\/events\/([^/]+)$/.exec(pathname);
  if (eventMatch) {
    methodIs(req.method, 'GET');
    const event = getEventOr404(db, decodeURIComponent(eventMatch[1]));
    return sendJson(res, 200, { event, tickets: availability(db, event) });
  }

  if (pathname === '/api/bookings') {
    methodIs(req.method, 'POST');
    const body = validateBooking(await parseJson(req));
    const booking = withinTransaction(db, () => {
      const event = getEventOr404(db, body.eventId);
      eventIsOpen(event);
      const pools = new Map(availability(db, event).map(pool => [pool.id, pool]));
      const items = body.items.map(item => {
        const pool = pools.get(item.id);
        if (item.quantity > pool.remaining)
          throw new ApiError(409, 'TICKETS_UNAVAILABLE', `Not enough ${pool.name} tickets remain.`);
        return { id: pool.id, name: pool.name, quantity: item.quantity, price: pool.price };
      });
      const totals = totalFor(items);
      const id = `CR-${randomBytes(16).toString('hex').toUpperCase()}`;
      const createdAt = new Date().toISOString();
      db.prepare(`INSERT INTO bookings (id, event_id, name, email, phone, payment, subtotal, fee, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, body.eventId, body.customer.name, body.customer.email, body.customer.phone,
          body.payment, totals.subtotal, totals.fee, totals.total, createdAt);
      const addItem = db.prepare('INSERT INTO booking_items (booking_id, type, quantity, price) VALUES (?, ?, ?, ?)');
      for (const item of items) addItem.run(id, item.id, item.quantity, item.price);
      return {
        id, eventId: body.eventId, event, items, ...totals,
        customer: body.customer, payment: body.payment, createdAt, demo: true
      };
    });
    return sendJson(res, 201, { booking }, { location: `/api/bookings/${booking.id}` });
  }
  const bookingMatch = /^\/api\/bookings\/(CR-[a-fA-F0-9]{32})$/.exec(pathname);
  if (bookingMatch) {
    methodIs(req.method, 'GET');
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingMatch[1]);
    if (!row) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'No booking was found for that reference.');
    const items = db.prepare('SELECT type AS id, quantity, price FROM booking_items WHERE booking_id = ?').all(row.id)
      .map(item => ({ ...item, name: availability(db, getEventOr404(db, row.event_id)).find(t => t.id === item.id).name }));
    return sendJson(res, 200, { booking: {
      id: row.id, eventId: row.event_id, event: getEventOr404(db, row.event_id),
      items, subtotal: row.subtotal, fee: row.fee, total: row.total,
      customer: { name: row.name, email: row.email, phone: row.phone },
      payment: row.payment, createdAt: row.created_at, demo: true
    } });
  }
  throw new ApiError(404, 'NOT_FOUND', 'The requested API endpoint does not exist.');
}

async function serveStatic(req, res, pathname) {
  if (!['GET', 'HEAD'].includes(req.method))
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are supported for static files.');
  let local;
  try { local = decodeURIComponent(pathname).replace(/^\//, '') || 'index.html'; }
  catch { throw new ApiError(400, 'INVALID_PATH', 'Invalid URL encoding.'); }
  const allowed = htmlPages.has(local) || (local.startsWith('assets/') && !local.split('/').some(s => s.startsWith('.')));
  if (!allowed) throw new ApiError(404, 'NOT_FOUND', 'File not found.');
  const filename = path.resolve(ROOT, local);
  if (!filename.startsWith(`${ROOT}${path.sep}`)) throw new ApiError(404, 'NOT_FOUND', 'File not found.');
  const extension = path.extname(filename).toLowerCase();
  if (!MIME[extension]) throw new ApiError(404, 'NOT_FOUND', 'File not found.');
  try {
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('Not file');
    const data = req.method === 'HEAD' ? null : await readFile(filename);
    res.writeHead(200, {
      'content-type': MIME[extension],
      'content-length': info.size,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin'
    });
    res.end(data);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, 'NOT_FOUND', 'File not found.');
  }
}

export function createHandler(db, { logErrors = true } = {}) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/'))
        await apiRoute(req, res, db, url.pathname, url.searchParams);
      else await serveStatic(req, res, url.pathname);
    } catch (err) {
      if (logErrors && !(err instanceof ApiError)) console.error('API error', err);
      if (!res.headersSent) sendJson(res, err.status || 500, errorBody(err),
        err.status === 405 ? { allow: err.message.match(/(?:GET|POST|HEAD)/)?.[0] || 'GET' } : {});
      else res.end();
    }
  };
}
