<template>
  <section class="pc-status-display-app">
    <nav
      v-if="enabledSchemes.length > 1"
      ref="statusTabsEl"
      class="pc-segment pc-status-tabs"
      aria-label="状态栏方案"
      @click.capture="horizontalDrag.onClickCapture"
      @pointercancel="horizontalDrag.onPointerCancel"
      @pointerdown="horizontalDrag.onPointerDown"
      @pointermove="horizontalDrag.onPointerMove"
      @pointerup="horizontalDrag.onPointerUp"
      @wheel="horizontalDrag.onWheel"
    >
      <button
        v-for="scheme in enabledSchemes"
        :key="scheme.id"
        :class="['pc-segment-btn', 'compact', { active: scheme.id === activeSchemeId }]"
        type="button"
        @click="selectScheme(scheme.id)"
      >
        {{ scheme.name }}
      </button>
    </nav>

    <div v-if="configError" class="pc-error-list pc-status-feedback">
      <span>{{ configError }}</span>
    </div>

    <div v-if="loading" class="pc-status-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>
    <div v-else-if="errorMessage" class="pc-status-feedback">
      <EmptyState :title="errorMessage">
        <button class="pc-soft-btn" type="button" @click="openSettings">打开状态栏设置</button>
      </EmptyState>
    </div>
    <FrontendFrame
      v-else-if="activeScheme && renderedHtml"
      :active="true"
      :content="renderedHtml"
      embedded
      flush-content
      frameless
      host-bridge
      security-mode="trusted"
      :theme="settingsStore.settings.theme"
      :title="activeScheme.name"
    />
    <div v-else class="pc-status-feedback">
      <EmptyState :title="schemes.length ? '当前聊天未启用状态方案' : '还没有状态方案'">
        <button class="pc-primary-btn compact" type="button" @click="openSettings">打开状态栏设置</button>
      </EmptyState>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useHorizontalDragScroll } from '@/composables/useHorizontalDragScroll';
import { readMvuData, readMvuStatData } from '@/apps/mvu-modifier/api';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import EmptyState from '@/components/EmptyState.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { applyRegexDisplayRules, extractWithRegexRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { getChatMessagesSafe, onTavernEvent } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import { renderMvuStatusTemplate, renderTextStatus } from './model';
import { statusDisplayRegexTargetId, type StatusDisplayScheme, useStatusDisplayStore } from './store';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const statusStore = useStatusDisplayStore();
const regexDisplay = useRegexDisplayStore();
const { configError, schemes } = storeToRefs(statusStore);
const route = computed(() => phone.currentRoute);
const loading = ref(false);
const renderedHtml = ref('');
const errorMessage = ref('');
const statusTabsEl = ref<HTMLElement | null>(null);
const horizontalDrag = useHorizontalDragScroll(statusTabsEl);
let refreshRevision = 0;
let eventStops: Array<{ stop: () => void }> = [];

const activeSchemeId = computed(() => statusStore.getActiveSchemeId(phone.currentTavernScopeKey));
const enabledSchemes = computed(() => {
  const enabledIds = new Set(statusStore.getEnabledSchemeIds(phone.currentTavernScopeKey));
  return schemes.value.filter(scheme => enabledIds.has(scheme.id));
});
const activeScheme = computed(() => enabledSchemes.value.find(scheme => scheme.id === activeSchemeId.value) ?? null);

function openSettings() {
  phone.pushRoute('status-display-settings', 'root', '状态栏设置');
}

function selectScheme(schemeId: string) {
  statusStore.setActiveScheme(phone.currentTavernScopeKey, schemeId);
}

function loadRegexStatus(scheme: StatusDisplayScheme) {
  const usage = regexDisplay.getUsage(statusDisplayRegexTargetId(scheme.id));
  const extractRules = getRegexRulesByIds(regexDisplay.rules, [usage.contentRuleId], 'extract');
  if (!extractRules.length) throw new Error('还没有配置状态文字提取规则');
  const displayRules = getRegexRulesByIds(regexDisplay.rules, usage.displayRuleIds, 'replace');
  const messages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });

  for (const message of [...messages].reverse()) {
    if (message.role !== 'assistant' || !message.message.trim()) continue;
    const extracted = extractWithRegexRules(message.message, extractRules);
    if (extracted.errors.length) throw new Error(extracted.errors.join('；'));
    if (!extracted.applied.length) continue;
    const displayed = applyRegexDisplayRules(extracted.content, displayRules);
    if (displayed.errors.length) throw new Error(displayed.errors.join('；'));
    const renderMode = displayed.applied.length ? displayed.renderMode : extracted.renderMode;
    return renderMode === 'html' ? displayed.content : renderTextStatus(displayed.content);
  }
  throw new Error('当前聊天没有命中状态格式的消息');
}

async function loadMvuStatus(scheme: StatusDisplayScheme) {
  if (!scheme.template.trim()) throw new Error('当前方案还没有网页模板');
  const options =
    scheme.mvuScope === 'message'
      ? { type: 'message' as const, message_id: 'latest' as const }
      : { type: scheme.mvuScope };
  const data = await readMvuData(options);
  return renderMvuStatusTemplate(scheme.template, readMvuStatData(data));
}

async function refreshStatus() {
  const revision = ++refreshRevision;
  renderedHtml.value = '';
  errorMessage.value = '';
  if (!activeScheme.value) return;
  if (!phone.isViewingCurrentChat) {
    errorMessage.value = '状态栏只读取酒馆当前聊天';
    return;
  }
  loading.value = true;
  try {
    if (activeScheme.value.source === 'regex') {
      const html = loadRegexStatus(activeScheme.value);
      if (revision === refreshRevision) renderedHtml.value = html;
    } else {
      const html = await loadMvuStatus(activeScheme.value);
      if (revision === refreshRevision) renderedHtml.value = html;
    }
  } catch (error) {
    if (revision === refreshRevision) errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (revision === refreshRevision) loading.value = false;
  }
}

watch(
  () => [route.value.appId, route.value.page, activeSchemeId.value, phone.currentTavernScopeKey] as const,
  ([appId, page]) => {
    if (appId === 'status-display' && page === 'root') void refreshStatus();
  },
  { immediate: true },
);

onActivated(() => {
  if (route.value.appId === 'status-display' && route.value.page === 'root') void refreshStatus();
});

onMounted(() => {
  eventStops = ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'GENERATION_ENDED', 'CHAT_CHANGED'].map(name =>
    onTavernEvent(name, () => {
      if (route.value.appId === 'status-display' && route.value.page === 'root') void refreshStatus();
    }),
  );
});

onUnmounted(() => {
  eventStops.forEach(stop => stop.stop());
  eventStops = [];
});
</script>

<style scoped>
.pc-status-display-app {
  min-height: 100%;
}

.pc-status-tabs {
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: 2px;
  padding: 4px 6px;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 0;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
}

.pc-status-tabs::-webkit-scrollbar {
  display: none;
}

.pc-status-tabs > button {
  flex: 0 0 auto;
  white-space: nowrap;
}

.pc-status-feedback {
  padding: 14px;
}

.pc-status-loading {
  display: grid;
  min-height: 180px;
  place-items: center;
  color: var(--pc-muted);
}
</style>
