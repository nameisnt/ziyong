/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const removedFiles = [
  'src/apps/diary/DiaryCreationModePage.vue',
  'src/apps/summary/SummaryCreationModePage.vue',
  'src/apps/forum/ForumThreadActions.vue',
  'src/core/homeGridLayout.ts',
  'src/util/sendGuard.ts',
  'src/core/regexTargetRegistry.ts',
  'src/apps/profiles/ProfileFieldEditorPage.vue',
  'src/apps/profiles/legacyCleanup.ts',
  'src/apps/profiles/rendering.ts',
  'src/apps/profiles/store.ts',
  'src/apps/profiles/pages/ProfilesCatalogPage.vue',
  'src/apps/profiles/pages/ProfilesEntryDetailPage.vue',
  'src/apps/profiles/pages/ProfilesEntryEditorPage.vue',
  'src/apps/profiles/pages/ProfilesTableEditorPage.vue',
  'src/apps/profiles/pages/ProfilesTableManagerPage.vue',
];

test('retired implementations are absent instead of being kept alive by source-reading tests', async () => {
  for (const file of removedFiles) {
    await assert.rejects(access(new URL(`../../${file}`, import.meta.url)), undefined, file);
  }
});

test('live registration and generation modules no longer reference retired subsystems', async () => {
  const [profilesIndex, appRuntime, statusSettings, generationVisibility, retiredCleanup] = await Promise.all([
    readFile(new URL('../../src/apps/profiles/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/app-builder/runtimeModules.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/apps/status-display-settings/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/util/generationVisibility.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/core/currentDataVersion.ts', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(profilesIndex, /legacyCleanup|runLegacyProfilesCleanup/u);
  assert.doesNotMatch(appRuntime, /registerRegexTargetProvider|regexTargetRegistry/u);
  assert.doesNotMatch(statusSettings, /registerRegexTargetProvider|regexTargetRegistry/u);
  assert.doesNotMatch(generationVisibility, /runWithVisibilityTransaction|acquireSendGuard|sendGuard/u);
  assert.match(retiredCleanup, /sillytavern_phone_profiles/u);
});

test('retired exported APIs are removed from live modules', async () => {
  const sources = await Promise.all(
    [
      '../../src/apps/preset-manager/api.ts',
      '../../src/apps/script-manager/api.ts',
      '../../src/apps/timekeeper/store.ts',
      '../../src/apps/profiles/profileReferences.ts',
      '../../src/util/bagu.ts',
      '../../src/core/appLayout.ts',
      '../../src/core/phoneLifecycle.ts',
      '../../src/apps/workbench/runner.ts',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')),
  );
  const combined = sources.join('\n');
  assert.doesNotMatch(
    combined,
    /renameTavernPreset|listAssistantScripts|parseProfileBirthDate|cleanExternalProfileReferences|applyBaguHits|removeHomeAppFromFolder|destroyPhoneLifecycle|uninstallWorkbenchAutoRunner/u,
  );
});
