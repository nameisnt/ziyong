<template>
  <div
    ref="shellEl"
    :class="['pc-reader-detail-shell', { 'footer-visible': effectiveFooterVisible }]"
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
          <slot name="content" :display-content="displayContent"></slot>
          <slot name="after-content"></slot>
        </article>
      </template>
      <ReaderContent v-else :content="displayContent" :formatted="contentFormatted" :title="title">
        <template #meta><slot name="meta"></slot></template>
        <template #before>
          <slot name="before-content"></slot>
        </template>
        <template #after>
          <slot name="after-content"></slot>
        </template>
      </ReaderContent>
    </article>

    <div class="pc-reader-footer-layer">
      <div v-if="effectiveFooterVisible" class="pc-reader-footer-popover" @click.stop>
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
        />
      </div>
    </div>

    <div
      v-if="toolVisible"
      ref="toolEl"
      :class="['pc-reader-tool', { dragging: toolDrag.moved }]"
      :style="toolPositionStyle"
    >
      <button
        class="pc-icon-btn pc-reader-tool-trigger"
        type="button"
        :aria-expanded="toolMenuOpen"
        title="阅读工具"
        @click.stop="toggleToolMenu"
        @pointercancel.stop="finishToolDrag"
        @pointerdown.stop="startToolDrag"
        @pointermove.stop="moveToolDrag"
        @pointerup.stop="finishToolDrag"
      >
        <i class="fa-solid fa-bars"></i>
      </button>
      <div
        v-if="toolMenuOpen"
        :class="['pc-reader-tool-menu', { 'open-left': toolOpenLeft, 'open-up': toolOpenUp }]"
        @click.stop
        @pointerdown.stop
      >
        <slot name="version-navigation"></slot>
        <button v-if="baguEnabled" class="pc-soft-btn" type="button" @click="runToolAction('bagu')">
          <i class="fa-solid fa-filter-circle-xmark"></i><span>{{ baguLabel }}</span>
        </button>
        <button
          v-if="favoriteEnabled"
          :class="['pc-soft-btn', { active: favoriteActive }]"
          type="button"
          @click="runToolAction('favorite')"
        >
          <i :class="favoriteIcon"></i><span>{{ favoriteActive ? favoriteActiveLabel : favoriteLabel }}</span>
        </button>
        <button
          v-if="branchEnabled"
          class="pc-soft-btn"
          type="button"
          :disabled="branchDisabled"
          @click="runToolAction('branch')"
        >
          <i class="fa-solid fa-code-branch"></i><span>{{ branchLabel }}</span>
        </button>
        <button
          v-if="eraserEnabled"
          class="pc-soft-btn"
          type="button"
          :disabled="eraserDisabled"
          @click="openTextEditor"
        >
          <i class="fa-solid fa-eraser"></i><span>{{ eraserLabel }}</span>
        </button>
        <button
          v-if="editEnabled"
          class="pc-soft-btn"
          type="button"
          :disabled="editDisabled"
          @click="runToolAction('edit')"
        >
          <i class="fa-solid fa-pen"></i><span>{{ editLabel }}</span>
        </button>
        <slot name="actions"></slot>
      </div>
    </div>

    <ReaderTextEditModal
      :occurrences="textOccurrences"
      :open="textEditOpen"
      :selected-text="selectedText"
      @close="textEditOpen = false"
      @save="saveTextEdit"
    />

    <slot name="overlays"></slot>
  </div>
</template>

<script setup lang="ts">
import DetailFooter from '@/components/DetailFooter.vue';
import ReaderContent from '@/components/ReaderContent.vue';
import ReaderTextEditModal from '@/components/ReaderTextEditModal.vue';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { findReaderTextOccurrences, type ReaderTextOccurrence } from '@/util/readerTextEdit';

const props = withDefaults(
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
    displayAppId?: string;
    eraserDisabled?: boolean;
    eraserEnabled?: boolean;
    eraserLabel?: string;
    editDisabled?: boolean;
    editEnabled?: boolean;
    editLabel?: string;
    favoriteActive?: boolean;
    favoriteActiveLabel?: string;
    favoriteEnabled?: boolean;
    favoriteIcon?: string;
    favoriteLabel?: string;
    footerAlwaysVisible?: boolean;
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
    branchLabel: '创建分支',
    catalogLabel: '目录',
    content: '',
    contentFormatted: false,
    customContent: false,
    displayAppId: '',
    eraserDisabled: false,
    eraserEnabled: false,
    eraserLabel: '修改句子',
    editDisabled: false,
    editEnabled: true,
    editLabel: '编辑',
    favoriteActive: false,
    favoriteActiveLabel: '取消收藏',
    favoriteEnabled: true,
    favoriteIcon: 'fa-solid fa-heart',
    favoriteLabel: '收藏',
    footerAlwaysVisible: false,
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
  (event: 'erase', content: string): void;
  (event: 'favorite'): void;
  (event: 'next'): void;
  (event: 'previous'): void;
  (event: 'top'): void;
}>();

