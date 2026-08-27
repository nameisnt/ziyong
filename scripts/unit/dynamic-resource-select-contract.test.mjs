/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const extrasSource = await readFile(
  new URL('../../src/apps/extras/ExtrasChapterGeneratePage.vue', import.meta.url),
  'utf8',
);
const promptsSource = await readFile(
  new URL('../../src/apps/prompts/PromptTypeEditorPage.vue', import.meta.url),
  'utf8',
);
const theaterGroupFieldSource = await readFile(
  new URL('../../src/components/prompts/TheaterTypeGroupField.vue', import.meta.url),
  'utf8',
);
function openingTags(source, tagName) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[\\s\\S]*?>`, 'g'))].map(match => match[0]);
}

test('user-grown regex and group resources use searchable selectors with preserved empty semantics', () => {
  const failures = [];
  const targets = [
    { binding: 'chapterDraft.summaryRuleId', count: 1, source: extrasSource },
    { binding: 'groupId', count: 1, source: theaterGroupFieldSource },
  ];

  for (const target of targets) {
    const nativeTargets = openingTags(target.source, 'select').filter(tag =>
      tag.includes(`v-model="${target.binding}"`),
    );
    const searchableTargets = openingTags(target.source, 'SearchableCombobox').filter(tag =>
      tag.includes(`v-model="${target.binding}"`),
    );
    if (nativeTargets.length) failures.push(`${target.binding} still uses ${nativeTargets.length} native select(s)`);
    if (searchableTargets.length !== target.count) {
      failures.push(
        `${target.binding} expected ${target.count} searchable selector(s), found ${searchableTargets.length}`,
      );
    }
  }

  for (const [source, label] of [[theaterGroupFieldSource, 'shared Theater group field']]) {
    if (!source.includes("import SearchableCombobox from '@/components/SearchableCombobox.vue';")) {
      failures.push(`${label} does not import SearchableCombobox`);
    }
  }

  for (const evidence of [
    'summaryRuleSelectOptions',
    "label: '仅识别结构化 summary 字段', value: ''",
    ':disabled="generationState.running"',
    'groupOptions',
    "label: '未分组', value: ''",
  ]) {
    if (!`${extrasSource}\n${promptsSource}\n${theaterGroupFieldSource}`.includes(evidence)) {
      failures.push(`dynamic selector semantics missing: ${evidence}`);
    }
  }

  assert.deepEqual(failures, []);
});
