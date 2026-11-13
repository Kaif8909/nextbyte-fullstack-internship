import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.js';
import { createHandler } from '../server/api.js';
import { sqliteStore } from '../server/sqlite-store.js';
import { createAuth } from '../server/auth.js';
import { createHash } from 'node:crypto';
import { createPostgresPool, postgresStore } from '../server/postgres-store.js';

let db;
let server;
let base;
let store;
const organizer = { tokenHash: createHash('sha256').update('test-organizer-key').digest('hex'), eventIds: [] };
const authEnv = () => ({ BOOKING_TOKEN_SECRET: 'test-only-booking-signing-key-32-characters', ORGANIZER_CREDENTIALS: JSON.stringify([organizer]) });
const headers = { 'content-type': 'application/json' };
const person = { full_name: 'Demo Attendee', email: 'test@example.com' };
const futureEvent = (title, capacity = 50) => ({
  title,
  description: 'An enjoyable community event for friends and visitors in Karachi.',
  category: 'Technology', city: 'Karachi', venue: 'Community Center Karachi',
  date: '2099-11-21T19:00:00+05:00', organizer: 'Demo Organizer',
  capacity, price: 4500
});
async function request(route, method = 'GET', data, customHeaders = headers) {
  const options = { method, headers: customHeaders };
  if (data !== undefined) options.body = typeof data === 'string' ? data : JSON.stringify(data);
  const response = await fetch(base + route, options);
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function createEvent(title, capacity) {
  const r = await request('/api/events', 'POST', futureEvent(title, capacity));
  assert.equal(r.status, 201);
  return r.body.event;
}
before(async () => {
  db = openDatabase(':memory:');
  store = process.env.TEST_DATABASE_URL ? postgresStore(createPostgresPool(process.env.TEST_DATABASE_URL)) : sqliteStore(db);
  server = http.createServer((req, res) => createHandler(store, { logErrors: false, auth: createAuth(authEnv()) })(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await store.close();
  if (process.env.TEST_DATABASE_URL) db.close();
});

test('health and events use JSON and include seeded demo catalog', async () => {
  assert.deepEqual((await request('/api/health')).body, { status: 'ok', database: store.kind, demo: true });
  const result = await request('/api/events?city=Karachi&category=Music');
  assert.equal(result.status, 200);
  assert.ok(result.body.events.length > 0);
  assert.ok(result.body.events.every(e => e.city === 'Karachi' && e.category === 'Music'));
  assert.ok(result.headers.get('content-type').includes('application/json'));
});

test('create event, read details, validate input and handle missing event', async () => {
  const bad = await request('/api/events', 'POST', { title: 'a' });
  assert.equal(bad.status, 422);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
  assert.ok(bad.body.error.details.length > 0);
  const event = await createEvent('A Future Community Workshop');
  const response = await request(`/api/events/${event.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.event.title, event.title);
  assert.equal(response.body.tickets.reduce((n, t) => n + t.capacity, 0), event.capacity);
  assert.equal((await request('/api/events/missing-event')).status, 404);
});

test('registrations validate, deduplicate emails and enforce general capacity', async () => {
  const e = await createEvent('General Registration Demo', 36);
  const invalid = await request(`/api/events/${e.id}/registrations`, 'POST', { full_name: '', email: 'abc' });
  assert.equal(invalid.status, 422);
  const first = await request(`/api/events/${e.id}/registrations`, 'POST', person);
  assert.equal(first.status, 201);
  assert.ok(first.body.registration_id > 0);
  const duplicate = await request(`/api/events/${e.id}/registrations`, 'POST', { ...person, email: 'TEST@example.com' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_REGISTRATION');
  const second = await request(`/api/events/${e.id}/registrations`, 'POST', { ...person, email: 'another@example.com' });
  assert.equal(second.status, 201);
  const snapshot = await request(`/api/events/${e.id}`);
  assert.equal(snapshot.body.tickets.reduce((n, t) => n + t.remaining, 0), 34);
});

test('ticket booking calculates trusted prices, creates a reference and persists inventory', async () => {
  const e = await createEvent('Bookable Ticket Demo');
  const input = {
    eventId: e.id,
    items: [{ id: 'early', quantity: 2, price: 1 }, { id: 'vip', quantity: 1, price: 1 }],
    customer: { name: 'Demo Person', email: 'demo@site.test', phone: '+92 300 1234567' },
    payment: 'demo-card', consent: true
  };
  const posted = await request('/api/bookings', 'POST', input);
  assert.equal(posted.status, 201);
  assert.equal(posted.body.booking.subtotal, 15075);
  assert.equal(posted.body.booking.fee, 754);
  assert.equal(posted.body.booking.total, 15829);
  assert.match(posted.body.booking.id, /^CR-[A-F0-9]{32}$/);
  const token = posted.headers.get('x-booking-token');
  assert.ok(token);
  assert.equal((await request(`/api/bookings/${posted.body.booking.id}`)).status, 401);
  const read = await request(`/api/bookings/${posted.body.booking.id}`, 'GET', undefined, { authorization: `Bearer ${token}` });
  assert.equal(read.status, 200);
  assert.equal(read.body.booking.customer.email, 'demo@site.test');
  const details = await request(`/api/events/${e.id}`);
  assert.equal(details.body.tickets.find(t => t.id === 'early').remaining, 18);
  assert.equal(details.body.tickets.find(t => t.id === 'vip').remaining, 14);
});

test('booking rejects duplicate ticket types, excessive quantity and stock conflicts', async () => {
  const e = await createEvent('Small Ticket Demo', 2);
  const basic = {
    eventId: e.id,
    items: [{ id: 'early', quantity: 2 }],
    customer: { name: 'Tester Person', email: 'valid@example.com', phone: '+92 300 1234567' },
    payment: 'demo-wallet', consent: true
  };
  const duplicate = await request('/api/bookings', 'POST', { ...basic, items: [basic.items[0], basic.items[0]] });
  assert.equal(duplicate.status, 422);
  const tooMany = await request('/api/bookings', 'POST', { ...basic, items: [{ id: 'early', quantity: 11 }] });
  assert.equal(tooMany.status, 422);
  assert.equal((await request('/api/bookings', 'POST', basic)).status, 201);
  const conflict = await request('/api/bookings', 'POST', { ...basic, items: [{ id: 'early', quantity: 1 }] });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'TICKETS_UNAVAILABLE');
});

test('invalid JSON, wrong media type, payload limit, method and private files are rejected', async () => {
  const json = await request('/api/events', 'POST', '{oops');
  assert.equal(json.status, 400);
  const media = await request('/api/events', 'POST', '{}', { 'content-type': 'text/plain' });
  assert.equal(media.status, 415);
  const large = await request('/api/events', 'POST', JSON.stringify({ payload: 'x'.repeat(70000) }));
  assert.equal(large.status, 413);
  const method = await request('/api/events/after-hours', 'POST', {});
  assert.equal(method.status, 405);
  const hidden = await fetch(base + '/server/index.js');
  assert.equal(hidden.status, 404);
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('<html'));
});


test('simple registrations fill even small events; concurrent final seat only succeeds once', async () => {
  const e = await createEvent('Limited Free Registration Demo', 1);
  const [a, b] = await Promise.all([
    request(`/api/events/${e.id}/registrations`, 'POST', { ...person, email: 'a@example.com' }),
    request(`/api/events/${e.id}/registrations`, 'POST', { ...person, email: 'b@example.com' })
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const response = await request(`/api/events/${e.id}`);
  assert.equal(response.body.tickets.reduce((n, t) => n + t.remaining, 0), 0);
});


test('SQLite records remain available after closing and reopening the database', () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'eventease-test-'));
  const target = path.join(folder, 'persistent.sqlite');
  try {
    const first = openDatabase(target);
    first.prepare(`INSERT INTO events (id,title,description,category,city,venue,date,organizer,price,capacity,image)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('reopened-event', 'Reopened Event', 'Demonstrate persistence', 'Technology', 'Karachi', 'Demo Hall',
      '2099-12-15T19:00:00+05:00', 'Demo Organizer', 0, 5, 'assets/images/hero.jpg');
    first.close();
    const second = openDatabase(target);
    assert.equal(second.prepare('SELECT title FROM events WHERE id = ?').get('reopened-event').title, 'Reopened Event');
    second.close();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('attendee data requires organizer authentication and explicit event authorization', async () => {
  const event = await createEvent('Protected Attendee Demo');
  await request(`/api/events/${event.id}/registrations`, 'POST', person);
  const route = `/api/events/${event.id}/registrations`;
  assert.equal((await request(route)).status, 401);
  assert.equal((await request(route, 'GET', undefined, { authorization: 'Bearer wrong' })).status, 401);
  const authorized = { authorization: 'Bearer test-organizer-key' };
  assert.equal((await request(route, 'GET', undefined, authorized)).status, 403);
  organizer.eventIds.push(event.id);
  const result = await request(route, 'GET', undefined, authorized);
  assert.equal(result.status, 200);
  assert.equal(result.body.count, 1);
  assert.equal(result.body.registrations[0].email, person.email);
});

test('receipt tokens cannot access another booking or organizer attendee lists', async () => {
  const event = await createEvent('Scoped Booking Receipt Demo');
  const payload = { eventId: event.id, items: [{ id: 'early', quantity: 1 }],
    customer: { name: 'Receipt Person', email: 'receipt@example.com', phone: '+92 300 1234567' }, payment: 'demo-card', consent: true };
  const first = await request('/api/bookings', 'POST', payload);
  const second = await request('/api/bookings', 'POST', payload);
  const receipt = { authorization: `Bearer ${first.headers.get('x-booking-token')}` };
  assert.equal((await request(`/api/bookings/${second.body.booking.id}`, 'GET', undefined, receipt)).status, 403);
  assert.equal((await request(`/api/events/${event.id}/registrations`, 'GET', undefined, receipt)).status, 401);
  assert.equal((await request(`/api/bookings/${first.body.booking.id}`, 'GET', undefined, { authorization: 'Bearer test-organizer-key' })).status, 403);
  organizer.eventIds.push(event.id);
  assert.equal((await request(`/api/bookings/${first.body.booking.id}`, 'GET', undefined, { authorization: 'Bearer test-organizer-key' })).status, 200);
});

test('mixed concurrent registration and booking cannot oversell the final seat', async () => {
  const event = await createEvent('Mixed Final Seat Demo', 1);
  const booking = { eventId: event.id, items: [{ id: 'early', quantity: 1 }],
    customer: { name: 'Seat Tester', email: 'seat@example.com', phone: '+92 300 1234567' }, payment: 'demo-wallet', consent: true };
  const results = await Promise.all([
    request('/api/bookings', 'POST', booking),
    request(`/api/events/${event.id}/registrations`, 'POST', person)
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  const details = await request(`/api/events/${event.id}`);
  assert.equal(details.body.tickets.reduce((n, pool) => n + pool.remaining, 0), 0);
});
