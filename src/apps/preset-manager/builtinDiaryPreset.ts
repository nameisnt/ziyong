import diaryPresetJson from '../../../日记 (1).json';
import { normalizePluginPresetImport, type PluginPresetRecord } from './pluginPreset';

export const BUILTIN_DIARY_PRESET_SELECTION = 'builtin:diary';

export function resolveDiaryPresetSelection(selection?: string) {
  return selection?.trim() || BUILTIN_DIARY_PRESET_SELECTION;
}

export function getBuiltinPluginPreset(selection: string): PluginPresetRecord | null {
  if (selection !== BUILTIN_DIARY_PRESET_SELECTION) return null;
  const normalized = normalizePluginPresetImport(diaryPresetJson);
  return {
    createdAt: '2026-08-13T00:00:00.000Z',
    id: 'builtin_diary',
    name: '日记（内置）',
    raw: normalized.raw,
    sourceFileName: '日记 (1).json',
    sourceFormat: normalized.sourceFormat,
    sourceRoot: normalized.sourceRoot,
    updatedAt: '2026-08-13T00:00:00.000Z',
  };
}
