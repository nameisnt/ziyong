import { getPhoneApp } from '@/core/appLayout';
import { getRegisteredPhoneAppScopeSwitchHandlers } from '@/core/appRegistry';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey, isPlaceholderChatScopeKey } from '@/store/chatScoped';
import { getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';

export interface PhoneRoute {
  appId: string;
  page: string;
  title: string;
  params?: Record<string, string>;
  origin?: 'home' | 'favorites';
}

export interface PhoneViewingScopeMeta {
  chatTitle: string;
  ownerName: string;
}

interface PhoneNavigationOptions {
  skipConfirm?: boolean;
}

type PhoneNavigationGuardResult =
  | boolean
  | {
      allow: boolean;
      skipPreviewConfirm?: boolean;
    };
type PhoneNavigationGuard = () => PhoneNavigationGuardResult | Promise<PhoneNavigationGuardResult>;

export type PhoneNoticeKind = 'error' | 'info' | 'success' | 'warning';

export interface PhoneNotice {
  actions?: PhoneNoticeAction[];
  id: string;
  input?: PhoneNoticeInputField;
  inputValue?: string;
  kind: PhoneNoticeKind;
  message: string;
  title: string;
}

export interface PhoneNoticeAction {
  id: string;
  label: string;
  role?: 'danger' | 'primary' | 'soft';
  value?: boolean;
}

export interface PhoneNoticeInput {
  actions?: PhoneNoticeAction[];
  input?: PhoneNoticeInputField;
  kind?: PhoneNoticeKind;
  message: string;
  timeoutMs?: number;
  title?: string;
}

export interface PhoneNoticeInputField {
  placeholder?: string;
  value?: string;
}

export interface PhoneConfirmOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  dedupeKey?: string;
  kind?: PhoneNoticeKind;
  title?: string;
}

export interface PhonePromptOptions extends PhoneConfirmOptions {
  initialValue?: string;
  placeholder?: string;
}

