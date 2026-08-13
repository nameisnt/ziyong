import diaryPresetJson from '../../../日记 (1).json';
import { normalizePluginPresetImport, pluginPresetSelection, type PluginPresetRecord } from './pluginPreset';

export const BUILTIN_DIARY_PRESET_ID = 'builtin_diary';
export const BUILTIN_DIARY_PRESET_SELECTION = pluginPresetSelection(BUILTIN_DIARY_PRESET_ID);
const LEGACY_BUILTIN_DIARY_PRESET_SELECTION = 'builtin:diary';

export function resolveDiaryPresetSelection(selection?: string) {
  const normalized = selection?.trim() || '';
  return !normalized || normalized === LEGACY_BUILTIN_DIARY_PRESET_SELECTION
    ? BUILTIN_DIARY_PRESET_SELECTION
    : normalized;
}

export function createBuiltinDiaryPresetRecord(): PluginPresetRecord {
  const normalized = normalizePluginPresetImport(diaryPresetJson);
  return {
    builtIn: true,
    createdAt: '2026-08-13T00:00:00.000Z',
    id: BUILTIN_DIARY_PRESET_ID,
    name: '日记（内置）',
    raw: normalized.raw,
    sourceFileName: '日记 (1).json',
    sourceFormat: normalized.sourceFormat,
    sourceRoot: normalized.sourceRoot,
    updatedAt: '2026-08-13T00:00:00.000Z',
  };
}
