/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('retired profile and reasoning components stay absent while their live replacements remain owned', async () => {
  await assert.rejects(access(new URL('../../src/components/ProfileEntryPicker.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/ReasoningModal.vue', import.meta.url)));

  const declarations = await source('components.d.ts');
  const generationPreview = await source('src/components/GenerationPreviewPanel.vue');
  const failedDraft = await source('src/components/FailedDraftRepairPage.vue');
  const readerDetail = await source('src/components/ReaderDetailShell.vue');
  const relationship = await source('src/apps/relationship/RelationshipApp.vue');

  assert.doesNotMatch(declarations, /ProfileEntryPicker|ReasoningModal/u);
  assert.match(generationPreview, /from '@\/components\/ReasoningDisclosure\.vue'/u);
  assert.match(failedDraft, /from '@\/components\/ReasoningDisclosure\.vue'/u);
  assert.match(readerDetail, /from '@\/components\/ReasoningDisclosure\.vue'/u);
  assert.match(relationship, /from '@\/apps\/relationship\/MermaidRelationshipGraph\.vue'/u);
  assert.doesNotMatch(relationship, /ExternalProfileReferencePicker/u);
});
