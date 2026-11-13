import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createAuth } from '../server/auth.js';
import { openStore } from '../server/database.js';
import { createHandler } from '../server/api.js';
import http from 'node:http';

const key = 'test-only-booking-signing-secret-32-characters';
const auth = createAuth({ BOOKING_TOKEN_SECRET: key });
const req = token => ({ headers: { authorization: `Bearer ${token}` } });
test('receipt signatures reject forgery, malformed data and expiration', () => {
  const id = 'CR-0123456789ABCDEF0123456789ABCDEF';
  const token = auth.issueBookingToken(id);
  assert.equal(auth.authenticate(req(token)).bookingId, id);
  const parts = token.split('.');
  assert.throws(() => auth.authenticate(req(parts[0] + '.wrong')), { status: 401 });
  const payload = Buffer.from(JSON.stringify({ bookingId: id, expires: 1 })).toString('base64url');
  const expired = payload + '.' + createHmac('sha256', key).update(payload).digest('base64url');
  assert.throws(() => auth.authenticate(req(expired)), { status: 401 });
  assert.throws(() => auth.authenticate(req('bad-json.signature')), { status: 401 });
});
test('hosted storage never falls back to SQLite and missing auth fails closed', async () => {
  await assert.rejects(openStore({ hosted: true, env: {} }), { code: 'DATABASE_URL_MISSING' });
  assert.throws(() => createAuth({}).assertBookingConfigured(), { status: 503 });
  assert.throws(() => createAuth({ ORGANIZER_CREDENTIALS: '[{"tokenHash":"invalid","eventIds":["*"]}]' }));
});
test('database health fails honestly and internal error details are not exposed', async () => {
  const store = { kind: 'postgresql', health: async () => { throw new Error('private connection details'); },
    listEvents: async () => { const error = new Error('private connection details'); error.code = 'PRIVATE_CODE'; throw error; } };
  const server = http.createServer(createHandler(store, { auth, logErrors: false }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 503);
    assert.equal((await health.json()).error.code, 'DATABASE_UNAVAILABLE');
    const events = await fetch(base + '/api/events');
    assert.equal(events.status, 500);
    assert.deepEqual(await events.json(), { error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
