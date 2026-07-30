import { useChatScopedDomain } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';
import { z } from 'zod';

export const previewDraftsField = 'sillytavern_phone_preview_drafts';

export const GenerationPreviewDraftSchema = z.object({
  appId: z.string(),
  createdAt: z.string(),
  page: z.string(),
  preview: z.unknown(),
  routeParams: z.record(z.string(), z.string()).default({}),
  title: z.string(),
  updatedAt: z.string(),
});

export type GenerationPreviewDraft = z.infer<typeof GenerationPreviewDraftSchema>;

const PreviewDraftScopeDataSchema = z.object({
  drafts: z.array(GenerationPreviewDraftSchema).default([]),
});

type PreviewDraftScopeData = z.infer<typeof PreviewDraftScopeDataSchema>;

function nowIso() {
  return new Date().toISOString();
}

function draftKey(appId: string, page: string) {
  return `${appId}:${page}`;
}

export const usePreviewDraftStore = defineStore('previewDrafts', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain<PreviewDraftScopeData>({
      field: previewDraftsField,
      schema: PreviewDraftScopeDataSchema,
      createDefault: () => validateInplace(PreviewDraftScopeDataSchema, {}),
    });

  const drafts = computed(() =>
    [...data.value.drafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );

  function getPreviewDraft(appId: string, page: string) {
    const key = draftKey(appId, page);
    return data.value.drafts.find(draft => draftKey(draft.appId, draft.page) === key) ?? null;
  }

  function upsertPreviewDraft(
    input: Pick<GenerationPreviewDraft, 'appId' | 'page' | 'preview' | 'routeParams' | 'title'>,
  ) {
    const timestamp = nowIso();
    const existing = getPreviewDraft(input.appId, input.page);
    if (existing) {
      existing.preview = klona(input.preview);
      existing.routeParams = { ...input.routeParams };
      existing.title = input.title;
      existing.updatedAt = timestamp;
      return existing;
    }

    const draft: GenerationPreviewDraft = {
      ...input,
      createdAt: timestamp,
      preview: klona(input.preview),
      routeParams: { ...input.routeParams },
      updatedAt: timestamp,
    };
    data.value.drafts = [draft, ...data.value.drafts];
    return draft;
  }

  function deletePreviewDraft(appId: string, page: string) {
    const key = draftKey(appId, page);
    data.value.drafts = data.value.drafts.filter(draft => draftKey(draft.appId, draft.page) !== key);
  }

  function deleteAppPreviewDrafts(appId: string) {
    data.value.drafts = data.value.drafts.filter(draft => draft.appId !== appId);
  }

  return {
    deleteAppPreviewDrafts,
    deletePreviewDraft,
    drafts,
    getPreviewDraft,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    upsertPreviewDraft,
  };
});
