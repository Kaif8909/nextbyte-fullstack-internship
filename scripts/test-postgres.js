import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

// Real PostgreSQL, in a fresh temporary cluster. No hosted credentials are used.
const directory = await mkdtemp(path.join(tmpdir(), 'eventease-pg-test-'));
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const password = randomBytes(24).toString('hex');
const postgres = new EmbeddedPostgres({ databaseDir: path.join(directory, 'data'), user: 'postgres',
  password, port, persistent: false, autoRehydrateSymlinks: true,
  postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
const env = { ...process.env, DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/eventease_test` };
env.TEST_DATABASE_URL = env.DATABASE_URL;
delete env.MIGRATION_DATABASE_URL;
async function run(args) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  if (code !== 0) throw new Error('PostgreSQL verification command failed.');
}
try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase('eventease_test');
  await run(['scripts/migrate.js']);
  await run(['scripts/migrate.js']); // Idempotence matters during redeployments.
  await run(['scripts/seed.js']);
  await run(['--test', 'tests/api.test.js', 'tests/postgres.test.js']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await postgres.stop();
  console.log('Stopped the isolated PostgreSQL test cluster.');
}
