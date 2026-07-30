import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
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
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: digestField,
    schema: DigestScopeDataSchema,
    createDefault: () => validateInplace(DigestScopeDataSchema, {}),
  });

  const entries = computed(() => [...data.value.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
  const failedDraftCollection = createFailedDraftCollection(data, 'digest_failed');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(input: Partial<Pick<DigestEntry, 'kind' | 'sourceLabel' | 'sourceMessageId' | 'sourceText' | 'tags'>> & Pick<DigestEntry, 'content' | 'title'>) {
    const timestamp = nowIso();
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
    };
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(entryId: string, input: Pick<DigestEntry, 'content' | 'sourceLabel' | 'sourceText' | 'tags' | 'title'>) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.title = input.title.trim() || entry.title;
    entry.content = input.content.trim();
    entry.sourceLabel = input.sourceLabel.trim();
    entry.sourceText = input.sourceText.trim();
    entry.tags = input.tags.map(tag => tag.trim()).filter(Boolean);
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
    getEntry,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    toggleFavorite,
    updateEntry,
  };
});
