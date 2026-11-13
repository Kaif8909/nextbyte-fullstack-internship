import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { default as handler } from '../api/index.js';

test('Vercel returns JSON 503 when DATABASE_URL is absent, never fake catalog or SQLite success', async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const route of ['/api/health', '/api/events']) {
      const result = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      assert.equal(result.status, 503);
      assert.deepEqual(await result.json(), { error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is not configured or is unavailable.' } });
    }
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
    assert.equal(config.env.NODEJS_HELPERS, '0');
    assert.equal(config.outputDirectory, 'public');
  } finally {
    if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = original;
    await new Promise(resolve => server.close(resolve));
  }
});