const regexDisplay = useRegexDisplayStore();
const slots = useSlots();
const displayRules = computed(() => {
  if (!props.displayAppId) return [];
  return getRegexRulesByIds(regexDisplay.rules, regexDisplay.getUsage(props.displayAppId).displayRuleIds, 'replace');
});
const displayContent = computed(() => applyRegexDisplayRules(props.content, displayRules.value).content);

watch(
  () => props.content,
  async () => {
    const scroller = shellEl.value?.querySelector<HTMLElement>('.pc-reader-content');
    if (!scroller) return;
    const scrollTop = scroller.scrollTop;
    await nextTick();
    scroller.scrollTop = Math.min(scrollTop, Math.max(0, scroller.scrollHeight - scroller.clientHeight));
  },
);

const footerVisible = ref(false);
const effectiveFooterVisible = computed(() => props.footerAlwaysVisible || footerVisible.value);
const toolVisible = computed(
  () =>
    props.baguEnabled ||
    props.favoriteEnabled ||
    props.branchEnabled ||
    props.eraserEnabled ||
    props.editEnabled ||
    Boolean(slots.actions || slots['version-navigation']),
);
const toolMenuOpen = ref(false);
const textEditOpen = ref(false);
const selectedText = ref('');
const textOccurrences = ref<ReaderTextOccurrence[]>([]);
const shellEl = ref<HTMLElement | null>(null);
const toolEl = ref<HTMLElement | null>(null);
const toolPosition = reactive({ x: -1, y: -1 });
const toolDrag = reactive({ moved: false, offsetX: 0, offsetY: 0, pointerId: -1, startX: 0, startY: 0 });
let suppressToolClick = false;
const toolPositionStyle = computed(() => ({
  left: `${Math.max(0, toolPosition.x)}px`,
  top: `${Math.max(0, toolPosition.y)}px`,
}));
const toolOpenLeft = computed(() => {
  const shellWidth = toolEl.value?.parentElement?.clientWidth ?? 0;
  return shellWidth > 0 && toolPosition.x > shellWidth / 2;
});
const toolOpenUp = computed(() => {
  const shellHeight = toolEl.value?.parentElement?.clientHeight ?? 0;
  return shellHeight > 0 && toolPosition.y > shellHeight / 2;
});

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
  if (shouldToggle && !props.footerAlwaysVisible) footerVisible.value = !footerVisible.value;
}

function hideFooter() {
  if (props.footerAlwaysVisible) return;
  footerVisible.value = false;
}

function runFooterAction(event: 'bottom' | 'catalog' | 'next' | 'previous' | 'top') {
  emit(event);
}

function clampToolPosition(x = toolPosition.x, y = toolPosition.y) {
  const shell = shellEl.value;
  const tool = toolEl.value;
  if (!shell) return;
  const width = tool?.offsetWidth || 46;
  const height = tool?.offsetHeight || 46;
  toolPosition.x = Math.min(Math.max(6, x), Math.max(6, shell.clientWidth - width - 6));
  toolPosition.y = Math.min(Math.max(6, y), Math.max(6, shell.clientHeight - height - 6));
}

function initializeToolPosition() {
  const shell = shellEl.value;
  const tool = toolEl.value;
  if (!shell || !tool) return;
  if (toolPosition.x < 0 || toolPosition.y < 0) {
    toolPosition.x = shell.clientWidth - tool.offsetWidth - 10;
    toolPosition.y = Math.round((shell.clientHeight - tool.offsetHeight) * 0.46);
  }
  clampToolPosition();
}

function startToolDrag(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return;
  const shell = shellEl.value;
  if (!shell) return;
  const rect = shell.getBoundingClientRect();
  toolDrag.pointerId = event.pointerId;
  toolDrag.startX = event.clientX;
  toolDrag.startY = event.clientY;
  toolDrag.offsetX = event.clientX - rect.left - toolPosition.x;
  toolDrag.offsetY = event.clientY - rect.top - toolPosition.y;
  toolDrag.moved = false;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function moveToolDrag(event: PointerEvent) {
  if (event.pointerId !== toolDrag.pointerId) return;
  if (!toolDrag.moved && Math.hypot(event.clientX - toolDrag.startX, event.clientY - toolDrag.startY) > 6) {
    toolDrag.moved = true;
    toolMenuOpen.value = false;
  }
  if (!toolDrag.moved) return;
  const rect = shellEl.value?.getBoundingClientRect();
  if (!rect) return;
  clampToolPosition(event.clientX - rect.left - toolDrag.offsetX, event.clientY - rect.top - toolDrag.offsetY);
}

function finishToolDrag(event?: PointerEvent) {
  if (event && event.pointerId !== toolDrag.pointerId) return;
  const moved = toolDrag.moved;
  if (event) (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  toolDrag.pointerId = -1;
  toolDrag.moved = false;
  if (moved) {
    suppressToolClick = true;
    window.setTimeout(() => {
      suppressToolClick = false;
    });
  }
}

function toggleToolMenu() {
  if (suppressToolClick) {
    suppressToolClick = false;
    return;
  }
  toolMenuOpen.value = !toolMenuOpen.value;
}

function runToolAction(event: 'bagu' | 'branch' | 'edit' | 'favorite') {
  emit(event);
}

function openTextEditor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
    toastr.warning('请先在当前正文里选中要修改的文字');
    return;
  }
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer;
  const element = ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as Element) : ancestor.parentElement;
  const content = shellEl.value?.querySelector('.pc-reader-content');
  if (!element || !content?.contains(element)) {
    toastr.warning('请只选择当前正文中的文字');
    return;
  }
  const text = selection.toString();
  const occurrences = findReaderTextOccurrences(props.content, text);
  if (!occurrences.length) {
    toastr.error('这是显示替换结果，无法安全写回原文');
    return;
  }
  selectedText.value = text;
  textOccurrences.value = occurrences;
  textEditOpen.value = true;
}

