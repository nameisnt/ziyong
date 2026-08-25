<template>
  <section class="pc-reader-app">
    <section v-if="route.page === 'root'" class="pc-reader-page">
      <div class="pc-compact-toolbar pc-reader-hero pc-chat-hero">
        <div class="pc-list-row-copy">
          <strong>{{ currentChatTitle }}</strong>
          <small>{{ readerScopeLabel }}</small>
        </div>
        <button
          class="pc-icon-btn pc-refresh-icon"
          type="button"
          :aria-label="t`刷新`"
          :disabled="loadingDetail"
          :title="t`刷新`"
          @click="refreshCurrentChat"
        >
          <i :class="['fa-solid fa-rotate-right', { spinning: loadingDetail }]"></i>
        </button>
      </div>

      <section class="pc-rule-panel">
        <div class="pc-rule-toggle">
          <div class="pc-rule-title">
            <strong>{{ t`阅读规则` }}</strong>
            <small>{{ readerRuleSummary }}</small>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="rulesOpen ? t`折叠规则` : t`展开规则`"
            :title="rulesOpen ? t`折叠规则` : t`展开规则`"
            @click="rulesOpen = !rulesOpen"
          >
            <i :class="rulesOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
        </div>

        <div v-if="rulesOpen" class="pc-rule-body">
          <div class="pc-rule-picker">
            <span class="pc-field-label">{{ t`标题规则` }}</span>
            <SearchableCombobox
              :model-value="titleRuleSelectValue"
              :options="readerTitleRuleOptions"
              :placeholder="t`选择或搜索标题规则`"
              @update:model-value="onReaderTitleRuleSelect"
            />
          </div>
          <div class="pc-rule-picker">
            <span class="pc-field-label">{{ t`楼层正文提取` }}</span>
            <SearchableCombobox
              :model-value="bodyRuleSelectValue"
              :options="readerBodyRuleOptions"
              :placeholder="t`选择或搜索正文规则`"
              @update:model-value="onReaderBodyRuleSelect"
            />
          </div>
          <details class="pc-reader-cleanup">
            <summary>
              <span>{{ t`正文清理` }}</span>
              <small>{{ cleanupSummary }}</small>
            </summary>
            <label class="pc-reader-cleanup-toggle">
              <span>{{ t`清理后为空则隐藏楼层` }}</span>
              <input
                :checked="readerSettings.hideEmptyAfterCleanup"
                type="checkbox"
                @change="onHideEmptyAfterCleanupChange"
              />
            </label>
            <div v-if="readerCleanupRules.length" class="pc-reader-cleanup-list">
              <label v-for="rule in readerCleanupRules" :key="rule.id" class="pc-reader-cleanup-item">
                <input
                  :checked="readerRegexUsage.displayRuleIds.includes(rule.id)"
                  type="checkbox"
                  @change="onCleanupRuleChange(rule.id, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ rule.name || t`未命名规则` }}</span>
              </label>
            </div>
            <p v-else class="pc-rule-help">{{ t`在正则显示 App 中勾选“正文清理”后，可在这里多选。` }}</p>
          </details>
          <div class="pc-reader-visibility-row">
            <span>{{ t`显示用户输入` }}</span>
            <label class="pc-toggle" :title="readerSettings.showUserMessages ? t`隐藏用户输入` : t`显示用户输入`">
              <input
                :checked="readerSettings.showUserMessages"
                type="checkbox"
                :aria-label="readerSettings.showUserMessages ? t`隐藏用户输入` : t`显示用户输入`"
                @change="onShowUserMessagesChange"
              />
              <span aria-hidden="true"></span>
            </label>
          </div>
          <p v-if="!readerBodyRegexRules.length" class="pc-rule-help">
            {{ t`正则显示 App 中勾选“楼层正文提取”的规则会显示在这里。` }}
          </p>
        </div>
      </section>

      <div v-if="error" class="pc-error-card">
        <strong>{{ t`读取失败` }}</strong>
        <p>{{ error }}</p>
      </div>

      <EmptyState v-if="!activeMessages.length && !loadingDetail" :title="t`没有可显示的楼层`" />

      <div v-else class="pc-message-list">
        <article v-for="message in activeMessages" :key="message.id" class="pc-message-card">
          <button class="pc-message-main" type="button" @click="openMessage(message.id)">
            <div class="pc-message-head">
              <div>
                <strong>{{ message.title }}</strong>
              </div>
              <div class="pc-message-meta">
                <small v-if="hasExtractedReaderTitle(message)" class="pc-reader-floor-label">
                  {{ readerFloorLabel(message) }}
                </small>
                <span v-if="message.isUser" class="pc-hidden-pill">{{ t`用户` }}</span>
                <span v-if="message.isHidden" class="pc-hidden-pill">{{ t`隐藏` }}</span>
              </div>
            </div>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'detail' && activeMessage" class="pc-reader-page pc-reader-detail-page">
      <ReaderDetailShell
        :actions-class="phone.isViewingCurrentChat ? 'six' : 'five'"
        :bagu-enabled="isViewingActiveSwipe"
        :branch-disabled="branching || !isViewingActiveSwipe"
        :branch-enabled="phone.isViewingCurrentChat && isViewingActiveSwipe"
        :branch-label="branching ? t`创建中` : t`创建分支`"
        :content="activeMessageBody"
        content-formatted
        display-app-id="reader"
        :edit-disabled="!phone.isViewingCurrentChat || !isViewingActiveSwipe"
        :edit-label="t`编辑正文`"
        :favorite-active="Boolean(activeMessageFavorite)"
        :favorite-enabled="isViewingActiveSwipe"
        :next-disabled="!nextMessageId"
        :previous-disabled="!previousMessageId"
        :reasoning="activeSwipeCandidate?.reasoning || ''"
        :reasoning-editable="phone.isViewingCurrentChat && isViewingActiveSwipe"
        :title="activeSwipeCandidate?.title || activeMessage.title"
        @bagu="openReaderBaguScan"
        @bottom="scrollToBottom"
        @branch="createReaderBranch"
        @catalog="showCatalogModal = true"
        @edit="openReaderEditor"
        @favorite="toggleActiveMessageFavorite"
        @next="openAdjacentMessage(nextMessageId)"
        @previous="openAdjacentMessage(previousMessageId)"
        @top="scrollToTop"
        @update:reasoning="saveReaderReasoning"
      >
        <template #meta>
          <span v-if="activeMessage.isUser" class="pc-hidden-pill">{{ t`用户` }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">{{ t`隐藏` }}</span>
        </template>
        <template #before-content>
          <section v-if="activeSwipeCandidates.length > 1" class="pc-reader-swipe-selector" aria-label="候选回复">
            <div class="pc-reader-swipe-head">
              <strong>{{ t`候选回复` }}</strong>
              <span>{{ t`当前酒馆选择` }} {{ activeMessage.activeSwipeIndex + 1 }}/{{ activeSwipeCandidates.length }}</span>
            </div>
            <div class="pc-reader-swipe-options">
              <button
                v-for="candidate in activeSwipeCandidates"
                :key="candidate.index"
                :class="['pc-segment-btn', 'compact', { active: candidate.index === selectedSwipeIndex }]"
                type="button"
                @click="selectSwipeCandidate(candidate.index)"
              >
                {{ t`候选` }} {{ candidate.index + 1 }}
              </button>
            </div>
            <p v-if="!isViewingActiveSwipe">{{ t`正在只读查看其他候选，不会改动酒馆当前回复。` }}</p>
          </section>
        </template>
        <template #actions>
          <button
            v-if="isViewingActiveSwipe"
            class="pc-soft-btn"
            type="button"
            :title="t`选中文字加入摘抄`"
            @click="saveSelectionToDigest"
          >
            <i class="fa-solid fa-highlighter"></i>
            <span>{{ t`摘抄` }}</span>
          </button>
        </template>
        <template #overlays>
          <CatalogModal
            :active-id="activeMessage.id"
            :items="messageCatalogItems"
            :open="showCatalogModal"
            @close="showCatalogModal = false"
            @select="selectCatalogMessage"
          />
        </template>
      </ReaderDetailShell>
    </section>

    <section v-else-if="route.page === 'bagu-scan' && activeMessage" class="pc-reader-page pc-reader-bagu-page">
      <article class="pc-message-card pc-reader-bagu-card">
        <div class="pc-message-head pc-reader-detail-head">
          <div class="pc-reader-detail-title">
            <strong>{{ activeMessage.title }}</strong>
          </div>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">{{ t`隐藏` }}</span>
        </div>
        <BaguScanPanel
          auto-scan
          class="pc-reader-bagu-scan-panel"
          :content="readerBaguContent"
          :apply-handler="applyReaderBaguContent"
        />
      </article>
    </section>

    <section v-else-if="route.page === 'edit' && activeMessage" class="pc-reader-page pc-reader-edit-page">
      <article class="pc-page-section pc-reader-edit-card">
        <div class="pc-compact-toolbar">{{ getActiveMessageSourceLabel() }}</div>
        <textarea
          v-model="readerEditDraft"
          class="pc-area pc-reader-edit-area"
          :placeholder="t`在这里修改阅读正文，保存后会写回原酒馆楼层。`"
        ></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="returnToReaderDetail">{{ t`返回` }}</button>
          <button class="pc-soft-btn" type="button" @click="resetReaderEditDraft">{{ t`恢复` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveReaderEdit">{{ t`应用到楼层` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import { useReaderChatSession } from '@/apps/reader/useReaderChatSession';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import {
  defaultReaderBodyRule,
  defaultReaderSettings,
  type ChatReaderRegexRule,
  type ReaderMessage,
} from '@/store/reader';
import {
  defaultReaderBodyRegexDisplayRuleId,
  type RegexDisplayRule,
  useRegexDisplayStore,
} from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import { useReaderStore } from '@/store/reader';
import { useSettingsStore } from '@/store/settings';
import { useDigestStore } from '@/apps/digest/store';
import { useWorldbookLinkStore } from '@/apps/worldbook-link/store';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { getCurrentTavernPresetName } from '@/apps/preset-manager/api';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import { getRegexRulesByOperation } from '@/util/regexDisplay';
import {
  executeSlashCommandSafe,
  getChatMessagesSafe,
  getOptionalGlobalFunction,
  onTavernEvent,
  setChatMessagesSafe,
} from '@/util/runtime';
import { getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { resolveReaderBodySourceRange, type ReaderBodySourceRange } from '@/util/readerRegex';
import { characters, getCharacters, getPastCharacterChats } from '@sillytavern/script';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const reader = useReaderStore();
const digest = useDigestStore();
const worldbookLinks = useWorldbookLinkStore();
const presetLinks = usePresetLinkStore();
const regexDisplay = useRegexDisplayStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const { rules: regexDisplayRules } = storeToRefs(regexDisplay);
const fallbackSettings = Object.freeze(defaultReaderSettings);
const fallbackRoute = Object.freeze({
  appId: 'home',
  page: 'home',
  title: '功能性阅读器',
  params: undefined,
});

const route = computed(() => phone.currentRoute ?? fallbackRoute);
const readerSettings = computed(() => reader.settings ?? fallbackSettings);
const globalReaderRegexUsage = computed(() => regexDisplay.getUsage('reader'));
const readerBinding = computed(() => presetLinks.getBinding(phone.viewingScopeKey));
const currentTavernPresetName = ref(getCurrentTavernPresetName());
const effectiveReaderPresetName = computed(
  () => readerBinding.value?.presetName || (phone.isViewingCurrentChat ? currentTavernPresetName.value : ''),
);
const readerPresetProfile = computed(() => presetLinks.getReaderProfile(effectiveReaderPresetName.value));
const readerRegexUsage = computed(() => ({
  contentRuleId: readerPresetProfile.value?.readerContentRuleId || globalReaderRegexUsage.value.contentRuleId,
  displayRuleIds: readerPresetProfile.value?.readerCleanupRuleIds ?? globalReaderRegexUsage.value.displayRuleIds,
  titleRuleId: readerPresetProfile.value?.readerTitleRuleId || globalReaderRegexUsage.value.titleRuleId,
}));
const showCatalogModal = ref(false);
const rulesOpen = ref(true);
const messageBodyEl = ref<HTMLElement | null>(null);
const readerEditDraft = ref('');
const branching = ref(false);
let pendingBranchSourceScopeKey = '';
let pendingBranchExpiresAt = 0;
const { scrollToBottom, scrollToTop } = useDetailScroll(messageBodyEl, '.pc-reader-detail-page .pc-reader-content');
const currentChatTitle = computed(
  () =>
    phone.viewingScopeMeta.chatTitle || String(SillyTavern.getCurrentChatId?.() || SillyTavern.chatId || '当前聊天'),
);
const readerScopeLabel = computed(() => (phone.isViewingCurrentChat ? '当前聊天' : '选中聊天'));

const defaultTitleRule: ChatReaderRegexRule = { find: '', flags: '', replace: '' };
const readerTitleRegexRules = computed(() => getRegexRulesByOperation(regexDisplayRules.value, 'extract'));
const readerBodyRegexRules = computed(() => getRegexRulesByOperation(regexDisplayRules.value, 'extract'));
const readerTitleRuleOptions = computed(() => [
  ...(effectiveReaderPresetName.value ? [{ label: '跟随全局阅读规则', value: '' }] : []),
  { label: '无正则', value: '__default_title__' },
  ...readerTitleRegexRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
]);
const readerBodyRuleOptions = computed(() => {
  const options = readerBodyRegexRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id }));
  if (!options.some(option => option.value === defaultReaderBodyRegexDisplayRuleId)) {
    options.unshift({ label: '默认楼层正文提取', value: '__default_body__' });
  }
  return [...(effectiveReaderPresetName.value ? [{ label: '跟随全局阅读规则', value: '' }] : []), ...options];
});
const readerCleanupRules = computed(() => getRegexRulesByOperation(regexDisplayRules.value, 'replace'));
const selectedTitleRegexRule = computed(() =>
  getSelectedReaderRegexRule(readerRegexUsage.value.titleRuleId, readerTitleRegexRules.value),
);
const selectedBodyRegexRule = computed(() =>
  getSelectedReaderRegexRule(readerRegexUsage.value.contentRuleId, readerBodyRegexRules.value),
);
const selectedCleanupRules = computed(() =>
  readerCleanupRules.value.filter(rule => readerRegexUsage.value.displayRuleIds.includes(rule.id)),
);
const activeTitleRule = computed(() => toReaderRegexRule(selectedTitleRegexRule.value, defaultTitleRule));
const activeBodyRule = computed(() => toReaderRegexRule(selectedBodyRegexRule.value, defaultReaderBodyRule));
const cleanupSummary = computed(() =>
  selectedCleanupRules.value.length ? `已选 ${selectedCleanupRules.value.length} 条` : '未选择',
);
const readerRuleSummary = computed(
  () =>
    `${effectiveReaderPresetName.value ? `预设 ${effectiveReaderPresetName.value} · ` : ''}${selectedTitleRegexRule.value?.name || '无正则'} / ${selectedBodyRegexRule.value?.name || '默认正文'} / 清理 ${selectedCleanupRules.value.length}`,
);
const titleRuleSelectValue = computed(() =>
  effectiveReaderPresetName.value
    ? readerPresetProfile.value?.readerTitleRuleId || ''
    : globalReaderRegexUsage.value.titleRuleId || '__default_title__',
);
const bodyRuleSelectValue = computed(() => {
  const selectedRuleId = effectiveReaderPresetName.value
    ? readerPresetProfile.value?.readerContentRuleId || ''
    : globalReaderRegexUsage.value.contentRuleId;
  if (effectiveReaderPresetName.value && !selectedRuleId) return '';
  if (!selectedRuleId || selectedRuleId === '__default_body__') {
    return readerBodyRegexRules.value.some(rule => rule.id === defaultReaderBodyRegexDisplayRuleId)
      ? defaultReaderBodyRegexDisplayRuleId
      : '__default_body__';
  }
  return selectedRuleId;
});
const contentRuleId = computed(() => readerRegexUsage.value.contentRuleId);
const { currentMessages, error, loadingDetail, loadCurrentChat, resetReaderChatSession } = useReaderChatSession({
  activeBodyRule,
  activeTitleRule,
  applyReaderCleanupRules,
  contentRuleId,
  getCharacterRecords: () => characters,
  getCharacters,
  getPastCharacterChats,
  normalizeTitle,
  readerSettings,
  syncCurrentTavernPresetName,
});
const activeMessages = computed(() => currentMessages.value);
const activeMessage = computed(() => {
  const messageId = route.value.params?.messageId;
  return messageId ? (activeMessages.value.find(item => item.id === messageId) ?? null) : null;
});
const selectedSwipeIndex = ref(0);
const activeSwipeCandidates = computed(() => activeMessage.value?.swipeCandidates ?? []);
const activeSwipeCandidate = computed(
  () =>
    activeSwipeCandidates.value.find(candidate => candidate.index === selectedSwipeIndex.value) ??
    activeSwipeCandidates.value.find(candidate => candidate.index === activeMessage.value?.activeSwipeIndex) ??
    activeSwipeCandidates.value[0] ??
    null,
);
const isViewingActiveSwipe = computed(
  () => Boolean(activeMessage.value && activeSwipeCandidate.value?.index === activeMessage.value.activeSwipeIndex),
);
const activeMessageBody = computed(() => (activeSwipeCandidate.value ? formatReaderBody(activeSwipeCandidate.value.body) : ''));
const readerBaguContent = computed(() => activeSwipeCandidate.value?.body || '');
const messageCatalogItems = computed(() =>
  activeMessages.value.map(message => ({
    id: message.id,
    meta: hasExtractedReaderTitle(message) ? readerFloorLabel(message) : '',
    title: message.title,
  })),
);
const activeMessageIndex = computed(() => activeMessages.value.findIndex(item => item.id === activeMessage.value?.id));
const previousMessageId = computed(() =>
  activeMessageIndex.value > 0 ? activeMessages.value[activeMessageIndex.value - 1]?.id || '' : '',
);
const nextMessageId = computed(() =>
  activeMessageIndex.value >= 0 ? activeMessages.value[activeMessageIndex.value + 1]?.id || '' : '',
);
const activeMessageFavorite = computed(() =>
  activeMessage.value ? reader.getFavorite(phone.viewingScopeKey, activeMessage.value.id) : null,
);
const reloadActiveChatDebounced = useDebounceFn(() => {
  void reloadActiveChat();
}, 250);

