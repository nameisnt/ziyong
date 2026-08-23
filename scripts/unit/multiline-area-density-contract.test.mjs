/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  chatInsert: await readFile(new URL('../../src/apps/chat-insert/ChatInsertApp.vue', import.meta.url), 'utf8'),
  entryBindings: await readFile(
    new URL('../../src/apps/entry-library/pages/EntryLibraryBindingsPage.vue', import.meta.url),
    'utf8',
  ),
  extras: await readFile(new URL('../../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8'),
  forumThread: await readFile(new URL('../../src/apps/forum/ForumThreadGeneratePage.vue', import.meta.url), 'utf8'),
  generationPanel: await readFile(new URL('../../src/components/GenerationPanel.vue', import.meta.url), 'utf8'),
  generationSource: await readFile(new URL('../../src/components/GenerationSourceFields.vue', import.meta.url), 'utf8'),
  global: await readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
};

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function minHeightsFor(source, selector) {
  return rulesFor(source, selector).flatMap(body =>
    [...body.matchAll(/(?:^|;)\s*min-height\s*:\s*([^;{}]+)/g)].map(match => match[1].trim()),
  );
}

test('multiline template, requirement, range and summary areas share one explicit 120px density', () => {
  const failures = [];
  const sharedHeights = minHeightsFor(files.global, '.pc-phone-root .pc-area.pc-area-multiline');
  if (!sharedHeights.includes('120px')) failures.push('shared multiline textarea does not define min-height: 120px');

  const markupTargets = [
    ['chat insert template', files.chatInsert, /v-model="settings\.template"\s+class="pc-area pc-area-multiline"/],
    ['entry binding template', files.entryBindings, /v-model="contentTemplate"[\s\S]*?class="pc-area pc-area-multiline"/],
    ['extras chapter summary', files.extras, /v-model="chapterGenerationState\.preview\.summary"\s+class="pc-area pc-area-multiline"/],
    ['forum board prompt', files.forumThread, /v-model="draft\.boardTypePrompt"[\s\S]*?class="pc-area pc-area-multiline"/],
    ['generation requirement', files.generationPanel, /:value="userRequirement"[\s\S]*?class="pc-area pc-area-multiline"/],
    ['custom source range', files.generationSource, /:value="rangeText"[\s\S]*?class="pc-area pc-area-multiline"/],
  ];
  for (const [label, source, pattern] of markupTargets) {
    if (!pattern.test(source)) failures.push(`${label} does not use pc-area-multiline`);
  }

  const localTargets = [
    ['chat insert compact area', files.chatInsert, '.pc-area.compact'],
    ['entry binding area', files.entryBindings, '.pc-entry-binding-template .pc-area'],
    ['extras compact area', files.extras, '.pc-extras-app .pc-area.compact'],
    ['forum type area', files.forumThread, '.pc-forum-type-fields .pc-area'],
    ['generation panel compact area', files.generationPanel, '.pc-area.compact'],
    ['generation source compact area', files.generationSource, '.pc-area.compact'],
  ];
  for (const [label, source, selector] of localTargets) {
    const heights = minHeightsFor(source, selector);
    if (heights.length) failures.push(`${label} still overrides min-height with ${heights.join(', ')}`);
  }

  assert.deepEqual(failures, []);
});
