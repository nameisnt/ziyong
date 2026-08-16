/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const consumers = await Promise.all(
  [
    ['Digest', 'src/apps/digest/DigestApp.vue'],
    ['Media', 'src/apps/media/MediaGenerateApp.vue'],
    ['CloudMedia', 'src/apps/cloud-media/CloudMediaApp.vue'],
    ['Profiles', 'src/apps/profiles/ProfilesApp.vue'],
    ['Relationship', 'src/apps/relationship/RelationshipApp.vue'],
  ].map(async ([name, file]) => ({
    file,
    name,
    source: await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'),
  })),
);

test('GEN02C consumers delegate request runtime to the persistent single-generation session', () => {
  for (const { file, source } of consumers) {
    assert.match(source, /useSingleGenerationTaskSession/, file);
    assert.match(source, /generationSession\.create\(/, file);
    assert.match(source, /lifecycle:\s*generationSession\.lifecycle\(task\.id\)/, file);
    assert.match(source, /generationSession\.complete\(task\.id,/, file);
    assert.match(source, /generationSession\.fail\(task\.id,/, file);
    assert.match(source, /:error="generationError"/, file);
    assert.match(source, /:raw-output="generationRawOutput"/, file);
    assert.match(source, /:running="generationRunning"/, file);
  }
});

test('GEN02C consumers do not stop requests on component disposal or duplicate runtime fields', () => {
  for (const { file, source } of consumers) {
    assert.doesNotMatch(source, /stopGenerationByIdSafe/, file);
    assert.doesNotMatch(source, /onScopeDispose\([\s\S]*?stopGeneration/s, file);
    assert.doesNotMatch(source, /generationId:\s*''/, file);
    assert.doesNotMatch(source, /rawOutput:\s*''/, file);
    assert.doesNotMatch(source, /running:\s*false/, file);
  }
});

test('GEN02C consumers explicitly retain saved, preview and failed-draft result semantics', () => {
  for (const { file, source } of consumers) {
    for (const state of ['saved', 'preview', 'failed-draft']) {
      assert.match(source, new RegExp(`resultState: '${state}'`), `${file}: ${state}`);
    }
  }
});
