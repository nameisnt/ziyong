/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const chatSource = await readFile(new URL('../../src/apps/chat-insert/ChatInsertApp.vue', import.meta.url), 'utf8');
const extrasSource = await readFile(new URL('../../src/components/extras/ExtrasBookEditorPage.vue', import.meta.url), 'utf8');

test('fixed short enum selects use pc-select without changing their behavior bindings', async () => {
  const failures = [];
  const targets = [
    { binding: 'v-model="settings.mode"', source: chatSource },
    { binding: 'v-model="settings.role"', source: chatSource },
    { binding: 'v-model="chapterDraft.mode"', source: extrasSource },
  ];

  for (const target of targets) {
    const select = target.source.match(new RegExp(`<select(?=[^>]*${target.binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})[^>]*>`))?.[0] || '';
    if (!select) {
      failures.push(`missing fixed select: ${target.binding}`);
      continue;
    }
    if (!/class="[^"]*\bpc-select\b[^"]*"/.test(select)) failures.push(`${target.binding} does not use pc-select`);
    if (!/class="[^"]*\bpc-select-compact\b[^"]*"/.test(select)) {
      failures.push(`${target.binding} does not use the content-width short-enum semantic`);
    }
    if (/class="[^"]*\bpc-field\b[^"]*"/.test(select)) failures.push(`${target.binding} still uses pc-field`);
  }

  const globalCss = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
  assert.match(globalCss, /\.pc-phone-root \.pc-select\.pc-select-compact\s*\{[^}]*width:\s*fit-content;/su);
  assert.match(globalCss, /\.pc-phone-root \.pc-select\.pc-select-compact\s*\{[^}]*max-width:\s*100%;/su);

  for (const behavior of [
    'settings.mode.startsWith(\'append\')',
    ':disabled="generationState.running"',
    'value="new-end"',
    'value="assistant"',
    'value="新开一本书"',
  ]) {
    if (!`${chatSource}\n${extrasSource}`.includes(behavior)) failures.push(`fixed select behavior changed: ${behavior}`);
  }

  assert.deepEqual(failures, []);
});
