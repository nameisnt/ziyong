/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('prompts owns its root and exclusive files while the theater group field remains shared', async () => {
  const files = (await readdir(new URL('../../src/apps/prompts/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'PromptAppEditorPage.vue',
    'PromptGroupEditorPage.vue',
    'PromptOutputEditorPage.vue',
    'PromptPhraseEditorPage.vue',
    'PromptTransferPage.vue',
    'PromptTypeEditorPage.vue',
    'PromptsApp.vue',
    'usePromptDefaultsSession.ts',
    'usePromptLibraryActions.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const editor = await source('src/apps/prompts/PromptTypeEditorPage.vue');
  const theater = await source('src/apps/theater/TheaterApp.vue');
  assert.match(builtin, /from '@\/apps\/prompts\/PromptsApp\.vue'/u);
  assert.match(editor, /from '@\/components\/prompts\/TheaterTypeGroupField\.vue'/u);
  assert.match(theater, /from '@\/components\/prompts\/TheaterTypeGroupField\.vue'/u);

  await access(new URL('../../src/components/prompts/TheaterTypeGroupField.vue', import.meta.url));
  await assert.rejects(access(new URL('../../src/components/PromptsApp.vue', import.meta.url)));
});
