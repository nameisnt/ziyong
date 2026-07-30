import { createFailedDraftCollection } from '@/store/failedDrafts';
import { FailedGenerationDraftSchema } from '@/type/generation';
import { useChatScopedDomain } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';

export const mediaField = 'sillytavern_phone_media';

export const MediaKindSchema = z.enum(['image', 'audio', 'video']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaEntrySchema = z.object({
  id: z.string(),
  kind: MediaKindSchema.default('image'),
  title: z.string(),
  url: z.string(),
  source: z.enum(['comfy', 'link', 'upload']).default('link'),
  note: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MediaEntry = z.infer<typeof MediaEntrySchema>;

export const MediaScopeDataSchema = z.object({
  entries: z.array(MediaEntrySchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type MediaScopeData = z.infer<typeof MediaScopeDataSchema>;

export const mediaKindOptions: Array<{ id: MediaKind; label: string }> = [
  { id: 'image', label: '相册' },
  { id: 'audio', label: '音乐' },
  { id: 'video', label: '视频' },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getMediaKindLabel(kind: MediaKind) {
  return mediaKindOptions.find(option => option.id === kind)?.label || '媒体';
}

export const useMediaStore = defineStore('media', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: mediaField,
    schema: MediaScopeDataSchema,
    createDefault: () => validateInplace(MediaScopeDataSchema, {}),
  });

  const entries = computed(() =>
    [...data.value.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
  const failedDraftCollection = createFailedDraftCollection(data, 'media_failed_draft');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(input: Pick<MediaEntry, 'kind' | 'note' | 'source' | 'title' | 'url'>) {
    const timestamp = nowIso();
    const entry: MediaEntry = {
      id: createId('media_entry'),
      kind: input.kind,
      title: input.title.trim() || '未命名媒体',
      url: input.url.trim(),
      source: input.source,
      note: input.note.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(entryId: string, input: Pick<MediaEntry, 'kind' | 'note' | 'source' | 'title' | 'url'>) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    entry.kind = input.kind;
    entry.title = input.title.trim() || entry.title;
    entry.url = input.url.trim();
    entry.source = input.source;
    entry.note = input.note.trim();
    entry.updatedAt = nowIso();
    return entry;
  }

  function deleteEntry(entryId: string) {
    data.value.entries = data.value.entries.filter(entry => entry.id !== entryId);
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
    updateEntry,
  };
});
