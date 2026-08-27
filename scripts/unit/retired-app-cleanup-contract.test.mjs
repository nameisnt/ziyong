/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cleanup = await readFile(new URL('../../src/util/retiredDataCleanup.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');
const layout = await readFile(new URL('../../src/core/appLayout.ts', import.meta.url), 'utf8');

test('retired planning and relationship fields are deleted during plugin startup', () => {
  assert.match(cleanup, /sillytavern_phone_scene_planner/u);
  assert.match(cleanup, /sillytavern_phone_storylines/u);
  assert.match(cleanup, /sillytavern_phone_relationships/u);
  assert.match(cleanup, /delete settings\[field\]/u);
  assert.match(app, /cleanupRetiredPhoneData\(\)/u);
  assert.doesNotMatch(layout, /scene-planner|storylines/u);
});
