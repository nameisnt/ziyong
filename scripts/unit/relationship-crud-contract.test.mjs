/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const catalog = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const harness = await readMaybe(new URL('../../src/testing/visual-harness.ts', import.meta.url));
const scenario = await readMaybe(new URL('../../src/testing/visual/relationshipScenarios.ts', import.meta.url));

test('relationship local CRUD has one dedicated browser scenario', () => {
  assert.match(catalog, /relationship-crud/);
  assert.match(harness, /applyRelationshipVisualScenario/);
  assert.match(harness, /useRelationshipStore/);
  assert.match(scenario, /name !== 'relationship-crud'/);
});

test('the relationship scenario covers editing and both confirmed deletion levels', () => {
  assert.match(scenario, /新增人物/);
  assert.match(scenario, /新增关系/);
  assert.match(scenario, /pc-relation-row/);
  assert.match(scenario, /删除人物关系/);
  assert.match(scenario, /和相关关系吗/);
  assert.match(scenario, /relationship\.links\.length === 0/);
});
