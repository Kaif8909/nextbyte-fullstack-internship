import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createPostgresPool, postgresStore } from '../server/postgres-store.js';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.js';
import { spawn } from 'node:child_process';
import { createHandler } from '../server/api.js';
import { createAuth } from '../server/auth.js';

const url = process.env.TEST_DATABASE_URL;
test('PostgreSQL stores bookings after a new pool, and rolls back partial writes', { skip: !url }, async () => {
  const pool = createPostgresPool(url);
  const store = postgresStore(pool);
  const id = `pg-${randomBytes(6).toString('hex')}`;
  const event = { ...(await store.listEvents())[0], id, capacity: 5, date: '2099-11-21T19:00:00+05:00' };
  await store.createEvent(event);
  const booking = { id: `CR-${randomBytes(16).toString('hex').toUpperCase()}`, eventId: id,
    customer: { name: 'Database Test', email: 'db@example.test', phone: '123456789' },
    payment: 'demo-card', subtotal: 100, fee: 5, total: 105, createdAt: new Date().toISOString(),
    items: [{ id: 'early', quantity: 1, price: 100 }] };
  try {
    await store.transaction(id, tx => tx.addBooking(booking));
    const invalid = { ...booking, id: `CR-${randomBytes(16).toString('hex').toUpperCase()}`, items: [{ id: 'early', quantity: 11, price: 100 }] };
    await assert.rejects(store.transaction(id, tx => tx.addBooking(invalid)));
    assert.equal(await store.getBooking(invalid.id), undefined);
  } finally { await store.close(); }
  const reopened = postgresStore(createPostgresPool(url));
  try { assert.equal((await reopened.getBooking(booking.id)).email, booking.customer.email); }
  finally { await reopened.close(); }
});

test('Vercel entry point uses PostgreSQL, JSON validation, nested routes and query filters', { skip: !url }, async () => {
  process.env.DATABASE_URL = url;
  process.env.BOOKING_TOKEN_SECRET = 'test-only-vercel-booking-signing-secret';
  const { default: handler } = await import('../api/index.js');
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, 'postgresql');
    const filtered = await fetch(base + '/api/events?city=Karachi&category=Music');
    const data = await filtered.json();
    assert.ok(data.events.length);
    assert.ok(data.events.every(event => event.city === 'Karachi' && event.category === 'Music'));
    const rewritten = await fetch(base + '/api/index?__eventease_path=events&city=Karachi&category=Music');
    assert.equal(rewritten.status, 200);
    assert.deepEqual((await rewritten.json()).events, data.events);
    assert.equal((await fetch(base + '/api/events/after-hours')).status, 200);
    const post = (route, body) => fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const created = await post('/api/index?__eventease_path=events', {
      title: 'Function Entry Test Event', description: 'A clearly labeled isolated function integration test event.',
      category: 'Technology', city: 'Karachi', venue: 'Test Venue', organizer: 'Test Organizer',
      date: '2099-12-15T19:00:00+05:00', capacity: 5, price: 100
    });
    assert.equal(created.status, 201);
    const event = (await created.json()).event;
    const registration = await post(`/api/events/${event.id}/registrations`, { full_name: 'Function Tester', email: 'function@example.test' });
    assert.equal(registration.status, 201);
    const booked = await post('/api/bookings', { eventId: event.id, items: [{ id: 'early', quantity: 1 }],
      customer: { name: 'Function Buyer', email: 'function-buyer@example.test', phone: '123456789' }, payment: 'demo-card', consent: true });
    assert.equal(booked.status, 201);
    const booking = (await booked.json()).booking;
    const receipt = booked.headers.get('x-booking-token');
    assert.equal((await fetch(base + `/api/bookings/${booking.id}`, { headers: { authorization: `Bearer ${receipt}` } })).status, 200);
    assert.equal((await fetch(base + `/api/events/${event.id}/registrations`)).status, 401);
    const bad = await fetch(base + '/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'INVALID_JSON');
    assert.equal((await fetch(base + '/server/db.js')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('independent PostgreSQL pools cannot double-book the last seat', { skip: !url }, async () => {
  const stores = [postgresStore(createPostgresPool(url)), postgresStore(createPostgresPool(url))];
  const auth = createAuth({ BOOKING_TOKEN_SECRET: 'test-only-independent-pool-signing-secret' });
  const servers = stores.map(store => http.createServer(createHandler(store, { auth, logErrors: false })));
  try {
    for (const server of servers) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const bases = servers.map(server => `http://127.0.0.1:${server.address().port}`);
    const event = { ...(await stores[0].listEvents())[0], id: `pool-${randomBytes(5).toString('hex')}`, capacity: 1, date: '2099-11-21T19:00:00+05:00' };
    await stores[0].createEvent(event);
    const booking = { eventId: event.id, items: [{ id: 'early', quantity: 1 }], customer: { name: 'Pool Tester', email: 'pool@example.test', phone: '123456789' }, payment: 'demo-card', consent: true };
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => fetch(bases[i % 2] + '/api/bookings', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(booking)
    })));
    assert.equal(results.filter(result => result.status === 201).length, 1);
    assert.equal(results.filter(result => result.status === 409).length, 7);
  } finally {
    for (const server of servers) await new Promise(resolve => server.close(resolve));
    for (const store of stores) await store.close();
  }
});

test('one-time SQLite import preserves attendee records and references; rejects a repeat import', { skip: !url }, async () => {
  // A separate database prevents interference with API tests or real data.
  const admin = createPostgresPool(url);
  const name = `eventease_import_${randomBytes(4).toString('hex')}`;
  const folder = await mkdtemp(path.join(tmpdir(), 'eventease-import-test-'));
  const target = path.join(folder, 'source.sqlite');
  const importedUrl = new URL(url); importedUrl.pathname = '/' + name;
  let imported;
  async function run(script, args = []) {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, DATABASE_URL: importedUrl.toString(), MIGRATION_DATABASE_URL: '' },
      stdio: 'pipe', windowsHide: true
    });
    child.stdout.resume(); child.stderr.resume();
    return new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  }
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    assert.equal(await run('scripts/migrate.js'), 0);
    const source = openDatabase(target);
    const id = 'CR-0123456789ABCDEF0123456789ABCDEF';
    source.prepare('INSERT INTO registrations (event_id,full_name,email) VALUES (?,?,?)').run('after-hours', 'Imported Attendee', 'import@example.test');
    source.prepare('INSERT INTO bookings (id,event_id,name,email,phone,payment,subtotal,fee,total,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(id, 'after-hours', 'Imported Buyer', 'buyer@example.test', '123456789', 'demo-card', 3600, 180, 3780, '2026-11-13T00:00:00.000Z');
    source.prepare('INSERT INTO booking_items (booking_id,type,quantity,price) VALUES (?,?,?,?)').run(id, 'early', 1, 3600);
    source.close();
    assert.equal(await run('scripts/import-sqlite.js', [target]), 0);
    imported = postgresStore(createPostgresPool(importedUrl.toString()));
    assert.equal((await imported.getBooking(id)).email, 'buyer@example.test');
    assert.equal((await imported.listRegistrations('after-hours'))[0].email, 'import@example.test');
    assert.equal((await imported.bookingItems(id))[0].quantity, 1);
    assert.equal(await run('scripts/import-sqlite.js', [target]), 1);
  } finally {
    await imported?.close();
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.end();
    // Exact generated child directory only; the source fixture contains synthetic data.
    await rm(folder, { recursive: true, force: true });
  }
});
