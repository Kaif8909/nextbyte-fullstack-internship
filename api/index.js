import { openStore } from '../server/database.js';
import { createHandler } from '../server/api.js';
import { logInitializationFailure } from '../server/diagnostics.js';

export function createVercelHandler({ open = openStore, buildHandler = createHandler } = {}) {
  let handler;
  let initializationStage;
  async function initialize() {
    let db;
    try {
      initializationStage = 'open_store';
      db = await open({ hosted: true });
      initializationStage = 'create_handler';
      const ready = buildHandler(db, { staticFiles: false });
      initializationStage = 'database_connect';
      // Pool construction is lazy. Verify a real authenticated TLS connection
      // before caching the handler; never report initialization as ready otherwise.
      await db.health();
      return ready;
    } catch (error) {
      try { await db?.close(); } catch { /* Do not leak cleanup errors. */ }
      throw error;
    }
  }
  return async function vercelHandler(req, res) {
    let stage = 'request_routing';
    try {
      const url = new URL(req.url, 'http://localhost');
      // Vercel may pass the rewrite destination rather than the browser URL.
      if (['/api', '/api/index'].includes(url.pathname) && url.searchParams.has('__eventease_path')) {
        url.pathname = '/api/' + url.searchParams.get('__eventease_path');
        url.searchParams.delete('__eventease_path');
        req.url = url.pathname + url.search;
      }
      // Share one small pool per warm function instance. Never listen on a port here.
      handler ||= initialize().catch(error => { handler = undefined; throw error; });
      stage = 'initializing';
      const ready = await handler;
      stage = 'request_handler';
      await ready(req, res);
    } catch (error) {
      logInitializationFailure(error, stage === 'initializing' ? initializationStage : stage);
      res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is not configured or is unavailable.' } }));
    }
  };
}

export default createVercelHandler();
