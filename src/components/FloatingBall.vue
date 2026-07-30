<template>
  <div v-show="visible" class="pc-float-ball-root">
    <button
      ref="buttonEl"
      type="button"
      class="pc-float-ball"
      :style="buttonStyle"
      :title="t`打开酒馆手机`"
      :aria-label="t`打开酒馆手机`"
      @click.stop.prevent="onClick"
      @pointerdown.stop="onPointerDown"
      @pointermove.stop="onPointerMove"
      @pointerup.stop="onPointerUp"
      @pointercancel.stop="onPointerCancel"
    >
      <i class="fa-solid fa-mobile-screen-button"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const buttonEl = ref<HTMLButtonElement | null>(null);
const settingsStore = useSettingsStore();
const phone = usePhoneStore();
const { settings } = storeToRefs(settingsStore);
const { isOpen } = storeToRefs(phone);

const x = ref(0);
const y = ref(0);
const pointerId = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const originX = ref(0);
const originY = ref(0);
const dragging = ref(false);
const suppressClickUntil = ref(0);

const visible = computed(() => settings.value.floatBallEnabled && !isOpen.value);
const buttonStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${settings.value.floatBallSize}px`,
  height: `${settings.value.floatBallSize}px`,
  background: settings.value.floatBallColor,
}));

function getDefaultPosition() {
  const size = settings.value.floatBallSize;
  return clampPosition(window.innerWidth - size - 24, window.innerHeight - size - 110);
}

function clampPosition(nextX: number, nextY: number) {
  const size = settings.value.floatBallSize;
  return {
    x: Math.min(Math.max(12, nextX), Math.max(12, window.innerWidth - size - 12)),
    y: Math.min(Math.max(12, nextY), Math.max(12, window.innerHeight - size - 12)),
  };
}

function syncPositionFromSettings() {
  if (typeof window === 'undefined') return;
  const position =
    settings.value.floatBallX === null || settings.value.floatBallY === null
      ? getDefaultPosition()
      : clampPosition(settings.value.floatBallX, settings.value.floatBallY);
  x.value = position.x;
  y.value = position.y;
}

function persistPosition() {
  settingsStore.setFloatBallPosition(x.value, y.value);
}

function openFromBall() {
  phone.openPhone();
}

function onPointerDown(event: PointerEvent) {
  pointerId.value = event.pointerId;
  startX.value = event.clientX;
  startY.value = event.clientY;
  originX.value = x.value;
  originY.value = y.value;
  dragging.value = false;
  buttonEl.value?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;

  const deltaX = event.clientX - startX.value;
  const deltaY = event.clientY - startY.value;
  if (!dragging.value && Math.hypot(deltaX, deltaY) > 6) {
    dragging.value = true;
  }
  if (!dragging.value) return;

  const next = clampPosition(originX.value + deltaX, originY.value + deltaY);
  x.value = next.x;
  y.value = next.y;
}

function onPointerUp(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  buttonEl.value?.releasePointerCapture?.(event.pointerId);

  if (dragging.value) {
    persistPosition();
    suppressClickUntil.value = Date.now() + 300;
  }

  pointerId.value = null;
  window.setTimeout(() => {
    dragging.value = false;
  }, dragging.value ? 300 : 0);
}

function onPointerCancel(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  buttonEl.value?.releasePointerCapture?.(event.pointerId);
  pointerId.value = null;
  dragging.value = false;
}

function onClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (Date.now() < suppressClickUntil.value || dragging.value) return;
  openFromBall();
}

watch(
  () => [settings.value.floatBallX, settings.value.floatBallY, settings.value.floatBallSize],
  () => syncPositionFromSettings(),
  { immediate: true },
);

watch(visible, nextVisible => {
  if (nextVisible) syncPositionFromSettings();
});

useEventListener(window, 'resize', syncPositionFromSettings);
useEventListener(window, 'orientationchange', syncPositionFromSettings);
useEventListener(document, 'visibilitychange', () => {
  if (!document.hidden) syncPositionFromSettings();
});
</script>

<style scoped>
.pc-float-ball-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147482000;
}

.pc-float-ball {
  position: fixed;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  color: #fff;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  cursor: pointer;
  font-size: 18px;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.pc-float-ball:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
}

.pc-float-ball:active {
  transform: scale(0.97);
}
</style>
