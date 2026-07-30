import type { ExternalApiPresetId, ExternalApiProfile, TextProviderSettings } from '@/type/settings';

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
