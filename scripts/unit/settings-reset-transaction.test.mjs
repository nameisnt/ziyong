/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadResetTransaction() {
  const source = await readFile(new URL('../../src/util/settingsResetTransaction.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'settingsResetTransaction.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { executePhoneAppResetTransaction } = await loadResetTransaction();

test('phone app resets run sequentially and persist only after every handler succeeds', async () => {
  const calls = [];
  await executePhoneAppResetTransaction({
    captureSnapshot: () => ({ before: true }),
    handlers: [
      async () => calls.push('reset-a'),
      async () => calls.push('reset-b'),
    ],
    persist: async () => calls.push('persist'),
    rehydrate: () => calls.push('rehydrate'),
    restoreSnapshot: () => calls.push('restore'),
  });

  assert.deepEqual(calls, ['reset-a', 'reset-b', 'persist']);
});

test('a failed reset compensates external effects in reverse order before restoring settings', async () => {
  const calls = [];
  const failure = new Error('reset failed');

  await assert.rejects(
    executePhoneAppResetTransaction({
      captureSnapshot: () => ({ before: true }),
      handlers: [
        async context => {
          calls.push('reset-a');
          context.addRollback(async () => calls.push('rollback-a'));
        },
        async context => {
          calls.push('reset-b');
          context.addRollback(async () => calls.push('rollback-b'));
          throw failure;
        },
      ],
      persist: async () => calls.push('persist-restored'),
      rehydrate: () => calls.push('rehydrate'),
      restoreSnapshot: snapshot => calls.push(`restore-${snapshot.before}`),
    }),
    error => error === failure,
  );

  assert.deepEqual(calls, [
    'reset-a',
    'reset-b',
    'rollback-b',
    'rollback-a',
    'restore-true',
    'rehydrate',
    'persist-restored',
  ]);
});

test('reset rollback preserves the primary, external and settings restoration errors', async () => {
  const primary = new Error('primary');
  const externalRollback = new Error('external rollback');
  const settingsRollback = new Error('settings rollback');

  await assert.rejects(
    executePhoneAppResetTransaction({
      captureSnapshot: () => ({ before: true }),
      handlers: [
        async context => {
          context.addRollback(async () => {
            throw externalRollback;
          });
          throw primary;
        },
      ],
      persist: async () => {
        throw settingsRollback;
      },
      rehydrate: () => undefined,
      restoreSnapshot: () => undefined,
    }),
    error =>
      error instanceof AggregateError &&
      error.errors.includes(primary) &&
      error.errors.includes(externalRollback) &&
      error.errors.includes(settingsRollback),
  );
});

test('settings clear and external worldbook resets consume the shared transactional contract', async () => {
  const [registry, panel, worldbook, worldSlots] = await Promise.all([
    readFile(new URL('../../src/core/appRegistry.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/settings/SettingsAdvancedPanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/worldbook-link/store.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(registry, /export interface PhoneAppResetContext/);
  assert.match(registry, /PhoneAppResetHandler\s*=\s*\(context:\s*PhoneAppResetContext\)/);
  assert.match(panel, /executePhoneAppResetTransaction\s*\(\s*\{/);
  assert.doesNotMatch(panel, /Promise\.all\(handlers\.map/);
  assert.match(worldbook, /transaction\.addRollback/);
  assert.match(worldbook, /setWorldbookEntryStates/);
  assert.match(worldSlots, /transaction\.addRollback/);
  assert.match(worldSlots, /restoreExternalResetSnapshot/);
  assert.match(worldSlots, /await\s+syncToWorldBook\(\)/);
});
