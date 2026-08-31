/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

async function readSource(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function loadCleanup() {
  const source = await readSource('src/core/currentDataVersion.ts');
  const output = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    fileName: 'currentDataVersion.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

test('active theater surfaces no longer expose participant metadata', async () => {
  const [sources, workbenchRunner] = await Promise.all([
    Promise.all(
      [
        'src/type/theater.ts',
        'src/core/theaterGeneration.ts',
        'src/store/theater.ts',
        'src/apps/theater/TheaterApp.vue',
        'src/apps/builtinArchive.ts',
        'src/apps/builtinFavorites.ts',
        'src/apps/builtinContentSources.ts',
        'src/apps/workbench/WorkbenchApp.vue',
        'src/apps/workbench/store.ts',
      ].map(readSource),
    ),
    readSource('src/apps/workbench/runner.ts'),
  ]);
  sources.forEach(source => assert.doesNotMatch(source, /participants|参与角色|未指定参与角色/u));
  assert.doesNotMatch(workbenchRunner, /theaterParticipants|参与角色|未指定参与角色/u);
});

test('data version 2 removes old theater participants without touching letter participants', async () => {
  const { applyCurrentPhoneDataVersion, CURRENT_PHONE_DATA_VERSION } = await loadCleanup();
  const theaterReplay = {
    config: { participants: [{ name: '旧角色' }], typeName: '对话体' },
  };
  const extensionSettings = {
    sillytavern_phone_data_version: 1,
    sillytavern_phone_letters: {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {
        current: { books: [{ participants: [{ name: '发信人' }, { name: '收信人' }] }] },
      },
    },
    sillytavern_phone_theater: {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {
        current: {
          entries: [
            {
              generationRecord: { replay: structuredClone(theaterReplay) },
              generationReplay: structuredClone(theaterReplay),
              participants: [{ name: '旧角色' }],
              title: '保留条目',
              versions: [
                {
                  generationRecord: { replay: structuredClone(theaterReplay) },
                  generationReplay: structuredClone(theaterReplay),
                  participants: [{ name: '旧版本角色' }],
                },
              ],
            },
          ],
          failedDrafts: [
            {
              context: { participants: [{ name: '旧草稿角色' }], typeName: '对话体' },
              generationRecord: { replay: structuredClone(theaterReplay) },
            },
          ],
        },
      },
    },
    sillytavern_phone_workbench: {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {
        current: {
          workflows: [
            {
              pendingRuns: {
                current: {
                  steps: [
                    {
                      appId: 'theater',
                      config: { theaterParticipants: '旧待续角色', theaterTypeName: '对话体' },
                    },
                  ],
                },
              },
              steps: [
                {
                  appId: 'theater',
                  config: { theaterParticipants: '旧角色', theaterTypeName: '对话体' },
                },
              ],
            },
          ],
        },
      },
    },
  };

  assert.equal(applyCurrentPhoneDataVersion(extensionSettings), true);
  assert.equal(extensionSettings.sillytavern_phone_data_version, CURRENT_PHONE_DATA_VERSION);

  const entry = extensionSettings.sillytavern_phone_theater.scopes.current.entries[0];
  assert.equal('participants' in entry, false);
  assert.equal('participants' in entry.generationReplay.config, false);
  assert.equal('participants' in entry.generationRecord.replay.config, false);
  assert.equal('participants' in entry.versions[0], false);
  assert.equal('participants' in entry.versions[0].generationReplay.config, false);
  assert.equal('participants' in entry.versions[0].generationRecord.replay.config, false);
  const failedDraft = extensionSettings.sillytavern_phone_theater.scopes.current.failedDrafts[0];
  assert.deepEqual(failedDraft.context, { typeName: '对话体' });
  assert.equal('participants' in failedDraft.generationRecord.replay.config, false);

  const workflow = extensionSettings.sillytavern_phone_workbench.scopes.current.workflows[0];
  assert.deepEqual(workflow.steps[0].config, { theaterTypeName: '对话体' });
  assert.deepEqual(workflow.pendingRuns.current.steps[0].config, { theaterTypeName: '对话体' });
  assert.deepEqual(extensionSettings.sillytavern_phone_letters.scopes.current.books[0].participants, [
    { name: '发信人' },
    { name: '收信人' },
  ]);
  assert.equal(applyCurrentPhoneDataVersion(extensionSettings), false);
});
