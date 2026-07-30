import { getLoadedPresetNameSafe, getOptionalGlobalFunction, getPresetNamesSafe } from '@/util/runtime';

export type TavernPresetPrompt = {
  content?: string;
  enabled: boolean;
  id: string;
  name: string;
  position?: {
    depth?: number;
    order?: number;
    type: 'in_chat' | 'relative';
  };
  role: 'assistant' | 'system' | 'user';
  [key: string]: unknown;
};

export type TavernPreset = {
  extensions: Record<string, unknown>;
  prompts: TavernPresetPrompt[];
  prompts_unused?: TavernPresetPrompt[];
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type BaibaiPresetGroup = {
  collapsed: boolean;
  enabled: boolean;
  id: string;
  name: string;
};

export type PresetDisplayNode =
  | {
      prompt: TavernPresetPrompt;
      type: 'prompt';
    }
  | {
      group: BaibaiPresetGroup;
      prompts: TavernPresetPrompt[];
      type: 'group';
    };

type GetPresetFn = (presetName: string) => unknown;
type LoadPresetFn = (presetName: string) => boolean | Promise<boolean>;
type UpdatePresetFn = (
  presetName: string,
  updater: (preset: TavernPreset) => TavernPreset,
  options?: { render?: 'debounced' | 'immediate' | 'none' },
) => Promise<unknown>;

const presetMutationQueues = new Map<string, Promise<void>>();

function requirePresetFunction<T extends (...args: never[]) => unknown>(name: string) {
  const fn = getOptionalGlobalFunction<T>(name);
  if (!fn) {
    throw new Error(`未检测到酒馆助手预设接口：${name}`);
  }
  return fn;
}

function assertPreset(value: unknown): TavernPreset {
  if (!value || typeof value !== 'object') {
    throw new Error('读取到的预设内容无效');
  }
  const preset = value as TavernPreset;
  if (!Array.isArray(preset.prompts)) {
    throw new Error('预设中没有可读取的条目列表');
  }
  if (!preset.extensions || typeof preset.extensions !== 'object') {
    return {
      ...preset,
      extensions: {},
    };
  }
  return preset;
}

export function listTavernPresets() {
  return getPresetNamesSafe();
}

export function getCurrentTavernPresetName() {
  return getLoadedPresetNameSafe().trim();
}

export function readTavernPreset(presetName: string) {
  const getPreset = requirePresetFunction<GetPresetFn>('getPreset');
  return assertPreset(getPreset(presetName));
}

export async function loadTavernPreset(presetName: string) {
  const loadPreset = requirePresetFunction<LoadPresetFn>('loadPreset');
  const loaded = await loadPreset(presetName);
  if (!loaded) {
    throw new Error(`无法切换到预设“${presetName}”`);
  }
}

function patchPrompt(
  preset: TavernPreset,
  promptId: string,
  patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled'>>,
) {
  const prompt = preset.prompts.find(item => item.id === promptId);
  if (!prompt) {
    throw new Error('这个预设条目已经不存在，请刷新后重试');
  }
  Object.assign(prompt, patch);
  return preset;
}

function enqueuePresetMutation<T>(presetName: string, task: () => Promise<T>) {
  const previous = presetMutationQueues.get(presetName) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  const settled = current.then(
    () => undefined,
    () => undefined,
  );
  presetMutationQueues.set(presetName, settled);
  void settled.finally(() => {
    if (presetMutationQueues.get(presetName) === settled) {
      presetMutationQueues.delete(presetName);
    }
  });
  return current;
}

export async function updateTavernPresetPrompt(
  presetName: string,
  promptId: string,
  patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled'>>,
) {
  return enqueuePresetMutation(presetName, async () => {
    const updatePresetWith = requirePresetFunction<UpdatePresetFn>('updatePresetWith');
    const stored = assertPreset(
      await updatePresetWith(presetName, preset => patchPrompt(preset, promptId, patch), { render: 'none' }),
    );

    let liveSynced = true;
    if (getCurrentTavernPresetName() === presetName) {
      try {
        await updatePresetWith('in_use', preset => patchPrompt(preset, promptId, patch), { render: 'immediate' });
      } catch {
        liveSynced = false;
      }
    }

    return { liveSynced, preset: stored };
  });
}

function readBaibaiGroupState(preset: TavernPreset) {
  const toolkit = preset.extensions.baibaiToolkit;
  if (!toolkit || typeof toolkit !== 'object') return null;
  const rawState = (toolkit as Record<string, unknown>).presetPromptGroups;
  if (!rawState || typeof rawState !== 'object') return null;

  const state = rawState as {
    groups?: unknown;
    prompts?: unknown;
  };
  if (!Array.isArray(state.groups) || !state.prompts || typeof state.prompts !== 'object') return null;

  const groups = state.groups
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index): BaibaiPresetGroup | null => {
      const id = String(item.id || '').trim();
      if (!id) return null;
      return {
        collapsed: Boolean(item.collapsed),
        enabled: item.enabled !== false,
        id,
        name: String(item.name || `分组 ${index + 1}`),
      };
    })
    .filter((item): item is BaibaiPresetGroup => Boolean(item));

  if (!groups.length) return null;
  return {
    groups,
    prompts: state.prompts as Record<string, unknown>,
  };
}

export function buildPresetDisplayNodes(preset: TavernPreset): PresetDisplayNode[] {
  const groupState = readBaibaiGroupState(preset);
  if (!groupState) {
    return preset.prompts.map(prompt => ({ prompt, type: 'prompt' }));
  }

  const groupById = new Map(groupState.groups.map(group => [group.id, group]));
  const promptGroupIds = new Map<string, string>();
  for (const [promptId, rawMeta] of Object.entries(groupState.prompts)) {
    if (!rawMeta || typeof rawMeta !== 'object') continue;
    const groupId = String((rawMeta as Record<string, unknown>).groupId || '');
    if (groupById.has(groupId)) {
      promptGroupIds.set(promptId, groupId);
    }
  }

  if (!promptGroupIds.size) {
    return preset.prompts.map(prompt => ({ prompt, type: 'prompt' }));
  }

  const renderedGroups = new Set<string>();
  const nodes: PresetDisplayNode[] = [];
  for (const prompt of preset.prompts) {
    const groupId = promptGroupIds.get(prompt.id);
    if (!groupId) {
      nodes.push({ prompt, type: 'prompt' });
      continue;
    }
    if (renderedGroups.has(groupId)) continue;

    const group = groupById.get(groupId);
    if (!group) {
      nodes.push({ prompt, type: 'prompt' });
      continue;
    }
    renderedGroups.add(groupId);
    nodes.push({
      group,
      prompts: preset.prompts.filter(item => promptGroupIds.get(item.id) === groupId),
      type: 'group',
    });
  }

  return nodes;
}
