/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/GenerationPreviewPanel.vue', import.meta.url), 'utf8');

test('generation preview keeps view switching separate from its save action', () => {
  assert.match(source, /class="pc-preview-mode-switch pc-segment"/u);
  assert.match(source, /role="tablist"/u);
  assert.match(source, /class="pc-preview-actions single"/u);
  assert.doesNotMatch(source, /pc-preview-actions" :class="\{ two: !scanEnabled \}"/u);
});
