/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [editor, promptsApp, relationshipModule, relationshipGeneration] = await Promise.all([
  readSource('src/apps/prompts/PromptAppEditorPage.vue'),
  readSource('src/apps/prompts/PromptsApp.vue'),
  readSource('src/apps/relationship/index.ts'),
  readSource('src/apps/relationship/generation.ts'),
]);

test('task template editor shows variable meaning beside its placeholder', () => {
  assert.match(editor, /<span>\{\{ variable\.label \}\}<\/span>/);
  assert.match(editor, /<code>\{\{ formatVariable\(variable\.key\) \}\}<\/code>/);
  assert.match(editor, /aria-label="`插入\$\{variable\.label\}占位符/);
  assert.match(promptsApp, /<span>\{\{ variable\.label \}\}<\/span>\s*<code>/);
});

test('task template editor provides a readable substitution preview', () => {
  assert.match(editor, /const placeholderPreview = computed/);
  assert.match(editor, /return label \? `【\$\{label\}】` : placeholder/);
  assert.match(editor, /\{\{ t`替换示意` \}\}/);
});

test('unregistered task variables are explained without blocking tavern macros', () => {
  assert.match(editor, /const unknownVariables = computed/);
  assert.match(editor, /这些内容不会由任务模板系统替换；如果也不是酒馆宏或自定义宏/);
});

test('relationship default template keeps its sentence visible and substitutes a value scope', () => {
  assert.match(
    relationshipModule,
    /defaultTemplate: '请重点判断以下范围内角色之间的当前单向关系：\{\{characterScope\}\}。'/,
  );
  assert.match(relationshipModule, /key: 'characterScope', label: '关系分析范围'/);
  assert.match(relationshipGeneration, /const characterScope = characterNames \|\| '来源内容中的主要角色'/);
  assert.match(relationshipGeneration, /taskTemplateVariables:\s*\{\s*characterScope,/);
});
