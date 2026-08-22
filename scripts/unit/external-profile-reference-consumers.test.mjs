/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const [picker, referenceModel, relationshipStore, relationshipApp, relationshipModule, storylineStore, storylineApp, storylineEditor, storylineModule] =
  await Promise.all([
    source('src/components/ExternalProfileReferencePicker.vue'),
    source('src/apps/profiles/profileReferences.ts'),
    source('src/apps/relationship/store.ts'),
    source('src/apps/relationship/RelationshipApp.vue'),
    source('src/apps/relationship/index.ts'),
    source('src/apps/storylines/store.ts'),
    source('src/apps/storylines/StorylinesApp.vue'),
    source('src/apps/storylines/StorylineEditorPage.vue'),
    source('src/apps/storylines/index.ts'),
  ]);

test('shared external profile reference model keeps mapping and identity as the only durable locator', () => {
  assert.match(referenceModel, /profileMappingId:\s*z\.string\(\)/u);
  assert.match(referenceModel, /profileIdentityValue:\s*z\.string\(\)/u);
  assert.match(referenceModel, /externalProfileReferenceKey/u);
  assert.doesNotMatch(referenceModel, /rowIndex|profileEntryId/u);
});

test('shared picker reads explicit mappings and rows without external CRUD', () => {
  assert.match(picker, /useExternalProfileMappingsStore/u);
  assert.match(picker, /readExternalMappedRows/u);
  assert.match(picker, /SearchableCombobox/u);
  assert.match(picker, /刷新外部资料/u);
  assert.doesNotMatch(picker, /createExternalProfilesRepository|insertMappedRow|updateMappedRow|deleteMappedRow/u);
});

test('relationship stores new external identity references while retaining legacy ids as unresolved data', () => {
  assert.match(relationshipStore, /profileEntryId:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(relationshipStore, /profileMappingId:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(relationshipStore, /profileIdentityValue:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(relationshipApp, /旧资料关联待重新选择/u);
  assert.match(relationshipApp, /ExternalProfileReferencePicker/u);
  assert.doesNotMatch(`${relationshipStore}\n${relationshipApp}`, /useProfilesStore|ProfileEntryPicker/u);
});

test('storylines use structured external references and preserve legacy ids without guessing', () => {
  assert.match(storylineStore, /relatedProfiles:\s*z\.array\(ExternalProfileReferenceSchema\)\.default\(\[\]\)/u);
  assert.match(storylineStore, /relatedProfileIds:\s*z\.array\(z\.string\(\)\)\.default\(\[\]\)/u);
  assert.match(storylineEditor, /ExternalProfileReferencePicker/u);
  assert.match(storylineEditor, /旧资料关联待重新选择/u);
  assert.doesNotMatch(`${storylineApp}\n${storylineEditor}`, /useProfilesStore|ProfileEntryPicker/u);
});

test('relationship and storylines backups explicitly migrate to schema version two', () => {
  for (const moduleSource of [relationshipModule, storylineModule]) {
    assert.match(moduleSource, /migrateImport:\s*data\s*=>\s*data/u);
    assert.match(moduleSource, /schemaVersion:\s*2/u);
  }
});
