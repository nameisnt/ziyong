import type { CardWriterStage, CardWriterTaskId, FullCardMode } from './preset';
import type { CardWriterStageResult } from './store';

export interface CardWriterActorInput {
  error: string;
  names: string[];
}

export interface CardWriterRequirementInput {
  brief: {
    concept: string;
    experience: string;
    relationship: string;
    worldHint: string;
    worldMode: 'auto' | 'custom' | 'existing';
  };
  fullCardMode: FullCardMode;
  npcNames: string[];
  plotRequirement: string;
  protagonistNames: string[];
  taskId: CardWriterTaskId;
  userRequirement: string;
}

export function stageIcon(status: CardWriterStageResult['status']) {
  if (status === 'completed') return 'fa-solid fa-check';
  if (status === 'running') return 'fa-solid fa-spinner fa-spin';
  if (status === 'failed') return 'fa-solid fa-triangle-exclamation';
  return 'fa-regular fa-circle';
}

export function parseActorInput(value: string, fallbackLabel: string, optional = false): CardWriterActorInput {
  const normalized = value.trim();
  if (!normalized) return { error: optional ? '' : `请填写至少一个${fallbackLabel}`, names: [] };
  if (/^\d+$/u.test(normalized)) {
    const count = Number(normalized);
    if (count < 1 || count > 20) return { error: `${fallbackLabel}数量需为 1-20`, names: [] };
    return { error: '', names: Array.from({ length: count }, (_item, index) => `${fallbackLabel}${index + 1}`) };
  }
  const tokens = normalized
    .split(/[\s,，、]+/u)
    .map(name => name.trim())
    .filter(Boolean);
  if (tokens.some(token => /^\d+$/u.test(token))) {
    return { error: '姓名列表和数量不能混填', names: [] };
  }
  const names = [...new Set(tokens)];
  return names.length ? { error: '', names } : { error: optional ? '' : `请填写至少一个${fallbackLabel}`, names: [] };
}

export function buildPreviewContent(stages: CardWriterStageResult[]) {
  const completed = stages.filter(stage => stage.status === 'completed' && stage.content.trim());
  if (completed.length === 1) return completed[0].content.trim();
  return completed.map(stage => `## ${stage.label}\n\n${stage.content.trim()}`).join('\n\n');
}

export function buildPreviewRaw(stages: CardWriterStageResult[]) {
  return stages
    .filter(stage => stage.raw.trim())
    .map(stage => `【${stage.label}】\n${stage.raw.trim()}`)
    .join('\n\n');
}

export function buildRequirementText(input: CardWriterRequirementInput) {
  if (input.taskId !== 'full-card') {
    return (
      input.userRequirement.trim() || '请根据已选择的聊天、引用与世界书素材完成创作。'
    );
  }
  if (input.fullCardMode === 'plot') {
    return [
      `主角：${input.protagonistNames.join('、')}`,
      `NPC：${input.npcNames.join('、') || '不额外生成 NPC'}`,
      '写卡依据：优先依据选中的聊天楼层、引用和世界书还原当前剧情，不要擅自改写已经发生的事实。',
      `剧情与要求：${input.plotRequirement.trim() || '根据所选素材提炼剧情，并补全适合继续互动的角色卡。'}`,
    ].join('\n');
  }
  const worldDescription =
    input.brief.worldMode === 'auto'
      ? '由 AI 自动安排适合角色发展的世界。'
      : input.brief.worldHint.trim() ||
        (input.brief.worldMode === 'existing' ? '沿用用户指定的已有世界。' : '补全自定义世界。');
  return [
    `角色核心点子：${input.brief.concept.trim()}`,
    `与玩家的关系：${input.brief.relationship.trim() || '未指定，请安排适合展开故事的初始关系。'}`,
    `期望体验：${input.brief.experience.trim() || '未指定，请根据角色设定安排自然的互动氛围。'}`,
    `故事世界：${worldDescription}`,
  ].join('\n');
}

export function buildStageUserInput(
  stageLabel: string,
  instruction: string,
  priorOutputs: Array<{ label: string; content: string }>,
  requirement: string,
  referencesText: string,
) {
  return [
    '【小手机自动写卡任务】',
    `当前阶段：${stageLabel}`,
    instruction,
    '',
    '【用户要求】',
    requirement,
    ...(referencesText ? ['', '【其他 App 引用】', referencesText] : []),
    ...priorOutputs.flatMap(item => ['', `【已完成阶段：${item.label}】`, item.content]),
    '',
    '【自动执行约定】',
    '用户已经完成本轮信息提供。不要继续提问，不要声称调用 Write、Edit、Read 或 SetAttribute。',
    '直接生成当前阶段最终成品；用户未明确的细节只做不冲突的最小补足。',
    '最终成品必须放入 <content><artifact>...</artifact></content>，不要输出下一步建议。',
  ].join('\n');
}

export function getStagePriorOutputs(stages: CardWriterStageResult[], stage: CardWriterStage) {
  const completed = stages.filter(item => item.status === 'completed' && item.content.trim());
  if (!stage.dependencyIds) return completed.map(item => ({ content: item.content, label: item.label }));
  const dependencyIds = new Set(stage.dependencyIds);
  return completed
    .filter(item => dependencyIds.has(item.id))
    .map(item => ({ content: item.content, label: item.label }));
}