watch(
  () => [activeMessage.value?.id, activeMessage.value?.activeSwipeIndex] as const,
  ([messageId, activeSwipeIndex]) => {
    if (!messageId) return;
    selectedSwipeIndex.value = activeSwipeIndex ?? 0;
  },
  { immediate: true },
);

function selectSwipeCandidate(index: number) {
  if (!activeSwipeCandidates.value.some(candidate => candidate.index === index)) return;
  selectedSwipeIndex.value = index;
}

function getSelectedReaderRegexRule(ruleId: string, availableRules: RegexDisplayRule[]) {
  if (ruleId === '__default_body__') {
    return availableRules.find(rule => rule.id === defaultReaderBodyRegexDisplayRuleId) ?? null;
  }
  if (!ruleId || ruleId.startsWith('__default_')) return null;
  return availableRules.find(rule => rule.id === ruleId) ?? null;
}

function toReaderRegexRule(rule: RegexDisplayRule | null, fallback: ChatReaderRegexRule): ChatReaderRegexRule {
  if (!rule) return fallback;
  return {
    find: rule.pattern,
    flags: rule.flags,
    replace: rule.replacement,
  };
}

function onReaderTitleRuleSelect(ruleId: string) {
  if (effectiveReaderPresetName.value) {
    presetLinks.setReaderRule(effectiveReaderPresetName.value, 'title', ruleId);
    toastr.success(`已更新预设“${effectiveReaderPresetName.value}”的共享阅读标题规则`);
    return;
  }
  regexDisplay.setExtractionRule('reader', 'title', ruleId);
  reader.setReaderRegexSelection('title', ruleId);
}

