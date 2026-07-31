<template>
  <section class="pc-reader-app">
    <section v-if="route.page === 'root'" class="pc-reader-page">
      <div class="pc-reader-hero pc-chat-hero">
        <div class="pc-hero-copy">
          <span class="pc-kicker">{{ readerScopeLabel }}</span>
          <h2>{{ currentChatTitle }}</h2>
        </div>
        <button
          class="pc-icon-btn pc-refresh-icon"
          type="button"
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
            :title="rulesOpen ? t`折叠规则` : t`展开规则`"
            @click="rulesOpen = !rulesOpen"
          >
            <i :class="rulesOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
        </div>

        <div v-if="rulesOpen" class="pc-rule-body">
          <label class="pc-rule-picker">
            <span class="pc-field-label">{{ t`标题规则` }}</span>
            <select :value="readerSettings.titleRuleId" class="pc-select" @change="onReaderTitleRuleSelect">
              <option value="__default_title__">{{ t`无正则` }}</option>
              <option v-for="rule in readerRegexRules" :key="rule.id" :value="rule.id">{{ rule.name }}</option>
            </select>
          </label>
          <label class="pc-rule-picker">
            <span class="pc-field-label">{{ t`楼层正文提取` }}</span>
            <select :value="bodyRuleSelectValue" class="pc-select" @change="onReaderBodyRuleSelect">
              <option v-if="!readerRegexRules.length" value="__default_body__">{{ t`默认楼层正文提取` }}</option>
              <option v-for="rule in readerRegexRules" :key="rule.id" :value="rule.id">{{ rule.name }}</option>
            </select>
          </label>
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
                  :checked="readerSettings.cleanupRuleIds.includes(rule.id)"
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
          <p v-if="!readerRegexRules.length" class="pc-rule-help">
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
              <span v-if="message.isUser" class="pc-hidden-pill">{{ t`用户` }}</span>
              <span v-if="message.isHidden" class="pc-hidden-pill">{{ t`隐藏` }}</span>
            </div>
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'detail' && activeMessage" class="pc-reader-page pc-reader-detail-page">
      <ReaderDetailShell
        :actions-class="phone.isViewingCurrentChat ? 'five' : ''"
        :branch-disabled="branching"
        :branch-enabled="phone.isViewingCurrentChat"
        :branch-label="branching ? t`正在创建分支` : t`从此处创建分支`"
        :content="activeMessageBody"
        content-formatted
        :edit-disabled="!phone.isViewingCurrentChat"
        :edit-label="phone.isViewingCurrentChat ? t`编辑正文` : t`历史聊天只读`"
        :favorite-active="Boolean(activeMessageFavorite)"
        :next-disabled="!nextMessageId"
        :previous-disabled="!previousMessageId"
        :title="activeMessage.title"
        @bagu="openReaderBaguScan"
        @bottom="scrollToBottom"
        @branch="createReaderBranch"
        @catalog="showCatalogModal = true"
        @edit="openReaderEditor"
        @favorite="toggleActiveMessageFavorite"
        @next="openAdjacentMessage(nextMessageId)"
        @previous="openAdjacentMessage(previousMessageId)"
        @top="scrollToTop"
      >
        <template #meta>
          <span v-if="activeMessage.isUser" class="pc-hidden-pill">{{ t`用户` }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">{{ t`隐藏` }}</span>
        </template>
        <template #actions>
          <button class="pc-soft-btn" type="button" :title="t`选中文字加入摘抄`" @click="saveSelectionToDigest">
            <i class="fa-solid fa-highlighter"></i>
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
      <article class="pc-editor-card pc-reader-edit-card">
        <span class="pc-kicker">{{ getActiveMessageSourceLabel() }}</span>
        <h2>{{ t`编辑正文` }}</h2>
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
import {
  defaultReaderBodyRule,
  defaultReaderSettings,
  normalizeBrief,
  normalizeArchivedMessage,
  type ChatReaderRegexRule,
  type ReaderMessage,
} from '@/store/reader';
import {
  defaultReaderBodyRegexDisplayRuleId,
  regexDisplayReaderCleanupTarget,
  regexDisplayReaderTarget,
  type RegexDisplayRule,
  useRegexDisplayStore,
} from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import { useReaderStore } from '@/store/reader';
import { useSettingsStore } from '@/store/settings';
import { useDigestStore } from '@/apps/digest/store';
import { useWorldbookLinkStore } from '@/apps/worldbook-link/store';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { normalizeChatArchiveId, parseChatScopeKey } from '@/util/chatArchive';
import { canOpenBaguScan } from '@/util/baguScanGate';
import { useDetailScroll } from '@/util/detailScroll';
import {
  executeSlashCommandSafe,
  getChatHistoryDetailSafe,
  getChatMessagesSafe,
  getOptionalGlobalFunction,
  onTavernEvent,
  setChatMessagesSafe,
} from '@/util/runtime';
import { getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { transformReaderMessages } from '@/util/readerRegex';
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
  title: '酒馆手机',
  params: undefined,
});

