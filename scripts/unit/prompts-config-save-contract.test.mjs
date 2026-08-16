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
const scenario = await readMaybe(new URL('../../src/testing/visual/promptsScenarios.ts', import.meta.url));

test('prompt configuration editors have one dedicated save scenario', () => {
  assert.match(catalog, /prompts-config-save/);
  assert.match(harness, /applyPromptsVisualScenario/);
  assert.match(scenario, /name === 'prompts-config-save'/);
});

test('the prompt configuration scenario saves task, type, and output states', () => {
  assert.match(scenario, /taskTemplates\[/);
  assert.match(scenario, /getTypePrompt\(/);
  assert.match(scenario, /outputRules\[/);
  assert.match(scenario, /pc-app-prompt-editor-area/);
  assert.match(scenario, /pc-output-editor/);
  assert.match(scenario, /resetDefaults\(\)/);
});