function saveTextEdit(payload: { occurrence: ReaderTextOccurrence; replacement: string }) {
  const occurrence = payload.occurrence;
  if (props.content.slice(occurrence.offset, occurrence.offset + selectedText.value.length) !== selectedText.value) {
    toastr.warning('正文在编辑期间已经变化，已停止保存');
    textEditOpen.value = false;
    return;
  }
  const content = `${props.content.slice(0, occurrence.sentenceStart)}${payload.replacement}${props.content.slice(
    occurrence.sentenceEnd,
  )}`;
  emit('erase', content);
  textEditOpen.value = false;
  window.getSelection()?.removeAllRanges();
}

let toolResizeObserver: ResizeObserver | null = null;
onMounted(() => {
  nextTick(initializeToolPosition);
  if (typeof ResizeObserver === 'function' && shellEl.value) {
    toolResizeObserver = new ResizeObserver(() => clampToolPosition());
    toolResizeObserver.observe(shellEl.value);
  }
});

onBeforeUnmount(() => toolResizeObserver?.disconnect());
</script>

<style scoped>
.pc-reader-detail-shell {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
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
  padding: 10px 0 64px;
  border-radius: 0;
  background: transparent;
  color: var(--pc-reader-text, var(--pc-text));
  font-family: var(--pc-reader-font-family);
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
  width: 100%;
}

.pc-reader-footer-popover :deep(.pc-detail-footer) {
  border-radius: min(var(--pc-card-radius), 8px) min(var(--pc-card-radius), 8px) 0 0;
}

.pc-reader-detail-shell :deep(.pc-reader-content) {
  padding-bottom: 64px;
}

.pc-reader-tool {
  position: absolute;
  z-index: 7;
  width: 46px;
  height: 46px;
}

.pc-reader-tool-trigger {
  width: 46px;
  height: 46px;
  border: 2px solid var(--pc-theme-accent);
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow:
    0 0 0 2px var(--pc-form-control-bg),
    0 7px 20px color-mix(in srgb, var(--pc-text) 26%, transparent 74%);
  touch-action: none;
}

.pc-reader-tool.dragging .pc-reader-tool-trigger {
  cursor: grabbing;
  opacity: 0.82;
}

.pc-reader-tool-menu {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  width: min(250px, calc(100vw - 38px));
  max-height: min(58vh, 420px);
  padding: 9px;
  overflow: auto;
  border: 1px solid color-mix(in srgb, var(--pc-form-control-text) 20%, var(--pc-form-control-bg) 80%);
  border-radius: var(--pc-control-radius);
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--pc-text) 28%, transparent 72%);
}

.pc-reader-tool-menu.open-left {
  right: 0;
  left: auto;
}

.pc-reader-tool-menu.open-up {
  top: auto;
  bottom: calc(100% + 7px);
}

.pc-reader-tool-menu > .pc-soft-btn,
.pc-reader-tool-menu :deep(.pc-soft-btn),
.pc-reader-tool-menu :deep(.pc-primary-btn) {
  justify-content: center;
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding-inline: 8px;
  border: 1px solid color-mix(in srgb, var(--pc-form-control-text) 14%, var(--pc-form-control-bg) 86%);
  background: color-mix(in srgb, var(--pc-form-control-text) 10%, var(--pc-form-control-bg) 90%);
  color: var(--pc-form-control-text);
  font-size: 13px;
  white-space: nowrap;
}

.pc-reader-tool-menu :deep(.pc-primary-btn) {
  border-color: var(--pc-theme-accent);
  background: var(--pc-theme-accent);
  color: var(--pc-primary-text);
}

.pc-reader-tool-menu :deep(.pc-soft-btn.active) {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 52%, var(--pc-form-control-bg) 48%);
  background: color-mix(in srgb, var(--pc-theme-accent) 22%, var(--pc-form-control-bg) 78%);
  color: var(--pc-theme-accent);
}

.pc-reader-tool-menu :deep(.pc-soft-btn.danger) {
  color: var(--pc-danger);
}

.pc-reader-tool-menu :deep(.pc-soft-btn i),
.pc-reader-tool-menu :deep(.pc-primary-btn i) {
  flex: 0 0 16px;
  width: 16px;
  text-align: center;
}

.pc-reader-tool-menu :deep(.pc-version-navigator) {
  grid-column: 1 / -1;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--pc-form-control-bg);
}
</style>
