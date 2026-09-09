import { usePresetLinkStore } from '@/apps/preset-link/store';
import { installNativePromptToggle, type NativePromptManager } from './nativeToggle';

export const useNativePresetGroups = defineStore('nativePresetGroups', () => {
  const error = ref('');
  const links = usePresetLinkStore();
  let loading: Promise<void> | undefined;
  let stop: (() => void) | undefined;
  let disposed = false;

  async function ensureReady() {
    if (stop) return;
    if (loading) return loading;
    loading = (async () => {
      try {
        const host = await import('@sillytavern/scripts/openai');
        if (!('promptManager' in host)) throw new Error('当前酒馆未提供预设条目管理器');
        if (disposed) return;
        stop = installNativePromptToggle({
          document,
          getManager: () => host.promptManager as NativePromptManager | null,
          beforeChange: states => links.retainNativeGroupRestore(states),
          onError: caught => toastr.error(caught instanceof Error ? caught.message : String(caught)),
        });
        error.value = '';
      } catch (caught) {
        error.value = `酒馆条目联动未加载：${caught instanceof Error ? caught.message : String(caught)}`;
        throw new Error(error.value);
      } finally {
        loading = undefined;
      }
    })();
    return loading;
  }

  onScopeDispose(() => {
    disposed = true;
    stop?.();
  });
  return { ensureReady, error };
});
