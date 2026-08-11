// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { parsePrettified } from '@/util/zod';
import type { PhoneContentConversionBatchMode } from '@/core/appRegistry';

export const contentConversionHistoryField = 'sillytavern_phone_content_conversion_history';

const ContentConversionHistoryRecordSchema = z.object({
  id: z.string(),
  sourceAppId: z.string(),
  sourceAppName: z.string(),
  sourceTitles: z.array(z.string()).default([]),
  targetAppId: z.string(),
  targetAppName: z.string(),
  targetItemIds: z.array(z.string()).default([]),
  batchMode: z.enum(['merge', 'separate']),
  count: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const ContentConversionHistorySettingsSchema = z.object({
  records: z.array(ContentConversionHistoryRecordSchema).default([]),
});

export type ContentConversionHistoryRecord = z.infer<typeof ContentConversionHistoryRecordSchema>;

export const useContentConversionHistoryStore = defineStore('content-conversion-history', () => {
  const data = ref(
    parsePrettified(
      ContentConversionHistorySettingsSchema,
      _.get(extension_settings, contentConversionHistoryField, {}),
    ),
  );
  const records = computed(() => data.value.records);

  watch(
    data,
    value => {
      _.set(
        extension_settings,
        contentConversionHistoryField,
        ContentConversionHistorySettingsSchema.parse(klona(value)),
      );
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  function addRecord(input: {
    batchMode: PhoneContentConversionBatchMode;
    count: number;
    sourceAppId: string;
    sourceAppName: string;
    sourceTitles: string[];
    targetAppId: string;
    targetAppName: string;
    targetItemIds: string[];
  }) {
    const record = ContentConversionHistoryRecordSchema.parse({
      ...input,
      id: `content_conversion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    });
    data.value.records = [record, ...data.value.records].slice(0, 100);
    return record;
  }

  function clearRecords() {
    data.value.records = [];
  }

  function rehydrateFromSettings() {
    data.value = parsePrettified(
      ContentConversionHistorySettingsSchema,
      _.get(extension_settings, contentConversionHistoryField, {}),
    );
  }

  return { addRecord, clearRecords, data, records, rehydrateFromSettings };
});
