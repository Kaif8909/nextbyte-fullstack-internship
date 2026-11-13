import http from 'node:http';
import { openStore } from './database.js';
import { randomBytes } from 'node:crypto';
import { createHandler } from './api.js';

// Keep local checkout usable without credentials. Set a stable key in .env.local
// to retain booking receipt access across restarts. Hosted code never generates one.
if (!process.env.BOOKING_TOKEN_SECRET && !process.env.VERCEL) {
  process.env.BOOKING_TOKEN_SECRET = randomBytes(32).toString('hex');
  console.log('Using a temporary local booking key; receipt tokens expire on restart.');
}
const db = await openStore();
const port = Number(process.env.PORT || 3000);
const server = http.createServer(createHandler(db));
server.listen(port, '127.0.0.1', () => {
  console.log(`EventEase Week 3 server: http://localhost:${port}`);
  console.log(`API health check: http://localhost:${port}/api/health`);
  console.log(`Database: ${db.kind}. Demo only: no real payments.`);
});
function close() { server.close(async () => { await db.close(); process.exit(0); }); }
process.once('SIGINT', close);
process.once('SIGTERM', close);
