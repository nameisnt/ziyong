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
  summaryGeneration,
  promptStore,
] = await Promise.all([
  readSource('src/apps/builtinPrompts.ts'),
  readSource('src/core/extrasGeneration.ts'),
  readSource('src/apps/extras/ExtrasApp.vue'),
  readSource('src/apps/digest/index.ts'),
  readSource('src/apps/digest/generation.ts'),
  readSource('src/core/summaryGeneration.ts'),
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

test('digest generation action exposes an editable task template', () => {
  assert.match(digestModule, /taskTemplateDefinitions:/);
  assert.match(digestModule, /actionId: 'generate'/);
  assert.match(digestGeneration, /taskInstruction: '请从本次选中的来源内容中提取值得保存的原文摘抄，不得改写。'/);
});

test('summary no longer registers an empty default task layer', () => {
  assert.doesNotMatch(builtinPrompts, /label: '生成总结', defaultTemplate: ''/);
  assert.match(summaryGeneration, /taskInstruction: '请根据本次选中的来源楼层和引用内容生成总结。'/);
});

test('task default coverage migration runs once for old installations', () => {
  assert.match(promptStore, /!\('digest\.generate' in settings\.taskTemplates\)/);
  assert.match(promptStore, /settings\.taskTemplates\['extras\.chapter-generate'\] = currentExtrasChapterTaskTemplate/);
  assert.match(promptStore, /settings\.taskTemplates\['summary\.generate'\] = currentSummaryTaskTemplate/);
});
