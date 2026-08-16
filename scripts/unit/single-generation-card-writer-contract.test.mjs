/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../../src/apps/card-writer/CardWriterApp.vue', import.meta.url),
  'utf8',
);
const session = await readFile(
  new URL('../../src/composables/useSingleGenerationTaskSession.ts', import.meta.url),
  'utf8',
);

test('GEN02F card writer owns one persistent sequence task across all ordered stages', () => {
  assert.match(source, /useSingleGenerationTaskSession/);
  assert.match(source, /actionId:\s*'generate-sequence'/);
  assert.match(source, /generationSession\.create\(/);
  assert.match(source, /runStageSequence\([^)]*task\.id/);
  assert.match(source, /lifecycle:\s*generationSession\.lifecycle\(taskId\)/);
  assert.match(source, /generationSession\.complete\(task\.id,/);
});

test('GEN02F card writer persists repairable stage previews and never stops on unmount', () => {
  assert.match(source, /usePreviewDraftStore/);
  assert.match(source, /persistWriterPreviewDraft/);
  assert.match(source, /restoreWriterPreviewDraft/);
  assert.doesNotMatch(source, /stopGenerationByIdSafe/);
  assert.doesNotMatch(source, /onBeforeUnmount\(stopWriter\)/);
  assert.doesNotMatch(source, /activeGenerationId\s*=\s*ref/);
});

test('shared single session can replace stage raw with the aggregate sequence output', () => {
  assert.match(session, /function setRawOutput\(/);
  assert.match(source, /generationSession\.setRawOutput\(preview\.raw/);
});