function onReaderBodyRuleSelect(ruleId: string) {
  if (effectiveReaderPresetName.value) {
    presetLinks.setReaderRule(effectiveReaderPresetName.value, 'content', ruleId);
    toastr.success(`已更新预设“${effectiveReaderPresetName.value}”的共享阅读正文规则`);
    return;
  }
  regexDisplay.setExtractionRule('reader', 'content', ruleId);
  reader.setReaderRegexSelection('body', ruleId);
}

function onCleanupRuleChange(ruleId: string, enabled: boolean) {
  if (effectiveReaderPresetName.value) {
    const profile = readerPresetProfile.value;
    const selected = new Set(profile?.readerCleanupRuleIds ?? []);
    if (enabled) selected.add(ruleId);
    else selected.delete(ruleId);
    presetLinks.saveReaderProfile(effectiveReaderPresetName.value, {
      readerCleanupRuleIds: [...selected],
      readerContentRuleId: profile?.readerContentRuleId || '',
      readerTitleRuleId: profile?.readerTitleRuleId || '',
    });
    return;
  }
  regexDisplay.setDisplayRuleEnabled('reader', ruleId, enabled);
  reader.setCleanupRuleEnabled(ruleId, enabled);
}

function onHideEmptyAfterCleanupChange(event: Event) {
  reader.setHideEmptyAfterCleanup((event.target as HTMLInputElement).checked);
}

