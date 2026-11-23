import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest, readJson } from '../scripts/content-lib.mjs';

test('generated manifest matches disk and is idempotent', async () => {
  const onDisk = await readJson('docs/manifest.json');
  const first = await buildManifest(new Date('2020-01-01T00:00:00Z'));
  const second = await buildManifest(new Date('2030-01-01T00:00:00Z'));
  assert.deepEqual(first, onDisk);
  assert.deepEqual(second, first);
});
