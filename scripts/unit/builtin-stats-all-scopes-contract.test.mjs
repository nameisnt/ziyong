/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/builtinStats.ts', import.meta.url), 'utf8');

test('built-in App totals include every stored chat scope', () => {
  assert.doesNotMatch(source, /isCurrentOwnerScope|getScopeOwnerPrefix/u);
  assert.match(source, /Object\.entries\(envelope\.scopes\)\.forEach/u);
  assert.match(source, /scopeKey === currentScopeKey/u);
});
