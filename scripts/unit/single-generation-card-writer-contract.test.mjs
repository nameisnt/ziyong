/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSourceFile, isFunctionDeclaration, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/apps/card-writer/CardWriterApp.vue', import.meta.url), 'utf8');
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

test('writer locks before material loading, rejects repeat clicks and stops before requesting AI', async () => {
  const script = source.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1];
  const ast = createSourceFile('writer.ts', script, ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => isFunctionDeclaration(node) && node.name?.text === 'runWriter');
  const code = transpileModule(fn.getText(ast), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
  for (const outcome of ['success', 'failure', 'stop']) {
    let resolveLoad, rejectLoad;
    const loading = new Promise((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
    const running = { value: false };
    const task = { value: null };
    let creates = 0,
      requests = 0;
    const failed = [];
    const context = {
      running,
      generateDisabled: { value: false },
      generationFormError: { value: '' },
      activeDocumentId: { value: '' },
      beginWriterPreviewDraft() {},
      selectedTask: { value: { id: 'persona', label: 'Persona' } },
      selectedStages: { value: [{ id: 'one', label: 'One' }] },
      activeStageDefinitions: { value: [] },
      stageStates: { value: [] },
      activePreviewStageId: { value: '' },
      currentChatScopeKey: { value: 'scope' },
      getCurrentChatScopeKey: () => 'scope',
      getCurrentOwnerLabel: () => 'Owner',
      getSelectedChatMessages: () => ({ messages: [], sourceLabel: 'Source' }),
      buildWorldbookText: () => loading,
      preview: {},
      includeWorldbook: { value: true },
      targetWorldbookName: { value: '' },
      persistWriterPreviewDraft() {},
      phone: { presentGeneratedPage() {} },
      runStageSequence: async () => {
        requests++;
        return true;
      },
      generationSession: {
        task,
        create() {
          creates++;
          running.value = true;
          return (task.value = { id: 'own-task' });
        },
        complete() {
          running.value = false;
        },
        fail(id) {
          failed.push(id);
          running.value = false;
        },
      },
    };
    const run = runInNewContext(`${code}; runWriter`, context);
    const first = run();
    assert.equal(running.value, true);
    await run();
    assert.equal(creates, 1);
    assert.equal(requests, 0);
    if (outcome === 'stop') running.value = false;
    if (outcome === 'failure') {
      task.value = { id: 'another-task' };
      rejectLoad(new Error('Material failure'));
    } else resolveLoad('Worldbook');
    await first;
    assert.equal(requests, outcome === 'success' ? 1 : 0);
    assert.deepEqual(failed, outcome === 'failure' ? ['own-task'] : []);
  }
});
