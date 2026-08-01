import type { Ref } from 'vue';

export function useDeferredAppMount(isOpen: Ref<boolean>, appId: Ref<string>) {
  const mountedAppId = ref('');
  let scheduleSequence = 0;
  let pendingFrame = 0;

  function cancelPendingFrame() {
    if (!pendingFrame) return;
    window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
  }

  function scheduleMount(open: boolean, nextAppId: string) {
    const sequence = ++scheduleSequence;
    cancelPendingFrame();

    if (!open || nextAppId === 'home') {
      mountedAppId.value = '';
      return;
    }

    if (mountedAppId.value === nextAppId) return;
    mountedAppId.value = '';
    void nextTick(() => {
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = 0;
        if (sequence !== scheduleSequence || !isOpen.value || appId.value !== nextAppId) return;
        mountedAppId.value = nextAppId;
      });
    });
  }

  watch([isOpen, appId], ([open, nextAppId]) => scheduleMount(open, nextAppId), {
    immediate: true,
    flush: 'post',
  });

  onScopeDispose(() => {
    scheduleSequence += 1;
    cancelPendingFrame();
  });

  return {
    mountedAppId,
  };
}
