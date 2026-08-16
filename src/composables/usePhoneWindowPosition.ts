import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';

export function usePhoneWindowPosition(isOpen: Ref<boolean>) {
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);
  const shellEl = ref<HTMLElement | null>(null);
  const topbarEl = ref<HTMLElement | null>(null);
  const positionX = ref(0);
  const positionY = ref(0);
  const pointerId = ref<number | null>(null);
  const startX = ref(0);
  const startY = ref(0);
  const originX = ref(0);
  const originY = ref(0);
  const dragging = ref(false);

  function getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  function getShellSize() {
    const rect = shellEl.value?.getBoundingClientRect();
    return {
      width: rect?.width ?? Math.min(360, window.innerWidth),
      height: rect?.height ?? Math.min(700, window.innerHeight),
    };
  }

  function clampPosition(nextX: number, nextY: number) {
    const margin = 0;
    const viewport = getViewportSize();
    const shell = getShellSize();
    return {
      x: Math.min(Math.max(margin, nextX), Math.max(margin, viewport.width - shell.width - margin)),
      y: Math.min(Math.max(margin, nextY), Math.max(margin, viewport.height - shell.height - margin)),
    };
  }

  function getDefaultPosition() {
    const viewport = getViewportSize();
    const shell = getShellSize();
    if (viewport.width <= 640) {
      return clampPosition((viewport.width - shell.width) / 2, viewport.height - shell.height);
    }
    return clampPosition(viewport.width - shell.width, viewport.height - shell.height);
  }

  function syncPositionFromSettings() {
    if (typeof window === 'undefined') return;
    const nextPosition =
      settings.value.phoneWindowX === null || settings.value.phoneWindowY === null
        ? getDefaultPosition()
        : clampPosition(settings.value.phoneWindowX, settings.value.phoneWindowY);
    positionX.value = nextPosition.x;
    positionY.value = nextPosition.y;
  }

  function persistPosition() {
    settingsStore.setPhoneWindowPosition(positionX.value, positionY.value);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button, input, textarea, select, a, label')) return;
    pointerId.value = event.pointerId;
    startX.value = event.clientX;
    startY.value = event.clientY;
    originX.value = positionX.value;
    originY.value = positionY.value;
    dragging.value = false;
    topbarEl.value?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    const deltaX = event.clientX - startX.value;
    const deltaY = event.clientY - startY.value;
    if (!dragging.value && Math.hypot(deltaX, deltaY) > 6) {
      dragging.value = true;
    }
    if (!dragging.value) return;
    const nextPosition = clampPosition(originX.value + deltaX, originY.value + deltaY);
    positionX.value = nextPosition.x;
    positionY.value = nextPosition.y;
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    topbarEl.value?.releasePointerCapture?.(event.pointerId);
    if (dragging.value) {
      persistPosition();
    }
    pointerId.value = null;
    dragging.value = false;
  }

  watch(
    () => [
      settings.value.phoneWindowX,
      settings.value.phoneWindowY,
      settings.value.interfaceSize.phoneWidth,
      settings.value.interfaceSize.phoneHeight,
    ],
    () => {
      if (!isOpen.value) return;
      void nextTick(() => syncPositionFromSettings());
    },
  );

  useEventListener(window, 'resize', async () => {
    if (!isOpen.value) return;
    await nextTick();
    syncPositionFromSettings();
  });

  useEventListener(window, 'orientationchange', async () => {
    if (!isOpen.value) return;
    await nextTick();
    syncPositionFromSettings();
  });

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    positionX,
    positionY,
    shellEl,
    syncPositionFromSettings,
    topbarEl,
  };
}
