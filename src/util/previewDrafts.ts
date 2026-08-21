import { usePreviewSession } from '@/composables/usePreviewSession';
import { usePhoneStore, type PhonePreviewSessionStatus, type PhoneRoute } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { computed, ref, watch, type Ref } from 'vue';

export interface PreviewDraftPersistenceOptions<TPreview> {
  appId: string;
  consumeFailedDraft?: (draftId: string) => void;
  getPreview: () => null | TPreview;
  getRouteParams?: () => Record<string, string>;
  getSessionStatus?: () => PhonePreviewSessionStatus;
  page: string;
  route: Ref<PhoneRoute>;
  setPreview: (preview: null | TPreview) => void;
  title: string | (() => string);
}

export function usePreviewDraftPersistence<TPreview>(options: PreviewDraftPersistenceOptions<TPreview>) {
  const phone = usePhoneStore();
  const previewDrafts = usePreviewDraftStore();
  const activeDraftId = ref<string | null>(null);

  usePreviewSession({
    appId: options.appId,
    getStatus: () => {
      if (!options.getPreview()) return null;
      return options.getSessionStatus?.() ?? 'unsaved';
    },
    page: options.page,
  });

  const drafts = computed(() => previewDrafts.getPreviewDrafts(options.appId, options.page));
  const draft = computed(() =>
    activeDraftId.value ? previewDrafts.getPreviewDraftById(activeDraftId.value) : drafts.value[0] ?? null,
  );

  function restorePreviewDraft(id = activeDraftId.value || draft.value?.id || '') {
    const saved = id ? previewDrafts.getPreviewDraftById(id) : null;
    if (!saved) return null;
    activeDraftId.value = saved.id;
    options.setPreview(klona(saved.preview) as TPreview);
    return saved;
  }

  function beginPreviewDraft() {
    activeDraftId.value = null;
  }

  function persistPreviewDraft(routeParams?: Record<string, string>) {
    const preview = options.getPreview();
    if (!preview) return null;
    const title = typeof options.title === 'function' ? options.title() : options.title;
    const current = activeDraftId.value ? previewDrafts.getPreviewDraftById(activeDraftId.value) : null;
    const resolvedRouteParams = routeParams ?? current?.routeParams ?? options.getRouteParams?.() ?? {};
    const input = {
      appId: options.appId,
      page: options.page,
      preview,
      routeParams: resolvedRouteParams,
      title,
    };
    const saved = current
      ? previewDrafts.updatePreviewDraft(current.id, input)
      : previewDrafts.createPreviewDraft(input);
    if (saved) activeDraftId.value = saved.id;
    return saved;
  }

  function clearPreviewDraft() {
    if (!activeDraftId.value) return;
    previewDrafts.deletePreviewDraft(activeDraftId.value);
    activeDraftId.value = null;
  }

  function openPreviewDraft(id = draft.value?.id || '') {
    const saved = restorePreviewDraft(id);
    if (!saved) return;
    phone.pushPage(saved.page, saved.title, saved.routeParams);
  }

  function discardPreviewDraft(id = draft.value?.id || '') {
    const saved = id ? previewDrafts.getPreviewDraftById(id) : null;
    if (!saved) return;
    activeDraftId.value = saved.id;
    if (options.route.value.appId === options.appId && options.route.value.page === options.page) {
      options.setPreview(null);
    }
    clearPreviewDraft();
  }

  watch(
    draft,
    saved => {
      if (!saved || !options.consumeFailedDraft || !saved.preview || typeof saved.preview !== 'object') return;
      const preview = saved.preview as Record<string, unknown>;
      const draftId = typeof preview.draftId === 'string' ? preview.draftId : '';
      if (!draftId) return;

      options.consumeFailedDraft(draftId);
      const normalized = {
        ...preview,
        draftId: null,
      } as TPreview;
      activeDraftId.value = saved.id;
      previewDrafts.updatePreviewDraft(saved.id, {
        appId: saved.appId,
        page: saved.page,
        preview: normalized,
        routeParams: saved.routeParams,
        title: saved.title,
      });

      const activePreview = options.getPreview();
      if (
        activePreview &&
        typeof activePreview === 'object' &&
        'draftId' in activePreview &&
        (activePreview as Record<string, unknown>).draftId === draftId
      ) {
        options.setPreview(klona(normalized));
      }
    },
    { immediate: true },
  );

  watch(
    () => options.route.value,
    current => {
      if (current.appId === options.appId && current.page === options.page) {
        restorePreviewDraft();
      }
    },
    { immediate: true, deep: true },
  );

  watch(
    () => options.getPreview(),
    preview => {
      if (preview) persistPreviewDraft();
    },
    { deep: true },
  );

  return {
    activeDraftId,
    beginPreviewDraft,
    clearPreviewDraft,
    discardPreviewDraft,
    draft,
    drafts,
    openPreviewDraft,
    persistPreviewDraft,
    restorePreviewDraft,
  };
}
