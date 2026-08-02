<template>
  <div
    :class="['pc-reader-detail-shell', { 'footer-visible': footerVisible }]"
    @pointercancel="resetReaderTap"
    @pointerdown="startReaderTap"
    @pointermove="trackReaderTap"
    @pointerup="finishReaderTap"
    @touchmove.passive="hideFooter"
    @wheel.passive="hideFooter"
  >
    <article class="pc-detail-card pc-reader-detail-card">
      <slot name="kicker"></slot>
      <template v-if="customContent">
        <article class="pc-detail-content pc-reader-content pc-reader-custom-content">
          <header class="pc-reader-document-head">
            <h1>{{ title }}</h1>
            <slot name="meta"></slot>
          </header>
          <slot name="before-content"></slot>
          <slot name="content"></slot>
          <slot name="after-content"></slot>
        </article>
      </template>
      <ReaderContent v-else :content="content" :formatted="contentFormatted" :title="title">
        <template #meta><slot name="meta"></slot></template>
        <template #before><slot name="before-content"></slot></template>
        <template #after><slot name="after-content"></slot></template>
      </ReaderContent>
    </article>

    <div class="pc-reader-footer-layer">
      <div v-if="footerVisible" class="pc-reader-footer-popover" @click.stop>
        <DetailFooter
          :actions-class="actionsClass"
          :catalog-label="catalogLabel"
          :next-disabled="nextDisabled"
          :next-label="nextLabel"
          :previous-disabled="previousDisabled"
          :previous-label="previousLabel"
          @bottom="runFooterAction('bottom')"
          @catalog="runFooterAction('catalog')"
          @next="runFooterAction('next')"
          @previous="runFooterAction('previous')"
          @top="runFooterAction('top')"
        >
          <template #actions>
            <button v-if="baguEnabled" class="pc-soft-btn" type="button" :title="baguLabel" @click="emit('bagu')">
              <i class="fa-solid fa-filter-circle-xmark"></i>
            </button>
            <button
              v-if="favoriteEnabled"
              :class="['pc-soft-btn', { active: favoriteActive }]"
              type="button"
              :title="favoriteActive ? favoriteActiveLabel : favoriteLabel"
              @click="emit('favorite')"
            >
              <i :class="favoriteIcon"></i>
            </button>
            <button
              v-if="branchEnabled"
              class="pc-soft-btn"
              type="button"
              :disabled="branchDisabled"
              :title="branchLabel"
              @click="emit('branch')"
            >
              <i class="fa-solid fa-code-branch"></i>
            </button>
            <button
              v-if="editEnabled"
              class="pc-soft-btn"
              type="button"
              :disabled="editDisabled"
              :title="editLabel"
              @click="emit('edit')"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <slot name="actions"></slot>
          </template>
        </DetailFooter>
      </div>
    </div>

    <slot name="overlays"></slot>
  </div>
</template>

<script setup lang="ts">
import DetailFooter from '@/components/DetailFooter.vue';
import ReaderContent from '@/components/ReaderContent.vue';

withDefaults(
  defineProps<{
    actionsClass?: string;
    baguEnabled?: boolean;
    baguLabel?: string;
    branchDisabled?: boolean;
    branchEnabled?: boolean;
    branchLabel?: string;
    catalogLabel?: string;
    content?: string;
    contentFormatted?: boolean;
    customContent?: boolean;
    editDisabled?: boolean;
    editEnabled?: boolean;
    editLabel?: string;
    favoriteActive?: boolean;
    favoriteActiveLabel?: string;
    favoriteEnabled?: boolean;
    favoriteIcon?: string;
    favoriteLabel?: string;
    nextDisabled?: boolean;
    nextLabel?: string;
    previousDisabled?: boolean;
    previousLabel?: string;
    title: string;
  }>(),
  {
    actionsClass: '',
    baguEnabled: true,
    baguLabel: '八股检测',
    branchDisabled: false,
    branchEnabled: false,
    branchLabel: '从此处创建分支',
    catalogLabel: '目录',
    content: '',
    contentFormatted: false,
    customContent: false,
    editDisabled: false,
    editEnabled: true,
    editLabel: '编辑',
    favoriteActive: false,
    favoriteActiveLabel: '取消收藏',
    favoriteEnabled: true,
    favoriteIcon: 'fa-solid fa-heart',
    favoriteLabel: '收藏',
    nextDisabled: false,
    nextLabel: '下一章',
    previousDisabled: false,
    previousLabel: '上一章',
  },
);

const emit = defineEmits<{
  (event: 'bagu'): void;
  (event: 'bottom'): void;
  (event: 'branch'): void;
  (event: 'catalog'): void;
  (event: 'edit'): void;
  (event: 'favorite'): void;
  (event: 'next'): void;
  (event: 'previous'): void;
  (event: 'top'): void;
}>();

const footerVisible = ref(false);

const readerTap = {
  pointerId: -1,
  startX: 0,
  startY: 0,
  startedAt: 0,
  moved: false,
  selectionActive: false,
};

const interactiveTargetSelector = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  'audio',
  'video',
  'iframe',
  '[contenteditable="true"]',
  '[role="button"]',
].join(',');

function hasTextSelection() {
  return Boolean(window.getSelection()?.toString().trim());
}

function resetReaderTap() {
  readerTap.pointerId = -1;
  readerTap.moved = false;
  readerTap.selectionActive = false;
}

function startReaderTap(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return;
  const target = event.target;
  if (target instanceof Element && target.closest(interactiveTargetSelector)) return;

  readerTap.pointerId = event.pointerId;
  readerTap.startX = event.clientX;
  readerTap.startY = event.clientY;
  readerTap.startedAt = performance.now();
  readerTap.moved = false;
  readerTap.selectionActive = hasTextSelection();
}

function trackReaderTap(event: PointerEvent) {
  if (event.pointerId !== readerTap.pointerId || readerTap.moved) return;
  readerTap.moved = Math.hypot(event.clientX - readerTap.startX, event.clientY - readerTap.startY) > 10;
}

function finishReaderTap(event: PointerEvent) {
  if (event.pointerId !== readerTap.pointerId) return;

  const shell = event.currentTarget as HTMLElement;
  const rect = shell.getBoundingClientRect();
  const elapsed = performance.now() - readerTap.startedAt;
  const relativeY = rect.height > 0 ? (event.clientY - rect.top) / rect.height : -1;
  const shouldToggle =
    !readerTap.moved &&
    !readerTap.selectionActive &&
    !hasTextSelection() &&
    elapsed <= 500 &&
    relativeY >= 0.2 &&
    relativeY <= 0.8;

  resetReaderTap();
  if (shouldToggle) footerVisible.value = !footerVisible.value;
}

function hideFooter() {
  footerVisible.value = false;
}

function runFooterAction(event: 'bottom' | 'catalog' | 'next' | 'previous' | 'top') {
  emit(event);
}
</script>

<style scoped>
.pc-reader-detail-shell {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.pc-reader-detail-card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.pc-reader-custom-content {
  flex: 1 1 auto;
  margin: 8px 0 0;
  min-height: 0;
  padding: 10px 0 112px;
  border-radius: 0;
  background: transparent;
  color: var(--pc-text);
  overflow: auto;
}

.pc-reader-footer-layer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.pc-reader-footer-popover {
  pointer-events: auto;
}

.pc-reader-footer-popover {
  width: 100%;
}

.pc-reader-footer-popover :deep(.pc-detail-footer) {
  border-radius: 18px 18px 0 0;
}

.pc-reader-detail-shell :deep(.pc-reader-content) {
  padding-bottom: 112px;
}
</style>
