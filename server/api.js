import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, isObject, validateBooking, validateEvent, validatePerson } from './validation.js';
import { ticketPools } from './inventory.js';
import { createAuth } from './auth.js';

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
    code: err.status ? err.code : 'INTERNAL_ERROR',
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
async function getEventOr404(db, eventId) {
  const event = await db.getEvent(eventId);
  if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'The requested event does not exist.');
  return event;
}
function totalFor(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = Math.round(subtotal * 0.05);
  return { subtotal, fee, total: subtotal + fee };
}

async function apiRoute(req, res, db, auth, pathname, searchParams) {
  if (pathname === '/api/health') {
    methodIs(req.method, 'GET');
    try { await db.health(); }
    catch { throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is unavailable.'); }
    return sendJson(res, 200, { status: 'ok', database: db.kind, demo: true });
  }
  if (pathname === '/api/events') {
    if (req.method === 'GET') {
      const q = (searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
      const city = (searchParams.get('city') || '').trim().toLowerCase().slice(0, 70);
      const category = (searchParams.get('category') || '').trim().toLowerCase().slice(0, 70);
      const data = (await db.listEvents()).filter(e =>
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
    await db.createEvent(created);
    return sendJson(res, 201, { event: created }, { location: `/api/events/${encodeURIComponent(id)}` });
  }

  const registration = /^\/api\/events\/([^/]+)\/registrations$/.exec(pathname);
  if (registration) {
    const eventId = decodeURIComponent(registration[1]);
    if (req.method === 'GET') {
      const identity = auth.authenticate(req, { organizerOnly: true });
      auth.authorize(identity, eventId);
      await getEventOr404(db, eventId);
      const registrations = await db.listRegistrations(eventId);
      return sendJson(res, 200, { registrations, count: registrations.length });
    }
    methodIs(req.method, 'POST');
    const body = await parseJson(req);
    const person = validatePerson(body);
    const result = await db.transaction(eventId, async tx => {
      const event = await getEventOr404(tx, eventId);
      eventIsOpen(event);
      const duplicate = await tx.registrationExists(eventId, person.email);
      if (duplicate) throw new ApiError(409, 'DUPLICATE_REGISTRATION', 'This email is already registered for the event.');
      const seats = (await tx.availability(event)).reduce((n, t) => n + t.remaining, 0);
      if (seats < 1) throw new ApiError(409, 'EVENT_FULL', 'No registration places remain.');
      const registrationId = await tx.addRegistration(eventId, person);
      return { registration_id: registrationId, event_id: eventId,
        full_name: person.name, email: person.email, message: 'Registration successful' };
    });
    return sendJson(res, 201, result);
  }
  const eventMatch = /^\/api\/events\/([^/]+)$/.exec(pathname);
  if (eventMatch) {
    methodIs(req.method, 'GET');
    const event = await getEventOr404(db, decodeURIComponent(eventMatch[1]));
    return sendJson(res, 200, { event, tickets: await db.availability(event) });
  }

  if (pathname === '/api/bookings') {
    methodIs(req.method, 'POST');
    const body = validateBooking(await parseJson(req));
    auth.assertBookingConfigured();
    const booking = await db.transaction(body.eventId, async tx => {
      const event = await getEventOr404(tx, body.eventId);
      eventIsOpen(event);
      const pools = new Map((await tx.availability(event)).map(pool => [pool.id, pool]));
      const items = body.items.map(item => {
        const pool = pools.get(item.id);
        if (item.quantity > pool.remaining)
          throw new ApiError(409, 'TICKETS_UNAVAILABLE', `Not enough ${pool.name} tickets remain.`);
        return { id: pool.id, name: pool.name, quantity: item.quantity, price: pool.price };
      });
      const totals = totalFor(items);
      const id = `CR-${randomBytes(16).toString('hex').toUpperCase()}`;
      const createdAt = new Date().toISOString();
      const saved = {
        id, eventId: body.eventId, event, items, ...totals,
        customer: body.customer, payment: body.payment, createdAt, demo: true
      };
      await tx.addBooking(saved);
      return saved;
    });
    return sendJson(res, 201, { booking }, {
      location: `/api/bookings/${booking.id}`,
      'x-booking-token': auth.issueBookingToken(booking.id)
    });
  }
  const bookingMatch = /^\/api\/bookings\/(CR-[a-fA-F0-9]{32})$/.exec(pathname);
  if (bookingMatch) {
    methodIs(req.method, 'GET');
    const identity = auth.authenticate(req);
    // A valid receipt for another booking must not reveal whether this one exists.
    if (identity.type === 'booking') auth.authorize(identity, null, bookingMatch[1]);
    const row = await db.getBooking(bookingMatch[1]);
    if (!row) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'No booking was found for that reference.');
    auth.authorize(identity, row.event_id, row.id);
    const event = await getEventOr404(db, row.event_id);
    const items = (await db.bookingItems(row.id))
      .map(item => ({ ...item, name: ticketPools(event).find(t => t.id === item.id).name }));
    return sendJson(res, 200, { booking: {
      id: row.id, eventId: row.event_id, event,
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

export function createHandler(db, { logErrors = true, auth = createAuth(), staticFiles = true } = {}) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/'))
        await apiRoute(req, res, db, auth, url.pathname, url.searchParams);
      else if (staticFiles) await serveStatic(req, res, url.pathname);
      else throw new ApiError(404, 'NOT_FOUND', 'The requested API endpoint does not exist.');
    } catch (err) {
      if (logErrors && !(err instanceof ApiError)) console.error('API request failed.');
      if (!res.headersSent) sendJson(res, err.status || 500, errorBody(err),
        err.status === 405 ? { allow: err.message.match(/(?:GET|POST|HEAD)/)?.[0] || 'GET' } : {});
      else res.end();
    }
  };
}
