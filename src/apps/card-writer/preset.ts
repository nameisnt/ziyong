import presetRaw from './assets/qiuqingzi-card-writer-preset.json?raw';
import type { RawOrderedPrompt } from '@/core/generationService';

type PresetPrompt = {
  content?: string;
  enabled?: boolean;
  identifier: string;
  name?: string;
  role?: RawOrderedPrompt['role'];
};

type PresetOrderItem = {
  enabled: boolean;
  identifier: string;
};

type WriterPreset = {
  prompt_order: Array<{ order: PresetOrderItem[] }>;
  prompts: PresetPrompt[];
};

export type CardWriterTaskId =
  'full-card' | 'persona' | 'worldview' | 'npc' | 'character-base' | 'palette' | 'quick-view' | 'opening' | 'free';

export type CardWriterStage = {
  dependencyIds?: string[];
  id: string;
  instruction: string;
  label: string;
  modules: string[];
};

export type FullCardMode = 'blank' | 'plot';

export type CardWriterTask = {
  description: string;
  id: CardWriterTaskId;
  label: string;
  stages: CardWriterStage[];
};

const singleStage = (id: string, label: string, moduleName: string, instruction: string): CardWriterStage => ({
  id,
  instruction,
  label,
  modules: [moduleName],
});

const worldviewStage = singleStage('worldview', '世界观', '📋 世界观', '整理并生成可直接使用的世界观设定。');
const characterBaseStage = singleStage('character-base', '角色基础', '📋 角色基础', '生成主要角色的完整基础信息。');
const paletteStage = singleStage('palette', '性格调色盘', '📋 性格调色盘', '根据现有设定生成角色性格调色盘。');
const quickViewStage = singleStage('quick-view', '角色速览', '📋 角色速览', '把已有角色资料整理成简洁的角色速览。');
const openingStage = singleStage('opening', '开场白', '📋 开场白', '根据已有世界观和角色资料生成可直接使用的开场白。');

function targetedStage(
  stage: CardWriterStage,
  id: string,
  label: string,
  instruction: string,
  dependencyIds: string[],
): CardWriterStage {
  return { ...stage, dependencyIds, id, instruction, label };
}

export function buildFullCardStages(mode: FullCardMode, protagonists: string[], npcs: string[]): CardWriterStage[] {
  if (mode === 'blank') {
    return [
      { ...worldviewStage, dependencyIds: [] },
      { ...characterBaseStage, dependencyIds: ['worldview'] },
      { ...paletteStage, dependencyIds: ['worldview', 'character-base'] },
      { ...quickViewStage, dependencyIds: ['worldview', 'character-base', 'palette'] },
      { ...openingStage, dependencyIds: ['worldview', 'quick-view'] },
    ];
  }

  const stages: CardWriterStage[] = [{ ...worldviewStage, dependencyIds: [] }];
  const protagonistOutputIds: string[] = [];
  protagonists.forEach((name, index) => {
    const suffix = index + 1;
    const baseId = `character-base-${suffix}`;
    const paletteId = `palette-${suffix}`;
    stages.push(
      targetedStage(
        characterBaseStage,
        baseId,
        `角色基础（${name}）`,
        `只为主角“${name}”生成完整基础信息，不要混入其他角色的人设。`,
        ['worldview'],
      ),
      targetedStage(
        paletteStage,
        paletteId,
        `性格调色盘（${name}）`,
        `只为主角“${name}”生成性格调色盘，并保持与其角色基础一致。`,
        ['worldview', baseId],
      ),
    );
    protagonistOutputIds.push(baseId, paletteId);
  });
  npcs.forEach((name, index) => {
    const npcId = `npc-${index + 1}`;
    stages.push(
      targetedStage(
        singleStage(npcId, `NPC 人物（${name}）`, '📋 NPC设计', ''),
        npcId,
        `NPC 人物（${name}）`,
        `只生成 NPC“${name}”，明确其剧情功能、与主角的关系及可推动的冲突。`,
        ['worldview', ...protagonistOutputIds],
      ),
    );
  });
  const allRoleOutputIds = [...protagonistOutputIds, ...npcs.map((_name, index) => `npc-${index + 1}`)];
  stages.push(
    targetedStage(quickViewStage, 'quick-view', '角色速览', '汇总全部主角与 NPC，生成简洁角色速览。', [
      'worldview',
      ...allRoleOutputIds,
    ]),
    targetedStage(openingStage, 'opening', '开场白', '根据世界观与角色速览生成可直接使用的开场白。', [
      'worldview',
      'quick-view',
    ]),
  );
  return stages;
}

