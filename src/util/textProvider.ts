import type { ExternalApiPresetId, ExternalApiProfile, TextProviderSettings } from '@/type/settings';

export type TextProviderSelection = 'inherit' | 'tavern' | `external:${string}`;
export type ConcreteTextProviderSelection = Exclude<TextProviderSelection, 'inherit'>;

export type ExternalApiPreset = {
  apiUrl: string;
  id: ExternalApiPresetId;
  label: string;
};

export const EXTERNAL_API_PRESETS: ExternalApiPreset[] = [
  {
    apiUrl: 'https://api.openai.com/v1',
    id: 'openai',
    label: 'OpenAI',
  },
  {
    apiUrl: 'https://api.deepseek.com',
    id: 'deepseek',
    label: 'DeepSeek',
  },
  {
    apiUrl: '',
    id: 'custom',
    label: 'OpenAI 兼容',
  },
];

export type ResolvedTextProviderSettings = {
  apiKey: string;
  apiUrl: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  mode: 'external' | 'tavern';
  model: string;
  profileId: string;
  profileName: string;
};

export function normalizeExternalApiUrl(apiUrl: string) {
  let normalized = apiUrl.trim();
  normalized = normalized.replace(/\/+$/, '');
  normalized = normalized.replace(/\/models$/i, '');
  normalized = normalized.replace(/\/chat\/completions$/i, '');
  return normalized;
}

export function getExternalApiPreset(presetId: ExternalApiPresetId) {
  return EXTERNAL_API_PRESETS.find(preset => preset.id === presetId) ?? EXTERNAL_API_PRESETS[2];
}

export function resolveExternalApiProfileUrl(profile: ExternalApiProfile) {
  const preset = getExternalApiPreset(profile.presetId);
  return normalizeExternalApiUrl(preset?.apiUrl || profile.apiUrl);
}

export function getActiveExternalApiProfile(settings: TextProviderSettings) {
  return (
    settings.externalProfiles.find(profile => profile.id === settings.activeExternalProfileId) ??
    settings.externalProfiles[0] ??
    null
  );
}

export function resolveTextProviderSettings(settings: TextProviderSettings): ResolvedTextProviderSettings {
  const profile = getActiveExternalApiProfile(settings);
  if (settings.mode !== 'external' || !profile) {
    return {
      apiKey: '',
      apiUrl: '',
      contextWindow: settings.contextWindow,
      maxOutputTokens: settings.maxOutputTokens,
      mode: 'tavern',
      model: '',
      profileId: '',
      profileName: '',
    };
  }

  return {
    apiKey: profile.apiKey.trim(),
    apiUrl: resolveExternalApiProfileUrl(profile),
    contextWindow: settings.contextWindow,
    maxOutputTokens: settings.maxOutputTokens,
    mode: 'external',
    model: profile.model.trim(),
    profileId: profile.id,
    profileName: profile.name.trim() || '外部 API',
  };
}

export function formatTextProviderSummary(settings: TextProviderSettings) {
  const resolved = resolveTextProviderSettings(settings);
  if (resolved.mode === 'tavern') return '跟随酒馆当前 API / 模型';
  return `${resolved.profileName} · ${resolved.model || '未选择模型'}`;
}

export function getCurrentTextProviderSelection(settings: TextProviderSettings): ConcreteTextProviderSelection {
  const resolved = resolveTextProviderSettings(settings);
  return resolved.mode === 'external' && resolved.profileId ? `external:${resolved.profileId}` : 'tavern';
}

export function applyTextProviderSelection(
  settings: TextProviderSettings,
  selection: TextProviderSelection,
): TextProviderSettings {
  if (selection === 'inherit') return settings;
  if (selection === 'tavern') {
    return {
      ...settings,
      mode: 'tavern',
    };
  }

  const profileId = selection.slice('external:'.length);
  const profile = settings.externalProfiles.find(item => item.id === profileId);
  if (!profile) throw new Error('本次选择的外部 API 连接配置已不存在');
  return {
    ...settings,
    activeExternalProfileId: profile.id,
    mode: 'external',
  };
}

export function formatTextProviderSelection(settings: TextProviderSettings, selection: TextProviderSelection) {
  const concreteSelection = selection === 'inherit' ? getCurrentTextProviderSelection(settings) : selection;
  if (concreteSelection === 'tavern') return '酒馆当前 API';
  const profileId = concreteSelection.slice('external:'.length);
  const profile = settings.externalProfiles.find(item => item.id === profileId);
  return profile?.name.trim() || '连接配置已失效';
}
