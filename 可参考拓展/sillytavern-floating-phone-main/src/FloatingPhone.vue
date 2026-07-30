<template>
  <div class="floating-phone-extension">
    <Transition name="phone-pop">
      <div
        v-show="expanded"
        ref="phoneContainerRef"
        class="phone-container"
        :style="phoneStyle"
        @click.capture="handlePhoneClickCapture"
        @pointerdown.capture="handlePhonePointerDown"
      >
        <PhoneApp />
      </div>
    </Transition>

    <DesktopPet />

    <button
      ref="buttonRef"
      class="floating-phone-button"
      type="button"
      :aria-label="expanded ? '收起小手机' : '展开小手机'"
      :aria-expanded="expanded"
      :style="buttonStyle"
      @click="togglePhone"
      @pointerdown="handleButtonPointerDown"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="7" y="2.75" width="10" height="18.5" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M10.25 5.25h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="12" cy="18.2" r=".75" fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import DesktopPet from '@/phone/components/DesktopPet.vue';
import PhoneApp from '@/phone/App.vue';

type Point = {
  x: number;
  y: number;
};

const expanded = ref(false);
const phoneContainerRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);
const phonePosition = ref<Point>({ x: Math.max(16, window.innerWidth - 430), y: 72 });
const buttonPosition = ref<Point>({ x: Math.max(16, window.innerWidth - 82), y: Math.max(16, window.innerHeight - 96) });
const suppressPhoneClick = ref(false);
const suppressButtonClick = ref(false);

const phoneStyle = computed(() => ({
  left: `${phonePosition.value.x}px`,
  top: `${phonePosition.value.y}px`,
}));

const buttonStyle = computed(() => ({
  left: `${buttonPosition.value.x}px`,
  top: `${buttonPosition.value.y}px`,
}));

function togglePhone() {
  if (suppressButtonClick.value) {
    suppressButtonClick.value = false;
    return;
  }
  expanded.value = !expanded.value;
}

function handlePhoneClickCapture(event: MouseEvent) {
  if (!suppressPhoneClick.value) return;
  event.stopPropagation();
  event.preventDefault();
  suppressPhoneClick.value = false;
}

function handlePhonePointerDown(event: PointerEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest('.island')) return;
  startDrag(event, phoneContainerRef.value, phonePosition, () => {
    suppressPhoneClick.value = true;
  });
}

function handleButtonPointerDown(event: PointerEvent) {
  startDrag(event, buttonRef.value, buttonPosition, () => {
    suppressButtonClick.value = true;
  });
}

function startDrag(
  event: PointerEvent,
  element: HTMLElement | null,
  position: typeof phonePosition,
  onDragged: () => void,
) {
  if (!element || event.button !== 0) return;

  const startPointer = { x: event.clientX, y: event.clientY };
  const startPosition = { ...position.value };
  let dragged = false;

  element.setPointerCapture(event.pointerId);

  const handleMove = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startPointer.x;
    const deltaY = moveEvent.clientY - startPointer.y;

    if (!dragged && Math.hypot(deltaX, deltaY) > 4) {
      dragged = true;
      onDragged();
    }

    if (!dragged) return;

    position.value = clampPosition({
      x: startPosition.x + deltaX,
      y: startPosition.y + deltaY,
    }, element);
  };

  const stopDrag = () => {
    element.removeEventListener('pointermove', handleMove);
    element.removeEventListener('pointerup', stopDrag);
    element.removeEventListener('pointercancel', stopDrag);
  };

  element.addEventListener('pointermove', handleMove);
  element.addEventListener('pointerup', stopDrag, { once: true });
  element.addEventListener('pointercancel', stopDrag, { once: true });
}

function clampPosition(next: Point, element: HTMLElement) {
  const margin = 8;
  const width = element.offsetWidth || 56;
  const height = element.offsetHeight || 56;

  return {
    x: Math.min(Math.max(margin, next.x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, next.y), Math.max(margin, window.innerHeight - height - margin)),
  };
}
</script>

<style scoped>
.floating-phone-extension {
  position:fixed;
  inset:0;
  z-index:9999;
  pointer-events:none;
  font-family:"DouyinSans", sans-serif !important;
  font-weight:normal !important;
}

.phone-container,
.floating-phone-button {
  position:fixed;
  pointer-events:auto;
  touch-action:none;
}

.phone-container {
  width:380px;
  height:780px;
  filter:drop-shadow(0 24px 54px rgba(0,0,0,.38));
}

.floating-phone-button {
  display:grid;
  place-items:center;
  width:56px;
  height:56px;
  border:1px solid rgba(255,255,255,.24);
  border-radius:999px;
  background:linear-gradient(145deg, rgba(18,18,22,.92), rgba(45,45,54,.88));
  color:#fff;
  box-shadow:0 14px 34px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.2);
  cursor:grab;
  backdrop-filter:blur(16px);
}

.floating-phone-button:active {
  cursor:grabbing;
  transform:scale(.97);
}

.floating-phone-button svg {
  width:29px;
  height:29px;
}

.phone-pop-enter-active,
.phone-pop-leave-active {
  transition:opacity .22s ease, transform .24s cubic-bezier(.2,.9,.2,1);
}

.phone-pop-enter-from,
.phone-pop-leave-to {
  opacity:0;
  transform:translateY(18px) scale(.96);
}

@media (max-width: 520px) {
  .phone-container {
    transform:scale(.82);
    transform-origin:top left;
  }
}
</style>