export const CARD_WRITER_TASKS: CardWriterTask[] = [
  {
    id: 'full-card',
    label: '一键写卡',
    description: '依次生成世界观、角色基础、性格、速览与开场白',
    stages: [worldviewStage, characterBaseStage, paletteStage, quickViewStage, openingStage],
  },
  {
    id: 'persona',
    label: '只生成人设',
    description: '生成普通或多阶段性格调色盘，不连带生成整张卡',
    stages: [paletteStage],
  },
  { id: 'worldview', label: '世界观', description: '从当前素材整理世界设定', stages: [worldviewStage] },
  {
    id: 'npc',
    label: 'NPC 人物',
    description: '生成一个或多个功能明确的 NPC',
    stages: [singleStage('npc', 'NPC 人物', '📋 NPC设计', '根据素材生成用户需要的 NPC 人物。')],
  },
  {
    id: 'character-base',
    label: '角色基础',
    description: '生成主要角色基础资料',
    stages: [characterBaseStage],
  },
  { id: 'palette', label: '性格调色盘', description: '生成角色性格与行为逻辑', stages: [paletteStage] },
  { id: 'quick-view', label: '角色速览', description: '压缩为便于模型读取的总览', stages: [quickViewStage] },
  { id: 'opening', label: '开场白', description: '生成角色卡第一条消息', stages: [openingStage] },
  {
    id: 'free',
    label: '自由创作',
    description: '使用秋青子自由创作模块',
    stages: [singleStage('free', '自由创作', '📋 自由创作助手', '严格按用户要求完成本轮自由创作。')],
  },
];

export function getCardWriterTaskStages(task: CardWriterTask, personaMode: 'multistage' | 'normal') {
  if (task.id !== 'persona') return task.stages;
  return [
    singleStage(
      'persona',
      personaMode === 'multistage' ? '多阶段人设' : '普通人设',
      personaMode === 'multistage' ? '📋 多阶段调色盘' : '📋 性格调色盘',
      personaMode === 'multistage'
        ? '根据用户提供的阶段、关系变化与角色底色，直接生成可用的多阶段调色盘人设。'
        : '根据用户提供的角色底色、矛盾感、行为逻辑与关系触发，直接生成可用的普通调色盘人设。',
    ),
  ];
}

const preset = JSON.parse(presetRaw) as WriterPreset;
const promptsById = new Map(preset.prompts.map(prompt => [String(prompt.identifier), prompt]));
const TASK_SECTION_START = new Set(['【一般条目】', '【MVU条目】']);
const TASK_SECTION_END = new Set(['【/一般条目】', '【/MVU条目】']);
const markerNames = new Set([...TASK_SECTION_START, ...TASK_SECTION_END, '【/worldinfo】']);

function normalizeMacros(content: string, moduleNames: string[], userInput: string) {
  return content
    .replace(/\{\{\/\/[^{}]*\}\}/gu, '')
    .replace(/\{\{setvar::template_knowledge::[^{}]*\}\}/gu, '')
    .replace(/\{\{addvar::template_knowledge::([^{}]*)\}\}/gu, '$1')
    .replace(/\{\{getvar::template_knowledge\}\}/gu, moduleNames.join('、'))
    .replace(/\{\{lastUserMessage\}\}/gu, userInput)
    .replace(/\{\{trim\}\}/gu, '')
    .replace(/\{\{random::([^{}]*)\}\}/gu, (_match, values: string) => values.split(/::|,/u)[0] || '')
    .replace(/\{\{format_message_variable::[^{}]*\}\}/gu, '')
    .replace(/\{\{user\}\}/gu, '用户')
    .trim();
}