function onShowUserMessagesChange(event: Event) {
  reader.setShowUserMessages((event.target as HTMLInputElement).checked);
}

watch(
  () =>
    JSON.stringify({
      bodyRuleId: readerRegexUsage.value.contentRuleId,
      cleanupRuleIds: readerRegexUsage.value.displayRuleIds,
      hideEmptyAfterCleanup: readerSettings.value.hideEmptyAfterCleanup,
      rules: [...readerTitleRegexRules.value, ...readerBodyRegexRules.value, ...readerCleanupRules.value].map(rule => [
        rule.id,
        rule.name,
        rule.pattern,
        rule.replacement,
        rule.flags,
        rule.operation,
      ]),
      titleRuleId: readerRegexUsage.value.titleRuleId,
      bindingUpdatedAt: readerBinding.value?.updatedAt || '',
      presetName: effectiveReaderPresetName.value,
      presetReaderUpdatedAt: readerPresetProfile.value?.updatedAt || '',
      showUserMessages: readerSettings.value.showUserMessages,
    }),
  () => {
    reloadActiveChatDebounced();
  },
);

watch(
  () => route.value,
  current => {
    if (current.appId !== 'reader') return;
    if (
      current.page === 'root' ||
      current.page === 'detail' ||
      current.page === 'bagu-scan' ||
      current.page === 'edit'
    ) {
      void loadCurrentChat();
    }
    if (current.page === 'edit') {
      readerEditDraft.value = activeMessage.value?.body || '';
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => phone.viewingScopeKey,
  () => {
    resetReaderChatSession();
    if (route.value.appId === 'reader') {
      void loadCurrentChat(true);
    }
  },
);

const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
  syncCurrentTavernPresetName();
  applyPendingBranchInheritance();
  resetReaderChatSession();
  if (route.value.appId === 'reader') {
    void loadCurrentChat(true);
  }
});

