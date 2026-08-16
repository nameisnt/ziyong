/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  global: await readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
  type: await readFile(new URL('../../src/components/prompts/PromptTypeEditorPage.vue', import.meta.url), 'utf8'),
  output: await readFile(new URL('../../src/components/prompts/PromptOutputEditorPage.vue', import.meta.url), 'utf8'),
  app: await readFile(new URL('../../src/components/prompts/PromptAppEditorPage.vue', import.meta.url), 'utf8'),
  comfy: await readFile(new URL('../../src/apps/comfy/ComfyApp.vue', import.meta.url), 'utf8'),
  diary: await readFile(new URL('../../src/components/diary/DiaryEntryEditorPage.vue', import.meta.url), 'utf8'),
  letters: await readFile(new URL('../../src/components/letters/LettersEntryEditorPage.vue', import.meta.url), 'utf8'),
  entry: await readFile(new URL('../../src/apps/entry-library/pages/EntryLibraryItemEditorPage.vue', import.meta.url), 'utf8'),
  worldbook: await readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookEntryEditorPage.vue', import.meta.url), 'utf8'),
};

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function hasMinHeight(source, selector) {
  return rulesFor(source, selector).some(body => /min-height\s*:/.test(body));
}

test('ordinary long text editors share one explicit 260px area semantic', () => {
  const failures = [];
  if (!rulesFor(files.global, '.pc-phone-root .pc-area.pc-area-long').some(body => /min-height\s*:\s*260px/.test(body))) {
    failures.push('global long area does not define 260px');
  }
  const consumers = [
    ['type prompt', files.type, /v-model="draft\.prompt"[^>]*class="[^"]*pc-area-long/],
    ['output format', files.output, /v-model="draft\.outputFormat"[^>]*class="[^"]*pc-area-long/],
    ['app prompt', files.app, /v-model="draft"[^>]*class="[^"]*pc-area-long/],
    ['Comfy workflow JSON', files.comfy, /v-model="workflowJsonModel"[^>]*class="[^"]*pc-area-long/],
    ['diary content', files.diary, /v-model="content"[^>]*class="[^"]*pc-area-long/],
    ['letter content', files.letters, /v-model="content"[^>]*class="[^"]*pc-area-long/],
    ['entry content', files.entry, /v-model="content"[^>]*class="[^"]*pc-area-long/],
    ['worldbook content', files.worldbook, /v-model="content"[^>]*class="[^"]*pc-area-long/],
  ];
  for (const [label, source, pattern] of consumers) if (!pattern.test(source)) failures.push(`${label} does not use pc-area-long`);

  const localRules = [
    ['app prompt', files.app, '.pc-app-prompt-editor-area'],
    ['Comfy workflow JSON', files.comfy, '.pc-workflow-json-area'],
    ['diary content', files.diary, '.pc-diary-entry-content'],
    ['letter content', files.letters, '.pc-letters-entry-content'],
    ['entry content', files.entry, '.pc-entry-content-field .pc-area'],
    ['worldbook content', files.worldbook, '.pc-worldbook-content-field .pc-area'],
  ];
  for (const [label, source, selector] of localRules) if (hasMinHeight(source, selector)) failures.push(`${label} keeps a local min-height`);
  assert.deepEqual(failures, []);
});
