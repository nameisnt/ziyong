/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bridge = await readFile(new URL('../../src/apps/profiles/externalBridge.ts', import.meta.url), 'utf8');
const crud = await readFile(new URL('../../src/apps/profiles/externalCrud.ts', import.meta.url), 'utf8');
const generation = await readFile(new URL('../../src/apps/profiles/generation.ts', import.meta.url), 'utf8');
const index = await readFile(new URL('../../src/apps/profiles/index.ts', import.meta.url), 'utf8');
const picker = await readFile(
  new URL('../../src/components/ExternalProfileReferencePicker.vue', import.meta.url),
  'utf8',
);
const profilesApp = await readFile(new URL('../../src/apps/profiles/ProfilesApp.vue', import.meta.url), 'utf8');

test('external profiles use direct table and row access without a mapping store', () => {
  assert.match(bridge, /readExternalProfileTables/u);
  assert.match(crud, /insertRow\(sheetKey/u);
  assert.match(crud, /updateRow\(sheetKey/u);
  assert.match(crud, /deleteRow\(sheetKey/u);
  assert.doesNotMatch(
    `${bridge}\n${crud}\n${generation}\n${index}\n${picker}\n${profilesApp}`,
    /profileMapping|MappedRow/u,
  );
});

test('profile generation targets a real table and title column', () => {
  assert.match(generation, /sheetKey: z\.string/u);
  assert.match(generation, /titleColumn: z\.string/u);
  assert.match(generation, /buildExternalProfileGenerationValues/u);
  assert.match(index, /insertRow: \(sheetKey, values\)/u);
});

test('profile row references use sheet key and row index', () => {
  assert.match(picker, /profileSheetKey/u);
  assert.match(picker, /profileRowIndex/u);
  assert.match(profilesApp, /rowIndex: String\(row\.index\)/u);
});

test('external profile cards support one persisted horizontal or vertical layout', async () => {
  const settingsSchema = await readFile(new URL('../../src/type/settings.ts', import.meta.url), 'utf8');
  const settingsStore = await readFile(new URL('../../src/store/settings.ts', import.meta.url), 'utf8');
  assert.match(
    settingsSchema,
    /externalProfilesLayout: z\.enum\(\['horizontal', 'vertical'\]\)\.default\('horizontal'\)/u,
  );
  assert.match(settingsStore, /function setExternalProfilesLayout/u);
  assert.match(profilesApp, /pc-external-profile-card-track/u);
  assert.match(profilesApp, /settingsStore\.setExternalProfilesLayout\('horizontal'\)/u);
  assert.match(profilesApp, /settingsStore\.setExternalProfilesLayout\('vertical'\)/u);
  assert.doesNotMatch(profilesApp, /pc-external-profile-grid-wrap/u);
});
