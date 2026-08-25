/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');
const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const phraseEditor = await readFile(
  new URL('../../src/apps/prompts/PromptPhraseEditorPage.vue', import.meta.url),
  'utf8',
);
const scenarios = await readFile(new URL('../../src/testing/visual/promptsScenarios.ts', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

test('quick phrases and format templates use the shared 120px multiline area', () => {
  const failures = [];
  if (!rulesFor(globalSource, '.pc-phone-root .pc-area.pc-area-multiline').some(body => /min-height\s*:\s*120px/.test(body))) {
    failures.push('shared multiline area does not define 120px');
  }
  if (!/class="pc-area pc-area-multiline"/.test(phraseEditor) || /class="pc-area compact"/.test(phraseEditor)) {
    failures.push('PromptPhraseEditor does not use the multiline area for both modes');
  }

  if (!catalog.includes("'prompts-template-editor'")) failures.push('template editor visual scenario is not cataloged');
  if (!/name === 'prompts-template-editor'/.test(scenarios) || !scenarios.includes('输入格式模板')) {
    failures.push('template editor visual scenario does not expose the template mode');
  }

  assert.deepEqual(failures, []);
});