function safeThinkingPrompt(id: string, selectedModules: string[]) {
  if (id === '41') return '<thinking>\n[metacognition]';
  if (id === '42') {
    return [
      `- 当前任务模块：${selectedModules.join('、')}`,
      '- 简要检查用户明确要求、现有素材与已完成阶段。',
      '- 检查输出是否可直接用于角色卡或世界书。',
      '- 不展开隐藏推理，只写简短任务自检摘要。',
    ].join('\n');
  }
  if (id === '43') return '</thinking>';
  if (id === '44') {
    return [
      '输出格式要求（强制执行）',
      '<thinking>[简短任务自检摘要]</thinking>',
      '<content><artifact>[本阶段最终成品]</artifact></content>',
      '不得在标签外输出内容，所有标签必须闭合。',
    ].join('\n');
  }
  if (id === '48') return '好的，我会直接完成本阶段，并从简短任务自检开始。\n<thinking>';
  return null;
}

export function buildCardWriterOrderedPrompts(options: {
  assistantPrefillEnabled: boolean;
  chatMessages: ChatMessage[];
  modules: string[];
  userInput: string;
  worldbookContent: string;
}) {
  const selectedModules = new Set(options.modules);
  const ordered: RawOrderedPrompt[] = [];
  const order = preset.prompt_order[0]?.order ?? [];
  let inTaskSection = false;
  let taskInserted = false;
  let worldbookClosed = false;

  for (const orderItem of order) {
    const id = String(orderItem.identifier);
    const prompt = promptsById.get(id);
    const name = prompt?.name || '';

    if (TASK_SECTION_START.has(name)) {
      inTaskSection = true;
      continue;
    }
    if (TASK_SECTION_END.has(name)) {
      inTaskSection = false;
      continue;
    }
    if (inTaskSection && !selectedModules.has(name)) continue;
    if (markerNames.has(name)) continue;

    if (id === 'worldInfoBefore') {
      if (options.worldbookContent.trim()) {
        ordered.push({ role: 'system', content: options.worldbookContent.trim() });
        ordered.push({ role: 'system', content: '</worldinfo>' });
        worldbookClosed = true;
      }
      continue;
    }
    if (
      [
        'charDescription',
        'personaDescription',
        'charPersonality',
        'scenario',
        'worldInfoAfter',
        'dialogueExamples',
      ].includes(id)
    ) {
      continue;
    }
    if (id === 'chatHistory') {
      if (!worldbookClosed && options.worldbookContent.trim())
        ordered.push({ role: 'system', content: '</worldinfo>' });
      options.chatMessages.forEach(message => {
        if (!message.message.trim()) return;
        ordered.push({
          role: message.role === 'assistant' || message.role === 'system' ? message.role : 'user',
          content: message.message.trim(),
        });
      });
      continue;
    }

    if (id === '45') continue;
    if (id === '48') {
      ordered.push({ role: 'user', content: options.userInput.trim() });
      taskInserted = true;
      if (!options.assistantPrefillEnabled) continue;
    }

    const shouldUse = inTaskSection ? selectedModules.has(name) : orderItem.enabled && prompt?.enabled !== false;
    if (!prompt || !shouldUse || !prompt.role || !prompt.content?.trim()) continue;
    if (name === '【worldinfo】' && !options.worldbookContent.trim()) continue;

    const safeThinking = safeThinkingPrompt(id, options.modules);
    const content = normalizeMacros(safeThinking ?? prompt.content, options.modules, options.userInput);
    if (content) ordered.push({ role: prompt.role, content });
  }

  if (!taskInserted) ordered.push({ role: 'user', content: options.userInput.trim() });

  return ordered;
}

export function parseCardWriterArtifact(rawOutput: string, stageLabel = '当前阶段') {
  if (!/<content\b[^>]*>/iu.test(rawOutput)) throw new Error(`${stageLabel}缺少 <content> 起始标签`);
  const contentMatch = rawOutput.match(/<content\b[^>]*>([\s\S]*?)<\/content>/iu);
  if (!contentMatch) throw new Error(`${stageLabel}的 <content> 标签未闭合`);
  const content = contentMatch[1];
  if (!/<artifact\b[^>]*>/iu.test(content)) throw new Error(`${stageLabel}缺少 <artifact> 起始标签`);
  const artifactMatch = content.match(/<artifact\b[^>]*>([\s\S]*?)<\/artifact>/iu);
  if (!artifactMatch) throw new Error(`${stageLabel}的 <artifact> 标签未闭合`);
  const artifact = artifactMatch[1]
    .trim()
    .replace(/^```(?:ya?ml|markdown|md|text)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim();
  if (!artifact) throw new Error(`${stageLabel}的 <artifact> 内容为空`);
  return artifact;
}
