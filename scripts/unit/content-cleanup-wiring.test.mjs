/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('generated versions freeze the preset cleanup rules', async () => {
  for (const path of [
    'src/store/diary.ts',
    'src/store/extras.ts',
    'src/store/forum.ts',
    'src/store/letters.ts',
    'src/store/theater.ts',
  ]) {
    const source = await read(path);
    assert.match(source, /cleanup: input\.cleanup \?\? captureContentCleanupSnapshot\(\),/u, path);
    assert.match(source, /from '@\/util\/contentCleanup'/u, path);
  }
});

test('the reader applies the frozen cleanup before the display rules', async () => {
  const source = await read('src/components/ReaderDetailShell.vue');
  assert.match(source, /const cleanupResult = computed\(\(\) => applyContentCleanup\(props\.content, props\.cleanupSnapshot, cleanupEnabled\.value\)\)/u);
  assert.match(source, /applyRegexDisplayRules\(cleanupResult\.value\.content, displayRules\.value\)/u);
  assert.match(source, /regexDisplay\.setCleanupEnabled\(regexUsageKey\.value, !cleanupEnabled\.value\)/u);
  assert.match(source, /正文清理：开/u);
  for (const path of [
    'src/apps/diary/DiaryEntryDetailPage.vue',
    'src/apps/extras/ExtrasChapterDetailPage.vue',
    'src/apps/forum/ForumThreadDetailPage.vue',
    'src/apps/letters/LettersEntryDetailPage.vue',
    'src/apps/theater/TheaterEntryDetailPage.vue',
  ]) {
    const page = await read(path);
    assert.match(page, /:cleanup-snapshot="cleanupSnapshot"/u, path);
  }
});

test('references hide entries that the cleanup empties', async () => {
  const picker = await read('src/components/ReferencePicker.vue');
  assert.match(picker, /function pruneReferenceTree\(nodes: PhoneReferenceTreeNode\[\]\): PhoneReferenceTreeNode\[\]/u);
  assert.match(picker, /if \(referenceHasContent\(node\.item\)\) pruned\.push\(node\);/u);
  assert.match(picker, /const children = pruneReferenceTree\(node\.children\);/u);
  assert.match(picker, /pruneReferenceTree\(referenceCatalog\.value\.nodes\)/u);
  const references = await read('src/util/references.ts');
  assert.match(references, /\.filter\(referenceHasContent\)/u);
  const builtin = await read('src/apps/builtinReferences.ts');
  assert.ok((builtin.match(/cleanup: activeCleanup\(/gu) || []).length >= 5);
});
