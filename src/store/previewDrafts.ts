import { useChatScopedDomain } from '@/store/chatScoped';
import { stripRetiredMediaPreviewDrafts } from '@/core/retiredMedia';
import { RawOutputSemanticsSchema } from '@/type/generation';
import { migratePreviewDraftScopeData } from '@/util/previewDraftMigration';
import { validateInplace } from '@/util/zod';
import { z } from 'zod';

export const previewDraftsField = 'sillytavern_phone_preview_drafts';

export const GenerationPreviewDraftSchema = z.object({
  appId: z.string(),
  createdAt: z.string(),
  id: z.string().min(1),
  page: z.string(),
  preview: z.unknown(),
  rawOutputSemantics: RawOutputSemanticsSchema.default('legacy-unknown'),
  routeParams: z.record(z.string(), z.string()).default({}),
  title: z.string(),
  updatedAt: z.string(),
});

export type GenerationPreviewDraft = z.infer<typeof GenerationPreviewDraftSchema>;

export const PreviewDraftScopeDataSchema = z.object({
  schemaVersion: z.literal(3),
  drafts: z.array(GenerationPreviewDraftSchema).default([]),
});

const PreviewDraftScopeDataInputSchema = z.preprocess(raw => {
  stripRetiredMediaPreviewDrafts(raw);
  return migratePreviewDraftScopeData(raw);
}, PreviewDraftScopeDataSchema);

type PreviewDraftScopeData = z.infer<typeof PreviewDraftScopeDataSchema>;

function nowIso() {
  return new Date().toISOString();
}

function createPreviewDraftId() {
  return `preview:${crypto.randomUUID()}`;
}

function draftKey(appId: string, page: string) {
  return `${appId}:${page}`;
}

type PreviewDraftInput = Pick<GenerationPreviewDraft, 'appId' | 'page' | 'preview' | 'routeParams' | 'title'> & {
  rawOutputSemantics?: GenerationPreviewDraft['rawOutputSemantics'];
};

export const usePreviewDraftStore = defineStore('previewDrafts', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain<PreviewDraftScopeData>({
      field: previewDraftsField,
      schema: PreviewDraftScopeDataInputSchema,
      createDefault: () => validateInplace(PreviewDraftScopeDataSchema, { schemaVersion: 3 }),
    });

  const drafts = computed(() =>
    [...data.value.drafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );

  function getPreviewDrafts(appId: string, page: string) {
    const key = draftKey(appId, page);
    return drafts.value.filter(draft => draftKey(draft.appId, draft.page) === key);
  }

  function getPreviewDraftById(id: string) {
    return data.value.drafts.find(draft => draft.id === id) ?? null;
  }

  function getPreviewDraft(appId: string, page: string) {
    return getPreviewDrafts(appId, page)[0] ?? null;
  }

  function createPreviewDraft(input: PreviewDraftInput) {
    const timestamp = nowIso();
    const draft: GenerationPreviewDraft = {
      ...input,
      createdAt: timestamp,
      id: createPreviewDraftId(),
      preview: klona(input.preview),
      rawOutputSemantics: input.rawOutputSemantics ?? 'original-v1',
      routeParams: { ...input.routeParams },
      updatedAt: timestamp,
    };
    data.value.drafts = [draft, ...data.value.drafts];
    return draft;
  }

  function updatePreviewDraft(id: string, input: PreviewDraftInput) {
    const existing = getPreviewDraftById(id);
    if (!existing) return null;
    existing.preview = klona(input.preview);
    if (input.rawOutputSemantics) existing.rawOutputSemantics = input.rawOutputSemantics;
    existing.routeParams = { ...input.routeParams };
    existing.title = input.title;
    existing.updatedAt = nowIso();
    return existing;
  }

  function deletePreviewDraft(id: string) {
    data.value.drafts = data.value.drafts.filter(draft => draft.id !== id);
  }

  /** Legacy single-preview helper for fixtures and callers that have not entered the multi-draft lifecycle. */
  function upsertPreviewDraft(input: PreviewDraftInput) {
    const existing = getPreviewDraft(input.appId, input.page);
    return existing ? updatePreviewDraft(existing.id, input)! : createPreviewDraft(input);
  }

  function deleteAppPreviewDrafts(appId: string) {
    data.value.drafts = data.value.drafts.filter(draft => draft.appId !== appId);
  }

  return {
    createPreviewDraft,
    deleteAppPreviewDrafts,
    deletePreviewDraft,
    drafts,
    getPreviewDraft,
    getPreviewDraftById,
    getPreviewDrafts,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    updatePreviewDraft,
    upsertPreviewDraft,
  };
});
