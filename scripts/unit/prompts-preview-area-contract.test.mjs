/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalSource = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const outputEditor = await readFile(new URL('../../src/components/prompts/PromptOutputEditorPage.vue', import.meta.url), 'utf8');
const scenarios = await readFile(new URL('../../src/testing/visual/promptsScenarios.ts', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function hasDeclaration(source, selector, pattern) {
  return rulesFor(source, selector).some(body => pattern.test(body));
}

test('prompt parser sample uses the explicit shared 160px preview area', () => {
  const failures = [];
  if (!hasDeclaration(globalSource, '.pc-phone-root .pc-area.pc-area-preview', /min-height\s*:\s*160px/)) {
    failures.push('shared preview/test area does not define min-height: 160px');
  }
  if (!/v-model="draft\.sample"\s+class="pc-area pc-area-preview"/.test(outputEditor)) {
    failures.push('parser sample still uses compact instead of pc-area-preview');
  }
  if (!scenarios.includes('Prompt output editor did not reveal its parser test sample') ||
      !scenarios.includes("style.display = 'none'")) {
    failures.push('output editor visual scenario does not expose the parser sample');
  }

  assert.deepEqual(failures, []);
});