export const usePhoneStore = defineStore('phone', () => {
  const isOpen = ref(false);
  const stack = ref<PhoneRoute[]>([{ appId: 'home', page: 'home', title: '酒馆手机' }]);
  const currentTavernScopeKey = ref(getCurrentChatScopeKey());
  const viewingScopeKey = ref(currentTavernScopeKey.value);
  const viewingScopeMeta = ref<PhoneViewingScopeMeta>(createDefaultScopeMeta(viewingScopeKey.value));
  const notices = ref<PhoneNotice[]>([]);
  const previewLeaveConfirming = ref(false);
  const navigationLeaveConfirming = ref(false);
  const navigationGuards = new Map<string, PhoneNavigationGuard>();
  const savedPreviewChecks = new Map<string, () => boolean>();
  const noticeTimers = new Map<string, number>();
  const noticeResolvers = new Map<string, (value: boolean) => void>();
  const noticePromptResolvers = new Map<string, (value: null | string) => void>();
  const pendingConfirmKeys = new Set<string>();

  const currentRoute = computed<PhoneRoute>(
    () => stack.value[stack.value.length - 1] ?? { appId: 'home', page: 'home', title: '酒馆手机' },
  );
  const canGoBack = computed(() => stack.value.length > 1);
  const currentApp = computed(() =>
    currentRoute.value.appId === 'home' ? null : getPhoneApp(currentRoute.value.appId),
  );
  const currentTitle = computed(() => currentRoute.value.title);
  const isViewingCurrentChat = computed(() =>
    areChatScopeKeysEquivalent(viewingScopeKey.value, currentTavernScopeKey.value),
  );

  function createDefaultScopeMeta(scopeKey: string): PhoneViewingScopeMeta {
    const marker = ':chat:';
    const index = scopeKey.lastIndexOf(marker);
    if (index < 0) {
      return formatScopeMetaParts(scopeKey || '未知角色', '未选择聊天');
    }
    const owner = scopeKey.slice(0, index);
    const separator = owner.indexOf(':');
    return formatScopeMetaParts(
      separator >= 0 ? owner.slice(separator + 1) : owner,
      scopeKey.slice(index + marker.length),
    );
  }

  function formatScopeMetaParts(ownerName: string, chatTitle: string): PhoneViewingScopeMeta {
    return {
      chatTitle: chatTitle === '__no_chat__' ? '正在读取当前聊天' : chatTitle || '未命名聊天',
      ownerName: resolveOwnerDisplayName(ownerName),
    };
  }

  function resolveOwnerDisplayName(ownerName: string) {
    const normalized = ownerName.trim();
    const currentCharacterName =
      getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName')?.()?.trim();
    const currentCharacterId = String(
      getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentCharacterId')?.() ??
        getOptionalGlobalValue('this_chid') ??
        '',
    );
    if (normalized === '__no_character__') return currentCharacterName || '当前角色';
    if (currentCharacterName && normalized === currentCharacterId) return currentCharacterName;

    const characterIndex = Number(normalized);
    const runtimeCharacters = getOptionalGlobalValue<unknown[]>('characters');
    const character =
      Number.isInteger(characterIndex) && Array.isArray(runtimeCharacters) ? runtimeCharacters[characterIndex] : null;
    if (character && typeof character === 'object') {
      const record = character as Record<string, unknown>;
      if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    }

    return normalized || '未知角色';
  }

  async function applyViewingScope(scopeKey: string) {
    await Promise.all(getRegisteredPhoneAppScopeSwitchHandlers().map(item => item.switchScope(scopeKey)));
  }

  async function setViewingScope(scopeKey: string, meta?: Partial<PhoneViewingScopeMeta>, forceApply = false) {
    const normalizedScopeKey = areChatScopeKeysEquivalent(scopeKey, currentTavernScopeKey.value)
      ? currentTavernScopeKey.value
      : scopeKey;
    const scopeChanged = normalizedScopeKey !== viewingScopeKey.value;
    const nextMeta = {
      ...createDefaultScopeMeta(normalizedScopeKey),
      ...meta,
    };
    viewingScopeKey.value = normalizedScopeKey;
    viewingScopeMeta.value = nextMeta;
    if (!scopeChanged && !forceApply) return;
    await applyViewingScope(normalizedScopeKey);
  }

  async function syncCurrentTavernScope(forceViewCurrent = false, forceApply = false) {
    const previousScopeKey = currentTavernScopeKey.value;
    const wasViewingCurrent =
      areChatScopeKeysEquivalent(viewingScopeKey.value, previousScopeKey) ||
      isPlaceholderChatScopeKey(viewingScopeKey.value);
    const nextScopeKey = getCurrentChatScopeKey();
    currentTavernScopeKey.value = nextScopeKey;
    if (forceViewCurrent || wasViewingCurrent) {
      await setViewingScope(nextScopeKey, undefined, forceApply);
    }
  }

  async function returnToCurrentScope() {
    await syncCurrentTavernScope(true);
  }

  function getTavernJumpTarget() {
    const marker = ':chat:';
    const index = viewingScopeKey.value.lastIndexOf(marker);
    if (index < 0) return null;
    const owner = viewingScopeKey.value.slice(0, index);
    const ownerSeparator = owner.indexOf(':');
    const ownerId = ownerSeparator >= 0 ? owner.slice(ownerSeparator + 1) : owner;
    const characterId = Number(ownerId);
    const chatId = viewingScopeKey.value.slice(index + marker.length);
    if (!chatId || chatId === '__no_chat__') return null;
    return {
      chatId,
      characterId: Number.isInteger(characterId) && characterId >= 0 ? characterId : null,
      ownerName: viewingScopeMeta.value.ownerName,
      scopeKey: viewingScopeKey.value,
    };
  }

  function openPhone() {
    isOpen.value = true;
    void syncCurrentTavernScope();
  }

  function closePhoneNow() {
    isOpen.value = false;
    clearNotices();
  }

  function registerNavigationGuard(guard: PhoneNavigationGuard) {
    const id = `phone_navigation_guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    navigationGuards.set(id, guard);
    return () => navigationGuards.delete(id);
  }

  function registerSavedPreviewCheck(check: () => boolean) {
    const id = `phone_saved_preview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    savedPreviewChecks.set(id, check);
    return () => savedPreviewChecks.delete(id);
  }

  function isGenerationPreviewRoute(route: PhoneRoute) {
    return route.appId !== 'home' && (route.page === 'preview' || route.page.endsWith('-preview'));
  }

  async function confirmPreviewLeave(options: PhoneNavigationOptions = {}) {
    if (options.skipConfirm || !isGenerationPreviewRoute(currentRoute.value)) return true;
    if ([...savedPreviewChecks.values()].some(check => check())) return true;
    if (previewLeaveConfirming.value) return false;
    previewLeaveConfirming.value = true;
    try {
      return await confirmNotice('当前预览还未保存，离开后将丢失这次生成结果。确定离开吗？', {
        cancelLabel: '继续编辑',
        confirmLabel: '离开',
        kind: 'warning',
        title: '离开预览？',
      });
    } finally {
      previewLeaveConfirming.value = false;
    }
  }

  async function confirmNavigationLeave(options: PhoneNavigationOptions = {}) {
    if (options.skipConfirm) return true;
    if (navigationLeaveConfirming.value) return false;
    navigationLeaveConfirming.value = true;
    try {
      let skipPreviewConfirm = false;
      for (const guard of navigationGuards.values()) {
        const result = await guard();
        if (typeof result === 'boolean') {
          if (!result) return false;
          continue;
        }
        if (!result.allow) return false;
        skipPreviewConfirm ||= Boolean(result.skipPreviewConfirm);
      }
      if (skipPreviewConfirm) return true;
      return await confirmPreviewLeave(options);
    } finally {
      navigationLeaveConfirming.value = false;
    }
  }

  async function closePhone(options: PhoneNavigationOptions = {}) {
    if (!(await confirmNavigationLeave(options))) return;
    closePhoneNow();
  }

  async function goHome(options: PhoneNavigationOptions = {}) {
    if (!(await confirmNavigationLeave(options))) return;
    stack.value = [{ appId: 'home', page: 'home', title: '酒馆手机' }];
  }

  async function goBack(options: PhoneNavigationOptions = {}) {
    if (!(await confirmNavigationLeave(options))) return;
    if (stack.value.length > 1) {
      stack.value = stack.value.slice(0, -1);
      return;
    }
    closePhoneNow();
  }

  function openApp(appId: string) {
    const app = getPhoneApp(appId);
    if (!app) return;
    isOpen.value = true;

    if (currentRoute.value.appId === appId && currentRoute.value.page === app.defaultRoute) return;
    stack.value = [...stack.value, { appId, page: app.defaultRoute, title: app.name }];
  }

  function pushRoute(
    appId: string,
    page: string,
    title: string,
    params?: Record<string, string>,
    origin?: 'home' | 'favorites',
  ) {
    const app = getPhoneApp(appId);
    if (!app) return;
    isOpen.value = true;
    stack.value = [...stack.value, { appId, page, title, params, origin }];
  }

  function pushPage(page: string, title: string, params?: Record<string, string>, origin?: 'home' | 'favorites') {
    if (currentRoute.value.appId === 'home') return;
    stack.value = [...stack.value, { appId: currentRoute.value.appId, page, title, params, origin }];
  }

  function replacePage(page: string, title: string, params?: Record<string, string>, origin?: 'home' | 'favorites') {
    if (currentRoute.value.appId === 'home') return;
    const nextRoute: PhoneRoute = { appId: currentRoute.value.appId, page, title, params, origin };
    const previousRoute = stack.value.at(-2);
    const comparableParams = (route: PhoneRoute) =>
      Object.entries(route.params ?? {})
        .filter(([key]) => key !== 'versionId')
        .sort(([left], [right]) => left.localeCompare(right));
    const replacesSameLogicalRoute =
      previousRoute?.appId === nextRoute.appId &&
      previousRoute.page === nextRoute.page &&
      JSON.stringify(comparableParams(previousRoute)) === JSON.stringify(comparableParams(nextRoute));
    stack.value = replacesSameLogicalRoute
      ? [...stack.value.slice(0, -2), nextRoute]
      : [...stack.value.slice(0, -1), nextRoute];
  }

  function replaceRoute(appId: string, page: string, title: string, params?: Record<string, string>) {
    const app = getPhoneApp(appId);
    if (!app) return;
    isOpen.value = true;
    stack.value = [...stack.value.slice(0, -1), { appId, page, title, params }];
  }

  async function presentGeneratedPage(appId: string, page: string, title: string, params?: Record<string, string>) {
    const current = currentRoute.value;
    const stillGenerating = current.appId === appId && current.page.toLocaleLowerCase().includes('generate');
    if (stillGenerating) {
      replaceRoute(appId, page, title, params);
      return true;
    }

    const isFailedDraft = page === 'failed-draft';
    const isPreview = page === 'preview' || page.endsWith('-preview');
    const shouldOpen = await confirmNotice(
      isFailedDraft
        ? '生成内容已保存为失败草稿，可以立即前往修复。'
        : isPreview
          ? '生成已经完成，结果已保存到预览草稿。'
          : '生成已经完成并保存，可以立即查看结果。',
      {
        cancelLabel: '稍后处理',
        confirmLabel: isFailedDraft ? '修复草稿' : isPreview ? '查看预览' : '查看结果',
        dedupeKey: `generation:${appId}:${page}:${JSON.stringify(params ?? {})}`,
        kind: isFailedDraft ? 'warning' : 'success',
        title: isFailedDraft ? '生成需要处理' : '生成完成',
      },
    );
    if (!shouldOpen) return false;
    pushRoute(appId, page, title, params);
    return true;
  }

  function resetPhoneState() {
    closePhoneNow();
    clearNotices();
    void goHome({ skipConfirm: true });
  }

  function createNoticeId() {
    return `phone_notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function dismissNotice(noticeId: string, value = false) {
    const timer = noticeTimers.get(noticeId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      noticeTimers.delete(noticeId);
    }
    const resolver = noticeResolvers.get(noticeId);
    if (resolver) {
      resolver(value);
      noticeResolvers.delete(noticeId);
    }
    const promptResolver = noticePromptResolvers.get(noticeId);
    if (promptResolver) {
      const notice = notices.value.find(item => item.id === noticeId);
      promptResolver(value ? (notice?.inputValue ?? '') : null);
      noticePromptResolvers.delete(noticeId);
    }
    notices.value = notices.value.filter(notice => notice.id !== noticeId);
  }

  function clearNotices() {
    noticeTimers.forEach(timer => window.clearTimeout(timer));
    noticeResolvers.forEach(resolve => resolve(false));
    noticePromptResolvers.forEach(resolve => resolve(null));
    noticeTimers.clear();
    noticeResolvers.clear();
    noticePromptResolvers.clear();
    pendingConfirmKeys.clear();
    notices.value = [];
  }

  function showNotice(input: PhoneNoticeInput) {
    const id = createNoticeId();
    const kind = input.kind ?? 'info';
    const retainedNotices = notices.value.slice(-2);
    const retainedIds = new Set(retainedNotices.map(notice => notice.id));
    notices.value.filter(notice => !retainedIds.has(notice.id)).forEach(notice => dismissNotice(notice.id));
    notices.value = [
      ...retainedNotices,
      {
        actions: input.actions,
        id,
        input: input.input,
        inputValue: input.input?.value ?? '',
        kind,
        message: input.message,
        title: input.title || defaultNoticeTitle(kind),
      },
    ];

    const timeoutMs = input.timeoutMs ?? 3200;
    if (timeoutMs > 0) {
      noticeTimers.set(
        id,
        window.setTimeout(() => dismissNotice(id), timeoutMs),
      );
    }
    return id;
  }

  function defaultNoticeTitle(kind: PhoneNoticeKind) {
    if (kind === 'success') return '完成';
    if (kind === 'warning') return '提示';
    if (kind === 'error') return '出错';
    return '提示';
  }

  function noticeInfo(message: string, options: Omit<PhoneNoticeInput, 'kind' | 'message'> = {}) {
    return showNotice({ ...options, kind: 'info', message });
  }

  function noticeWarning(message: string, options: Omit<PhoneNoticeInput, 'kind' | 'message'> = {}) {
    return showNotice({ ...options, kind: 'warning', message });
  }

  function noticeSuccess(message: string, options: Omit<PhoneNoticeInput, 'kind' | 'message'> = {}) {
    return showNotice({ ...options, kind: 'success', message });
  }

  function noticeError(message: string, options: Omit<PhoneNoticeInput, 'kind' | 'message'> = {}) {
    return showNotice({ ...options, kind: 'error', message });
  }

  function chooseNoticeAction(noticeId: string, actionId: string) {
    const notice = notices.value.find(item => item.id === noticeId);
    const action = notice?.actions?.find(item => item.id === actionId);
    dismissNotice(noticeId, action?.value ?? false);
  }

  function updateNoticeInput(noticeId: string, value: string) {
    notices.value = notices.value.map(notice => (notice.id === noticeId ? { ...notice, inputValue: value } : notice));
  }

  function confirmNotice(message: string, options: PhoneConfirmOptions = {}) {
    const dedupeKey = options.dedupeKey || `${options.title || '确认操作'}\n${message}`;
    if (pendingConfirmKeys.has(dedupeKey)) return Promise.resolve(false);
    pendingConfirmKeys.add(dedupeKey);
    const confirmation = new Promise<boolean>(resolve => {
      const noticeId = showNotice({
        actions: [
          {
            id: 'cancel',
            label: options.cancelLabel || '取消',
            role: 'soft',
            value: false,
          },
          {
            id: 'confirm',
            label: options.confirmLabel || '确认',
            role: options.kind === 'error' || options.kind === 'warning' ? 'danger' : 'primary',
            value: true,
          },
        ],
        kind: options.kind ?? 'warning',
        message,
        timeoutMs: 0,
        title: options.title || '确认操作',
      });
      noticeResolvers.set(noticeId, resolve);
    });
    void confirmation.finally(() => pendingConfirmKeys.delete(dedupeKey));
    return confirmation;
  }

  function promptNotice(message: string, options: PhonePromptOptions = {}) {
    return new Promise<null | string>(resolve => {
      const noticeId = showNotice({
        actions: [
          {
            id: 'cancel',
            label: options.cancelLabel || '取消',
            role: 'soft',
            value: false,
          },
          {
            id: 'confirm',
            label: options.confirmLabel || '确认',
            role: 'primary',
            value: true,
          },
        ],
        input: {
          placeholder: options.placeholder,
          value: options.initialValue ?? '',
        },
        kind: options.kind ?? 'info',
        message,
        timeoutMs: 0,
        title: options.title || '输入内容',
      });
      noticePromptResolvers.set(noticeId, resolve);
    });
  }

  let chatChangedSyncTimer: number | null = null;
  const stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    if (chatChangedSyncTimer !== null) window.clearTimeout(chatChangedSyncTimer);
    chatChangedSyncTimer = window.setTimeout(() => {
      chatChangedSyncTimer = null;
      void syncCurrentTavernScope(true, true);
    }, 0);
    void goHome({ skipConfirm: true });
  });
  onScopeDispose(() => {
    if (chatChangedSyncTimer !== null) window.clearTimeout(chatChangedSyncTimer);
    stopChatChanged.stop();
  });

  return {
    canGoBack,
    chooseNoticeAction,
    clearNotices,
    closePhone,
    confirmNotice,
    currentApp,
    currentRoute,
    currentTitle,
    currentTavernScopeKey,
    dismissNotice,
    getTavernJumpTarget,
    goBack,
    goHome,
    isViewingCurrentChat,
    isOpen,
    noticeError,
    noticeInfo,
    noticeSuccess,
    noticeWarning,
    notices,
    openApp,
    openPhone,
    promptNotice,
    presentGeneratedPage,
    pushPage,
    pushRoute,
    registerNavigationGuard,
    registerSavedPreviewCheck,
    replacePage,
    replaceRoute,
    resetPhoneState,
    returnToCurrentScope,
    setViewingScope,
    syncCurrentTavernScope,
    stack,
    updateNoticeInput,
    viewingScopeKey,
    viewingScopeMeta,
  };
});
