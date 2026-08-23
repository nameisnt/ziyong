/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const storeSource = await readMaybe(new URL('../../src/store/prompts.ts', import.meta.url));
const theaterSource = await readMaybe(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url));
const promptsSource = await readMaybe(new URL('../../src/components/PromptsApp.vue', import.meta.url));
const editorSource = await readMaybe(new URL('../../src/components/prompts/PromptTypeEditorPage.vue', import.meta.url));
const groupFieldSource = await readMaybe(
  new URL('../../src/components/prompts/TheaterTypeGroupField.vue', import.meta.url),
);
const catalogSource = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const theaterScenarioSource = await readMaybe(new URL('../../src/testing/visual/theaterScenarios.ts', import.meta.url));
const promptsScenarioSource = await readMaybe(new URL('../../src/testing/visual/promptsScenarios.ts', import.meta.url));

test('prompt store exposes one domain-scoped batch group mutation without editing prompt bodies', () => {
  const start = storeSource.indexOf('function moveTypePromptsToGroup(');
  const end = storeSource.indexOf('\n  function ', start + 1);
  const source = storeSource.slice(start, end);

  assert.ok(start >= 0, 'missing moveTypePromptsToGroup mutation');
  assert.match(source, /domain:\s*string/u);
  assert.match(source, /promptIds:\s*string\[\]/u);
  assert.match(source, /data\.value\.typePrompts\s*=\s*data\.value\.typePrompts\.map/u);
  assert.match(source, /item\.domain\s*!==\s*domain/u);
  assert.match(source, /\.\.\.item,\s*groupId:/u);
  assert.doesNotMatch(source, /item\.prompt\s*=/u);
  assert.doesNotMatch(source, /deleteTypePrompt/u);
  assert.match(storeSource, /moveTypePromptsToGroup,/u);
});

test('theater generation and prompt editor reuse one group field while existing types stay read-only', () => {
  assert.match(groupFieldSource, /SearchableCombobox/u);
  assert.match(groupFieldSource, /createTypePromptGroup\('theater'/u);
  assert.match(editorSource, /TheaterTypeGroupField/u);
  assert.match(theaterSource, /TheaterTypeGroupField/u);
  assert.match(theaterSource, /v-model="generationDraft\.typeGroupId"/u);
  assert.match(theaterSource, /selectedGenerationTypeGroupName/u);
  assert.match(theaterSource, /readonly/u);
});

test('prompt type organizer supports explicit multi-select and one batch move only', () => {
  assert.match(promptsSource, /typeOrganizeMode/u);
  assert.match(promptsSource, /selectedTypePromptIds/u);
  assert.match(promptsSource, /toggleTypePromptSelection/u);
  assert.match(promptsSource, /selectTypePromptGroup/u);
  assert.match(promptsSource, /moveTypePromptsToGroup\(\s*'theater'/u);
  assert.doesNotMatch(promptsSource, /batchDeleteType/u);
  assert.doesNotMatch(promptsSource, /batch.*prompt\s*=/iu);
});

test('theater type grouping has isolated generation and batch browser scenarios', () => {
  assert.match(catalogSource, /theater-type-group/u);
  assert.match(catalogSource, /prompts-type-group-batch/u);
  assert.match(theaterScenarioSource, /name === 'theater-type-group'/u);
  assert.match(promptsScenarioSource, /name === 'prompts-type-group-batch'/u);
});
