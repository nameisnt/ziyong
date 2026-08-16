/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [
  builtinPrompts,
  extrasGeneration,
  extrasApp,
  digestModule,
  digestGeneration,
  comfyModule,
  comfyGeneration,
  cloudMediaModule,
  summaryGeneration,
  scenePlannerModule,
  promptStore,
] = await Promise.all([
  readSource('src/apps/builtinPrompts.ts'),
  readSource('src/core/extrasGeneration.ts'),
  readSource('src/components/ExtrasApp.vue'),
  readSource('src/apps/digest/index.ts'),
  readSource('src/apps/digest/generation.ts'),
  readSource('src/apps/comfy/index.ts'),
  readSource('src/apps/comfy/generation.ts'),
  readSource('src/apps/cloud-media/index.ts'),
  readSource('src/core/summaryGeneration.ts'),
  readSource('src/apps/scene-planner/index.ts'),
  readSource('src/store/prompts.ts'),
]);

test('extras chapter task template preserves the optional summary instruction', () => {
  assert.match(
    builtinPrompts,
    /defaultTemplate: lines\('\{\{modeInstruction\}\}', '\{\{typeFallback\}\}', '\{\{summaryInstruction\}\}'\)/,
  );
  assert.match(builtinPrompts, /key: 'summaryInstruction', label: '启用自动摘要时的完整格式要求（程序生成）'/);
  assert.match(extrasGeneration, /summaryInstruction: config\.parseSummary/);
  assert.equal((extrasApp.match(/parseSummary: chapterGenerationDraft\.parseSummary/g) ?? []).length, 4);
  assert.equal((extrasApp.match(/summaryFormatHint: chapterGenerationDraft\.summaryFormatHint/g) ?? []).length, 4);
});

test('digest and ComfyUI generation actions expose editable task templates', () => {
  assert.match(digestModule, /taskTemplateDefinitions:/);
  assert.match(digestModule, /actionId: 'generate'/);
  assert.match(digestGeneration, /taskInstruction: '请从本次选中的来源内容中提取值得保存的原文摘抄，不得改写。'/);

  assert.match(comfyModule, /taskTemplateDefinitions:/);
  assert.match(comfyModule, /actionId: 'generate-prompt'/);
  assert.match(
    comfyGeneration,
    /taskInstruction: '请根据本次来源、引用和用户要求，为当前工作流生成可直接填写的参数。'/,
  );
});

test('summary and cloud media no longer register empty default task layers', () => {
  assert.doesNotMatch(builtinPrompts, /label: '生成总结', defaultTemplate: ''/);
  assert.match(summaryGeneration, /taskInstruction: '请根据本次选中的来源楼层和引用内容生成总结。'/);
  assert.doesNotMatch(cloudMediaModule, /label: '生成云媒体提示词', defaultTemplate: ''/);
});

test('task default coverage migration runs once for old installations', () => {
  assert.match(promptStore, /!\('digest\.generate' in settings\.taskTemplates\)/);
  assert.match(promptStore, /!\('comfy\.generate-prompt' in settings\.taskTemplates\)/);
  assert.match(promptStore, /settings\.taskTemplates\['extras\.chapter-generate'\] = currentExtrasChapterTaskTemplate/);
  assert.match(promptStore, /settings\.taskTemplates\['summary\.generate'\] = currentSummaryTaskTemplate/);
  assert.match(
    promptStore,
    /settings\.taskTemplates\['cloud-media\.generate-prompt'\] = currentCloudMediaTaskTemplate/,
  );
});

test('scene planner uses one generation action label', () => {
  assert.equal((scenePlannerModule.match(/label: '生成场景方案'/g) ?? []).length, 2);
  assert.doesNotMatch(scenePlannerModule, /label: '生成提示词'/);
});