const route = computed(() => phone.currentRoute ?? fallbackRoute);
const readerSettings = computed(() => reader.settings ?? fallbackSettings);
const currentMessages = ref<ReaderMessage[]>([]);
const loadedScopeKey = ref('');
const error = ref('');
const loadingDetail = ref(false);
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

const activeMessages = computed(() => currentMessages.value);
const activeMessage = computed(() => {
  const messageId = route.value.params?.messageId;
  return messageId ? (activeMessages.value.find(item => item.id === messageId) ?? null) : null;
});
function escapeCssString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toReaderFontStack(fontFamily: string) {
  const value = fontFamily.trim();
  if (!value) return 'var(--pc-font-sans)';
  if (value.includes(',') || value.startsWith('var(')) return value;
  return `"${escapeCssString(value)}", var(--pc-font-sans)`;
}

const readerBodyStyle = computed(() => ({
  fontFamily: toReaderFontStack(settings.value.reader.fontFamily),
}));
const activeMessageBody = computed(() => (activeMessage.value ? formatReaderBody(activeMessage.value.body) : ''));
const readerBaguContent = computed(() => activeMessage.value?.body || '');
const messageCatalogItems = computed(() =>
  activeMessages.value.map(message => ({
    id: message.id,
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
const defaultTitleRule: ChatReaderRegexRule = { find: '', flags: '', replace: '' };
const readerRegexRules = computed(() =>
  regexDisplayRules.value.filter(rule => rule.targets.includes(regexDisplayReaderTarget) && rule.pattern.trim()),
);
const readerCleanupRules = computed(() =>
  regexDisplayRules.value.filter(rule => rule.targets.includes(regexDisplayReaderCleanupTarget) && rule.pattern.trim()),
);
const selectedTitleRegexRule = computed(() => getSelectedReaderRegexRule(readerSettings.value.titleRuleId));
const selectedBodyRegexRule = computed(() => getSelectedReaderRegexRule(readerSettings.value.bodyRuleId));
const selectedCleanupRules = computed(() =>
  readerCleanupRules.value.filter(rule => readerSettings.value.cleanupRuleIds.includes(rule.id)),
);
const activeTitleRule = computed(() => toReaderRegexRule(selectedTitleRegexRule.value, defaultTitleRule));
const activeBodyRule = computed(() => toReaderRegexRule(selectedBodyRegexRule.value, defaultReaderBodyRule));
const cleanupSummary = computed(() =>
  selectedCleanupRules.value.length ? `已选 ${selectedCleanupRules.value.length} 条` : '未选择',
);
const readerRuleSummary = computed(
  () =>
    `${selectedTitleRegexRule.value?.name || '无正则'} / ${selectedBodyRegexRule.value?.name || '默认正文'} / 清理 ${selectedCleanupRules.value.length}`,
);
const bodyRuleSelectValue = computed(() => {
  if (readerSettings.value.bodyRuleId === '__default_body__') {
    return readerRegexRules.value.some(rule => rule.id === defaultReaderBodyRegexDisplayRuleId)
      ? defaultReaderBodyRegexDisplayRuleId
      : '__default_body__';
  }
  return readerSettings.value.bodyRuleId;
});
const activeMessageFavorite = computed(() =>
  activeMessage.value ? reader.getFavorite(phone.viewingScopeKey, activeMessage.value.id) : null,
);
const reloadActiveChatDebounced = useDebounceFn(() => {
  void reloadActiveChat();
}, 250);
let readerLoadSerial = 0;

function getSelectedReaderRegexRule(ruleId: string) {
  if (ruleId === '__default_body__') {
    return readerRegexRules.value.find(rule => rule.id === defaultReaderBodyRegexDisplayRuleId) ?? null;
  }
  if (!ruleId || ruleId.startsWith('__default_')) return null;
  return readerRegexRules.value.find(rule => rule.id === ruleId) ?? null;
}

function toReaderRegexRule(rule: RegexDisplayRule | null, fallback: ChatReaderRegexRule): ChatReaderRegexRule {
  if (!rule) return fallback;
  return {
    find: rule.pattern,
    flags: rule.flags,
    replace: rule.replacement,
  };
}

function onReaderTitleRuleSelect(event: Event) {
  reader.setReaderRegexSelection('title', (event.target as HTMLSelectElement).value);
}

function onReaderBodyRuleSelect(event: Event) {
  reader.setReaderRegexSelection('body', (event.target as HTMLSelectElement).value);
}

function onCleanupRuleChange(ruleId: string, enabled: boolean) {
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
      bodyRuleId: readerSettings.value.bodyRuleId,
      cleanupRuleIds: readerSettings.value.cleanupRuleIds,
      hideEmptyAfterCleanup: readerSettings.value.hideEmptyAfterCleanup,
      rules: [...readerRegexRules.value, ...readerCleanupRules.value].map(rule => [
        rule.id,
        rule.name,
        rule.pattern,
        rule.replacement,
        rule.flags,
        rule.targets.join(','),
      ]),
      titleRuleId: readerSettings.value.titleRuleId,
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
    currentMessages.value = [];
    loadedScopeKey.value = '';
    error.value = '';
    if (route.value.appId === 'reader') {
      void loadCurrentChat(true);
    }
  },
);

const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
  applyPendingBranchInheritance();
  currentMessages.value = [];
  loadedScopeKey.value = '';
  error.value = '';
  if (route.value.appId === 'reader') {
    void loadCurrentChat(true);
  }
});

onScopeDispose(() => {
  stopChatChanged.stop();
});

function openMessage(messageId: string) {
  if (!messageId) return;
  const message = activeMessages.value.find(item => item.id === messageId);
  if (!message) return;
  showCatalogModal.value = false;
  phone.pushPage('detail', message.title, {
    messageId,
  });
  void nextTick(() => scrollToTop('auto'));
}

function openAdjacentMessage(messageId: string) {
  if (!messageId) return;
  openMessage(messageId);
}

function openReaderBaguScan() {
  if (!activeMessage.value) return;
  if (!canOpenBaguScan(readerBaguContent.value)) return;
  phone.pushPage('bagu-scan', '八股检测', {
    messageId: activeMessage.value.id,
  });
}

function openReaderEditor() {
  if (!activeMessage.value) return;
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
  openMessage(messageId);
}

function getActiveMessageSourceLabel() {
  if (!activeMessage.value) return '';
  return `${currentChatTitle.value} · 第 ${activeMessage.value.sourceMessageId} 楼`;
}

function saveSelectionToDigest() {
  if (!activeMessage.value) return;
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
        sourceText: activeMessage.value.rawText,
        tags: existingEntry.tags,
      })
    : digest.createEntry({
        title: activeMessage.value.title || `第 ${activeMessage.value.sourceMessageId} 楼摘抄`,
        content: selectedText,
        sourceLabel,
        sourceMessageId: activeMessage.value.sourceMessageId,
        sourceText: activeMessage.value.rawText,
        kind: 'manual',
      });
  selection?.removeAllRanges();
  toastr.success(`已加入摘抄：${entry?.title || activeMessage.value.title}`);
}

