/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const extrasSource = await readFile(
  new URL('../../src/components/extras/ExtrasChapterGeneratePage.vue', import.meta.url),
  'utf8',
);
const promptsSource = await readFile(
  new URL('../../src/components/prompts/PromptTypeEditorPage.vue', import.meta.url),
  'utf8',
);
const storylinesSource = await readFile(
  new URL('../../src/apps/storylines/StorylineEditorPage.vue', import.meta.url),
  'utf8',
);

function openingTags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[\\s\\S]*?>`, 'g'))].map(match => match[0]);
}

test('user-grown regex, group and storyline resources use searchable selectors with preserved empty semantics', () => {
  const failures = [];
  const targets = [
    { binding: 'chapterDraft.summaryRuleId', count: 1, source: extrasSource },
    { binding: 'draft.groupId', count: 1, source: promptsSource },
    { binding: 'draft.lineId', count: 2, source: storylinesSource },
  ];

  for (const target of targets) {
    const nativeTargets = openingTags(target.source, 'select').filter(tag => tag.includes(`v-model="${target.binding}"`));
    const searchableTargets = openingTags(target.source, 'SearchableCombobox').filter(tag =>
      tag.includes(`v-model="${target.binding}"`),
    );
    if (nativeTargets.length) failures.push(`${target.binding} still uses ${nativeTargets.length} native select(s)`);
    if (searchableTargets.length !== target.count) {
      failures.push(`${target.binding} expected ${target.count} searchable selector(s), found ${searchableTargets.length}`);
    }
  }

  for (const [source, label] of [
    [promptsSource, 'prompt type editor'],
    [storylinesSource, 'storyline editor'],
  ]) {
    if (!source.includes("import SearchableCombobox from '@/components/SearchableCombobox.vue';")) {
      failures.push(`${label} does not import SearchableCombobox`);
    }
  }

  for (const evidence of [
    'summaryRuleSelectOptions',
    "label: '仅识别结构化 summary 字段', value: ''",
    ':disabled="generationState.running"',
    'theaterGroupOptions',
    "label: '未分组', value: ''",
    'hookLineOptions',
    "label: '不绑定剧情线', value: ''",
    ':options="lineOptions"',
  ]) {
    if (!`${extrasSource}\n${promptsSource}\n${storylinesSource}`.includes(evidence)) {
      failures.push(`dynamic selector semantics missing: ${evidence}`);
    }
  }

  assert.deepEqual(failures, []);
});
