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
    'native-user-prefix-link',
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

test('tutorial explains current macro, branch and MVU boundaries without obsolete floor controls', () => {
  const macro = articleSources[articleFiles.indexOf('macro')];
  const dependency = articleSources[articleFiles.indexOf('dependency')];
  const apps = articleSources[articleFiles.indexOf('apps')];
  for (const text of [
    '原生用户名宏联动（全局）',
    '{{pc_native_user}}',
    '默认关闭',
    '开启和关闭后都需刷新',
    '实际发送提示词',
  ]) {
    assert.ok(macro.includes(text), `missing macro guidance: ${text}`);
  }
  assert.ok(dependency.includes('不提供历史楼层选择'));
  assert.ok(dependency.includes('点击“应用”'));
  assert.doesNotMatch(dependency, /其他消息楼层|点击该字段的保存/u);
  assert.ok(apps.includes('工作台、关系网、时间确认不在此次自动继承范围'));
  assert.ok(apps.includes('不沿用原聊天的 worldEntryId'));
  assert.ok(apps.includes('跨聊天共享的状态方案仍共用一份'));
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
