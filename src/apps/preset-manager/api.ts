import {
  getLoadedPresetNameSafe,
  getOptionalGlobalFunction,
  getOptionalGlobalValue,
  getPresetNamesSafe,
} from '@/util/runtime';

export type TavernPresetPrompt = {
  content?: string;
  enabled: boolean;
  extra?: Record<string, unknown>;
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

export type TavernPresetPromptCopyInput = {
  content: string;
  enabled?: boolean;
  name: string;
  role: TavernPresetPrompt['role'];
};

type GetPresetFn = (presetName: string) => unknown;
type CreatePresetFn = (presetName: string, preset: TavernPreset) => boolean | Promise<boolean>;
type LoadPresetFn = (presetName: string) => boolean | Promise<boolean>;
type UpdatePresetFn = (
  presetName: string,
  updater: (preset: TavernPreset) => TavernPreset,
  options?: { render?: 'debounced' | 'immediate' | 'none' },
) => Promise<unknown>;

const presetMutationQueues = new Map<string, Promise<void>>();

type PresetManagerMutationApi = {
  deletePreset?: (name: string) => unknown;
};

type DeletePresetFn = (name: string) => boolean | Promise<boolean>;

type TavernHelperPresetMutationApi = {
  deletePreset?: DeletePresetFn;
};

function getTavernHelperPresetMutationApi() {
  return getOptionalGlobalValue<TavernHelperPresetMutationApi>('TavernHelper');
}

function getPresetMutationManager() {
  const getManager = getOptionalGlobalFunction<(apiId?: string) => unknown>('getPresetManager');
  return getManager?.('openai') as PresetManagerMutationApi | null | undefined;
}

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

function readPresetFromManager(presetName: string) {
  const getManager = getOptionalGlobalFunction<(apiId?: string) => unknown>('getPresetManager');
  if (!getManager) return undefined;
  const manager = getManager('openai') as
    | {
        findPreset?: (name: string) => unknown;
        getCompletionPresetByName?: (name: string) => unknown;
        getPreset?: (name: string) => unknown;
        getSelectedPresetName?: () => unknown;
        selected_preset?: unknown;
        selectedPreset?: unknown;
      }
    | null
    | undefined;
  const selectedName = manager?.getSelectedPresetName?.();
  const selectedFallback =
    selectedName === presetName ? (manager?.selectedPreset ?? manager?.selected_preset) : undefined;
  return (
    manager?.getCompletionPresetByName?.(presetName) ??
    manager?.findPreset?.(presetName) ??
    manager?.getPreset?.(presetName) ??
    selectedFallback
  );
}

export function listTavernPresets() {
  return getPresetNamesSafe();
}

export function getCurrentTavernPresetName() {
  return getLoadedPresetNameSafe().trim();
}

export function readTavernPreset(presetName: string) {
  const getPreset = getOptionalGlobalFunction<GetPresetFn>('getPreset');
  let directError: unknown = null;
  if (getPreset) {
    try {
      return assertPreset(getPreset(presetName));
    } catch (caughtError) {
      directError = caughtError;
    }
  }

  try {
    const fallback = readPresetFromManager(presetName);
    if (fallback !== undefined) return assertPreset(fallback);
  } catch (caughtError) {
    directError ??= caughtError;
  }

  if (directError instanceof Error) throw directError;
  throw new Error(`无法读取预设“${presetName}”：当前环境只提供了预设名称，没有提供完整预设内容`);
}

export async function createTavernPreset(presetName: string, preset: TavernPreset) {
  const name = presetName.trim();
  if (!name || name === 'in_use') throw new Error('预设名称无效');
  if (listTavernPresets().includes(name)) throw new Error(`已经存在名为“${name}”的预设`);
  const createPreset = requirePresetFunction<CreatePresetFn>('createPreset');
  const created = await createPreset(name, structuredClone(assertPreset(preset)));
  if (!created || !listTavernPresets().includes(name)) {
    throw new Error('酒馆未能确认目标预设已创建');
  }
  return readTavernPreset(name);
}

export async function loadTavernPreset(presetName: string) {
  const loadPreset = requirePresetFunction<LoadPresetFn>('loadPreset');
  const loaded = await loadPreset(presetName);
  if (!loaded) {
    throw new Error(`无法切换到预设“${presetName}”`);
  }
}

export async function renameTavernPreset(oldName: string, newName: string) {
  const sourceName = oldName.trim();
  const targetName = newName.trim();
  if (!sourceName || !targetName) throw new Error('预设名称不能为空');
  if (sourceName === targetName) return { current: getCurrentTavernPresetName() === sourceName };
  if (listTavernPresets().includes(targetName)) throw new Error(`已经存在名为“${targetName}”的预设`);
  // 当前宿主的 renamePreset 会加载目标预设，并可能触发内置正则导入；
  // manager.renamePreset 又依赖会被弹窗流程污染的当前选择，均不满足原子改名契约。
  throw new Error('当前酒馆没有不切换预设、不导入正则的安全改名接口；插件已阻止本次操作');
}

export async function deleteTavernPreset(presetName: string) {
  const name = presetName.trim();
  if (!name) throw new Error('预设名称不能为空');
  if (getCurrentTavernPresetName() === name) {
    throw new Error('不能直接删除当前正在使用的预设，请先切换到其他预设');
  }
  const helper = getTavernHelperPresetMutationApi();
  const deletePreset = helper?.deletePreset?.bind(helper);
  const manager = getPresetMutationManager();
  if (deletePreset) {
    const deleted = await deletePreset(name);
    if (!deleted) throw new Error('酒馆拒绝了预设删除，请刷新列表后重试');
  } else if (manager?.deletePreset) {
    await manager.deletePreset(name);
  } else {
    throw new Error('当前酒馆没有提供预设删除接口');
  }
  if (listTavernPresets().includes(name)) throw new Error('酒馆未能确认预设已删除，请刷新后重试');
}

function patchPrompt(
  preset: TavernPreset,
  promptId: string,
  patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled' | 'name' | 'role'>>,
) {
  const prompt = preset.prompts.find(item => item.id === promptId);
  if (!prompt) {
    throw new Error('这个预设条目已经不存在，请刷新后重试');
  }
  Object.assign(prompt, patch);
  return preset;
}

function getBaibaiPromptGroupMetadata(preset: TavernPreset) {
  const toolkit = preset.extensions.baibaiToolkit;
  if (!toolkit || typeof toolkit !== 'object') return null;
  const state = (toolkit as Record<string, unknown>).presetPromptGroups;
  if (!state || typeof state !== 'object') return null;
  const prompts = (state as Record<string, unknown>).prompts;
  return prompts && typeof prompts === 'object' ? (prompts as Record<string, unknown>) : null;
}

function normalizeInChatPromptOrder(preset: TavernPreset) {
  const groupIndexes = new Map<string, number>();
  for (const prompt of preset.prompts) {
    if (prompt.position?.type !== 'in_chat') continue;
    const key = `${prompt.role}:${prompt.position.depth ?? 0}`;
    const order = groupIndexes.get(key) ?? 0;
    prompt.position.order = order;
    groupIndexes.set(key, order + 1);
  }
}

function removeEntryLibraryBindingMarker(prompt: TavernPresetPrompt) {
  const phone = prompt.extra?.tavern_phone;
  if (!phone || typeof phone !== 'object') return;
  delete (phone as Record<string, unknown>).entryLibraryBindingId;
  if (!Object.keys(phone).length) delete prompt.extra?.tavern_phone;
  if (prompt.extra && !Object.keys(prompt.extra).length) delete prompt.extra;
}

function createCopiedPrompt(
  source: TavernPresetPrompt,
  promptId: string,
  input: TavernPresetPromptCopyInput,
): TavernPresetPrompt {
  const copied = structuredClone(source);
  copied.id = promptId;
  copied.name = input.name.trim() || `${source.name || source.id} - 副本`;
  copied.content = input.content;
  copied.enabled = input.enabled ?? false;
  copied.role = input.role;
  copied.position = copied.position ? structuredClone(copied.position) : { type: 'relative' };
  removeEntryLibraryBindingMarker(copied);
  return copied;
}

function insertCopiedPrompt(preset: TavernPreset, sourcePromptId: string, copiedPrompt: TavernPresetPrompt) {
  const sourceIndex = preset.prompts.findIndex(prompt => prompt.id === sourcePromptId);
  if (sourceIndex < 0) throw new Error('原预设条目已经不存在，请刷新后重试');
  if (preset.prompts.some(prompt => prompt.id === copiedPrompt.id)) {
    throw new Error('复制条目的标识发生冲突，请重试');
  }
  preset.prompts.splice(sourceIndex + 1, 0, structuredClone(copiedPrompt));

  const groupMetadata = getBaibaiPromptGroupMetadata(preset);
  const sourceMetadata = groupMetadata?.[sourcePromptId];
  if (groupMetadata && sourceMetadata && typeof sourceMetadata === 'object') {
    groupMetadata[copiedPrompt.id] = structuredClone(sourceMetadata);
  }
  normalizeInChatPromptOrder(preset);
  return preset;
}

function removePrompt(preset: TavernPreset, promptId: string) {
  const promptIndex = preset.prompts.findIndex(prompt => prompt.id === promptId);
  if (promptIndex < 0) throw new Error('这个预设条目已经不存在，请刷新后重试');
  preset.prompts.splice(promptIndex, 1);
  const groupMetadata = getBaibaiPromptGroupMetadata(preset);
  if (groupMetadata) delete groupMetadata[promptId];
  normalizeInChatPromptOrder(preset);
  return preset;
}

function reorderPrompts(preset: TavernPreset, orderedPromptIds: string[]) {
  const currentIds = preset.prompts.map(prompt => prompt.id);
  if (
    currentIds.length !== orderedPromptIds.length ||
    new Set(currentIds).size !== currentIds.length ||
    orderedPromptIds.some(promptId => !currentIds.includes(promptId))
  ) {
    throw new Error('预设条目已经发生变化，请刷新后再排序');
  }
  const promptById = new Map(preset.prompts.map(prompt => [prompt.id, prompt]));
  preset.prompts = orderedPromptIds.map(promptId => promptById.get(promptId) as TavernPresetPrompt);
  normalizeInChatPromptOrder(preset);
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
  patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled' | 'name' | 'role'>>,
) {
  return enqueuePresetMutation(presetName, async () => {
    const updatePresetWith = requirePresetFunction<UpdatePresetFn>('updatePresetWith');
    const stored = assertPreset(
      await updatePresetWith(
        presetName,
        preset => {
          patchPrompt(preset, promptId, patch);
          if (patch.role) normalizeInChatPromptOrder(preset);
          return preset;
        },
        { render: 'none' },
      ),
    );

    let liveSynced = true;
    if (getCurrentTavernPresetName() === presetName) {
      try {
        await updatePresetWith(
          'in_use',
          preset => {
            patchPrompt(preset, promptId, patch);
            if (patch.role) normalizeInChatPromptOrder(preset);
            return preset;
          },
          { render: 'immediate' },
        );
      } catch {
        liveSynced = false;
      }
    }

    return { liveSynced, preset: stored };
  });
}

export async function duplicateTavernPresetPrompt(
  presetName: string,
  sourcePromptId: string,
  input: TavernPresetPromptCopyInput,
) {
  const copiedPromptId = `phone_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return enqueuePresetMutation(presetName, async () => {
    const updatePresetWith = requirePresetFunction<UpdatePresetFn>('updatePresetWith');
    let copiedPrompt: TavernPresetPrompt | null = null;
    const stored = assertPreset(
      await updatePresetWith(
        presetName,
        preset => {
          const source = preset.prompts.find(prompt => prompt.id === sourcePromptId);
          if (!source || typeof source.content !== 'string') {
            throw new Error('这个条目不能复制，或已经不存在');
          }
          copiedPrompt = createCopiedPrompt(source, copiedPromptId, input);
          return insertCopiedPrompt(preset, sourcePromptId, copiedPrompt);
        },
        { render: 'none' },
      ),
    );
    if (!copiedPrompt) throw new Error('没有生成可保存的条目副本');

    let liveSynced = true;
    if (getCurrentTavernPresetName() === presetName) {
      try {
        const liveCopy = structuredClone(copiedPrompt);
        await updatePresetWith('in_use', preset => insertCopiedPrompt(preset, sourcePromptId, liveCopy), {
          render: 'immediate',
        });
      } catch {
        liveSynced = false;
      }
    }
    return { copiedPromptId, liveSynced, preset: stored };
  });
}

export async function deleteTavernPresetPrompt(presetName: string, promptId: string) {
  return enqueuePresetMutation(presetName, async () => {
    const updatePresetWith = requirePresetFunction<UpdatePresetFn>('updatePresetWith');
    const stored = assertPreset(
      await updatePresetWith(presetName, preset => removePrompt(preset, promptId), { render: 'none' }),
    );
    let liveSynced = true;
    if (getCurrentTavernPresetName() === presetName) {
      try {
        await updatePresetWith('in_use', preset => removePrompt(preset, promptId), { render: 'immediate' });
      } catch {
        liveSynced = false;
      }
    }
    return { liveSynced, preset: stored };
  });
}

export async function reorderTavernPresetPrompts(presetName: string, orderedPromptIds: string[]) {
  return enqueuePresetMutation(presetName, async () => {
    const updatePresetWith = requirePresetFunction<UpdatePresetFn>('updatePresetWith');
    const stored = assertPreset(
      await updatePresetWith(presetName, preset => reorderPrompts(preset, orderedPromptIds), { render: 'none' }),
    );
    let liveSynced = true;
    if (getCurrentTavernPresetName() === presetName) {
      try {
        await updatePresetWith('in_use', preset => reorderPrompts(preset, orderedPromptIds), {
          render: 'immediate',
        });
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
