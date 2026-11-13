import { openStore } from '../server/database.js';
import { createHandler } from '../server/api.js';

let handler;
export default async function vercelHandler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    // Vercel may pass the rewrite destination rather than the browser URL.
    if (['/api', '/api/index'].includes(url.pathname) && url.searchParams.has('__eventease_path')) {
      url.pathname = '/api/' + url.searchParams.get('__eventease_path');
      url.searchParams.delete('__eventease_path');
      req.url = url.pathname + url.search;
    }
    // Share one small pool per warm function instance. Never listen on a port here.
    handler ||= openStore({ hosted: true }).then(db => createHandler(db, { staticFiles: false }))
      .catch(error => { handler = undefined; throw error; });
    await (await handler)(req, res);
  } catch {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is not configured or is unavailable.' } }));
  }
}
