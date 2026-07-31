import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const cloudMediaField = 'sillytavern_phone_cloud_media';

export const CloudMediaProviderSchema = z.enum(['fal', 'minimax', 'novelai']);
export type CloudMediaProvider = z.infer<typeof CloudMediaProviderSchema>;

export const CloudMediaProfileSchema = z.object({
  id: z.string(),
  name: z.string().default('云媒体配置'),
  provider: CloudMediaProviderSchema.default('fal'),
  kind: z.enum(['image', 'audio', 'video']).default('image'),
  apiKey: z.string().default(''),
  baseUrl: z.string().default('https://queue.fal.run'),
  model: z.string().default('fal-ai/flux/schnell'),
  requestJson: z.string().default('{}'),
  aspectRatio: z.string().default('1:1'),
  width: z.number().int().min(64).max(4096).default(1024),
  height: z.number().int().min(64).max(4096).default(1024),
  steps: z.number().int().min(1).max(100).default(28),
  guidance: z.number().min(0).max(30).default(5),
  sampler: z.string().default('k_euler_ancestral'),
  duration: z.number().int().min(1).max(30).default(6),
  resolution: z.string().default('1080P'),
  instrumental: z.boolean().default(true),
});
export type CloudMediaProfile = z.infer<typeof CloudMediaProfileSchema>;

export const CloudMediaSettingsSchema = z.object({
  activeProfileId: z.string().default(''),
  profiles: z.array(CloudMediaProfileSchema).default([]),
  version: z.literal(1).default(1),
});
export type CloudMediaSettings = z.infer<typeof CloudMediaSettingsSchema>;

function createId() {
  return `cloud_media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function providerDefaults(provider: CloudMediaProvider): Omit<CloudMediaProfile, 'id' | 'name'> {
  if (provider === 'minimax') {
    return {
      apiKey: '',
      aspectRatio: '1:1',
      baseUrl: 'https://api.minimaxi.com',
      duration: 6,
      guidance: 5,
      height: 1024,
      instrumental: true,
      kind: 'image',
      model: 'image-01',
      provider,
      requestJson: '{}',
      resolution: '1080P',
      sampler: '',
      steps: 28,
      width: 1024,
    };
  }
  if (provider === 'novelai') {
    return {
      apiKey: '',
      aspectRatio: '2:3',
      baseUrl: 'https://image.novelai.net',
      duration: 6,
      guidance: 5,
      height: 1216,
      instrumental: true,
      kind: 'image',
      model: 'nai-diffusion-4-5-full',
      provider,
      requestJson: '{}',
      resolution: '1080P',
      sampler: 'k_euler_ancestral',
      steps: 28,
      width: 832,
    };
  }
  return {
    apiKey: '',
    aspectRatio: '1:1',
    baseUrl: 'https://queue.fal.run',
    duration: 6,
    guidance: 5,
    height: 1024,
    instrumental: true,
    kind: 'image',
    model: 'fal-ai/flux/schnell',
    provider,
    requestJson: '{}',
    resolution: '1080P',
    sampler: '',
    steps: 28,
    width: 1024,
  };
}

function createProfile(provider: CloudMediaProvider, index: number): CloudMediaProfile {
  const providerName = provider === 'fal' ? 'fal.ai' : provider === 'minimax' ? 'MiniMax' : 'NovelAI';
  return {
    id: createId(),
    name: `${providerName} ${index}`,
    ...providerDefaults(provider),
  };
}

function readSettings(raw: unknown) {
  return validateInplace(CloudMediaSettingsSchema, raw && typeof raw === 'object' ? raw : {});
}

export const useCloudMediaStore = defineStore('cloud-media', () => {
  const settings = ref<CloudMediaSettings>(readSettings(_.get(extension_settings, cloudMediaField, {})));

  watch(
    settings,
    value => {
      _.set(extension_settings, cloudMediaField, readSettings(klona(value)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const activeProfile = computed(
    () => settings.value.profiles.find(profile => profile.id === settings.value.activeProfileId) ?? null,
  );

  function addProfile(provider: CloudMediaProvider = 'fal') {
    const profile = createProfile(provider, settings.value.profiles.length + 1);
    settings.value.profiles.push(profile);
    settings.value.activeProfileId = profile.id;
    return profile;
  }

  function deleteProfile(profileId: string) {
    settings.value.profiles = settings.value.profiles.filter(profile => profile.id !== profileId);
    if (settings.value.activeProfileId === profileId) {
      settings.value.activeProfileId = settings.value.profiles[0]?.id ?? '';
    }
  }

  function setProvider(profileId: string, provider: CloudMediaProvider) {
    const profile = settings.value.profiles.find(item => item.id === profileId);
    if (!profile || profile.provider === provider) return;
    const apiKey = profile.apiKey;
    const name = profile.name;
    Object.assign(profile, providerDefaults(provider), { apiKey, name, provider });
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, cloudMediaField, {}));
  }

  if (!settings.value.profiles.length) addProfile('fal');

  return {
    activeProfile,
    addProfile,
    deleteProfile,
    rehydrateFromSettings,
    setProvider,
    settings,
  };
});
