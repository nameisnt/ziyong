import type { RawOrderedPrompt } from '@/core/generationService';
import type { TavernPreset, TavernPresetPrompt, TavernPresetPromptCopyInput } from './api';

export const PLUGIN_PRESET_SELECTION_PREFIX = 'plugin:';

export type PluginPresetSourceFormat = 'legacy' | 'modern';

export type PluginPresetRecord = {
  builtIn?: boolean;
  createdAt: string;
  hidden?: boolean;
  id: string;
  name: string;
  raw: Record<string, unknown>;
  sourceFileName: string;
  sourceFormat: PluginPresetSourceFormat;
  sourceRoot: 'array' | 'object';
  updatedAt: string;
};

type LegacyOrderItem = { enabled?: boolean; identifier?: unknown };
type LegacyOrderRecord = { character_id?: unknown; order?: LegacyOrderItem[] };

const PLACEHOLDER_BY_ID: Record<string, string> = {
  char_description: 'char_description',
  charDescription: 'char_description',
  char_personality: 'char_personality',
  charPersonality: 'char_personality',
  chat_history: 'chat_history',
  chatHistory: 'chat_history',
  dialogue_examples: 'dialogue_examples',
  dialogueExamples: 'dialogue_examples',
  persona_description: 'persona_description',
  personaDescription: 'persona_description',
  scenario: 'scenario',
  user_input: 'user_input',
  userInput: 'user_input',
  world_info_after: 'world_info_after',
  worldInfoAfter: 'world_info_after',
  world_info_before: 'world_info_before',
  worldInfoBefore: 'world_info_before',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneRecord(value: Record<string, unknown>) {
  // 预设来源本身必须是 JSON；JSON 往返既能去掉 Vue Proxy，也不会引入运行时专用字段。
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeRole(value: unknown): TavernPresetPrompt['role'] {
  return value === 'assistant' || value === 'user' || value === 'system' ? value : 'system';
}

function promptIdentifier(prompt: Record<string, unknown>, format: PluginPresetSourceFormat) {
  return String(
    format === 'legacy' ? (prompt.identifier ?? prompt.id ?? '') : (prompt.id ?? prompt.identifier ?? ''),
  ).trim();
}

function getRawPrompts(raw: Record<string, unknown>) {
  return Array.isArray(raw.prompts) ? raw.prompts.filter(isRecord) : [];
}

function getPromptGroupMetadata(raw: Record<string, unknown>) {
  const extensions = isRecord(raw.extensions) ? raw.extensions : null;
  const toolkit = extensions && isRecord(extensions.baibaiToolkit) ? extensions.baibaiToolkit : null;
  const state = toolkit && isRecord(toolkit.presetPromptGroups) ? toolkit.presetPromptGroups : null;
  return state && isRecord(state.prompts) ? state.prompts : null;
}

function getLegacyOrderRecords(raw: Record<string, unknown>) {
  return Array.isArray(raw.prompt_order) ? (raw.prompt_order.filter(isRecord) as LegacyOrderRecord[]) : [];
}

function getEffectiveLegacyOrderRecord(raw: Record<string, unknown>) {
  const records = getLegacyOrderRecords(raw);
  return (
    records.find(record => Number(record.character_id) === 100001) ??
    records.find(record => Number(record.character_id) === 100000) ??
    records[1] ??
    records[0] ??
    null
  );
}

function canonicalPrompt(rawPrompt: Record<string, unknown>, format: PluginPresetSourceFormat): TavernPresetPrompt {
  const id = promptIdentifier(rawPrompt, format);
  const rawPosition = isRecord(rawPrompt.position) ? rawPrompt.position : null;
  const position = rawPosition
    ? {
        depth: typeof rawPosition.depth === 'number' ? rawPosition.depth : undefined,
        order: typeof rawPosition.order === 'number' ? rawPosition.order : undefined,
        type: rawPosition.type === 'in_chat' ? ('in_chat' as const) : ('relative' as const),
      }
    : { type: 'relative' as const };
  return {
    content: typeof rawPrompt.content === 'string' ? rawPrompt.content : undefined,
    enabled: rawPrompt.enabled !== false,
    extra: {
      ...(isRecord(rawPrompt.extra) ? cloneRecord(rawPrompt.extra) : {}),
      tavern_phone_plugin: {
        category: typeof rawPrompt.category === 'string' ? rawPrompt.category : '',
        sourceIdentifier: id,
      },
    },
    id,
    name: String(rawPrompt.name || id),
    position,
    role: normalizeRole(rawPrompt.role),
  };
}

export function detectPluginPresetFormat(raw: Record<string, unknown>): PluginPresetSourceFormat {
  const prompts = getRawPrompts(raw);
  if (!prompts.length) throw new Error('预设中没有可读取的 prompts 条目');
  const legacy = prompts.some(prompt => 'identifier' in prompt) || Array.isArray(raw.prompt_order);
  return legacy ? 'legacy' : 'modern';
}

export function normalizePluginPresetImport(value: unknown) {
  const sourceRoot = Array.isArray(value) ? ('array' as const) : ('object' as const);
  const raw = Array.isArray(value) ? { prompts: value } : value;
  if (!isRecord(raw)) throw new Error('导入文件不是有效的预设 JSON');
  const sourceFormat = detectPluginPresetFormat(raw);
  const prompts = getRawPrompts(raw);
  const identifiers = prompts.map(prompt => promptIdentifier(prompt, sourceFormat));
  if (identifiers.some(id => !id)) throw new Error('预设中存在缺少 id/identifier 的条目');
  const duplicates = identifiers.filter((id, index) => identifiers.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`预设中存在重复标识：${[...new Set(duplicates)].slice(0, 5).join('、')}`);
  return { raw: cloneRecord(raw), sourceFormat, sourceRoot };
}

export function readPluginPreset(record: PluginPresetRecord): TavernPreset {
  const rawPrompts = getRawPrompts(record.raw);
  const canonicalById = new Map(
    rawPrompts.map(prompt => {
      const canonical = canonicalPrompt(prompt, record.sourceFormat);
      return [canonical.id, canonical];
    }),
  );
  let prompts = [...canonicalById.values()];

  if (record.sourceFormat === 'legacy') {
    const order = getEffectiveLegacyOrderRecord(record.raw)?.order ?? [];
    const orderedIds: string[] = [];
    const enabledById = new Map<string, boolean>();
    for (const item of order) {
      const id = String(item.identifier ?? '').trim();
      if (!id || orderedIds.includes(id)) continue;
      orderedIds.push(id);
      enabledById.set(id, item.enabled !== false);
    }
    prompts = [
      ...orderedIds.map(id => canonicalById.get(id)).filter((prompt): prompt is TavernPresetPrompt => Boolean(prompt)),
      ...prompts.filter(prompt => !orderedIds.includes(prompt.id)),
    ];
    prompts.forEach(prompt => {
      if (enabledById.has(prompt.id)) prompt.enabled = enabledById.get(prompt.id) as boolean;
    });
  }

  return {
    ...cloneRecord(record.raw),
    extensions: isRecord(record.raw.extensions) ? cloneRecord(record.raw.extensions) : {},
    prompts,
  } as TavernPreset;
}

function findRawPrompt(record: PluginPresetRecord, promptId: string) {
  const prompt = getRawPrompts(record.raw).find(item => promptIdentifier(item, record.sourceFormat) === promptId);
  if (!prompt) throw new Error('这个插件预设条目已经不存在');
  return prompt;
}

export function patchPluginPresetPrompt(
  record: PluginPresetRecord,
  promptId: string,
  patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled' | 'name' | 'role'>>,
) {
  const prompt = findRawPrompt(record, promptId);
  if (patch.content !== undefined) prompt.content = patch.content;
  if (patch.name !== undefined) prompt.name = patch.name;
  if (patch.role !== undefined) prompt.role = patch.role;
  if (patch.enabled !== undefined) {
    prompt.enabled = patch.enabled;
    if (record.sourceFormat === 'legacy') {
      const orderItem = getEffectiveLegacyOrderRecord(record.raw)?.order?.find(
        item => String(item.identifier ?? '') === promptId,
      );
      if (orderItem) orderItem.enabled = patch.enabled;
    }
  }
  record.updatedAt = new Date().toISOString();
}

export function reorderPluginPresetPrompts(record: PluginPresetRecord, orderedPromptIds: string[]) {
  const prompts = getRawPrompts(record.raw);
  const currentIds = prompts.map(prompt => promptIdentifier(prompt, record.sourceFormat));
  if (
    currentIds.length !== orderedPromptIds.length ||
    new Set(orderedPromptIds).size !== orderedPromptIds.length ||
    orderedPromptIds.some(id => !currentIds.includes(id))
  ) {
    throw new Error('插件预设条目已经发生变化，请刷新后再排序');
  }
  const byId = new Map(prompts.map(prompt => [promptIdentifier(prompt, record.sourceFormat), prompt]));
  record.raw.prompts = orderedPromptIds.map(id => byId.get(id) as Record<string, unknown>);
  if (record.sourceFormat === 'legacy') {
    const orderRecord = getEffectiveLegacyOrderRecord(record.raw);
    if (orderRecord) {
      const enabledById = new Map(
        (orderRecord.order ?? []).map(item => [String(item.identifier ?? ''), item.enabled !== false]),
      );
      orderRecord.order = orderedPromptIds.map(identifier => ({
        enabled: enabledById.get(identifier) ?? findRawPrompt(record, identifier).enabled !== false,
        identifier,
      }));
    }
  }
  record.updatedAt = new Date().toISOString();
}

export function deletePluginPresetPrompt(record: PluginPresetRecord, promptId: string) {
  findRawPrompt(record, promptId);
  record.raw.prompts = getRawPrompts(record.raw).filter(
    prompt => promptIdentifier(prompt, record.sourceFormat) !== promptId,
  );
  if (record.sourceFormat === 'legacy') {
    getLegacyOrderRecords(record.raw).forEach(orderRecord => {
      orderRecord.order = (orderRecord.order ?? []).filter(item => String(item.identifier ?? '') !== promptId);
    });
  }
  const groupMetadata = getPromptGroupMetadata(record.raw);
  if (groupMetadata) delete groupMetadata[promptId];
  record.updatedAt = new Date().toISOString();
}

export function duplicatePluginPresetPrompt(
  record: PluginPresetRecord,
  sourcePromptId: string,
  input: TavernPresetPromptCopyInput,
) {
  const prompts = getRawPrompts(record.raw);
  const sourceIndex = prompts.findIndex(prompt => promptIdentifier(prompt, record.sourceFormat) === sourcePromptId);
  if (sourceIndex < 0) throw new Error('原插件预设条目已经不存在');
  const source = cloneRecord(prompts[sourceIndex]);
  const id = `phone_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (record.sourceFormat === 'legacy') source.identifier = id;
  else source.id = id;
  source.name = input.name.trim();
  source.content = input.content;
  source.enabled = input.enabled ?? false;
  source.role = input.role;
  prompts.splice(sourceIndex + 1, 0, source);
  record.raw.prompts = prompts;
  if (record.sourceFormat === 'legacy') {
    const orderRecord = getEffectiveLegacyOrderRecord(record.raw);
    const order = orderRecord?.order ?? [];
    const orderIndex = order.findIndex(item => String(item.identifier ?? '') === sourcePromptId);
    order.splice(orderIndex < 0 ? order.length : orderIndex + 1, 0, {
      enabled: input.enabled ?? false,
      identifier: id,
    });
    if (orderRecord) orderRecord.order = order;
  }
  const groupMetadata = getPromptGroupMetadata(record.raw);
  const sourceGroupMetadata = groupMetadata?.[sourcePromptId];
  if (groupMetadata && isRecord(sourceGroupMetadata)) groupMetadata[id] = cloneRecord(sourceGroupMetadata);
  record.updatedAt = new Date().toISOString();
  return id;
}

export function exportPluginPreset(record: PluginPresetRecord) {
  const raw = cloneRecord(record.raw);
  const extensions = isRecord(raw.extensions) ? raw.extensions : null;
  const toolkit = extensions && isRecord(extensions.baibaiToolkit) ? extensions.baibaiToolkit : null;
  const groupState = toolkit && isRecord(toolkit.presetPromptGroups) ? toolkit.presetPromptGroups : null;
  const hasPromptGroups = Boolean(
    groupState &&
    ((Array.isArray(groupState.groups) && groupState.groups.length > 0) ||
      (isRecord(groupState.prompts) && Object.keys(groupState.prompts).length > 0)),
  );
  return record.sourceRoot === 'array' && Array.isArray(raw.prompts) && !hasPromptGroups ? raw.prompts : raw;
}

export function buildPluginPresetOrderedPrompts(
  record: PluginPresetRecord,
  variables: Record<string, string> = {},
): Array<RawOrderedPrompt | string> {
  const orderedPrompts = readPluginPreset(record).prompts.reduce<Array<RawOrderedPrompt | string>>(
    (ordered, prompt) => {
      if (!prompt.enabled) return ordered;
      const placeholder = PLACEHOLDER_BY_ID[prompt.id];
      if (placeholder) {
        ordered.push(placeholder);
        return ordered;
      }
      let content = prompt.content?.trim() || '';
      for (const [name, value] of Object.entries(variables)) {
        if (!/^[\w.-]+$/u.test(name)) continue;
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
        content = content.replace(new RegExp(`\\{\\{\\s*${escapedName}\\s*\\}\\}`, 'giu'), () => value);
      }
      if (content) ordered.push({ content, role: prompt.role });
      return ordered;
    },
    [],
  );

  // 酒馆聊天预设通常没有 userInput 标记：本轮输入原本由聊天生成流程自动接在
  // Chat History 后。插件私有预设使用 generateRaw，必须显式补回这个占位符，
  // 否则任务、类型、追加要求和输出格式会整段丢失。预设主动放置时仍尊重原位置。
  if (!orderedPrompts.includes('user_input')) {
    const chatHistoryIndex = orderedPrompts.indexOf('chat_history');
    orderedPrompts.splice(chatHistoryIndex < 0 ? orderedPrompts.length : chatHistoryIndex + 1, 0, 'user_input');
  }

  return orderedPrompts;
}

export function pluginPresetSelection(id: string) {
  return `${PLUGIN_PRESET_SELECTION_PREFIX}${id}`;
}

export function pluginPresetIdFromSelection(selection: string) {
  return selection.startsWith(PLUGIN_PRESET_SELECTION_PREFIX)
    ? selection.slice(PLUGIN_PRESET_SELECTION_PREFIX.length).trim()
    : '';
}

export function buildPluginPresetSelectionOptions(records: PluginPresetRecord[], currentSelection = '') {
  const currentId = pluginPresetIdFromSelection(currentSelection);
  return records
    .filter(record => !record.hidden || record.id === currentId)
    .map(record => ({
      ...(record.hidden ? { disabled: true } : {}),
      group: '插件预设',
      label: record.hidden ? `${record.name}（已隐藏，请重新选择）` : record.name,
      value: pluginPresetSelection(record.id),
    }));
}
