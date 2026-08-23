/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [previewPanel, forumScenario, visualRunner] = await Promise.all([
  readFile(new URL('../../src/components/GenerationPreviewPanel.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/forumGenerationScenarios.ts', import.meta.url), 'utf8'),
  readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8'),
]);

test('forum preview visual contracts select the current compact raw tab label', () => {
  assert.match(previewPanel, /t`原文`/u);
  assert.match(forumScenario, /textContent\?\.includes\('原文'\)/u);
  assert.match(visualRunner, /getByRole\('tab', \{ name: '原文', exact: true \}\)/u);
  assert.doesNotMatch(forumScenario, /textContent\?\.includes\('原始输出'\)/u);
  assert.doesNotMatch(visualRunner, /getByRole\('tab', \{ name: '原始输出', exact: true \}\)/u);
});
