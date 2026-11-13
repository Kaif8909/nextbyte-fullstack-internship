import test from 'node:test';
import assert from 'node:assert/strict';
import { rootCertificates } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { normalizeCaCertificate, parseDatabaseUrl } from '../server/postgres-config.js';
import { logInitializationFailure } from '../server/diagnostics.js';
import { createVercelHandler } from '../api/index.js';
import { createPostgresPool } from '../server/postgres-store.js';

test('URL configuration rejects missing, quoted and non-PostgreSQL URLs with safe codes', () => {
  assert.throws(() => parseDatabaseUrl(), { code: 'DATABASE_URL_MISSING' });
  for (const url of ['not-a-url', '"postgresql://user:private@host/db"', 'https://host/db'])
    assert.throws(() => parseDatabaseUrl(url), { code: 'DATABASE_URL_INVALID' });
  assert.equal(parseDatabaseUrl('postgresql://user:private@host/db').protocol, 'postgresql:');
});

test('CA parsing supports real and escaped newlines and rejects malformed or mixed PEM', () => {
  const ca = rootCertificates.find(pem => new X509Certificate(pem).ca).trim();
  assert.equal(normalizeCaCertificate(ca.replace(/\n/g, '\\n')), ca);
  assert.equal(normalizeCaCertificate(ca.replace(/\n/g, '\r\n')), ca);
  assert.equal(normalizeCaCertificate(), undefined);
  for (const value of ['path/to/ca.crt', '-----BEGIN CERTIFICATE-----\nprivate\n-----END CERTIFICATE-----',
    '"' + ca + '"', ca + '\nprivate text'])
    assert.throws(() => normalizeCaCertificate(value), { code: 'DATABASE_CA_INVALID' });
});

test('explicit TLS validation survives URL SSL options', async () => {
  const pool = createPostgresPool('postgresql://user:private@db.example.test/demo?sslmode=disable');
  try {
    assert.equal(pool.options.ssl.rejectUnauthorized, true);
    assert.equal(pool.options.ssl.servername, 'db.example.test');
    assert.ok(!pool.options.connectionString.includes('sslmode'));
  } finally { await pool.end(); }
});

test('diagnostics never serialize exception messages, stacks, arbitrary codes or environment values', t => {
  const log = t.mock.method(console, 'error', () => {});
  const secret = 'CANARY-private-url-certificate-token-attendee';
  const error = Object.assign(new Error(secret), { code: secret, private: secret });
  error.stack = secret;
  const env = { DATABASE_URL: secret, DATABASE_CA_CERT: secret, BOOKING_TOKEN_SECRET: secret };
  logInitializationFailure(error, secret, env);
  const entry = JSON.parse(log.mock.calls[0].arguments[0]);
  assert.equal(entry.code, 'INITIALIZATION_FAILED');
  assert.equal(entry.stage, 'unknown');
  assert.equal(entry.category, 'unknown');
  assert.ok(Object.values(entry.configuration).every(value => typeof value === 'boolean'));
  assert.ok(!JSON.stringify(entry).includes(secret));
  logInitializationFailure({ code: 'ERR_MODULE_NOT_FOUND', message: secret }, 'open_store', env);
  assert.equal(JSON.parse(log.mock.calls[1].arguments[0]).category, 'dependency_import');
});

function response() {
  return { status: null, headers: null, body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; } };
}
const unavailable = { error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is not configured or is unavailable.' } };

test('function catches initialization failures at each stage with unchanged public 503 and no private detail', async t => {
  const log = t.mock.method(console, 'error', () => {});
  for (const [stage, code] of [['open_store', 'ERR_MODULE_NOT_FOUND'], ['create_handler', 'ORGANIZER_CONFIG_INVALID'], ['database_connect', 'SELF_SIGNED_CERT_IN_CHAIN']]) {
    let closed = false;
    const fail = () => { throw Object.assign(new Error('CANARY-secret'), { code }); };
    const db = { health: stage === 'database_connect' ? fail : async () => {}, close: async () => { closed = true; } };
    const handler = createVercelHandler({ open: stage === 'open_store' ? fail : async () => db,
      buildHandler: stage === 'create_handler' ? fail : () => () => assert.fail('Must not reach request handler') });
    const res = response();
    await handler({ url: '/api/health' }, res);
    assert.equal(res.status, 503);
    assert.deepEqual(JSON.parse(res.body), unavailable);
    const entry = JSON.parse(log.mock.calls.at(-1).arguments[0]);
    assert.equal(entry.stage, stage);
    assert.equal(entry.code, code);
    assert.ok(!JSON.stringify(entry).includes('CANARY-secret'));
    assert.equal(closed, stage !== 'open_store');
  }
});

test('function connects before serving, shares initialization and retries after a connection failure', async t => {
  t.mock.method(console, 'error', () => {});
  let opens = 0, connects = 0, serves = 0;
  const handler = createVercelHandler({
    open: async () => { opens++; return {
      health: async () => { connects++; if (connects === 1) throw Object.assign(new Error('private'), { code: 'ECONNREFUSED' }); },
      close: async () => {}
    }; },
    buildHandler: () => (req, res) => { assert.ok(connects >= 2); serves++; res.end('ok'); }
  });
  const first = response();
  await handler({ url: '/api/events' }, first);
  assert.equal(first.status, 503);
  await Promise.all([handler({ url: '/api/events' }, response()), handler({ url: '/api/health' }, response())]);
  assert.equal(opens, 2);
  assert.equal(connects, 2);
  assert.equal(serves, 2);
});
