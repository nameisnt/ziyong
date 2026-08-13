/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/apps/preset-manager/pluginPreset.ts', import.meta.url), 'utf8');
const builtinDiaryRaw = JSON.parse(
  await readFile(new URL('../../%E6%97%A5%E8%AE%B0%20(1).json', import.meta.url), 'utf8'),
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const model = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function legacyPreset() {
  return {
    temperature: 0.8,
    prompts: [
      { identifier: 'main', name: '主提示', role: 'system', content: 'A', enabled: true },
      { identifier: 'chatHistory', name: '聊天历史', enabled: true },
      { identifier: 'task', name: '任务', role: 'user', content: '{{perspectiveName}}', enabled: true },
    ],
    prompt_order: [
      {
        character_id: 100001,
        order: [
          { identifier: 'task', enabled: false },
          { identifier: 'main', enabled: true },
          { identifier: 'chatHistory', enabled: true },
        ],
      },
    ],
  };
}

function record(raw, sourceRoot = 'object') {
  return {
    createdAt: '2026-08-13T00:00:00.000Z',
    id: 'private-1',
    name: '测试预设',
    raw,
    sourceFileName: 'test.json',
    sourceFormat: 'legacy',
    sourceRoot,
    updatedAt: '2026-08-13T00:00:00.000Z',
  };
}

test('legacy prompt_order controls effective order and switches', () => {
  const imported = model.normalizePluginPresetImport(legacyPreset());
  assert.equal(imported.sourceFormat, 'legacy');
  const preset = model.readPluginPreset(record(imported.raw));
  assert.deepEqual(preset.prompts.map(prompt => prompt.id), ['task', 'main', 'chatHistory']);
  assert.deepEqual(preset.prompts.map(prompt => prompt.enabled), [false, true, true]);
  assert.deepEqual(model.buildPluginPresetOrderedPrompts(record(imported.raw)), [
    { content: 'A', role: 'system' },
    'chat_history',
    'user_input',
  ]);
});

test('missing native user input is inserted once after chat history without moving post-history prompts', () => {
  const raw = legacyPreset();
  raw.prompts.push({
    identifier: 'after-history',
    name: '历史收尾',
    role: 'system',
    content: '</history>',
    enabled: true,
  });
  raw.prompt_order[0].order.push({ identifier: 'after-history', enabled: true });

  assert.deepEqual(model.buildPluginPresetOrderedPrompts(record(raw)), [
    { content: 'A', role: 'system' },
    'chat_history',
    'user_input',
    { content: '</history>', role: 'system' },
  ]);
});

test('explicit native user input marker keeps its preset position and is not duplicated', () => {
  const raw = legacyPreset();
  raw.prompts.push({ identifier: 'userInput', name: '用户输入', enabled: true });
  raw.prompt_order[0].order = [
    { identifier: 'userInput', enabled: true },
    { identifier: 'main', enabled: true },
    { identifier: 'chatHistory', enabled: true },
    { identifier: 'task', enabled: false },
  ];

  assert.deepEqual(model.buildPluginPresetOrderedPrompts(record(raw)), [
    'user_input',
    { content: 'A', role: 'system' },
    'chat_history',
  ]);
});

test('built-in diary preset keeps the original order and includes the native generation request', () => {
  const imported = model.normalizePluginPresetImport(builtinDiaryRaw);
  const prompts = model.buildPluginPresetOrderedPrompts(record(imported.raw), {
    perspectiveName: '林见夏',
  });
  const chatHistoryIndex = prompts.indexOf('chat_history');

  assert.ok(chatHistoryIndex >= 0);
  assert.equal(prompts[chatHistoryIndex + 1], 'user_input');
  assert.equal(prompts.filter(prompt => prompt === 'user_input').length, 1);
  assert.match(prompts[0].content, /你是林见夏/u);
  assert.deepEqual(prompts[chatHistoryIndex + 2], { content: '</过往经历>', role: 'system' });
});

test('editing and reordering legacy prompts updates the exported prompt_order without dropping settings', () => {
  const presetRecord = record(structuredClone(legacyPreset()));
  model.patchPluginPresetPrompt(presetRecord, 'task', { enabled: true, name: '视角任务' });
  model.reorderPluginPresetPrompts(presetRecord, ['main', 'chatHistory', 'task']);
  assert.deepEqual(model.buildPluginPresetOrderedPrompts(presetRecord, { perspectiveName: '林见月' }).at(-1), {
    content: '林见月',
    role: 'user',
  });
  const exported = model.exportPluginPreset(presetRecord);
  assert.equal(exported.temperature, 0.8);
  assert.deepEqual(exported.prompt_order[0].order, [
    { identifier: 'main', enabled: true },
    { identifier: 'chatHistory', enabled: true },
    { identifier: 'task', enabled: true },
  ]);
  assert.equal(exported.prompts.find(prompt => prompt.identifier === 'task').name, '视角任务');
});

test('raw array imports export as an array and duplicate identifiers are rejected', () => {
  const imported = model.normalizePluginPresetImport([{ id: 'one', name: 'One', content: '1', role: 'system' }]);
  const modernRecord = { ...record(imported.raw, 'array'), sourceFormat: 'modern' };
  assert.ok(Array.isArray(model.exportPluginPreset(modernRecord)));
  assert.throws(
    () => model.normalizePluginPresetImport({ prompts: [{ identifier: 'x' }, { identifier: 'x' }] }),
    /重复标识/u,
  );
});
