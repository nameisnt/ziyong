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
    <div v-if="contextBarVisible" class="pc-reader-context-bar">
      <div class="pc-reader-context-meta">
        <span v-if="contextLabel">{{ contextLabel }}</span>
        <span v-if="versionCount > 0">{{ versionCount }} 个版本</span>
        <span v-if="updatedAt">更新于 {{ formatUpdatedAt(updatedAt) }}</span>
        <slot name="detail-context"></slot>
      </div>
      <slot name="version-navigation"></slot>
    </div>

    <article class="pc-detail-card pc-reader-detail-card">
      <slot name="kicker"></slot>
      <template v-if="customContent">
        <article class="pc-detail-content pc-reader-content pc-reader-custom-content">
          <ReasoningDisclosure
            :content="displayReasoning"
            :editable="reasoningEditable"
            @update:content="emit('update:reasoning', $event)"
          />
          <header class="pc-reader-document-head">
            <h1>{{ displayTitle }}</h1>
            <slot name="meta"></slot>
            <span v-if="sourceLabel" class="pc-reader-source-label">{{ sourceLabel }}</span>
          </header>
          <slot name="before-content"></slot>
          <slot name="content" :display-content="displayContent"></slot>
          <slot name="after-content"></slot>
        </article>
      </template>
      <ReaderContent v-else :content="displayContent" :formatted="contentFormatted" :title="displayTitle">
        <template #before-header>
          <ReasoningDisclosure
            :content="displayReasoning"
            :editable="reasoningEditable"
            @update:content="emit('update:reasoning', $event)"
          />
        </template>
        <template #meta>
          <slot name="meta"></slot>
          <span v-if="sourceLabel" class="pc-reader-source-label">{{ sourceLabel }}</span>
        </template>
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
        aria-label="阅读工具"
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
        <button v-if="baguEnabled" class="pc-soft-btn" type="button" @click="runToolAction('bagu')">
          <i class="fa-solid fa-filter-circle-xmark"></i><span>{{ baguLabel }}</span>
        </button>
        <button
          v-if="simplifyEnabled"
          class="pc-soft-btn"
          type="button"
          :disabled="simplifying"
          @click="toggleSimplified"
        >
          <i class="fa-solid fa-language"></i
          ><span>{{ simplifying ? '加载中' : simplified ? '显示原文' : '繁转简' }}</span>
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
          v-if="editEnabled"
          class="pc-soft-btn"
          type="button"
          :disabled="editDisabled"
          @click="runToolAction('edit')"
        >
          <i class="fa-solid fa-pen"></i><span>{{ editLabel }}</span>
        </button>
        <ItemTransferExportButton
          v-if="itemTransferAvailable"
          :app-id="displayAppId"
          button-class="pc-soft-btn"
          :params="itemTransferParams"
        />
        <slot name="actions"></slot>
      </div>
    </div>

    <slot name="overlays"></slot>
  </div>
</template>

<script setup lang="ts">
import DetailFooter from '@/components/DetailFooter.vue';
import ItemTransferExportButton from '@/components/ItemTransferExportButton.vue';
import ReaderContent from '@/components/ReaderContent.vue';
import ReasoningDisclosure from '@/components/ReasoningDisclosure.vue';
import { getRegisteredPhoneApp } from '@/core/appRegistry';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import { loadChineseConverter } from '@/util/chineseConversion';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';

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
    contextLabel?: string;
    customContent?: boolean;
    displayAppId?: string;
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
    reasoning?: string;
    reasoningEditable?: boolean;
    simplifyEnabled?: boolean;
    sourceLabel?: string;
    title: string;
    updatedAt?: string;
    versionCount?: number;
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
    contextLabel: '',
    customContent: false,
    displayAppId: '',
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
    reasoning: '',
    reasoningEditable: false,
    simplifyEnabled: true,
    sourceLabel: '',
    updatedAt: '',
    versionCount: 0,
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
  (event: 'update:reasoning', value: string): void;
}>();

