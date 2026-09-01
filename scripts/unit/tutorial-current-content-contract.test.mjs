/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const articleFiles = ['apps', 'data', 'dependency', 'generation', 'macro', 'start', 'troubleshooting'];
const articleSources = await Promise.all(
  articleFiles.map(name => readFile(new URL(`../../src/apps/tutorial/articles/${name}.ts`, import.meta.url), 'utf8')),
);
const articles = articleSources.join('\n');
const tutorial = await readFile(new URL('../../src/apps/tutorial/TutorialApp.vue', import.meta.url), 'utf8');
const directory = await readFile(new URL('../../src/apps/tutorial/TutorialAppDirectory.vue', import.meta.url), 'utf8');
const aggregate = await readFile(new URL('../../src/apps/tutorial/data.ts', import.meta.url), 'utf8');

test('current tutorial corpus contains the previously omitted feature guides', () => {
  for (const articleId of [
    'macro-builder-guide',
    'chat-library-guide',
    'mini-games-guide',
    'assistant-script-manager',
    'status-display-guide',
    'file-repository-guide',
    'extension-transfer-guide',
    'batch-generation-preview',
    'web-rendering-empty-or-stuck',
  ]) {
    assert.match(articles, new RegExp(`id: '${articleId}'`, 'u'), `missing tutorial article: ${articleId}`);
  }
});

test('tutorial corpus remains split behind an explicitly typed aggregate', () => {
  assert.match(aggregate, /export const tutorialArticles: TutorialArticle\[\]/u);
  for (const name of articleFiles) assert.match(aggregate, new RegExp(`articles/${name}`, 'u'));
});

test('tutorial search and navigation expose the current interaction contract', () => {
  assert.match(tutorial, /const searchIndex = tutorialArticles\.map/u);
  assert.match(tutorial, /blockIndex: match\.blockIndex/u);
  assert.match(tutorial, /<DetailFooter/u);
  assert.match(tutorial, /showGroupedArticles/u);
  assert.match(tutorial, /aria-label="搜索教程"/u);
  assert.match(directory, /:aria-label="t`搜索 App`"/u);
  assert.doesNotMatch(directory, /if \(query\.value\.trim\(\)\) return/u);
});
