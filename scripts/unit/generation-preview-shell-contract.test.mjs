/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [panel, page, failedPage, cardWriter, digest, relationship, customHost] = await Promise.all([
  readSource('src/components/GenerationPreviewPanel.vue'),
  readSource('src/components/GenerationPreviewPage.vue'),
  readSource('src/components/FailedDraftRepairPage.vue'),
  readSource('src/apps/card-writer/CardWriterApp.vue'),
  readSource('src/apps/digest/DigestApp.vue'),
  readSource('src/apps/relationship/RelationshipApp.vue'),
  readSource('src/apps/app-builder/CustomAppHost.vue'),
]);

test('shared preview shell owns reasoning disclosure and raw-output semantics', () => {
  assert.match(
    panel,
    /<ReasoningDisclosure[\s\S]*?:content="reasoning"[\s\S]*?:editable="reasoningEditable"[\s\S]*?@update:content="emit\('update:reasoning', \$event\)"/u,
  );
  assert.match(panel, /:raw-output-semantics="rawOutputSemantics"/);
  assert.match(page, /v-model:reasoning="reasoning"/);
  assert.match(page, /:raw-output-semantics="rawOutputSemantics"/);
});

test('shared failed-draft shell owns reasoning, warnings, and raw-output semantics', () => {
  assert.match(failedPage, /<ReasoningDisclosure :content="reasoning"\s*\/>/);
  assert.match(failedPage, /v-if="warnings\.length"/);
  assert.match(failedPage, /:raw-output-semantics="rawOutputSemantics"/);
});

test('special preview consumers use the shared capabilities instead of a second raw/failed shell', () => {
  assert.match(cardWriter, /:reasoning="activePreviewStage\?\.reasoning \|\| ''"/);
  assert.doesNotMatch(cardWriter, /<ReasoningModal/);
  for (const source of [digest, relationship, customHost]) {
    assert.match(source, /<FailedDraftRepairPage/);
    assert.doesNotMatch(source, /<RawOutputEditor/);
  }
});