const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const slots = useSlots();
const contextBarVisible = computed(() =>
  Boolean(
    props.contextLabel ||
    props.updatedAt ||
    props.versionCount > 0 ||
    slots['detail-context'] ||
    slots['version-navigation'],
  ),
);
const itemTransferParams = computed(() => phone.currentRoute.params || {});
const itemTransferAvailable = computed(() => {
  if (!props.displayAppId) return false;
  const provider = getRegisteredPhoneApp(props.displayAppId)?.itemTransferProvider;
  if (!provider) return false;
  try {
    return Boolean(provider.exportItem(itemTransferParams.value));
  } catch {
    return false;
  }
});
const displayRules = computed(() => {
  if (!props.displayAppId) return [];
  return getRegexRulesByIds(regexDisplay.rules, regexDisplay.getUsage(props.displayAppId).displayRuleIds, 'replace');
});
const simplified = ref(false);
const simplifying = ref(false);
const simplifyText = shallowRef<(text: string) => string>(text => text);
const displayContent = computed(() => {
  const content = applyRegexDisplayRules(props.content, displayRules.value).content;
  return simplified.value ? simplifyText.value(content) : content;
});
const displayReasoning = computed(() => (simplified.value ? simplifyText.value(props.reasoning) : props.reasoning));
const displayTitle = computed(() => (simplified.value ? simplifyText.value(props.title) : props.title));

watch([() => props.content, () => props.title], () => void scrollContentToTop());

const footerVisible = ref(false);
const effectiveFooterVisible = computed(() => props.footerAlwaysVisible || footerVisible.value);
const toolVisible = computed(
  () =>
    props.baguEnabled ||
    props.favoriteEnabled ||
    props.branchEnabled ||
    props.editEnabled ||
    props.simplifyEnabled ||
    itemTransferAvailable.value ||
    Boolean(slots.actions),
);
const toolMenuOpen = ref(false);
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

function toggleFooter() {
  if (props.footerAlwaysVisible) return;
  footerVisible.value = !footerVisible.value;
}

function runFooterAction(event: 'bottom' | 'catalog' | 'next' | 'previous' | 'top') {
  emit(event);
  if (event === 'catalog' || event === 'next' || event === 'previous' || event === 'top') {
    void scrollContentToTop();
  }
}

async function scrollContentToTop() {
  await nextTick();
  const scroller = shellEl.value?.querySelector<HTMLElement>('.pc-reader-content');
  if (scroller) scroller.scrollTop = 0;
}

function clampToolPosition(x = toolPosition.x, y = toolPosition.y) {
  const shell = shellEl.value;
  const tool = toolEl.value;
  if (!shell) return;
  const width = tool?.offsetWidth || 40;
  const height = tool?.offsetHeight || 40;
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

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return '今天';
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

async function toggleSimplified() {
  if (simplified.value) {
    simplified.value = false;
    return;
  }
  simplifying.value = true;
  try {
    simplifyText.value = (await loadChineseConverter()).toSimplified;
    simplified.value = true;
  } catch (error) {
    toastr.error(`繁简转换加载失败：${error instanceof Error ? error.message : String(error)}`);
  } finally {
    simplifying.value = false;
  }
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

defineExpose({ hideFooter, toggleFooter });
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

.pc-reader-context-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 4px 6px;
  border-bottom: 1px solid var(--pc-border);
  background: var(--pc-surface);
}

.pc-reader-context-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-reader-context-meta > * {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-reader-context-meta > * + *::before {
  margin: 0 6px;
  content: '\00b7';
}

.pc-reader-context-bar :deep(.pc-version-navigator) {
  flex: 0 0 auto;
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

.pc-reader-custom-content > .pc-reader-document-head {
  margin: 0 0 18px;
}

.pc-reader-custom-content > .pc-reader-document-head h1 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--pc-reader-text, var(--pc-text));
  font-family: inherit;
  font-size: 24px;
  line-height: 1.3;
}

.pc-reader-source-label {
  display: block;
  margin-top: 8px;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
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
  width: 36px;
  height: 36px;
}

.pc-reader-tool-trigger {
  width: 28px;
  height: 28px;
  margin: 4px;
  border: 1px solid var(--pc-theme-accent);
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow:
    0 0 0 2px var(--pc-form-control-bg),
    0 7px 20px color-mix(in srgb, var(--pc-text) 26%, transparent 74%);
  touch-action: none;
  font-size: 13px;
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
  gap: 5px;
  width: 230px;
  max-height: 420px;
  padding: 6px;
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
  min-height: 28px;
  padding-inline: 6px;
  border: 1px solid color-mix(in srgb, var(--pc-form-control-text) 14%, var(--pc-form-control-bg) 86%);
  background: color-mix(in srgb, var(--pc-form-control-text) 10%, var(--pc-form-control-bg) 90%);
  color: var(--pc-form-control-text);
  font-size: 12px;
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
</style>
