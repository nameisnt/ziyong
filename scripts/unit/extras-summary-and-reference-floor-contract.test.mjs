/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bookEditor = await readFile(new URL('../../src/apps/extras/ExtrasBookEditorPage.vue', import.meta.url), 'utf8');
const chapterGenerate = await readFile(
  new URL('../../src/apps/extras/ExtrasChapterGeneratePage.vue', import.meta.url),
  'utf8',
);
const summaryOptions = await readFile(
  new URL('../../src/components/ExtrasSummaryOptions.vue', import.meta.url),
  'utf8',
);
const overview = await readFile(new URL('../../src/apps/extras/ExtrasBookOverviewPage.vue', import.meta.url), 'utf8');
const extrasApp = await readFile(new URL('../../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8');
const extrasStore = await readFile(new URL('../../src/store/extras.ts', import.meta.url), 'utf8');
const extraType = await readFile(new URL('../../src/type/extra.ts', import.meta.url), 'utf8');
const generationPanel = await readFile(
  new URL('../../src/components/GenerationPanel.vue', import.meta.url),
  'utf8',
);
const referencePicker = await readFile(
  new URL('../../src/components/ReferencePicker.vue', import.meta.url),
  'utf8',
);

test('the new extras book page offers the summary block and the shared mode dropdown', () => {
  const failures = [];
  if (/<select\b/.test(bookEditor)) failures.push('the generation mode must not render a native select');
  const comboboxTag = bookEditor.match(/<SearchableCombobox\b[^>]*modeOptions[^>]*>/s)?.[0] ?? '';
  if (!comboboxTag) failures.push('the generation mode must use the shared combobox');
  if (!/:searchable="false"/.test(comboboxTag)) failures.push('the mode dropdown must be option-only');
  if (!/@update:model-value="onModeChange"/.test(comboboxTag)) failures.push('mode picks must be forwarded');
  if (!/<ExtrasSummaryOptions\b/.test(bookEditor)) failures.push('the new book page must render the summary block');
  if (!/:summary-rule-options="summaryRuleOptions"/.test(bookEditor))
    failures.push('the summary block needs the extract-rule options');
  assert.deepEqual(failures, []);
});

test('both extras pages share one summary block instead of duplicating it', () => {
  const failures = [];
  if (!/<ExtrasSummaryOptions\b/.test(chapterGenerate))
    failures.push('the chapter page must reuse the shared summary block');
  if (/pc-extras-summary-options/.test(chapterGenerate))
    failures.push('the chapter page must not keep its own copy of the summary markup');
  for (const model of ['parseSummary', 'removeSummaryBlock', 'summaryFormatHint', 'summaryRuleId']) {
    if (!new RegExp(`defineModel<[^>]*>\\('${model}'`).test(summaryOptions))
      failures.push(`the shared summary block must model ${model}`);
  }
  if (!/:disabled="disabled"/.test(summaryOptions)) failures.push('the shared summary block must respect running state');
  assert.deepEqual(failures, []);
});

test('the book overview page decides how many recent chapters stay raw while generating', () => {
  const failures = [];
  if (!/summarySkipRecentChapters: z\.number\(\)\.int\(\)\.min\(0\)\.default\(0\)/.test(extraType))
    failures.push('ExtraBook must persist summarySkipRecentChapters');
  if (!/function setSummarySkipRecentChapters\(/.test(extrasStore))
    failures.push('the extras store needs a setter for the raw chapter count');
  if (!/const max = book\.chapters\.length;/.test(extrasStore))
    failures.push('the raw chapter count must be clamped against the chapters');
  if (!/Math\.min\(\(?Math\.max\(0, Math\.trunc\(count\)\)\), max\)/.test(extrasStore) && !/Math\.min\(Math\.max\(0, Math\.trunc\(count\)\), max\)/.test(extrasStore))
    failures.push('the stored count must stay inside 0..chapters');
  if (!/emit\('setSummarySkipRecent'/.test(overview)) failures.push('the overview page must emit the raw chapter count');
  if (!/:disabled="!book\.chapters\.length"/.test(overview)) failures.push('the count input must disable without chapters');
  if (/pickAutoCoveredChapterIds/.test(extrasApp))
    failures.push('the summary page must not preselect chapters from this setting anymore');
  if (!/rawRecentChapters: book\.summarySkipRecentChapters \?\? 0/.test(extrasApp))
    failures.push('chapter generation must hand the raw chapter count to the history builder');
  if (!/@set-summary-skip-recent="setSummarySkipRecent"/.test(extrasApp))
    failures.push('the app must persist the raw chapter count coming from the overview page');
  assert.deepEqual(failures, []);
});

test('summaries stop at the recent chapters that are written out in full', async () => {
  const { buildExtraHistoryContext } = await import('../../src/util/extrasSummary.ts');
  const chapters = [1, 2, 3, 4, 5].map(number => ({
    id: `ch-${number}`,
    chapterNumber: number,
    title: `第 ${number} 章`,
    content: `正文${number}`,
  }));
  const summary = (id, ids, updatedAt) => ({
    id,
    enabled: true,
    content: `总结${id}`,
    coveredChapterIds: ids.map(number => `ch-${number}`),
    updatedAt,
  });
  const book = {
    chapters,
    summaries: [
      summary('s1', [1, 2], '2026-01-01'),
      summary('s2', [3, 4], '2026-01-02'),
      summary('s3', [5], '2026-01-03'),
    ],
  };
  const failures = [];
  const allSummarized = buildExtraHistoryContext(book, chapters);
  if (!allSummarized.includes('总结s1') || !allSummarized.includes('总结s2') || !allSummarized.includes('总结s3'))
    failures.push('without a raw window every summary may replace its chapters');

  const rawTwo = buildExtraHistoryContext(book, chapters, { rawRecentChapters: 2 });
  if (!rawTwo.includes('正文4') || !rawTwo.includes('正文5'))
    failures.push('the last two chapters must keep their original text');
  if (rawTwo.includes('总结s2') || rawTwo.includes('总结s3'))
    failures.push('a summary touching the raw window must be dropped as a whole');
  if (!rawTwo.includes('总结s1')) failures.push('summaries older than the raw window still apply');
  if (rawTwo.includes('正文1') || rawTwo.includes('正文2'))
    failures.push('chapters covered by an older summary must not be repeated as raw text');

  const rawEverything = buildExtraHistoryContext(book, chapters, { rawRecentChapters: 5 });
  if (rawEverything.includes('总结')) failures.push('asking for every chapter raw must drop all summaries');

  assert.deepEqual(failures, []);
});

test('the reference list ends with the generation floor of this request', async () => {
  const { buildReferenceFloorLabel } = await import('../../src/util/generationSource.ts');
  const failures = [];
  if (!/:floor-label="referenceFloorLabel"/.test(generationPanel))
    failures.push('the panel must pass the generation floor to the reference list');
  if (!/buildReferenceFloorLabel\(\{/.test(generationPanel))
    failures.push('the panel must reuse the shared floor formatter');
  if (!/onTavernEvent\('CHAT_CHANGED', refreshLastMessageId\)/.test(generationPanel))
    failures.push('the floor of latest/all modes must refresh when the chat changes');
  if (!/floorLabel\?: string;/.test(referencePicker)) failures.push('the picker needs an optional floor label');
  if (
    !/<span\s+v-if="floorLabel && item\.id === modelValue\[modelValue\.length - 1\]\?\.id"\s+class="pc-reference-floor"/.test(
      referencePicker,
    )
  )
    failures.push('the floor must sit at the right side of the last selected reference');
  if (!/function floorBadge\(/.test(referencePicker)) failures.push('the tree rows must show the floor number');
  if (!/\.pc-reference-node\.leaf \{\n\s+grid-template-columns: auto minmax\(0, 1fr\) auto;/.test(referencePicker))
    failures.push('the floor number needs its own trailing column');
  if (!/\.pc-reference-node-floor \{/.test(referencePicker))
    failures.push('the floor number must reuse the muted text style');

  const cases = [
    [{ mode: 'none', lastMessageId: 40 }, ''],
    [{ mode: 'latest', lastMessageId: 40 }, '生成楼层：第 40 楼'],
    [{ mode: 'all', lastMessageId: 40 }, '生成楼层：第 40 楼'],
    [{ mode: 'recent', lastMessageId: 40 }, '生成楼层：第 40 楼'],
    [{ mode: 'single', singleMessageId: 7, lastMessageId: 40 }, '生成楼层：第 7 楼'],
    [{ mode: 'single', singleMessageId: 0, lastMessageId: 40 }, '生成楼层：第 0 楼'],
    [{ mode: 'fromStart', fromStartEnd: 12, lastMessageId: 40 }, '生成楼层：第 12 楼'],
    [{ mode: 'range', rangeText: '12-20, 24, 30-32', lastMessageId: 40 }, '生成楼层：第 32 楼'],
    [{ mode: 'range', rangeText: '', lastMessageId: 40 }, ''],
  ];
  for (const [input, expected] of cases) {
    const actual = buildReferenceFloorLabel(input);
    if (actual !== expected) failures.push(`${input.mode}: expected "${expected}", got "${actual}"`);
  }
  assert.deepEqual(failures, []);
});
