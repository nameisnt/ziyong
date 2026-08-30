export type PresetPromptGroupRange = {
  collapsed: boolean;
  enabled: boolean;
  endPromptId: string;
  id: string;
  name: string;
  selectionMode: PresetPromptGroupSelectionMode;
  startPromptId: string;
};

export type PresetPromptGroupSelectionMode = 'multiple' | 'single';

type SelectablePrompt = {
  enabled: boolean;
  id: string;
};

type PromptGroupRoot = {
  extensions?: unknown;
};

type PromptGroupState = {
  groups: PresetPromptGroupRange[];
  version: 2;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function rawPromptGroupState(root: PromptGroupRoot) {
  if (!isRecord(root.extensions)) return null;
  const toolkit = isRecord(root.extensions.baibaiToolkit) ? root.extensions.baibaiToolkit : null;
  return toolkit && isRecord(toolkit.presetPromptGroups) ? toolkit.presetPromptGroups : null;
}

function promptIndexMap(promptIds: string[]) {
  return new Map(promptIds.map((promptId, index) => [promptId, index]));
}

function legacyRange(rawState: Record<string, unknown>, groupId: string, promptIds: string[]) {
  if (!isRecord(rawState.prompts)) return null;
  const prompts = rawState.prompts;
  const assigned = promptIds.filter(promptId => {
    const metadata = prompts[promptId];
    return isRecord(metadata) && String(metadata.groupId || '') === groupId;
  });
  return assigned.length ? { endPromptId: assigned.at(-1) as string, startPromptId: assigned[0] as string } : null;
}

export function readPresetPromptGroups(root: PromptGroupRoot, promptIds: string[]): PresetPromptGroupRange[] {
  const rawState = rawPromptGroupState(root);
  if (!rawState || !Array.isArray(rawState.groups)) return [];
  const indexes = promptIndexMap(promptIds);
  const occupied = new Set<number>();

  return rawState.groups.filter(isRecord).flatMap((item, groupIndex) => {
    const id = String(item.id || '').trim();
    if (!id) return [];
    let startPromptId = String(item.startPromptId || '').trim();
    let endPromptId = String(item.endPromptId || '').trim();
    if (!startPromptId && !endPromptId) {
      const migrated = legacyRange(rawState, id, promptIds);
      startPromptId = migrated?.startPromptId || '';
      endPromptId = migrated?.endPromptId || '';
    }

    const startIndex = indexes.get(startPromptId);
    const endIndex = indexes.get(endPromptId);
    if (startPromptId || endPromptId) {
      if (startIndex === undefined || endIndex === undefined || startIndex > endIndex) return [];
      const overlaps = Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => startIndex + offset).some(
        index => occupied.has(index),
      );
      if (overlaps) {
        startPromptId = '';
        endPromptId = '';
      } else {
        for (let index = startIndex; index <= endIndex; index += 1) occupied.add(index);
      }
    }

    return [
      {
        collapsed: Boolean(item.collapsed),
        enabled: item.enabled !== false,
        endPromptId,
        id,
        name: String(item.name || `分组 ${groupIndex + 1}`),
        selectionMode: item.selectionMode === 'single' ? 'single' : 'multiple',
        startPromptId,
      },
    ];
  });
}

export function writePresetPromptGroups(root: PromptGroupRoot, promptIds: string[]) {
  if (!isRecord(root.extensions)) root.extensions = {};
  const extensions = root.extensions as Record<string, unknown>;
  if (!isRecord(extensions.baibaiToolkit)) extensions.baibaiToolkit = {};
  const toolkit = extensions.baibaiToolkit as Record<string, unknown>;
  const state: PromptGroupState = {
    groups: readPresetPromptGroups(root, promptIds),
    version: 2,
  };
  toolkit.presetPromptGroups = state;
  return state;
}

export function buildPresetPromptGroupIds(groups: PresetPromptGroupRange[], promptIds: string[]) {
  const indexes = promptIndexMap(promptIds);
  const result = new Map<string, string>();
  for (const group of groups) {
    const startIndex = indexes.get(group.startPromptId);
    const endIndex = indexes.get(group.endPromptId);
    if (startIndex === undefined || endIndex === undefined || startIndex > endIndex) continue;
    for (let index = startIndex; index <= endIndex; index += 1) result.set(promptIds[index] as string, group.id);
  }
  return result;
}

function groupPromptIds(group: PresetPromptGroupRange, promptIds: string[]) {
  const indexes = promptIndexMap(promptIds);
  const startIndex = indexes.get(group.startPromptId);
  const endIndex = indexes.get(group.endPromptId);
  return startIndex === undefined || endIndex === undefined || startIndex > endIndex
    ? []
    : promptIds.slice(startIndex, endIndex + 1);
}

