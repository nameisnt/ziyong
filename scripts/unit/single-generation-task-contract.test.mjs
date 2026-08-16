/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [schema, store, backup, session, taskCenter, generationService, manualBatchRunner] = await Promise.all([
  readSource('src/type/generationTask.ts'),
  readSource('src/store/generationTasks.ts'),
  readSource('src/apps/builtinBackup.ts'),
  readSource('src/composables/useSingleGenerationTaskSession.ts').catch(() => ''),
  readSource('src/components/GenerationTaskCenter.vue'),
  readSource('src/core/generationService.ts'),
  readSource('src/core/manualBatchRunner.ts'),
]);

test('single generation tasks have an explicit durable schema and v1 backup migration', () => {
  assert.match(schema, /GenerationTaskKindSchema\s*=\s*z\.enum\(\[[^\]]*'single'/s);
  assert.match(schema, /GenerationTaskStatusSchema\s*=\s*z\.enum\(\[[^\]]*'failed'/s);
  assert.match(schema, /SingleGenerationTaskConfigSchema/);
  assert.match(backup, /key:\s*'generation-tasks'[\s\S]*?migrateImport:/);
  assert.match(backup, /schemaVersion:\s*2/);
  assert.match(backup, /fromVersion\s*!==\s*1/);
});

test('single task lifecycle never exposes batch resume semantics', () => {
  assert.match(store, /task\.kind\s*===\s*'single'[\s\S]*?请求已中断/s);
  assert.match(store, /function stopNow[\s\S]*?task\.kind\s*===\s*'single'[\s\S]*?'cancelled'/s);
  assert.match(store, /聊天已切换[\s\S]*?请求已中断/s);
  assert.match(taskCenter, /task\.kind\s*!==\s*'single'[\s\S]*?继续任务/s);
  assert.match(manualBatchRunner, /if \(task\.kind === 'single'\) return/);
});

test('shared single session owns only runtime task transitions and raw output', () => {
  for (const method of ['create', 'lifecycle', 'complete', 'fail', 'stop']) {
    assert.match(session, new RegExp(`\\b${method}\\b`), `missing single session ${method} API`);
  }
  assert.match(session, /kind:\s*'single'/);
  assert.match(session, /commitRawOutput/);
  assert.match(session, /updateRawOutput/);
  assert.match(generationService, /export type GenerationLifecycle/);
  assert.doesNotMatch(session, /parse|adapter|previewDraft|saveEntity/i);
});

test('task center can inspect retained raw output without a fake resume button', () => {
  assert.match(taskCenter, /查看原始输出/);
  assert.match(taskCenter, /复制原始输出/);
  assert.match(taskCenter, /pc-task-raw-output/);
  assert.match(taskCenter, /navigator\.clipboard\.writeText/);
});
