import { validateInplace } from '@/util/zod';
import { GenerationSourceModeSchema } from '@/type/settings';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const cardWriterField = 'sillytavern_phone_card_writer';

const CardWriterStageResultSchema = z.object({
  content: z.string().default(''),
  error: z.string().default(''),
  id: z.string(),
  label: z.string(),
  raw: z.string().default(''),
  reasoning: z.string().default(''),
  status: z.enum(['completed', 'failed', 'pending', 'running']).default('completed'),
});

const CardWriterDocumentSchema = z.object({
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
  sourceOwnerLabel: z.string().default(''),
  sourceLabel: z.string().default(''),
  sourceScopeKey: z.string().default(''),
  stages: z.array(CardWriterStageResultSchema).default([]),
  taskId: z.string(),
  taskLabel: z.string(),
  targetWorldbookName: z.string().default(''),
  title: z.string(),
  updatedAt: z.string(),
  raw: z.string().default(''),
  worldbookIncluded: z.boolean().default(false),
  worldbookWritten: z.boolean().default(false),
});

export type CardWriterDocument = z.infer<typeof CardWriterDocumentSchema>;
export type CardWriterStageResult = z.infer<typeof CardWriterStageResultSchema>;

export const CardWriterSettingsSchema = z.object({
  assistantPrefillEnabled: z.boolean().default(false),
  blankSourceMode: GenerationSourceModeSchema.default('none'),
  documents: z.array(CardWriterDocumentSchema).default([]),
  otherTaskSourceMode: GenerationSourceModeSchema.default('latest'),
  plotSourceMode: GenerationSourceModeSchema.default('all'),
  version: z.literal(1).default(1),
});

function readSettings(raw: unknown) {
  return validateInplace(CardWriterSettingsSchema, raw && typeof raw === 'object' ? raw : {});
}

export const useCardWriterStore = defineStore('card-writer', () => {
  const settings = ref(readSettings(_.get(extension_settings, cardWriterField, {})));

  watch(
    settings,
    nextSettings => {
      _.set(extension_settings, cardWriterField, readSettings(klona(nextSettings)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const documents = computed(() =>
    [...settings.value.documents].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );

  function saveDocument(
    input: Omit<CardWriterDocument, 'createdAt' | 'id' | 'raw' | 'stages' | 'updatedAt'> & {
      id?: string;
      raw?: string;
      stages?: CardWriterStageResult[];
    },
  ) {
    const now = new Date().toISOString();
    const existing = input.id ? settings.value.documents.find(item => item.id === input.id) : null;
    const normalizedInput = {
      ...input,
      raw: input.raw ?? existing?.raw ?? '',
      stages: input.stages ?? existing?.stages ?? [],
    };
    if (existing) {
      Object.assign(existing, normalizedInput, { updatedAt: now });
      return existing;
    }
    const document: CardWriterDocument = {
      ...normalizedInput,
      createdAt: now,
      id: `card_writer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: now,
    };
    settings.value.documents.push(document);
    return document;
  }

  function deleteDocument(id: string) {
    settings.value.documents = settings.value.documents.filter(item => item.id !== id);
  }

  function getDocument(id: string) {
    return settings.value.documents.find(item => item.id === id) ?? null;
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, cardWriterField, {}));
  }

  return { deleteDocument, documents, getDocument, rehydrateFromSettings, saveDocument, settings };
});