function toggleActiveMessageFavorite() {
  if (!activeMessage.value) return;
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

function replaceReaderBodyInRaw(rawText: string, currentBody: string, nextBody: string) {
  if (rawText === currentBody) return nextBody;

  const directIndex = rawText.indexOf(currentBody);
  if (directIndex >= 0 && rawText.indexOf(currentBody, directIndex + currentBody.length) === -1) {
    return `${rawText.slice(0, directIndex)}${nextBody}${rawText.slice(directIndex + currentBody.length)}`;
  }

  const bodyRule = activeBodyRule.value;
  if (!bodyRule.find.trim()) return null;

  try {
    const parsed = parseReaderRegexPattern(bodyRule.find, bodyRule.flags);
    const flags = parsed.flags.includes('g') ? parsed.flags.replace(/g/g, '') : parsed.flags;
    const expression = new RegExp(parsed.pattern, flags);
    const match = rawText.match(expression);
    if (!match || match.index === undefined || match.length <= 1) return null;
    const captured = match.slice(1).find(value => value !== undefined && value !== '');
    if (!captured) return null;
    const captureOffset = match[0].indexOf(captured);
    if (captureOffset < 0) return null;
    const start = match.index + captureOffset;
    const end = start + captured.length;
    return `${rawText.slice(0, start)}${nextBody}${rawText.slice(end)}`;
  } catch {
    return null;
  }
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
  if (!activeMessage.value) return false;
  if (!phone.isViewingCurrentChat) {
    throw new Error('历史聊天只读，请先切回当前聊天再应用检测结果');
  }

  const nextRawText = replaceReaderBodyInRaw(activeMessage.value.rawText, activeMessage.value.body, content);
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
    activeMessage.value.body,
    readerEditDraft.value,
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

async function refreshCurrentChat() {
  await loadCurrentChat(true);
}

async function reloadActiveChat() {
  if (route.value.page !== 'root' && route.value.page !== 'detail') return;
  await loadCurrentChat(true);
}

async function loadCurrentChat(force = false) {
  const scopeKeyAtStart = phone.viewingScopeKey;
  const isViewingCurrentAtStart = phone.isViewingCurrentChat;
  if (currentMessages.value.length && loadedScopeKey.value === scopeKeyAtStart && !force) return currentMessages.value;
  const loadSerial = ++readerLoadSerial;
  loadingDetail.value = true;
  error.value = '';
  try {
    const sourceMessages = await loadViewingSourceMessages(scopeKeyAtStart, isViewingCurrentAtStart);
    const transformed = await transformReaderMessages(
      sourceMessages.map(item => ({
        messageIndex: item.messageIndex,
        rawText: item.rawText,
      })),
      activeTitleRule.value,
      activeBodyRule.value,
    );

    const normalized = sourceMessages
      .map((item, index) => {
        const body = applyReaderCleanupRules(transformed[index]?.body || item.rawText);
        return {
          ...item,
          title: normalizeTitle(transformed[index]?.title || '', item.messageIndex, item.isUser),
          body,
        };
      })
      .filter(
        item =>
          (readerSettings.value.showHiddenAssistantMessages || !item.isHidden) &&
          (!readerSettings.value.hideEmptyAfterCleanup || item.body.trim()),
      );

    if (loadSerial !== readerLoadSerial || phone.viewingScopeKey !== scopeKeyAtStart) return currentMessages.value;
    currentMessages.value = normalized;
    loadedScopeKey.value = scopeKeyAtStart;
    if (route.value.page === 'detail') {
      const currentMessageId = route.value.params?.messageId;
      const exists = normalized.some(item => item.id === currentMessageId);
      if (!exists && normalized[0]) {
        phone.replacePage('detail', normalized[0].title, {
          messageId: normalized[0].id,
        });
      }
    }
    return normalized;
  } catch (caughtError) {
    if (loadSerial === readerLoadSerial && phone.viewingScopeKey === scopeKeyAtStart) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取聊天失败';
      loadedScopeKey.value = scopeKeyAtStart;
    }
    return [];
  } finally {
    if (loadSerial === readerLoadSerial) loadingDetail.value = false;
  }
}

async function loadViewingSourceMessages(scopeKey: string, isViewingCurrent: boolean) {
  const rawMessages = isViewingCurrent
    ? getChatMessagesSafe('0-{{lastMessageId}}')
    : await loadHistoryMessagesFromViewingScope(scopeKey);
  return rawMessages
    .map((item, index) => normalizeArchivedMessage(item, index, readerSettings.value))
    .filter((item): item is NonNullable<ReturnType<typeof normalizeArchivedMessage>> => Boolean(item));
}

async function loadHistoryMessagesFromViewingScope(scopeKey: string) {
  const scope = parseChatScopeKey(scopeKey);
  if (!scope.chatId || scope.chatId === '__no_chat__') {
    throw new Error('这个档案没有可读取的酒馆聊天文件');
  }
  if (scope.kind !== 'char') {
    throw new Error('当前只支持读取角色卡聊天历史');
  }

  await getCharacters();
  const characterId = resolveViewingCharacterId(scope.ownerId, phone.viewingScopeMeta.ownerName);
  if (characterId < 0) {
    throw new Error('无法在酒馆角色列表中找到这个角色卡');
  }

  const briefs = await getPastCharacterChats(characterId);
  const normalizedBriefs = (briefs || [])
    .map(normalizeBrief)
    .filter((item): item is NonNullable<ReturnType<typeof normalizeBrief>> => Boolean(item));
  const targetChatId = normalizeChatArchiveId(scope.chatId);
  const brief = normalizedBriefs.find(item => isHistoryBriefMatch(item, targetChatId));
  if (!brief) {
    throw new Error('无法找到这个历史聊天文件');
  }

  const result = await getChatHistoryDetailSafe([brief.raw], false);
  const detailArray =
    result && typeof result === 'object'
      ? (Object.entries(result).find(([key]) => normalizeChatArchiveId(key) === targetChatId)?.[1] ??
        Object.values(result)[0])
      : null;
  if (!Array.isArray(detailArray)) return [];
  return detailArray;
}

function isHistoryBriefMatch(brief: NonNullable<ReturnType<typeof normalizeBrief>>, targetChatId: string) {
  const candidates = [brief.id, brief.fileName, brief.title]
    .map(value => normalizeChatArchiveId(value))
    .filter(Boolean);
  return candidates.includes(targetChatId);
}

function resolveViewingCharacterId(ownerId: string, ownerName: string) {
  const numericOwnerId = Number(ownerId);
  if (
    Number.isInteger(numericOwnerId) &&
    numericOwnerId >= 0 &&
    Array.isArray(characters) &&
    characters[numericOwnerId]
  ) {
    return numericOwnerId;
  }

  if (!Array.isArray(characters)) return -1;
  const ownerNameLower = ownerName.trim().toLowerCase();
  const ownerIdLower = ownerId.trim().toLowerCase();
  return characters.findIndex(character => {
    if (!character || typeof character !== 'object') return false;
    const record = character as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim().toLowerCase() : '';
    const avatar = typeof record.avatar === 'string' ? record.avatar.trim().toLowerCase() : '';
    const avatarStem = avatar.replace(/\.[^/.]+$/, '');
    return Boolean(
      (ownerNameLower && name === ownerNameLower) ||
      (ownerIdLower && (name === ownerIdLower || avatar === ownerIdLower || avatarStem === ownerIdLower)),
    );
  });
}

function normalizeTitle(title: string, messageIndex: number, isUser = false) {
  const trimmed = title.trim();
  if (!trimmed) return isUser ? `用户 · 第 ${messageIndex} 楼` : `第 ${messageIndex} 楼`;
  return trimmed;
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
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.pc-reader-edit-card h2 {
  margin: 0;
  font-size: 20px;
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

.pc-reader-hero,
.pc-settings-card,
.pc-error-card,
.pc-accordion-item,
.pc-brief-card,
.pc-message-card,
.pc-rule-card,
.pc-rule-panel {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: 20px;
  backdrop-filter: blur(12px);
}

.pc-reader-hero,
.pc-settings-card,
.pc-error-card,
.pc-reader-hero,
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

.pc-reader-hero,
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

.pc-hero-copy {
  flex: 1 1 auto;
  min-width: 0;
}

.pc-kicker,
.pc-reader-hero h2 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-kicker {
  display: block;
}

.pc-reader-hero h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
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
  overflow: hidden;
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

.pc-reader-cleanup {
  border-radius: 16px;
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
  border-radius: 16px;
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
  border-radius: 22px;
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
  border-radius: 18px;
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
  border-radius: 18px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-family: inherit;
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
