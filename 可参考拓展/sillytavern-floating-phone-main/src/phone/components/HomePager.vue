<template>
  <div
    ref="pager"
    class="home-pager"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="home-track" :class="{ dragging }" :style="trackStyle">
      <section class="home-page">
        <AppGrid :apps="apps" @app-click="$emit('app-click', $event)" />
        <WeatherWidget />
      </section>
      <section class="home-page">
        <AnniversaryWidget />
        <AppGrid class="second-page-apps" :apps="secondPageApps" @app-click="$emit('app-click', $event)" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AnniversaryWidget from './AnniversaryWidget.vue';
import AppGrid from './AppGrid.vue';
import WeatherWidget from './WeatherWidget.vue';
import { useAppIcons } from '../composables/useAppIcons.js';

defineProps({ apps: { type: Array, default: () => [] } });
defineEmits(['app-click']);

const PAGE_COUNT = 2;
const appIcons = useAppIcons();
const secondPageApps = computed(() => ['landlord', 'diary', 'pet'].map(id => appIcons.apps.value.find(app => app.id === id)).filter(Boolean));

const pager = ref(null);
const currentPage = ref(0);
const dragging = ref(false);
const width = ref(0);
const startX = ref(0);
const startY = ref(0);
const deltaX = ref(0);
const startTime = ref(0);
const activePointerId = ref(null);
const pendingPointer = ref(false);

const trackStyle = computed(() => {
  const base = -currentPage.value * width.value;
  const offset = dragging.value ? deltaX.value : 0;
  return { transform: `translate3d(${base + offset}px, 0, 0)` };
});

onMounted(() => {
  updateWidth();
  window.addEventListener('resize', updateWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWidth);
});

function updateWidth() {
  width.value = pager.value?.clientWidth || 0;
}

function onPointerDown(event) {
  if (isInteractiveTarget(event.target)) return;
  if (!width.value) updateWidth();
  pendingPointer.value = true;
  dragging.value = false;
  startX.value = event.clientX;
  startY.value = event.clientY;
  deltaX.value = 0;
  startTime.value = performance.now();
  activePointerId.value = event.pointerId;
}

function onPointerMove(event) {
  if (!pendingPointer.value || event.pointerId !== activePointerId.value) return;
  const rawDelta = event.clientX - startX.value;
  const yDelta = event.clientY - startY.value;

  if (!dragging.value) {
    if (Math.abs(yDelta) > 10 && Math.abs(yDelta) > Math.abs(rawDelta)) {
      resetPointer();
      return;
    }
    if (Math.abs(rawDelta) < 10) return;
    dragging.value = true;
    pager.value?.setPointerCapture?.(event.pointerId);
  }

  event.preventDefault();
  const atFirstPage = currentPage.value === 0 && rawDelta > 0;
  const atLastPage = currentPage.value === PAGE_COUNT - 1 && rawDelta < 0;
  deltaX.value = atFirstPage || atLastPage ? rawDelta * 0.32 : rawDelta;
}

function onPointerUp(event) {
  if (!pendingPointer.value || event.pointerId !== activePointerId.value) return;
  if (!dragging.value) {
    resetPointer();
    return;
  }

  const elapsed = Math.max(1, performance.now() - startTime.value);
  const velocity = Math.abs(deltaX.value) / elapsed;
  const threshold = width.value * 0.18;

  if ((deltaX.value < -threshold || (deltaX.value < -24 && velocity > 0.55)) && currentPage.value < PAGE_COUNT - 1) {
    currentPage.value += 1;
  } else if ((deltaX.value > threshold || (deltaX.value > 24 && velocity > 0.55)) && currentPage.value > 0) {
    currentPage.value -= 1;
  }

  dragging.value = false;
  deltaX.value = 0;
  pendingPointer.value = false;
  activePointerId.value = null;
  pager.value?.releasePointerCapture?.(event.pointerId);
}

function resetPointer() {
  dragging.value = false;
  pendingPointer.value = false;
  deltaX.value = 0;
  activePointerId.value = null;
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('button, a, input, textarea, select, .app-icon, .avatar-slot'));
}
</script>

<style scoped>
.home-pager {
  position:absolute; inset:0; z-index:5; overflow:hidden;
  touch-action:pan-y; user-select:none;
}
.home-track {
  display:flex; width:100%; height:100%; will-change:transform;
  transition:transform .42s cubic-bezier(.2,.82,.16,1);
}
.home-track.dragging { transition:none; }
.home-page { position:relative; flex:0 0 100%; width:100%; height:100%; }
.second-page-apps { top:210px; }
</style>