onScopeDispose(() => {
  stopChatChanged.stop();
});

function openMessage(messageId: string, replaceCurrent = false) {
  if (!messageId) return;
  const message = activeMessages.value.find(item => item.id === messageId);
  if (!message) return;
  showCatalogModal.value = false;
  const params = { messageId };
  if (replaceCurrent) phone.replacePage('detail', message.title, params);
  else phone.pushPage('detail', message.title, params);
  void nextTick(() => scrollToTop('auto'));
}

function openAdjacentMessage(messageId: string) {
  if (!messageId) return;
  openMessage(messageId, true);
}

function openReaderBaguScan() {
  if (!activeMessage.value || !isViewingActiveSwipe.value) return;
  if (!canOpenBaguScan(readerBaguContent.value)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    messageId: activeMessage.value.id,
  });
}

function openReaderEditor() {
  if (!activeMessage.value || !isViewingActiveSwipe.value) return;
  if (!phone.isViewingCurrentChat) {
    toastr.warning('历史聊天只读，请先切回酒馆当前聊天再编辑');
    return;
  }
  readerEditDraft.value = activeMessage.value.body;
  phone.pushPage('edit', '编辑正文', {
    messageId: activeMessage.value.id,
  });
}

function clearPendingBranch() {
  pendingBranchSourceScopeKey = '';
  pendingBranchExpiresAt = 0;
}

function applyPendingBranchInheritance() {
  if (!pendingBranchSourceScopeKey) return;
  if (Date.now() > pendingBranchExpiresAt) {
    clearPendingBranch();
    return;
  }

  const targetScopeKey = getCurrentChatScopeKey();
  if (isPlaceholderChatScopeKey(targetScopeKey) || targetScopeKey === pendingBranchSourceScopeKey) return;

  const inheritedCount = worldbookLinks.inheritProfiles(pendingBranchSourceScopeKey, targetScopeKey);
  const inheritedPreset = presetLinks.inheritBinding(pendingBranchSourceScopeKey, targetScopeKey);
  clearPendingBranch();
  const inheritedLabels = [
    inheritedCount ? `${inheritedCount} 本世界书的条目开关` : '',
    inheritedPreset ? '预设绑定' : '',
  ].filter(Boolean);
  toastr.success(inheritedLabels.length ? `已创建分支，并继承${inheritedLabels.join('、')}` : '已创建分支');
}

async function createReaderBranch() {
  if (!activeMessage.value || branching.value) return;
  if (!phone.isViewingCurrentChat) {
    toastr.warning('历史聊天只读，请先切回酒馆当前聊天再创建分支');
    return;
  }

  const sourceScopeKey = getCurrentChatScopeKey();
  if (isPlaceholderChatScopeKey(sourceScopeKey)) {
    toastr.warning('当前聊天尚未就绪，请稍后再试');
    return;
  }

  branching.value = true;
  pendingBranchSourceScopeKey = sourceScopeKey;
  pendingBranchExpiresAt = Date.now() + 15_000;
  try {
    await executeSlashCommandSafe(`/branch-create ${activeMessage.value.sourceMessageId}`);
    if (getCurrentChatScopeKey() === sourceScopeKey) {
      clearPendingBranch();
      toastr.error('酒馆未能创建分支');
      return;
    }
    applyPendingBranchInheritance();
  } catch (caughtError) {
    clearPendingBranch();
    const message = caughtError instanceof Error ? caughtError.message : '酒馆未能创建分支';
    toastr.error(message);
  } finally {
    branching.value = false;
  }
}

function selectCatalogMessage(messageId: string) {
  showCatalogModal.value = false;
  openMessage(messageId, true);
}

function getActiveMessageSourceLabel() {
  if (!activeMessage.value) return '';
  return `${currentChatTitle.value} · 第 ${activeMessage.value.sourceMessageId} 楼`;
}

