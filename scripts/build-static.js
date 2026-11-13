import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public');
// public/ is generated output, never the source directory.
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of await readdir(root)) {
  if (file.endsWith('.html')) await cp(path.join(root, file), path.join(output, file));
}
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Built frontend HTML and assets in public/.');
