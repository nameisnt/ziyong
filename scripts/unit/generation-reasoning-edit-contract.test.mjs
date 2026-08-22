/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const disclosure = await readSource('src/components/ReasoningDisclosure.vue');
const panel = await readSource('src/components/GenerationPreviewPanel.vue');
const page = await readSource('src/components/GenerationPreviewPage.vue');
const wrappers = await Promise.all(
  ['diary/DiaryPreviewPage.vue', 'summary/SummaryPreviewPage.vue', 'letters/LettersPreviewPage.vue'].map(path =>
    readSource(`src/components/${path}`),
  ),
);
const consumers = await Promise.all(
  [
    'src/components/DiaryApp.vue',
    'src/components/SummaryApp.vue',
    'src/components/ExtrasApp.vue',
    'src/components/TheaterApp.vue',
    'src/components/LettersApp.vue',
    'src/components/ForumApp.vue',
    'src/apps/app-builder/CustomAppHost.vue',
    'src/apps/digest/DigestApp.vue',
    'src/apps/relationship/RelationshipApp.vue',
    'src/apps/scene-planner/ScenePlannerApp.vue',
    'src/apps/storylines/StorylinesApp.vue',
  ].map(readSource),
);

test('reasoning disclosure edits a local draft and applies or cancels explicitly', () => {
  assert.match(disclosure, /editable\?: boolean/u);
  assert.match(disclosure, /function beginEdit\(\)/u);
  assert.match(
    disclosure,
    /function cancelEdit\(\)[\s\S]*?draft\.value = props\.content[\s\S]*?editing\.value = false/u,
  );
  assert.match(disclosure, /function applyEdit\(\)[\s\S]*?emit\('update:content', draft\.value\)/u);
  assert.match(disclosure, /@click="draft = ''"/u);
  assert.match(disclosure, /pc-area pc-area-multiline pc-reasoning-editor/u);
});

test('shared preview panel and page expose one reasoning v-model chain', () => {
  assert.match(panel, /reasoningEditable\?: boolean/u);
  assert.match(panel, /'update:reasoning': \[value: string\]/u);
  assert.match(panel, /@update:content="emit\('update:reasoning', \$event\)"/u);
  assert.match(page, /v-model:reasoning="reasoning"/u);
  assert.match(page, /const reasoning = defineModel<string>\('reasoning', \{ default: '' \}\)/u);
  wrappers.forEach(source => {
    assert.match(source, /v-model:reasoning="reasoning"/u);
    assert.match(source, /defineModel<string>\('reasoning', \{ default: '' \}\)/u);
  });
});

test('every generated preview writes reasoning into its owning preview record', async () => {
  consumers.forEach(source => {
    assert.match(source, /@update:reasoning=/u);
  });
  assert.match(await readSource('src/apps/card-writer/CardWriterApp.vue'), /function updateActiveStageReasoning/u);
});

test('generation reasoning helper mutates only an existing generation record', async () => {
  const source = await readSource('src/util/generationReasoning.ts');
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
  }).outputText;
  const helper = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const target = { generationRecord: { reasoning: '旧内容' } };
  assert.equal(helper.updateGenerationRecordReasoning(target, '新内容'), true);
  assert.equal(target.generationRecord.reasoning, '新内容');
  assert.equal(helper.updateGenerationRecordReasoning({}, '不会创建'), false);
});
