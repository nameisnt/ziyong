/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPreviewContent,
  buildPreviewRaw,
  buildRequirementText,
  buildStageUserInput,
  getStagePriorOutputs,
  parseActorInput,
  stageIcon,
} from '../../src/apps/card-writer/prompt.ts';

function stage(overrides) {
  return { content: '', error: '', id: 'stage-1', label: '一、角色定位', raw: '', status: 'idle', ...overrides };
}

test('parseActorInput expands counts and splits names', () => {
  assert.deepEqual(parseActorInput('2', '主角'), { error: '', names: ['主角1', '主角2'] });
  assert.deepEqual(parseActorInput('沈砚，苏晚 沈砚', '主角'), { error: '', names: ['沈砚', '苏晚'] });
  assert.deepEqual(parseActorInput('', '主角', true), { error: '', names: [] });
});

test('parseActorInput rejects mixed and out-of-range input', () => {
  assert.equal(parseActorInput('', '主角').error, '请填写至少一个主角');
  assert.equal(parseActorInput('0', '主角').error, '主角数量需为 1-20');
  assert.equal(parseActorInput('21', 'NPC').error, 'NPC数量需为 1-20');
  assert.equal(parseActorInput('沈砚 2', '主角').error, '姓名列表和数量不能混填');
});

test('stage icons map every status', () => {
  assert.equal(stageIcon('completed'), 'fa-solid fa-check');
  assert.equal(stageIcon('running'), 'fa-solid fa-spinner fa-spin');
  assert.equal(stageIcon('failed'), 'fa-solid fa-triangle-exclamation');
  assert.equal(stageIcon('idle'), 'fa-regular fa-circle');
  assert.equal(stageIcon('queued'), 'fa-regular fa-circle');
});

test('preview aggregates only completed stages with content', () => {
  const stages = [
    stage({ content: '甲', id: 'a', label: 'A', status: 'completed' }),
    stage({ content: '  ', id: 'b', label: 'B', status: 'completed' }),
    stage({ content: '丙', id: 'c', label: 'C', status: 'running' }),
  ];
  assert.equal(buildPreviewContent(stages), '甲');
  assert.equal(buildPreviewContent([...stages, stage({ content: '丁', id: 'd', label: 'D', status: 'completed' })]), '## A\n\n甲\n\n## D\n\n丁');

  const withRaw = [
    stage({ id: 'a', label: 'A', raw: '原文A' }),
    stage({ id: 'b', label: 'B', raw: ' ' }),
    stage({ id: 'c', label: 'C', raw: ' 原文C ' }),
  ];
  assert.equal(buildPreviewRaw(withRaw), '【A】\n原文A\n\n【C】\n原文C');
  assert.equal(buildPreviewRaw([]), '');
});

test('requirement text follows the task mode', () => {
  const base = {
    brief: { concept: '', experience: '', relationship: '', worldHint: '', worldMode: 'auto' },
    fullCardMode: 'brief',
    npcNames: [],
    plotRequirement: '',
    protagonistNames: [],
    taskId: 'character',
    userRequirement: '',
  };
  assert.equal(
    buildRequirementText({ ...base, userRequirement: '  写个冷面剑客 ' }),
    '写个冷面剑客',
  );
  assert.equal(
    buildRequirementText(base),
    '请根据已选择的聊天、引用与世界书素材完成创作。',
  );

  const plot = buildRequirementText({
    ...base,
    fullCardMode: 'plot',
    npcNames: ['阿九'],
    plotRequirement: '旧城重逢',
    protagonistNames: ['沈砚', '苏晚'],
    taskId: 'full-card',
  });
  assert.match(plot, /^主角：沈砚、苏晚\nNPC：阿九\n写卡依据：/u);
  assert.match(plot, /剧情与要求：旧城重逢$/u);

  const brief = buildRequirementText({
    ...base,
    brief: { concept: '  落魄剑客 ', experience: '', relationship: '', worldHint: '', worldMode: 'custom' },
    fullCardMode: 'brief',
    taskId: 'full-card',
  });
  assert.match(brief, /^角色核心点子：落魄剑客$/mu);
  assert.match(brief, /与玩家的关系：未指定，请安排适合展开故事的初始关系。/u);
  assert.match(brief, /故事世界：补全自定义世界。/u);
});

test('stage user input keeps the fixed execution contract', () => {
  const input = buildStageUserInput('二、剧情', '写剧情', [{ content: '甲', label: '一、角色' }], '要求', '引用正文');
  assert.match(input, /当前阶段：二、剧情/u);
  assert.match(input, /【其他 App 引用】\n引用正文/u);
  assert.match(input, /【已完成阶段：一、角色】\n甲/u);
  assert.match(input, /不要继续提问/u);
  assert.match(input, /<content><artifact>\.\.\.<\/artifact><\/content>/u);
  assert.equal(buildStageUserInput('A', 'i', [], 'r', '').includes('【其他 App 引用】'), false);
});

test('prior outputs respect stage dependencies', () => {
  const stages = [
    stage({ content: '甲', id: 'a', label: 'A', status: 'completed' }),
    stage({ content: '乙', id: 'b', label: 'B', status: 'completed' }),
    stage({ content: '丙', id: 'c', label: 'C', status: 'failed' }),
  ];
  assert.deepEqual(getStagePriorOutputs(stages, { dependencyIds: undefined }), [
    { content: '甲', label: 'A' },
    { content: '乙', label: 'B' },
  ]);
  assert.deepEqual(getStagePriorOutputs(stages, { dependencyIds: ['b'] }), [{ content: '乙', label: 'B' }]);
  assert.deepEqual(getStagePriorOutputs(stages, { dependencyIds: ['c'] }), []);
});
