/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/GenerationPreviewPanel.vue', import.meta.url), 'utf8');

test('generation preview keeps view switching beside edit actions instead of a standalone row', () => {
  assert.match(
    source,
    /<div class="pc-preview-toolbar">[\s\S]*?<div class="pc-preview-toolbar-actions">[\s\S]*?pc-preview-mode-switch[\s\S]*?editingContent/su,
  );
  assert.doesNotMatch(source, /<\/header>\s*<div class="pc-preview-mode-switch pc-segment"/u);
});

test('generation preview uses one shrinkable flex column without implicit grid rows', () => {
  assert.match(source, /\.pc-generation-preview\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/u);
  assert.doesNotMatch(source, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/u);
  assert.match(source, /\.pc-preview-panel[\s\S]*?flex:\s*1 1 auto;/u);
});

test('generation preview relies on the selected mode button instead of a duplicated view label', () => {
  assert.doesNotMatch(source, /<strong>\{\{ activeViewLabel \}\}<\/strong>/u);
  assert.doesNotMatch(source, /const activeViewLabel = computed/u);
  assert.match(source, /:aria-selected="activeView === 'preview'"/u);
  assert.match(source, /:aria-selected="activeView === 'raw'"/u);
});