export function applyPresetPromptSelection(
  root: PromptGroupRoot,
  prompts: SelectablePrompt[],
  promptId: string,
  enabled: boolean,
) {
  const target = prompts.find(prompt => prompt.id === promptId);
  if (!target) throw new Error('这个预设条目已经不存在');
  const promptIds = prompts.map(prompt => prompt.id);
  const groups = readPresetPromptGroups(root, promptIds);
  const groupId = buildPresetPromptGroupIds(groups, promptIds).get(promptId);
  const group = groups.find(item => item.id === groupId);
  if (enabled && group?.selectionMode === 'single') {
    const memberIds = new Set(groupPromptIds(group, promptIds));
    prompts.forEach(prompt => {
      if (memberIds.has(prompt.id)) prompt.enabled = prompt.id === promptId;
    });
    return;
  }
  target.enabled = enabled;
}

export function setPresetPromptGroupSelectionMode(
  root: PromptGroupRoot,
  prompts: SelectablePrompt[],
  groupId: string,
  selectionMode: PresetPromptGroupSelectionMode,
  retainedPromptId?: string,
) {
  const promptIds = prompts.map(prompt => prompt.id);
  const state = writePresetPromptGroups(root, promptIds);
  const group = state.groups.find(item => item.id === groupId);
  if (!group) throw new Error('这个条目分组已经不存在');
  const memberIds = new Set(groupPromptIds(group, promptIds));
  const enabledMembers = prompts.filter(prompt => memberIds.has(prompt.id) && prompt.enabled);
  if (selectionMode === 'single' && retainedPromptId === undefined && enabledMembers.length > 1) {
    throw new Error('切换单选前需要选择一个保留的启用条目');
  }
  if (retainedPromptId && !memberIds.has(retainedPromptId)) throw new Error('要保留的条目不在这个分组中');
  if (selectionMode === 'single' && retainedPromptId !== undefined) {
    prompts.forEach(prompt => {
      if (memberIds.has(prompt.id)) prompt.enabled = prompt.id === retainedPromptId;
    });
  }
  group.selectionMode = selectionMode;
}

export function setPresetPromptGroupRange(
  root: PromptGroupRoot,
  promptIds: string[],
  groupId: string,
  startPromptId: string,
  endPromptId: string,
) {
  const state = writePresetPromptGroups(root, promptIds);
  const group = state.groups.find(item => item.id === groupId);
  if (!group) throw new Error('这个条目分组已经不存在');
  if (!startPromptId && !endPromptId) {
    group.startPromptId = '';
    group.endPromptId = '';
    return;
  }

  const indexes = promptIndexMap(promptIds);
  const startIndex = indexes.get(startPromptId);
  const endIndex = indexes.get(endPromptId);
  if (startIndex === undefined || endIndex === undefined) throw new Error('分组边界条目已经不存在');
  if (startIndex > endIndex) throw new Error('结束条目必须位于开始条目之后');

  for (const other of state.groups) {
    if (other.id === groupId) continue;
    const otherStart = indexes.get(other.startPromptId);
    const otherEnd = indexes.get(other.endPromptId);
    if (otherStart === undefined || otherEnd === undefined) continue;
    if (startIndex <= otherEnd && endIndex >= otherStart) throw new Error(`分组范围与“${other.name}”重叠`);
  }
  group.startPromptId = startPromptId;
  group.endPromptId = endPromptId;
}

export function extendPresetPromptGroupAfterDuplicate(
  root: PromptGroupRoot,
  promptIds: string[],
  sourcePromptId: string,
  copiedPromptId: string,
) {
  if (!rawPromptGroupState(root)) return;
  const state = writePresetPromptGroups(root, promptIds);
  state.groups.forEach(group => {
    if (group.endPromptId === sourcePromptId) group.endPromptId = copiedPromptId;
  });
}

export function removePresetPromptBoundaryGroups(root: PromptGroupRoot, promptIds: string[], promptId: string) {
  if (!rawPromptGroupState(root)) return;
  const state = writePresetPromptGroups(root, promptIds);
  state.groups = state.groups.filter(group => group.startPromptId !== promptId && group.endPromptId !== promptId);
}

export function rebasePresetPromptGroupRanges(
  root: PromptGroupRoot,
  previousPromptIds: string[],
  nextPromptIds: string[],
) {
  if (!rawPromptGroupState(root)) return;
  const state = writePresetPromptGroups(root, previousPromptIds);
  const previousIndexes = promptIndexMap(previousPromptIds);
  const nextIndexes = promptIndexMap(nextPromptIds);
  state.groups.forEach(group => {
    const startIndex = previousIndexes.get(group.startPromptId);
    const endIndex = previousIndexes.get(group.endPromptId);
    if (startIndex === undefined || endIndex === undefined) return;
    const memberIndexes = previousPromptIds
      .slice(startIndex, endIndex + 1)
      .map(promptId => nextIndexes.get(promptId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);
    if (!memberIndexes.length) return;
    group.startPromptId = nextPromptIds[memberIndexes[0]] as string;
    group.endPromptId = nextPromptIds[memberIndexes.at(-1) as number] as string;
  });
}

export function hasPresetPromptGroups(root: PromptGroupRoot) {
  const state = rawPromptGroupState(root);
  return Boolean(state && Array.isArray(state.groups) && state.groups.length);
}
