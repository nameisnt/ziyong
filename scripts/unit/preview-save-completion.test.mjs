/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

async function transpile(relativePath) {
  const source = await readFile(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
}

const { completePreviewSave } = await import(
  `data:text/javascript;base64,${Buffer.from(await transpile('../../src/util/previewSave.ts')).toString('base64')}`
);

test('preview save drops the failed draft, clears the draft, closes, notifies, then navigates', () => {
  const calls = [];
  completePreviewSave({
    clearDraft: () => calls.push('clear'),
    closePreview: () => calls.push('close'),
    deleteFailedDraft: id => calls.push(`draft:${id}`),
    draftId: 'draft-1',
    navigate: () => calls.push('navigate'),
    notify: message => calls.push(`notify:${message}`),
    successMessage: 'saved',
  });
  assert.deepEqual(calls, ['draft:draft-1', 'clear', 'close', 'notify:saved', 'navigate']);
});

test('preview save skips failed draft cleanup when the preview was not recovered', () => {
  const calls = [];
  completePreviewSave({
    clearDraft: () => calls.push('clear'),
    closePreview: () => calls.push('close'),
    deleteFailedDraft: () => calls.push('draft'),
    draftId: null,
    navigate: () => calls.push('navigate'),
    notify: () => calls.push('notify'),
    successMessage: 'saved',
  });
  assert.deepEqual(calls, ['clear', 'close', 'notify', 'navigate']);
});

test('the save tail stays shared by every previewed writing app', async () => {
  const files = [
    'src/apps/diary/DiaryApp.vue',
    'src/apps/letters/LettersApp.vue',
    'src/apps/theater/TheaterApp.vue',
    'src/apps/extras/useExtrasChapterPreviewSession.ts',
    'src/apps/forum/useForumPreviewSession.ts',
  ];
  for (const file of files) {
    const content = await readFile(fileURLToPath(new URL(`../../${file}`, import.meta.url)), 'utf8');
    assert.match(content, /completePreviewSave\(/u, `${file} should use the shared save tail`);
    assert.doesNotMatch(
      content,
      /deleteFailedDraft\(preview\.draftId\);\s*\n\s*(?:options\.)?clear\w*PreviewDraft\(\);/u,
      `${file} should not hand-roll the save tail`,
    );
  }
});
