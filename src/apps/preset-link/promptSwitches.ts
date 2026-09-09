import {
  buildPresetDisplayNodes,
  getCurrentTavernPresetName,
  readTavernPreset,
  type TavernPreset,
} from '@/apps/preset-manager/api';
import { getOptionalGlobalFunction } from '@/util/runtime';

export type PresetPromptStates = Record<string, boolean>;

export function snapshotPromptStates(preset: TavernPreset): PresetPromptStates {
  return Object.fromEntries(preset.prompts.map(prompt => [prompt.id, prompt.enabled]));
}

export function expandSingleGroupRestore(preset: TavernPreset, states: PresetPromptStates) {
  const restore = { ...states };
  for (const node of buildPresetDisplayNodes(preset)) {
    if (node.type !== 'group' || node.group.selectionMode !== 'single') continue;
    if (!node.prompts.some(prompt => Object.hasOwn(states, prompt.id))) continue;
    for (const prompt of node.prompts) {
      if (!Object.hasOwn(restore, prompt.id)) restore[prompt.id] = prompt.enabled;
    }
  }
  return restore;
}

export function checkPromptStates(preset: TavernPreset, states: PresetPromptStates, affectedOnly = false) {
  for (const node of buildPresetDisplayNodes(preset)) {
    if (node.type !== 'group' || node.group.selectionMode !== 'single') continue;
    if (affectedOnly && !node.prompts.some(prompt => Object.hasOwn(states, prompt.id))) continue;
    if (node.prompts.filter(prompt => states[prompt.id] ?? prompt.enabled).length > 1) {
      throw new Error(`单选分组“${node.group.name}”只能启用一个条目，请调整开关后保存`);
    }
  }
}

export function missingPromptIds(preset: TavernPreset, states: PresetPromptStates) {
  const ids = new Set(preset.prompts.map(prompt => prompt.id));
  return Object.keys(states).filter(id => !ids.has(id));
}

export async function writeLivePromptStates(states: PresetPromptStates, isCurrent: () => boolean) {
  const presetName = getCurrentTavernPresetName();
  const ownsLivePreset = () => isCurrent() && getCurrentTavernPresetName() === presetName;
  if (!isCurrent()) return false;
  if (
    !readTavernPreset('in_use').prompts.some(
      prompt => Object.hasOwn(states, prompt.id) && states[prompt.id] !== prompt.enabled,
    )
  )
    return true;
  const update =
    getOptionalGlobalFunction<
      (
        name: string,
        updater: (preset: TavernPreset) => TavernPreset,
        options: { render: 'immediate' },
      ) => Promise<unknown>
    >('updatePresetWith');
  if (!update) throw new Error('当前酒馆没有提供预设条目开关接口');
  if (!isCurrent()) return false;
  await update(
    'in_use',
    preset => {
      if (!ownsLivePreset()) return preset;
      preset.prompts.forEach(prompt => {
        if (Object.hasOwn(states, prompt.id)) prompt.enabled = states[prompt.id]!;
      });
      return preset;
    },
    { render: 'immediate' },
  );
  if (
    ownsLivePreset() &&
    readTavernPreset('in_use').prompts.some(
      prompt => Object.hasOwn(states, prompt.id) && states[prompt.id] !== prompt.enabled,
    )
  ) {
    throw new Error('酒馆未应用完整的条目开关，请重试');
  }
  return ownsLivePreset();
}