function saveSelectionToDigest() {
  if (!activeMessage.value || !activeSwipeCandidate.value || !isViewingActiveSwipe.value) return;
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || '';
  if (!selectedText) {
    toastr.warning('请先在正文里选中要摘录的文字');
    return;
  }

  const sourceLabel = getActiveMessageSourceLabel();
  const existingEntry = digest.data.entries.find(
    entry =>
      entry.kind === 'manual' &&
      entry.sourceMessageId === activeMessage.value?.sourceMessageId &&
      entry.sourceLabel === sourceLabel,
  );

  const entry = existingEntry
    ? digest.updateEntry(existingEntry.id, {
        title: existingEntry.title,
        content: [existingEntry.content.trim(), selectedText].filter(Boolean).join('\n\n'),
        sourceLabel,
        sourceText: activeSwipeCandidate.value.rawText,
        tags: existingEntry.tags,
      })
    : digest.createEntry({
        title: activeMessage.value.title || `第 ${activeMessage.value.sourceMessageId} 楼摘抄`,
        content: selectedText,
        sourceLabel,
        sourceMessageId: activeMessage.value.sourceMessageId,
        sourceText: activeSwipeCandidate.value.rawText,
        kind: 'manual',
      });
  selection?.removeAllRanges();
  toastr.success(`已加入摘抄：${entry?.title || activeMessage.value.title}`);
}

function toggleActiveMessageFavorite() {
  if (!activeMessage.value || !isViewingActiveSwipe.value) return;
  const result = reader.toggleFavorite({
    content: activeMessage.value.rawText,
    messageId: activeMessage.value.id,
    scopeKey: phone.viewingScopeKey,
    scopeTitle: currentChatTitle.value,
    sourceLabel: getActiveMessageSourceLabel(),
    sourceMessageId: activeMessage.value.sourceMessageId,
    title: activeMessage.value.title || `第 ${activeMessage.value.sourceMessageId} 楼`,
  });
  toastr.success(result ? '已收藏当前楼层' : '已取消收藏');
}

async function saveChatIfAvailable() {
  const saveChat = getOptionalGlobalFunction<() => Promise<void> | void>('saveChat');
  if (saveChat) await Promise.resolve(saveChat());
}

function parseReaderRegexPattern(find: string, flags: string) {
  const allowed = new Set(['g', 'i', 'm', 's', 'u', 'y']);
  const normalizeFlags = (value: string) => {
    let normalized = '';
    for (const char of value.trim()) {
      if (allowed.has(char) && !normalized.includes(char)) normalized += char;
    }
    return normalized;
  };
  const source = find.trim();
  const literal = source.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
  if (!literal) return { flags: normalizeFlags(flags), pattern: source };
  return { flags: normalizeFlags(`${literal[2] || ''}${flags}`), pattern: literal[1] };
}

function replaceReaderBodyInRaw(
  rawText: string,
  currentBody: string,
  nextBody: string,
  sourceRange: ReaderBodySourceRange | null = resolveReaderBodySourceRange(
    rawText,
    currentBody,
    activeBodyRule.value,
    readerRegexUsage.value.contentRuleId,
  ),
) {
  if (rawText === currentBody) return nextBody;
  if (!sourceRange || rawText.slice(sourceRange.start, sourceRange.end) !== currentBody) return null;
  return `${rawText.slice(0, sourceRange.start)}${nextBody}${rawText.slice(sourceRange.end)}`;
}

function applyReaderCleanupRules(body: string) {
  return selectedCleanupRules.value.reduce((nextBody, rule) => {
    try {
      const parsed = parseReaderRegexPattern(rule.pattern, rule.flags);
      if (!parsed.pattern.trim()) return nextBody;
      return nextBody.replace(new RegExp(parsed.pattern, parsed.flags), rule.replacement).trim();
    } catch {
      return nextBody;
    }
  }, body);
}

async function applyReaderBaguContent(content: string) {
  if (!activeMessage.value || !isViewingActiveSwipe.value) return false;
  if (!phone.isViewingCurrentChat) {
    throw new Error('历史聊天只读，请先切回当前聊天再应用检测结果');
  }

  const nextRawText = replaceReaderBodyInRaw(
    activeMessage.value.rawText,
    activeMessage.value.sourceBody,
    content,
    activeMessage.value.bodySourceRange,
  );
  if (nextRawText === null) {
    throw new Error('当前正文规则无法安全写回原楼层，请先在酒馆楼层编辑中手动修改');
  }

  await setChatMessagesSafe(
    [
      {
        message_id: activeMessage.value.sourceMessageId,
        message: nextRawText,
      },
    ],
    { refresh: 'affected' },
  );
  await saveChatIfAvailable();
  await loadCurrentChat(true);
  return true;
}

function resetReaderEditDraft() {
  readerEditDraft.value = activeMessage.value?.body || '';
}

function returnToReaderDetail() {
  if (!activeMessage.value) return;
  phone.replacePage('detail', activeMessage.value.title, {
    messageId: activeMessage.value.id,
  });
}

async function saveReaderEdit() {
  if (!activeMessage.value) return;
  if (!phone.isViewingCurrentChat) {
    toastr.warning('历史聊天只读，请先切回酒馆当前聊天再编辑');
    return;
  }

  const messageId = activeMessage.value.id;
  const nextRawText = replaceReaderBodyInRaw(
    activeMessage.value.rawText,
    activeMessage.value.sourceBody,
    readerEditDraft.value,
    activeMessage.value.bodySourceRange,
  );
  if (nextRawText === null) {
    toastr.error('当前正文规则无法安全写回原楼层，请改用酒馆楼层编辑或调整阅读正文规则');
    return;
  }

  await setChatMessagesSafe(
    [
      {
        message_id: activeMessage.value.sourceMessageId,
        message: nextRawText,
      },
    ],
    { refresh: 'affected' },
  );
  await saveChatIfAvailable();
  await loadCurrentChat(true);
  const updatedMessage = activeMessages.value.find(item => item.id === messageId);
  phone.replacePage('detail', updatedMessage?.title || activeMessage.value?.title || '阅读详情', { messageId });
  toastr.success('已更新原聊天楼层');
}

