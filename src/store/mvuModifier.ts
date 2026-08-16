import {
  migrateLegacyMvuStorage,
  shouldImportLegacyMvuStorage,
} from '@/util/mvuPersistence';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { z } from 'zod';

export const mvuModifierField = 'sillytavern_phone_mvu_modifier';

const MvuPathSchema = z.array(z.union([z.string(), z.number()]));

export const MvuFavoriteRecordSchema = z.object({
  label: z.string(),
  path: MvuPathSchema,
});

export const MvuChangeRecordSchema = z.object({
  id: z.string(),
  newValue: z.unknown(),
  oldValue: z.unknown(),
  path: z.string(),
  timestamp: z.number(),
});

export const MvuModifierSettingsSchema = z.object({
  favorites: z.record(z.string(), z.array(MvuFavoriteRecordSchema)).default({}),
  history: z.record(z.string(), z.array(MvuChangeRecordSchema)).default({}),
  legacyLocalStorageImported: z.boolean().default(true),
  version: z.literal(1).default(1),
});

export type MvuFavoriteRecord = z.infer<typeof MvuFavoriteRecordSchema>;
export type MvuChangeRecord = z.infer<typeof MvuChangeRecordSchema>;
export type MvuModifierSettings = z.infer<typeof MvuModifierSettingsSchema>;

type SettingsReadResult = {
  data: MvuModifierSettings;
  error: string;
  rawData: unknown;
};

function readLegacyStorageItem(key: string) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function readSettings(raw: unknown): SettingsReadResult {
  const rawData = klona(raw);
  const parsed = MvuModifierSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: MvuModifierSettingsSchema.parse({}),
      error: `MVU 本地配置校验失败：${parsed.error.issues[0]?.message ?? '数据格式无效'}`,
      rawData,
    };
  }
  return { data: parsed.data, error: '', rawData };
}

function ensureLegacyMigration() {
  const raw = _.get(extension_settings, mvuModifierField);
  if (!shouldImportLegacyMvuStorage(raw)) return raw;
  const migrated = MvuModifierSettingsSchema.parse(migrateLegacyMvuStorage(readLegacyStorageItem));
  _.set(extension_settings, mvuModifierField, klona(migrated));
  void saveSettingsDebounced();
  return migrated;
}

export const useMvuModifierPersistenceStore = defineStore('mvuModifierPersistence', () => {
  const initial = readSettings(ensureLegacyMigration());
  const settings = ref(initial.data);
  const configError = ref(initial.error);
  const rawConfig = shallowRef(initial.rawData);

  function persist(nextSettings: MvuModifierSettings) {
    if (configError.value) return;
    const parsed = MvuModifierSettingsSchema.parse(klona(nextSettings));
    _.set(extension_settings, mvuModifierField, parsed);
    void saveSettingsDebounced();
  }

  watch(settings, nextSettings => persist(nextSettings), { deep: true });

  function rehydrateFromSettings() {
    const next = readSettings(_.get(extension_settings, mvuModifierField));
    configError.value = next.error;
    rawConfig.value = next.rawData;
    settings.value = next.data;
  }

  const favoriteStorage = computed({
    get: () => settings.value.favorites,
    set: value => {
      settings.value.favorites = value;
    },
  });
  const historyStorage = computed({
    get: () => settings.value.history,
    set: value => {
      settings.value.history = value;
    },
  });

  return {
    configError,
    favoriteStorage,
    historyStorage,
    rawConfig,
    rehydrateFromSettings,
    settings,
  };
});
