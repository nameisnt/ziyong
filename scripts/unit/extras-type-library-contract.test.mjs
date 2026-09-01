/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [session, editor, generator, schema] = await Promise.all([
  readFile(new URL('../../src/apps/extras/useExtrasChapterTypePromptSession.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/extras/ExtrasBookEditorPage.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/extras/ExtrasChapterGeneratePage.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/type/extra.ts', import.meta.url), 'utf8'),
]);

test('extras custom types default to saving and support explicit existing-type updates and groups', () => {
  assert.match(session, /saveCustomTypeToLibrary\.value = true/u);
  assert.match(session, /saveExistingTypePrompt/u);
  assert.match(session, /createTypePrompt\(\{[\s\S]*?domain: 'extras'/u);
  assert.match(editor, /domain="extras"/u);
  assert.match(generator, /保存到类型库/u);
});

test('unsaved extras custom prompts stay private to the book and old books receive an empty default', () => {
  assert.match(schema, /typePrompt: z\.string\(\)\.default\(''\)/u);
  assert.match(session, /saveCustomTypeToLibrary/u);
});