async function saveReaderReasoning(reasoning: string) {
  if (!activeMessage.value || !phone.isViewingCurrentChat || !isViewingActiveSwipe.value) return;
  const sourceMessage = getChatMessagesSafe('0-{{lastMessageId}}', { include_swipes: true }).find(
    message => message.message_id === activeMessage.value?.sourceMessageId,
  );
  if (!sourceMessage) return;

  const swipeIndex = activeMessage.value.activeSwipeIndex;
  const swipes = Array.isArray(sourceMessage.swipes) ? sourceMessage.swipes : [];
  if (swipes.length) {
    const swipesData = swipes.map((_, index) => ({ ...(sourceMessage.swipes_data?.[index] || {}) }));
    swipesData[swipeIndex] = { ...swipesData[swipeIndex], reasoning };
    await setChatMessagesSafe(
      [{ message_id: sourceMessage.message_id, swipes_data: swipesData }],
      { refresh: 'affected' },
    );
  } else {
    await setChatMessagesSafe(
      [{ message_id: sourceMessage.message_id, extra: { ...sourceMessage.extra, reasoning } }],
      { refresh: 'affected' },
    );
  }
  await saveChatIfAvailable();
  await loadCurrentChat(true);
}

async function refreshCurrentChat() {
  await loadCurrentChat(true);
}

async function reloadActiveChat() {
  if (route.value.page !== 'root' && route.value.page !== 'detail') return;
  await loadCurrentChat(true);
}

function syncCurrentTavernPresetName() {
  currentTavernPresetName.value = getCurrentTavernPresetName();
}

function normalizeTitle(title: string, messageIndex: number, isUser = false) {
  const trimmed = title.trim();
  if (!trimmed) return isUser ? `用户 · 第 ${messageIndex} 楼` : `第 ${messageIndex} 楼`;
  return trimmed;
}

function readerFloorLabel(message: Pick<ReaderMessage, 'sourceMessageId'>) {
  return `第 ${message.sourceMessageId} 楼`;
}

function hasExtractedReaderTitle(message: Pick<ReaderMessage, 'isUser' | 'sourceMessageId' | 'title'>) {
  return message.title.trim() !== normalizeTitle('', message.sourceMessageId, message.isUser);
}

function formatReaderBody(value: string) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  if (settings.value.reader.blankLineBetweenLines) {
    return lines
      .map(line => line.trim())
      .filter(line => line)
      .join('\n\n');
  }
  if (settings.value.reader.firstLineIndent) {
    return lines.map(line => line.trimStart()).join('\n');
  }
  return value;
}
</script>

<style scoped>
.pc-reader-app,
.pc-reader-page {
  height: 100%;
  min-height: 0;
}

.pc-reader-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-reader-detail-page {
  gap: 10px;
}

.pc-reader-bagu-page {
  overflow: auto;
}

.pc-reader-edit-page {
  min-height: 0;
}

.pc-reader-bagu-card {
  padding: 14px;
}

.pc-reader-bagu-scan-panel {
  margin-top: 14px;
}

.pc-reader-edit-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.pc-reader-edit-area {
  min-height: 0;
  height: 100%;
  resize: none;
  font-family: var(--pc-reader-font-family);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  white-space: pre-wrap;
}

.pc-reader-edit-card > .pc-form-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-reader-edit-card > .pc-form-actions > button {
  min-width: 0;
  white-space: nowrap;
}

.pc-settings-card,
.pc-error-card,
.pc-accordion-item,
.pc-brief-card,
.pc-message-card,
.pc-rule-card,
.pc-rule-panel {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: min(var(--pc-card-radius), 8px);
  backdrop-filter: blur(12px);
}

.pc-settings-card,
.pc-error-card,
.pc-settings-head,
.pc-toolbar-actions,
.pc-inline-actions,
.pc-inline-grid,
.pc-message-head,
.pc-search-field,
.pc-rule-head,
.pc-accordion-head,
.pc-character-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-settings-head,
.pc-message-head,
.pc-rule-head,
.pc-accordion-head {
  justify-content: space-between;
}

.pc-home-tools {
  padding: 10px 14px;
}

.pc-chat-hero {
  align-items: center;
}

.pc-error-card p {
  color: var(--pc-text);
}

.pc-refresh-icon {
  border-radius: 999px;
}

.pc-refresh-icon .spinning {
  animation: pc-reader-spin 0.9s linear infinite;
}

@keyframes pc-reader-spin {
  to {
    transform: rotate(360deg);
  }
}

.pc-reader-app :is(.pc-primary-btn, .pc-soft-btn, .pc-icon-btn) {
  flex: 0 0 auto;
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}

.pc-preset-list,
.pc-accordion-list,
.pc-brief-list,
.pc-message-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-rule-card,
.pc-brief-card,
.pc-message-card {
  padding: 14px;
}

.pc-rule-panel {
  position: relative;
  z-index: 2;
  overflow: visible;
  flex: 0 0 auto;
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, transparent 12%);
}

.pc-rule-toggle {
  width: 100%;
  min-height: 58px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  text-align: left;
}

