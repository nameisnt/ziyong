<template>
  <div class="pc-horizontal-scroll-frame">
    <component
      :is="as"
      ref="viewportEl"
      v-bind="viewportAttrs"
      @click.capture="horizontalDrag.onClickCapture"
      @pointercancel="horizontalDrag.onPointerCancel"
      @pointerdown="horizontalDrag.onPointerDown"
      @pointermove="horizontalDrag.onPointerMove"
      @pointerup="horizontalDrag.onPointerUp"
      @wheel="horizontalDrag.onWheel"
    >
      <slot />
    </component>

    <button
      v-if="horizontalDrag.canScrollBackward.value"
      class="pc-icon-btn pc-horizontal-scroll-arrow previous"
      type="button"
      title="向左浏览"
      aria-label="向左浏览"
      data-scroll-direction="previous"
      @click="horizontalDrag.scrollPrevious"
    >
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <button
      v-if="horizontalDrag.canScrollForward.value"
      class="pc-icon-btn pc-horizontal-scroll-arrow next"
      type="button"
      title="向右浏览"
      aria-label="向右浏览"
      data-scroll-direction="next"
      @click="horizontalDrag.scrollNext"
    >
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useHorizontalDragScroll } from '@/composables/useHorizontalDragScroll';
import { computed, ref, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{ as?: string }>(), { as: 'div' });

const attrs = useAttrs();
const viewportEl = ref<HTMLElement | null>(null);
const horizontalDrag = useHorizontalDragScroll(viewportEl);
const viewportAttrs = computed(() => ({ ...attrs, class: ['pc-horizontal-scroll-viewport', attrs.class] }));
</script>

<style scoped>
.pc-horizontal-scroll-frame {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-width: 0;
}

.pc-horizontal-scroll-arrow {
  position: absolute;
  z-index: 4;
  top: 50%;
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, transparent 12%);
  box-shadow: 0 2px 7px color-mix(in srgb, var(--pc-text) 18%, transparent 82%);
  transform: translateY(-50%);
}

.pc-horizontal-scroll-arrow:hover,
.pc-horizontal-scroll-arrow:active {
  transform: translateY(-50%);
}

.pc-horizontal-scroll-arrow.previous {
  left: 2px;
}

.pc-horizontal-scroll-arrow.next {
  right: 2px;
}
</style>
