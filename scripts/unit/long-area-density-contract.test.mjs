/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  global: await readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
  type: await readFile(new URL('../../src/apps/prompts/PromptTypeEditorPage.vue', import.meta.url), 'utf8'),
  output: await readFile(new URL('../../src/apps/prompts/PromptOutputEditorPage.vue', import.meta.url), 'utf8'),
  app: await readFile(new URL('../../src/apps/prompts/PromptAppEditorPage.vue', import.meta.url), 'utf8'),
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
  if (
    !rulesFor(files.global, '.pc-phone-root .pc-area.pc-area-long').some(body => /min-height\s*:\s*260px/.test(body))
  ) {
    failures.push('global long area does not define 260px');
  }
  const consumers = [
    ['type prompt', files.type, /v-model="draft\.prompt"[^>]*class="[^"]*pc-area-long/],
    ['output format', files.output, /v-model="draft\.outputFormat"[^>]*class="[^"]*pc-area-long/],
    ['app prompt', files.app, /v-model="draft"[^>]*class="[^"]*pc-area-long/],
  ];
  for (const [label, source, pattern] of consumers)
    if (!pattern.test(source)) failures.push(`${label} does not use pc-area-long`);

  const localRules = [['app prompt', files.app, '.pc-app-prompt-editor-area']];
  for (const [label, source, selector] of localRules)
    if (hasMinHeight(source, selector)) failures.push(`${label} keeps a local min-height`);
  assert.deepEqual(failures, []);
});
