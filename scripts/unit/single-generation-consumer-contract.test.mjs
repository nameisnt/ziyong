/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const consumers = await Promise.all(
  [
    ['Storylines', 'src/apps/storylines/StorylinesApp.vue'],
    ['ScenePlanner', 'src/apps/scene-planner/ScenePlannerApp.vue'],
  ].map(async ([name, file]) => ({
    file,
    name,
    source: await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'),
  })),
);

test('reference single-generation consumers delegate runtime state to the shared session', () => {
  for (const { file, source } of consumers) {
    assert.match(source, /useSingleGenerationTaskSession/, file);
    assert.match(source, /generationSession\.create\(/, file);
    assert.match(source, /lifecycle:\s*generationSession\.lifecycle\(task\.id\)/, file);
    assert.match(source, /generationSession\.complete\(task\.id,/, file);
    assert.match(source, /generationSession\.fail\(task\.id,/, file);
    assert.match(source, /:error="generationError"/, file);
    assert.match(source, /:raw-output="generationRawOutput"/, file);
    assert.match(source, /:running="generationRunning"/, file);
  }
});

test('reference consumers no longer stop requests on component disposal or own runtime fields', () => {
  for (const { file, source } of consumers) {
    assert.doesNotMatch(source, /stopGenerationByIdSafe/, file);
    assert.doesNotMatch(source, /onScopeDispose\([\s\S]*?stopGeneration/s, file);
    assert.doesNotMatch(source, /generationId:\s*''/, file);
    assert.doesNotMatch(source, /rawOutput:\s*''/, file);
    assert.doesNotMatch(source, /running:\s*false/, file);
  }
});

test('reference consumers retain saved, preview and failed-draft result routing', () => {
  const storylines = consumers.find(item => item.name === 'Storylines')?.source ?? '';
  const scenePlanner = consumers.find(item => item.name === 'ScenePlanner')?.source ?? '';
  for (const state of ['saved', 'preview', 'failed-draft']) assert.match(storylines, new RegExp(`resultState: '${state}'`));
  assert.match(scenePlanner, /resultState:\s*result\.status === 'saved' \? 'saved' : 'preview'/);
  assert.match(scenePlanner, /resultState:\s*'failed-draft'/);
});
