import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { HiddenGenerationRecordSchema, type FailedGenerationDraft } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const digestField = 'sillytavern_phone_digests';

export const DigestEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  sourceText: z.string().default(''),
  sourceLabel: z.string().default(''),
  sourceMessageId: z.number().int().nonnegative().nullable().default(null),
  kind: z.enum(['ai', 'manual']).default('manual'),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  directoryOrder: z.number().int().nonnegative().optional(),
  sourceFloorEnd: z.number().int().nonnegative().optional(),
  generationRecord: HiddenGenerationRecordSchema.optional(),
});
export type DigestEntry = z.infer<typeof DigestEntrySchema>;

export const DigestScopeDataSchema = z.object({
  entries: z.array(DigestEntrySchema).default([]),
  failedDrafts: z.array(z.custom<FailedGenerationDraft>()).default([]),
});
export type DigestScopeData = z.infer<typeof DigestScopeDataSchema>;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDigestStore = defineStore('digest', () => {
  const { data, flushCurrentScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
    field: digestField,
    schema: DigestScopeDataSchema,
    createDefault: () => validateInplace(DigestScopeDataSchema, {}),
  });

  function normalizeDirectoryOrders() {
    const ordered = [...data.value.entries].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
    for (const entry of ordered) {
      if (typeof entry.sourceFloorEnd !== 'number' && typeof entry.sourceMessageId === 'number') {
        entry.sourceFloorEnd = entry.sourceMessageId;
      }
    }
    let nextOrder = ordered.reduce(
      (maximum, entry) => Math.max(maximum, entry.directoryOrder ?? entry.sourceFloorEnd ?? 0),
      0,
    );
    for (const entry of ordered) {
      if (typeof entry.directoryOrder === 'number') continue;
      if (typeof entry.sourceFloorEnd === 'number') {
        entry.directoryOrder = entry.sourceFloorEnd;
        continue;
      }
      nextOrder += 1;
      entry.directoryOrder = nextOrder;
    }
  }

  watch(data, normalizeDirectoryOrders, { deep: true, immediate: true });

  const entries = computed(() =>
    [...data.value.entries].sort(
      (left, right) =>
        (left.directoryOrder ?? 0) - (right.directoryOrder ?? 0) || left.createdAt.localeCompare(right.createdAt),
    ),
  );
  const failedDraftCollection = createFailedDraftCollection(data, 'digest_failed');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(
    input: Partial<
      Pick<
        DigestEntry,
        | 'directoryOrder'
        | 'generationRecord'
        | 'kind'
        | 'sourceFloorEnd'
        | 'sourceLabel'
        | 'sourceMessageId'
        | 'sourceText'
        | 'tags'
      >
    > &
      Pick<DigestEntry, 'content' | 'title'>,
  ) {
    const timestamp = nowIso();
    const sourceFloorEnd = input.sourceFloorEnd ?? input.sourceMessageId ?? undefined;
    const nextDirectoryOrder =
      data.value.entries.reduce((maximum, entry) => Math.max(maximum, entry.directoryOrder ?? 0), 0) + 1;
    const entry: DigestEntry = {
      id: createId('digest_entry'),
      title: input.title.trim() || '未命名摘抄',
      content: input.content.trim(),
      sourceText: input.sourceText?.trim() || '',
      sourceLabel: input.sourceLabel?.trim() || '',
      sourceMessageId: input.sourceMessageId ?? null,
      kind: input.kind ?? 'manual',
      tags: [...(input.tags ?? [])].map(tag => tag.trim()).filter(Boolean),
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      directoryOrder: input.directoryOrder ?? sourceFloorEnd ?? nextDirectoryOrder,
      sourceFloorEnd,
      generationRecord: input.generationRecord,
    };
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(
    entryId: string,
    input: Pick<DigestEntry, 'content' | 'sourceLabel' | 'sourceText' | 'tags' | 'title'> & {
      directoryOrder?: number;
    },
  ) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.sourceLabel = input.sourceLabel.trim();
    entry.sourceText = input.sourceText.trim();
    entry.tags = input.tags.map(tag => tag.trim()).filter(Boolean);
    if (typeof input.directoryOrder === 'number') entry.directoryOrder = Math.max(0, Math.round(input.directoryOrder));
    entry.updatedAt = nowIso();
    return entry;
  }

  function deleteEntry(entryId: string) {
    data.value.entries = data.value.entries.filter(entry => entry.id !== entryId);
  }

  function toggleFavorite(entryId: string) {
    const entry = getEntry(entryId);
    if (!entry) return;
    entry.favorite = !entry.favorite;
    entry.updatedAt = nowIso();
  }

  return {
    ...failedDraftCollection,
    createEntry,
    data,
    deleteEntry,
    entries,
    flushCurrentScope,
    getEntry,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateEntry,
  };
});
