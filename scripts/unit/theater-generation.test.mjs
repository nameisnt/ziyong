/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTheaterGenerateConfig, buildTheaterVersionSplitPrompt } from '../../src/apps/theater/generation.ts';

test('theater generation config keeps the draft fields and fixed capture values', () => {
  const config = buildTheaterGenerateConfig({
    appPrompt: '小剧场提示词',
    entryId: 'entry-1',
    mode: 'rewrite',
    outputFormat: '输出格式',
    typeId: 'type-1',
    typeName: '花吐症',
    typePrompt: '类型提示词',
    userRequirement: '追加要求',
  });
  assert.deepEqual(config, {
    appPrompt: '小剧场提示词',
    entryId: 'entry-1',
    existingContent: '',
    mode: 'rewrite',
    outputFormat: '输出格式',
    renderMode: 'markdown',
    typeId: 'type-1',
    typeName: '花吐症',
    typePrompt: '类型提示词',
    userRequirement: '追加要求',
  });
});

test('a single version cannot be split', () => {
  assert.equal(buildTheaterVersionSplitPrompt([{ id: 'v1' }], 'v1'), null);
  assert.equal(buildTheaterVersionSplitPrompt([], ''), null);
});

test('an unknown version cannot be split', () => {
  assert.equal(buildTheaterVersionSplitPrompt([{ id: 'v1' }, { id: 'v2' }], 'missing'), null);
  assert.equal(buildTheaterVersionSplitPrompt([{ id: 'v1' }, { id: 'v2' }], ''), null);
});

test('the split prompt names the version position and asks for confirmation', () => {
  const prompt = buildTheaterVersionSplitPrompt([{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }], 'v2');
  assert.deepEqual(prompt, {
    confirmLabel: '拆分版本',
    kind: 'warning',
    message: '将当前版本 2/3 拆分为独立小剧场，并从原记录中移除吗？',
  });
});
