/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = readFileSync('src/testing/visual/scenarioCatalog.ts', 'utf8');
const harness = readFileSync('src/testing/visual-harness.ts', 'utf8');
const bootstrap = readFileSync('src/testing/visual-bootstrap.ts', 'utf8');

test('world strategy lamps have one explicit two-consumer browser scenario', () => {
  assert.match(catalog, /['"]world-strategy-lamps['"]/);
  assert.match(harness, /name === ['"]world-strategy-lamps['"]/);
  assert.match(harness, /pc-world-entry-lamp\.blue/);
  assert.match(harness, /pc-world-entry-lamp\.green/);
  assert.match(harness, /pc-worldbook-entry-lamp\.blue/);
  assert.match(harness, /pc-worldbook-entry-lamp\.green/);
});

test('the visual worldbook fixture declares both strategies explicitly', () => {
  assert.match(bootstrap, /constant:\s*true/);
  assert.match(bootstrap, /selective:\s*true/);
});
