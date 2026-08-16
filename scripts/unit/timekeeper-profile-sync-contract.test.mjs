/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = readFileSync('src/testing/visual/scenarioCatalog.ts', 'utf8');
const harness = readFileSync('src/testing/visual-harness.ts', 'utf8');

test('timekeeper profile synchronization has a dedicated browser scenario', () => {
  assert.match(catalog, /['"]timekeeper-profile-sync['"]/);
  assert.match(harness, /name === ['"]timekeeper-profile-sync['"]/);
});

test('the scenario exercises the complete create edit birth and delete chain', () => {
  assert.match(harness, /新增人物/);
  assert.match(harness, /birthDate/);
  assert.match(harness, /pc-person-card/);
  assert.match(harness, /删除人物及资料/);
});