.pc-rule-title {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-rule-title strong,
.pc-rule-title small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-rule-title small {
  margin-top: 3px;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-rule-select {
  flex: 0 1 132px;
  min-width: 112px;
  margin-top: 0;
}

.pc-rule-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px 14px;
}

.pc-rule-picker {
  display: grid;
  grid-template-columns: minmax(92px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pc-rule-picker > :deep(.pc-combobox) {
  min-width: 0;
}

.pc-reader-cleanup {
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface-strong);
  padding: 10px;
}

.pc-reader-cleanup summary,
.pc-reader-cleanup-toggle,
.pc-reader-cleanup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-reader-cleanup summary {
  cursor: pointer;
  font-weight: 800;
  list-style: none;
}

.pc-reader-cleanup summary::-webkit-details-marker {
  display: none;
}

.pc-reader-cleanup summary small,
.pc-reader-cleanup-toggle span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-reader-cleanup-toggle {
  margin-top: 10px;
}

.pc-reader-visibility-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  color: var(--pc-text);
  font-weight: 700;
}

.pc-reader-cleanup-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.pc-reader-cleanup-item {
  justify-content: flex-start;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface);
  padding: 8px 10px;
  font-weight: 700;
}

.pc-rule-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-rule-help {
  margin: 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
}

.pc-rule-section {
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface-strong);
  padding: 12px;
}

.pc-rule-head {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 0;
}

.pc-rule-fields {
  margin-top: 10px;
}

.pc-rule-grid,
.pc-inline-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pc-name-field {
  margin-top: 0;
}

.pc-reader-app :is(.pc-field, .pc-select) {
  margin-top: 12px;
}

.pc-accordion-head,
.pc-brief-main,
.pc-message-main {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
}

.pc-accordion-item {
  overflow: hidden;
}

.pc-accordion-head {
  padding: 16px 18px;
}

.pc-accordion-body {
  padding: 0 14px 14px;
}

.pc-reader-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.pc-picker-panel {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface) 86%, transparent 14%);
}

.pc-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 8px;
}

.pc-picker-head span {
  min-width: 32px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-size: 12px;
}

.pc-picker-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-character-scroll,
.pc-brief-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 214px;
  overflow: auto;
  padding: 0 10px 12px;
}

.pc-character-row {
  width: 100%;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: min(var(--pc-card-radius), 8px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  text-align: left;
}

.pc-character-main {
  flex: 1 1 auto;
  min-width: 0;
}

.pc-character-row.active {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 34%, transparent 66%);
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
}

.pc-character-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-weight: 700;
}

.pc-character-copy strong,
.pc-brief-main strong,
.pc-message-head strong,
.pc-error-card strong {
  display: block;
}

.pc-character-copy,
.pc-message-head > div {
  flex: 1 1 auto;
  min-width: 0;
}

.pc-message-head > .pc-message-meta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.pc-reader-floor-label {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}

.pc-character-copy strong,
.pc-brief-main strong,
.pc-message-head strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-hidden-pill {
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
  font-size: 11px;
}

.pc-message-body {
  flex: 1 1 auto;
  margin-top: 14px;
  padding: 16px;
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  color: var(--pc-reader-text, var(--pc-text));
  font-family: var(--pc-reader-font-family);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  min-height: 0;
  overflow: auto;
}

.pc-message-body :deep(*) {
  font-family: inherit;
}

.pc-message-body.indent :deep(p) {
  text-indent: 2em;
}

.pc-message-detail-card {
  flex: 1 1 auto;
  min-height: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  font-family: var(--pc-reader-font-family);
}

.pc-message-detail-card .pc-message-head strong {
  font-family: inherit;
}

.pc-message-detail-card .pc-reader-detail-head {
  position: relative;
  justify-content: center;
  padding: 2px 42px 0;
  text-align: center;
}

.pc-reader-detail-title {
  min-width: 0;
}

.pc-message-detail-card .pc-reader-detail-title strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.pc-message-detail-card .pc-reader-detail-title p {
  margin: 6px 0 0;
  color: color-mix(in srgb, var(--pc-text) 58%, transparent 42%);
  font-size: 12px;
  line-height: 1.35;
}

.pc-message-detail-card .pc-hidden-pill {
  position: absolute;
  top: 2px;
  right: 0;
}

.pc-reader-swipe-selector {
  display: grid;
  gap: 8px;
  margin: 0 0 14px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 10px);
  background: var(--pc-surface-strong);
}

.pc-reader-swipe-head,
.pc-reader-swipe-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-reader-swipe-head {
  justify-content: space-between;
}

.pc-reader-swipe-head span,
.pc-reader-swipe-selector p {
  margin: 0;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-reader-swipe-options {
  flex-wrap: wrap;
}

.pc-rendered-markdown > * {
  margin: 0 0 0.78em;
}

.pc-rendered-markdown > *:last-child {
  margin-bottom: 0;
}

.pc-rendered-markdown h3,
.pc-rendered-markdown h4,
.pc-rendered-markdown h5,
.pc-rendered-markdown h6 {
  font-size: 1.05em;
  line-height: 1.45;
}

.pc-rendered-markdown ul,
.pc-rendered-markdown ol {
  padding-left: 1.3em;
}

.pc-rendered-markdown blockquote {
  padding-left: 0.9em;
  border-left: 3px solid color-mix(in srgb, var(--pc-theme-accent) 40%, transparent 60%);
  color: var(--pc-muted);
}

.pc-rendered-markdown pre {
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-text) 8%, transparent 92%);
  font-size: 0.88em;
}

.pc-number-field {
  display: flex;
  flex-direction: column;
}
</style>
