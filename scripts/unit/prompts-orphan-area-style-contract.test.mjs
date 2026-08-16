/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/PromptsApp.vue', import.meta.url), 'utf8');

test('Prompts parent has no orphan textarea height rules', () => {
  const template = source.slice(source.indexOf('<template>'), source.indexOf('<script setup'));
  const failures = [];
  assert.doesNotMatch(template, /class="[^"]*pc-area/);
  if (/\.pc-prompts-app \.pc-area:not\(\.pc-area-multiline\)\s*\{/.test(source)) failures.push('orphan generic 260px rule exists');
  if (/\.pc-prompts-app \.pc-area\.compact\s*\{/.test(source)) failures.push('orphan compact 180px rule exists');
  assert.deepEqual(failures, []);
});
