/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(path, 'utf8');

test('reader detail shell exposes the registered item export action', () => {
  const source = read('src/components/ReaderDetailShell.vue');
  assert.match(source, /ItemTransferExportButton/);
  assert.match(source, /itemTransferAvailable/);
});

test('all approved A-group list surfaces expose item import', () => {
  const cases = [
    ['src/components/summary/SummaryBookPage.vue', 'app-id="summary"'],
    ['src/components/diary/DiaryBookPage.vue', 'app-id="diary"'],
    ['src/components/extras/ExtrasBookOverviewPage.vue', 'app-id="extras"'],
    ['src/components/forum/ForumBoardPage.vue', 'app-id="forum"'],
    ['src/components/theater/TheaterCatalogPage.vue', 'app-id="theater"'],
    ['src/components/letters/LettersBookPage.vue', 'app-id="letters"'],
    ['src/apps/digest/DigestApp.vue', 'app-id="digest"'],
    ['src/apps/profiles/ProfilesApp.vue', 'app-id="profiles"'],
    ['src/apps/scene-planner/ScenePlannerApp.vue', 'app-id="scene-planner"'],
  ];
  for (const [path, marker] of cases) {
    const source = read(path);
    assert.match(source, /ItemTransferImportAction/, path);
    assert.ok(source.includes(marker), `${path} must bind ${marker}`);
  }
});

test('profile row detail and scene plan expose item-specific export context', () => {
  const profiles = read('src/apps/profiles/ProfilesApp.vue');
  assert.match(profiles, /route\.page === 'row'/);
  assert.match(profiles, /display-app-id="profiles"/);
  assert.match(profiles, /identityValue/);
  assert.match(profiles, /mappingId/);
  const scene = read('src/apps/scene-planner/ScenePlannerApp.vue');
  assert.match(scene, /ItemTransferExportButton/);
  assert.match(scene, /planId:\s*plan\.id/);
});
