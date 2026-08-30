/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cleanup = await readFile(new URL('../../src/core/currentDataVersion.ts', import.meta.url), 'utf8');
const lifecycle = await readFile(new URL('../../src/core/phoneLifecycle.ts', import.meta.url), 'utf8');
const layout = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');

test('retired internal content fields are deleted during plugin startup', () => {
  assert.match(cleanup, /sillytavern_phone_profiles/u);
  assert.match(cleanup, /sillytavern_phone_scene_planner/u);
  assert.match(cleanup, /sillytavern_phone_storylines/u);
  assert.match(cleanup, /sillytavern_phone_relationships/u);
  assert.match(cleanup, /delete record\[key\]/u);
  assert.match(lifecycle, /applyCurrentPhoneDataVersion/u);
  assert.doesNotMatch(layout, /scene-planner|storylines/u);
});
