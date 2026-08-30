/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const currentData = await readFile(new URL('../../src/core/currentDataVersion.ts', import.meta.url), 'utf8');
const lifecycle = await readFile(new URL('../../src/core/phoneLifecycle.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');
const hydrationSources = await Promise.all(
  ['settings', 'prompts', 'generationTasks', 'previewDrafts'].map(name =>
    readFile(new URL(`../../src/store/${name}.ts`, import.meta.url), 'utf8'),
  ),
);

test('one current data-version gate owns destructive retired-data cleanup', async () => {
  assert.match(currentData, /CURRENT_PHONE_DATA_VERSION/u);
  assert.match(currentData, /sillytavern_phone_data_version/u);
  assert.match(currentData, /if \(extensionSettings\[PHONE_DATA_VERSION_FIELD\] === CURRENT_PHONE_DATA_VERSION\) return false/u);
  for (const field of [
    'sillytavern_phone_profiles',
    'sillytavern_phone_relationships',
    'sillytavern_phone_scene_planner',
    'sillytavern_phone_storylines',
    'sillytavern_phone_media',
    'sillytavern_phone_comfy',
    'sillytavern_phone_cloud_media',
  ]) {
    assert.match(currentData, new RegExp(field), field);
  }
  assert.match(lifecycle, /applyCurrentPhoneDataVersion/u);
  assert.doesNotMatch(app, /cleanupRetiredPhoneData/u);
  await assert.rejects(access(new URL('../../src/util/retiredDataCleanup.ts', import.meta.url)));
  await assert.rejects(access(new URL('../../src/core/retiredMedia.ts', import.meta.url)));
});

test('current stores do not repeat retired-data migration during hydration', () => {
  for (const source of hydrationSources) {
    assert.doesNotMatch(source, /retiredMedia|stripRetiredMedia/u);
  }
});
