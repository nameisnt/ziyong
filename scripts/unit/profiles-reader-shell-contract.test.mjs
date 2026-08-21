/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../../src/apps/profiles/pages/ProfilesEntryDetailPage.vue', import.meta.url),
  'utf8',
);

test('profiles detail uses the shared reader shell instead of rebuilding its own footer', () => {
  assert.match(source, /import ReaderDetailShell from ['"]@\/components\/ReaderDetailShell\.vue['"]/u);
  assert.match(source, /<ReaderDetailShell[\s\S]*custom-content/u);
  assert.doesNotMatch(source, /import DetailFooter from/u);
  assert.doesNotMatch(source, /<DetailFooter/u);
});

test('profiles detail preserves its render modes and reader actions as shared shell slots', () => {
  assert.match(source, /<FrontendFrame v-if="renderMode === 'frontend'"/u);
  assert.match(source, /v-else class="pc-profile-detail-content pc-rendered-markdown"/u);
  assert.match(source, /@bagu="\$emit\('bagu'\)"/u);
  assert.match(source, /@favorite="\$emit\('favorite'\)"/u);
  assert.match(source, /@edit="\$emit\('edit'\)"/u);
  assert.match(source, /@click="\$emit\('remove'\)"/u);
});
