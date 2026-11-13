import http from 'node:http';
import { openDatabase } from './db.js';
import { createHandler } from './api.js';

const db = openDatabase();
const port = Number(process.env.PORT || 3000);
const server = http.createServer(createHandler(db));
server.listen(port, '127.0.0.1', () => {
  console.log(`EventEase Week 3 server: http://localhost:${port}`);
  console.log(`API health check: http://localhost:${port}/api/health`);
  console.log('Demo only: no real payments or authentication.');
});
function close() { server.close(() => { db.close(); process.exit(0); }); }
process.once('SIGINT', close);
process.once('SIGTERM', close);
