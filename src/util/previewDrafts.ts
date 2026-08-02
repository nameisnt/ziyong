import type { PhoneRoute } from '@/store/phone';
import { usePhoneStore } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { computed, watch, type Ref } from 'vue';

export interface PreviewDraftPersistenceOptions<TPreview> {
  appId: string;
  consumeFailedDraft?: (draftId: string) => void;
  getPreview: () => null | TPreview;
  getRouteParams?: () => Record<string, string>;
  page: string;
  route: Ref<PhoneRoute>;
  setPreview: (preview: null | TPreview) => void;
  title: string | (() => string);
}

export function usePreviewDraftPersistence<TPreview>(options: PreviewDraftPersistenceOptions<TPreview>) {
  const phone = usePhoneStore();
  const previewDrafts = usePreviewDraftStore();

  const draft = computed(() => previewDrafts.getPreviewDraft(options.appId, options.page));

  function restorePreviewDraft() {
    const saved = draft.value;
    if (!saved || options.getPreview()) return saved;
    options.setPreview(klona(saved.preview) as TPreview);
    return saved;
  }

  function persistPreviewDraft(routeParams?: Record<string, string>) {
    const preview = options.getPreview();
    if (!preview) return null;
    const title = typeof options.title === 'function' ? options.title() : options.title;
    const resolvedRouteParams = routeParams ?? draft.value?.routeParams ?? options.getRouteParams?.() ?? {};
    return previewDrafts.upsertPreviewDraft({
      appId: options.appId,
      page: options.page,
      preview,
      routeParams: resolvedRouteParams,
      title,
    });
  }

  function clearPreviewDraft() {
    previewDrafts.deletePreviewDraft(options.appId, options.page);
  }

  function openPreviewDraft() {
    const saved = restorePreviewDraft();
    if (!saved) return;
    phone.pushPage(saved.page, saved.title, saved.routeParams);
  }

  function discardPreviewDraft() {
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
      previewDrafts.upsertPreviewDraft({
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
    clearPreviewDraft,
    discardPreviewDraft,
    draft,
    openPreviewDraft,
    persistPreviewDraft,
    restorePreviewDraft,
  };
}
