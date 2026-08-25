/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sources = Object.fromEntries(
  await Promise.all(
    [
      ['creation', '../../src/components/CreationModeModal.vue'],
      ['preview', '../../src/components/GenerationPreviewPanel.vue'],
      ['prompts', '../../src/apps/prompts/PromptsApp.vue'],
    ].map(async ([key, path]) => [key, await readFile(new URL(path, import.meta.url), 'utf8')]),
  ),
);
const contentBookScenarios = await readFile(
  new URL('../../src/testing/visual/contentBookScenarios.ts', import.meta.url),
  'utf8',
);
const interactionContracts = await readFile(new URL('../ui-interaction-contracts.mjs', import.meta.url), 'utf8');
const runnerSource = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

test('simple dialogs share modal focus, keyboard, phone-back and scroll-lock lifecycle', () => {
  const failures = [];
  for (const [key, source] of Object.entries(sources)) {
    if (!source.includes("from '@/composables/usePhoneModalLifecycle'")) {
      failures.push(`${key} does not import the shared modal lifecycle`);
    }
  }

  for (const evidence of ['ref="dialogRef"', 'tabindex="-1"', 'usePhoneModalLifecycle({']) {
    if (!sources.creation.includes(evidence)) failures.push(`CreationModeModal missing: ${evidence}`);
  }
  if (sources.creation.includes('useEventListener(window')) {
    failures.push('CreationModeModal still owns duplicate keyboard or phone-back listeners');
  }

  for (const evidence of ['ref="parseNoticeDialogRef"', 'tabindex="-1"', 'usePhoneModalLifecycle({']) {
    if (!sources.preview.includes(evidence)) failures.push(`GenerationPreviewPanel parse notice missing: ${evidence}`);
  }

  for (const evidence of [
    'ref="appPromptDialogRef"',
    'ref="typePromptDialogRef"',
    'tabindex="-1"',
    'dialogRef: appPromptDialogRef',
    'dialogRef: typePromptDialogRef',
  ]) {
    if (!sources.prompts.includes(evidence)) failures.push(`PromptsApp simple dialogs missing: ${evidence}`);
  }
  if ((sources.prompts.match(/usePhoneModalLifecycle\(\{/g) ?? []).length !== 2) {
    failures.push('PromptsApp does not register exactly two shared dialog lifecycles');
  }

  const diaryScenario = contentBookScenarios.slice(
    contentBookScenarios.indexOf("name === 'diary-creation-mode'"),
    contentBookScenarios.indexOf("name === 'diary-book'"),
  );
  if (!diaryScenario.includes("resetPhoneToRoute('diary', 'root'")) failures.push('diary modal fixture does not start at root');
  if (!diaryScenario.includes(".pc-diary-catalog-page .pc-book-item") || !diaryScenario.includes('.click()')) {
    failures.push('diary modal fixture does not use the real create action');
  }

  for (const scenario of ['diary-creation-mode']) {
    if (!interactionContracts.includes(`scenario: '${scenario}'`)) {
      failures.push(`${scenario} is not registered as a formal interaction contract`);
    }
    if (!runnerSource.includes(`scenario === '${scenario}'`)) {
      failures.push(`${scenario} has no formal lifecycle interaction assertions`);
    }
  }
  for (const evidence of [
    "page.keyboard.press('Escape')",
    "new Event('phone-before-back'",
    'document.activeElement',
    "style.overflow)) !== 'hidden'",
  ]) {
    if (!runnerSource.includes(evidence)) failures.push(`simple modal interaction evidence missing: ${evidence}`);
  }

  assert.deepEqual(failures, []);
});
