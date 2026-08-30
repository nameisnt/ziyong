/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
const [profiles, checkbox, relationship, mermaidGraph, timekeeper] = await Promise.all([
  source('src/apps/profiles/ProfilesApp.vue'),
  source('src/components/BulkSelectionCheckbox.vue'),
  source('src/apps/relationship/RelationshipApp.vue'),
  source('src/apps/relationship/MermaidRelationshipGraph.vue'),
  source('src/apps/timekeeper/TimekeeperApp.vue'),
]);

test('external profile cards reuse desktop horizontal drag without changing vertical mode', () => {
  assert.match(profiles, /useHorizontalDragScroll\(profileCardTrackEl\)/u);
  assert.match(profiles, /externalProfilesLayout === 'horizontal' && profileCardDrag\.onPointerDown/u);
  assert.match(profiles, /profileCardDrag\.onClickCapture/u);
  assert.match(profiles, /profileCardDrag\.onWheel/u);
});

test('shared selection checkbox owns its complete theme appearance', () => {
  assert.match(checkbox, /<span aria-hidden="true"><i class="fa-solid fa-check"><\/i><\/span>/u);
  assert.match(checkbox, /background:\s*var\(--pc-form-control-bg\)/u);
  assert.match(checkbox, /input:checked \+ span[\s\S]*background:\s*var\(--pc-theme-accent\)/u);
  assert.doesNotMatch(checkbox, /accent-color/u);
});

test('relationship and timekeeper reuse shared disclosures and themed surfaces', () => {
  assert.match(relationship, /<details class="pc-page-section pc-relationship-disclosure" open>/u);
  assert.match(relationship, /class="pc-compact-row pc-character-editor-row"/u);
  assert.doesNotMatch(relationship, /pc-section-toggle/u);
  assert.match(relationship, /\.pc-relationship-page\s*\{\s*align-content:\s*start;/u);
  assert.match(mermaidGraph, /getImageData\(0, 0, 1, 1\)/u);
  assert.doesNotMatch(mermaidGraph, /primaryColor:\s*'var\(/u);
  assert.match(timekeeper, /class="pc-editor-card pc-person-card"/u);
  assert.match(timekeeper, /<details class="pc-page-section pc-time-disclosure">/u);
  assert.match(timekeeper, /\.pc-timekeeper-page\s*\{[\s\S]*?gap:\s*0;/u);
  assert.doesNotMatch(timekeeper, /\.pc-(?:grid|people-list|advance-btn)[^{]*\{[^}]*margin-top:/u);
  assert.match(timekeeper, /background:\s*var\(--pc-form-control-bg\)/u);
});
