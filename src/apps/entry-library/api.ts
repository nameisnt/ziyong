import type { TavernPreset, TavernPresetPrompt } from '@/apps/preset-manager/api';
import { getCurrentTavernPresetName } from '@/apps/preset-manager/api';
import { getOptionalGlobalFunction } from '@/util/runtime';

type UpdatePresetFn = (
  presetName: string,
  updater: (preset: TavernPreset) => TavernPreset,
  options?: { render?: 'debounced' | 'immediate' | 'none' },
) => Promise<TavernPreset>;

function requireUpdatePreset() {
  const updatePreset = getOptionalGlobalFunction<UpdatePresetFn>('updatePresetWith');
  if (!updatePreset) throw new Error('未检测到酒馆助手预设修改接口');
  return updatePreset;
}

function getPromptList(preset: TavernPreset, source: 'prompts' | 'prompts_unused') {
  if (source === 'prompts') return preset.prompts;
  preset.prompts_unused ??= [];
  return preset.prompts_unused;
}

function findBoundPrompt(
  preset: TavernPreset,
  binding: {
    id: string;
    targetPromptId: string;
    targetPromptName: string;
    targetPromptSource: 'prompts' | 'prompts_unused';
  },
) {
  const prompts = getPromptList(preset, binding.targetPromptSource);
  const markerMatch = prompts.find(prompt => {
    const phone = prompt.extra?.tavern_phone;
    return (
      phone && typeof phone === 'object' && (phone as Record<string, unknown>).entryLibraryBindingId === binding.id
    );
  });
  if (markerMatch) return markerMatch;
  const idMatches = prompts.filter(prompt => prompt.id === binding.targetPromptId);
  if (idMatches.length === 1) return idMatches[0];
  const nameMatches = prompts.filter(prompt => prompt.name === binding.targetPromptName);
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function patchBoundPrompt(
  preset: TavernPreset,
  binding: {
    id: string;
    targetPromptId: string;
    targetPromptName: string;
    targetPromptSource: 'prompts' | 'prompts_unused';
  },
  content: string,
) {
  const prompt = findBoundPrompt(preset, binding);
  if (!prompt) throw new Error(`找不到目标预设条目“${binding.targetPromptName}”`);
  prompt.content = content;
  prompt.extra ??= {};
  const phone =
    prompt.extra.tavern_phone && typeof prompt.extra.tavern_phone === 'object'
      ? (prompt.extra.tavern_phone as Record<string, unknown>)
      : {};
  phone.entryLibraryBindingId = binding.id;
  prompt.extra.tavern_phone = phone;
  return preset;
}

export async function syncPresetLibraryBinding(
  binding: {
    id: string;
    presetName: string;
    targetPromptId: string;
    targetPromptName: string;
    targetPromptSource: 'prompts' | 'prompts_unused';
  },
  content: string,
) {
  const updatePreset = requireUpdatePreset();
  await updatePreset(binding.presetName, preset => patchBoundPrompt(preset, binding, content), { render: 'none' });
  if (getCurrentTavernPresetName() === binding.presetName) {
    await updatePreset('in_use', preset => patchBoundPrompt(preset, binding, content), { render: 'immediate' });
  }
}

export function isCollectablePresetPrompt(prompt: TavernPresetPrompt) {
  return typeof prompt.content === 'string';
}
