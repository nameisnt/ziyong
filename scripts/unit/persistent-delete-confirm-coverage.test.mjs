/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('persisted Bagu rules and MVU history require the shared confirmation', async () => {
  const [bagu, mvu] = await Promise.all([
    source('../../src/components/BaguApp.vue'),
    source('../../src/apps/mvu-modifier/MvuModifierApp.vue'),
  ]);
  assert.match(bagu, /async function removeRule[\s\S]{0,700}phone\.confirmNotice/u);
  assert.match(mvu, /async function clearHistory[\s\S]{0,700}phone\.confirmNotice/u);
});

test('dedupe, relationship and workbench destructive buttons use confirmed coordinators', async () => {
  const [library, relationship, workbench] = await Promise.all([
    source('../../src/apps/entry-library/EntryLibraryApp.vue'),
    source('../../src/apps/relationship/RelationshipApp.vue'),
    source('../../src/apps/workbench/WorkbenchApp.vue'),
  ]);

  assert.match(library, /function deleteDuplicate[\s\S]{0,300}(?:return|await) deleteItem/u);
  assert.doesNotMatch(relationship, /@click="relationship\.deleteLink/u);
  assert.match(relationship, /async function removeLink[\s\S]{0,700}phone\.confirmNotice/u);
  assert.doesNotMatch(workbench, /@click="workbench\.(?:deleteStep|deleteInsertDraft)/u);
  assert.match(workbench, /async function removeStep[\s\S]{0,700}phone\.confirmNotice/u);
  assert.match(workbench, /async function discardInsertDraft[\s\S]{0,700}phone\.confirmNotice/u);
});
