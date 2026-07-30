type StopHandle = { stop: () => void };
type EventListener = (...args: unknown[]) => void;
type EventSourceLike = {
  makeLast?: (eventName: string, listener: EventListener) => void;
  off?: (eventName: string, listener: EventListener) => void;
  on?: (eventName: string, listener: EventListener) => void;
  removeListener?: (eventName: string, listener: EventListener) => void;
};

function noopStopHandle(): StopHandle {
  return {
    stop() {},
  };
}

export function getGlobalRecord() {
  return globalThis as Record<string, unknown>;
}

type RuntimeSillyTavernContext = {
  chat?: unknown;
  eventSource?: EventSourceLike;
  eventTypes?: Record<string, unknown>;
  getContext?: () => unknown;
  saveChat?: (() => Promise<void>) | (() => void);
  [key: string]: unknown;
};

type TavernHelperRuntime = Record<string, unknown>;

const generationAbortControllers = new Map<string, AbortController>();

function getRuntimeRecords() {
  const records: Array<Record<string, unknown>> = [];
  const pushRecord = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (!records.includes(record)) {
      records.push(record);
    }
  };

  pushRecord(globalThis);

  if (typeof window !== 'undefined') {
    try {
      pushRecord(window);
    } catch {
      // ignore inaccessible window reference
    }

    try {
      pushRecord(window.parent);
    } catch {
      // ignore cross-frame access failures
    }

    try {
      pushRecord(window.top);
    } catch {
      // ignore cross-frame access failures
    }
  }

  return records;
}

export function getTavernEventName(name: string) {
  const globalEvents = getOptionalGlobalValue<Record<string, unknown>>('tavern_events');
  const contextEvents = getSillyTavernContext()?.eventTypes;
  const events = globalEvents && typeof globalEvents === 'object' ? globalEvents : contextEvents;
  if (!events || typeof events !== 'object') return null;
  const value = events[name];
  return typeof value === 'string' ? value : null;
}

function removeEventListener(
  eventSource: EventSourceLike | null | undefined,
  eventName: string,
  listener: EventListener,
) {
  if (typeof eventSource?.removeListener === 'function') {
    eventSource.removeListener(eventName, listener);
    return;
  }

  if (typeof eventSource?.off === 'function') {
    eventSource.off(eventName, listener);
  }
}

export function onRuntimeEvent(eventName: string, handler: EventListener): StopHandle {
  const eventOnFn = getOptionalGlobalFunction<(eventName: string, handler: EventListener) => StopHandle>('eventOn');
  if (eventOnFn) {
    return eventOnFn(eventName, handler);
  }

  const eventSource = getSillyTavernContext()?.eventSource;
  if (!eventSource || typeof eventSource.on !== 'function') {
    return noopStopHandle();
  }

  eventSource.on(eventName, handler);
  return {
    stop() {
      removeEventListener(eventSource, eventName, handler);
    },
  };
}

export function onTavernEvent(name: string, handler: EventListener): StopHandle {
  const eventName = getTavernEventName(name);
  if (!eventName) {
    return noopStopHandle();
  }

  return onRuntimeEvent(eventName, handler);
}

export function getIframeEventName(name: string) {
  const events = getOptionalGlobalValue<Record<string, unknown>>('iframe_events');
  if (!events || typeof events !== 'object') return null;
  const value = events[name];
  return typeof value === 'string' ? value : null;
}

export function getGenerationIdFromEventArgs(...args: unknown[]) {
  const directKeys = ['generation_id', 'generationId', 'generationID'];
  const nestedKeys = ['data', 'detail', 'options', 'config', 'request'];

  const readRecord = (value: unknown) => {
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    for (const key of directKeys) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    for (const key of nestedKeys) {
      const nested = record[key];
      if (!nested || typeof nested !== 'object') continue;
      const nestedRecord = nested as Record<string, unknown>;
      for (const directKey of directKeys) {
        const candidate = nestedRecord[directKey];
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      }
    }
    return '';
  };

  for (const value of args) {
    const fromRecord = readRecord(value);
    if (fromRecord) return fromRecord;
  }

  return (
    args
      .slice(1)
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
      ?.trim() ?? ''
  );
}

export function hasVisibilityTransactionRuntime() {
  return Boolean(getOptionalGlobalFunction('getChatMessages') && getOptionalGlobalFunction('setChatMessages'));
}

export function hasTavernHelperRuntime() {
  return Boolean(getOptionalGlobalValue('TavernHelper'));
}

function getTavernHelperRuntime() {
  for (const record of getRuntimeRecords()) {
    const helper = record.TavernHelper;
    if (helper && typeof helper === 'object') {
      return helper as TavernHelperRuntime;
    }
  }
  return null;
}

function getTavernHelperMethod<T extends (...args: never[]) => unknown>(name: string): T | null {
  const helper = getTavernHelperRuntime();
  const value = helper?.[name];
  return typeof value === 'function' ? (value as T) : null;
}

export function getOptionalGlobalFunction<T extends (...args: never[]) => unknown>(name: string): T | null {
  for (const record of getRuntimeRecords()) {
    const value = record[name];
    if (typeof value === 'function') {
      return value as T;
    }
  }

  const context = getSillyTavernContext();
  const contextValue = context?.[name as keyof RuntimeSillyTavernContext];
  if (typeof contextValue === 'function') {
    return contextValue as T;
  }

  const helper = getTavernHelperRuntime();
  const helperValue = helper?.[name];
  if (typeof helperValue === 'function') {
    return helperValue as T;
  }

  return null;
}

export function getOptionalGlobalValue<T>(name: string): T | null {
  for (const record of getRuntimeRecords()) {
    if (name in record) {
      return record[name] as T;
    }
  }

  const context = getSillyTavernContext();
  if (context && name in context) {
    return context[name as keyof RuntimeSillyTavernContext] as T;
  }

  const helper = getTavernHelperRuntime();
  if (helper && name in helper) {
    return helper[name] as T;
  }

  return null;
}

function requiredTavernHelperMethod<T extends (...args: never[]) => unknown>(name: string): T {
  const fn = getTavernHelperMethod<T>(name);
  if (!fn) {
    throw new Error(`未检测到酒馆助手接口: ${name}`);
  }
  return fn;
}

function requiredGlobalFunction<T extends (...args: never[]) => unknown>(name: string): T {
  const fn = getOptionalGlobalFunction<T>(name);
  if (!fn) {
    throw new Error(`${name} is not defined`);
  }
  return fn;
}

function getSillyTavernContext() {
  for (const record of getRuntimeRecords()) {
    const value = record.SillyTavern;
    if (!value || typeof value !== 'object') continue;

    const runtime = value as RuntimeSillyTavernContext;
    if (typeof runtime.getContext === 'function') {
      try {
        const context = runtime.getContext();
        if (context && typeof context === 'object') {
          return context as RuntimeSillyTavernContext;
        }
      } catch {
        // ignore broken context accessor and continue to fallback
      }
    }

    return runtime;
  }

  if (typeof SillyTavern === 'object' && SillyTavern) {
    const runtime = SillyTavern as RuntimeSillyTavernContext;
    if (typeof runtime.getContext === 'function') {
      try {
        const context = runtime.getContext();
        if (context && typeof context === 'object') {
          return context as RuntimeSillyTavernContext;
        }
      } catch {
        // ignore broken context accessor and continue to fallback
      }
    }
    return runtime;
  }

  return null;
}

function normalizeSillyTavernRole(message: SillyTavern.ChatMessage): ChatMessage['role'] {
  if (message.extra?.type === 'narrator' && !message.is_user) return 'system';
  return message.is_user ? 'user' : 'assistant';
}

function normalizeChatMessage(raw: unknown, fallbackIndex = 0) {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
  const extra = record.extra && typeof record.extra === 'object' ? (record.extra as Record<string, unknown>) : {};
  const role =
    typeof record.role === 'string'
      ? record.role
      : typeof record.is_user === 'boolean' && record.is_user
        ? 'user'
        : 'assistant';
  const messageId =
    typeof record.message_id === 'number'
      ? record.message_id
      : Number.isFinite(Number(record.message_id))
        ? Number(record.message_id)
        : fallbackIndex;
  const message =
    typeof record.message === 'string' ? record.message : typeof record.mes === 'string' ? record.mes : '';
  const name = typeof record.name === 'string' ? record.name : '';
  const hiddenSource =
    typeof record.is_hidden === 'boolean'
      ? record.is_hidden
      : typeof record.isHidden === 'boolean'
        ? record.isHidden
        : typeof record.is_system === 'boolean'
          ? record.is_system
          : false;

  return {
    ...record,
    data,
    extra,
    is_hidden: Boolean(hiddenSource),
    message,
    message_id: Math.max(0, messageId),
    name,
    role: role === 'user' || role === 'system' ? role : 'assistant',
  } satisfies ChatMessage;
}

function getChatMessagesFromSillyTavern(range: string, options?: Record<string, unknown>) {
  const context = getSillyTavernContext();
  const chat = Array.isArray(context?.chat) ? (context.chat as SillyTavern.ChatMessage[]) : [];
  const hideState = options?.hide_state;
  const normalized = chat.map((message, index) => ({
    data: {},
    extra: message.extra || {},
    is_hidden: Boolean(message.is_system),
    message: typeof message.mes === 'string' ? message.mes : '',
    message_id: index,
    name: typeof message.name === 'string' ? message.name : '',
    role: normalizeSillyTavernRole(message),
  })) satisfies ChatMessage[];

  const filtered = normalized.filter(message => {
    if (hideState === 'hidden') return message.is_hidden;
    if (hideState === 'unhidden') return !message.is_hidden;
    return true;
  });

  if (range === '0-{{lastMessageId}}') return filtered;
  if (/^0-\d+$/.test(range)) {
    const end = Number.parseInt(range.slice(2), 10);
    return filtered.filter(message => message.message_id >= 0 && message.message_id <= end);
  }

  throw new Error('当前运行环境不支持该消息读取范围');
}

export function getChatMessagesSafe(range: string, options?: Record<string, unknown>) {
  const fn =
    getOptionalGlobalFunction<(range: string, options?: Record<string, unknown>) => ChatMessage[]>('getChatMessages');
  if (fn) {
    return fn(range, options).map((message, index) => normalizeChatMessage(message, index));
  }
  return getChatMessagesFromSillyTavern(range, options);
}

export function setChatMessagesSafe(messages: unknown, options?: Record<string, unknown>) {
  const fn =
    requiredGlobalFunction<(messages: unknown, options?: Record<string, unknown>) => Promise<void> | void>(
      'setChatMessages',
    );
  return fn(messages, options);
}

export function getLastMessageIdSafe() {
  const fn = getOptionalGlobalFunction<() => number>('getLastMessageId');
  if (fn) {
    return fn();
  }
  const context = getSillyTavernContext();
  const chat = Array.isArray(context?.chat) ? context.chat : [];
  return chat.length - 1;
}

export function generateSafe(config: Record<string, unknown>) {
  const fn = requiredGlobalFunction<(config: Record<string, unknown>) => Promise<unknown>>('generate');
  return fn(config);
}

export function generateRawSafe(config: Record<string, unknown>) {
  const fn = getOptionalGlobalFunction<(config: Record<string, unknown>) => Promise<unknown>>('generateRaw');
  if (!fn) {
    throw new Error('未检测到酒馆助手 generateRaw 接口，无法在不写入酒馆楼层的情况下生成');
  }
  return fn(config);
}

export function registerMacroLikeSafe(
  regex: RegExp,
  replace: (
    context: { message_id?: number; role?: 'assistant' | 'system' | 'user' },
    substring: string,
    ...args: unknown[]
  ) => string,
) {
  const fn =
    getOptionalGlobalFunction<(macroRegex: RegExp, macroReplace: typeof replace) => { unregister?: () => void } | void>(
      'registerMacroLike',
    );
  if (!fn) {
    throw new Error('未检测到酒馆助手 registerMacroLike 接口，无法解析 {{phoneUserInput}}');
  }

  const registration = fn(regex, replace);
  return {
    stop() {
      registration?.unregister?.();
    },
  } satisfies StopHandle;
}

export function registerGenerationAbortController(generationId: string) {
  generationAbortControllers.get(generationId)?.abort();
  const controller = new AbortController();
  generationAbortControllers.set(generationId, controller);
  return controller;
}

export function releaseGenerationAbortController(generationId: string, controller: AbortController) {
  if (generationAbortControllers.get(generationId) === controller) {
    generationAbortControllers.delete(generationId);
  }
}

export function generateRawDataSafe(config: {
  api?: string;
  jsonSchema?: unknown;
  prompt: unknown;
  responseLength?: number | null;
}) {
  const context = getSillyTavernContext();
  const fn = context?.generateRawData;
  if (typeof fn !== 'function') {
    throw new Error('未检测到 SillyTavern.generateRawData 接口，无法绕过 generateRaw 生成');
  }
  return fn(config);
}

export function extractMessageFromDataSafe(data: unknown, activateApi?: string) {
  const context = getSillyTavernContext();
  const fn = context?.extractMessageFromData;
  if (typeof fn !== 'function') return '';
  return String(fn(data as object, activateApi) ?? '');
}

function normalizePresetNames(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))]
    .filter(name => name !== 'in_use' && !name.startsWith('--'))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

export function getPresetNamesSafe() {
  const getNamesFn = getOptionalGlobalFunction<() => unknown>('getPresetNames');
  if (getNamesFn) {
    try {
      const names = normalizePresetNames(getNamesFn());
      if (names.length) return names;
    } catch {
      // fall through to preset manager fallback
    }
  }

  const helperFn = getTavernHelperMethod<() => unknown>('getPresetNames');
  if (helperFn) {
    try {
      const names = normalizePresetNames(helperFn());
      if (names.length) return names;
    } catch {
      // fall through to preset manager fallback
    }
  }

  try {
    const managerFn = getOptionalGlobalFunction<(apiId?: string) => unknown>('getPresetManager');
    const manager = managerFn?.('openai') as
      | {
          getAllPresets?: () => unknown;
        }
      | null
      | undefined;
    const names = normalizePresetNames(manager?.getAllPresets?.());
    if (names.length) return names;
  } catch {
    // fall through to DOM fallback
  }

  if (typeof document !== 'undefined') {
    const selector = document.querySelector<HTMLSelectElement>('#settings_preset_openai');
    if (selector) {
      return normalizePresetNames(Array.from(selector.options).map(option => option.textContent || option.value));
    }
  }

  return [];
}

export function getLoadedPresetNameSafe() {
  const helperFn = getTavernHelperMethod<() => unknown>('getLoadedPresetName');
  if (helperFn) {
    try {
      const name = helperFn();
      if (typeof name === 'string') return name;
    } catch {
      // fall through to preset manager fallback
    }
  }

  return getSelectedPresetNameSafe();
}

export function getSelectedPresetNameSafe(apiId?: string) {
  const fn = getOptionalGlobalFunction<(apiId?: string) => unknown>('getPresetManager');
  if (!fn) return '';

  try {
    const manager = fn(apiId) as
      | {
          getSelectedPresetName?: () => unknown;
        }
      | null
      | undefined;
    const name = manager?.getSelectedPresetName?.();
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

function normalizePromptContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return JSON.stringify(content, null, 2);

  const parts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== 'object') {
      parts.push(String(item));
      continue;
    }

    const record = item as Record<string, unknown>;
    if (record.type === 'text') {
      parts.push(String(record.text ?? ''));
      continue;
    }
    if (record.type === 'image_url') {
      const imageUrl =
        record.image_url && typeof record.image_url === 'object'
          ? (record.image_url as Record<string, unknown>).url
          : '';
      parts.push(`[Image] ${String(imageUrl || '')}`.trim());
      continue;
    }
    if (record.type === 'video_url') {
      const videoUrl =
        record.video_url && typeof record.video_url === 'object'
          ? (record.video_url as Record<string, unknown>).url
          : '';
      parts.push(`[Video] ${String(videoUrl || '')}`.trim());
      continue;
    }
    parts.push(JSON.stringify(record));
  }
  return parts.filter(Boolean).join('\n\n');
}

async function countPromptTokens(content: string) {
  const fn = getOptionalGlobalFunction<(content: string) => Promise<number> | number>('getTokenCountAsync');
  if (!fn || !content) return 0;

  try {
    const result = await fn(content);
    return Number.isFinite(Number(result)) ? Number(result) : 0;
  } catch {
    return 0;
  }
}

export interface CapturedTavernPromptMessage {
  content: string;
  id: number;
  role: string;
  token: number;
}

export interface CapturedTavernPromptPreview {
  maxTokens: number | null;
  messages: CapturedTavernPromptMessage[];
  model: string;
  preset: string;
  raw: Record<string, unknown>;
  totalTokens: number;
}

export function captureTavernPromptPreview(
  generateConfig: Record<string, unknown>,
  timeoutMs = 15000,
  signal?: AbortSignal,
): Promise<CapturedTavernPromptPreview> {
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new DOMException('生成已停止', 'AbortError'),
    );
  }
  const eventName = getTavernEventName('CHAT_COMPLETION_SETTINGS_READY');
  if (!eventName) {
    return Promise.reject(new Error('未检测到 CHAT_COMPLETION_SETTINGS_READY 事件'));
  }

  const helperGenerateFn =
    getTavernHelperMethod<(config: Record<string, unknown>) => Promise<unknown>>('generate') ??
    getOptionalGlobalFunction<(config: Record<string, unknown>) => Promise<unknown>>('generate');
  const sillyTavernGenerateFn = (() => {
    const runtime = getOptionalGlobalValue<Record<string, unknown>>('SillyTavern');
    const fn = runtime?.generate;
    return typeof fn === 'function'
      ? (fn.bind(runtime) as (input: string, options?: Record<string, unknown>) => Promise<unknown>)
      : null;
  })();
  if (!helperGenerateFn && !sillyTavernGenerateFn) {
    return Promise.reject(new Error('未检测到酒馆助手 generate 接口'));
  }

  const stopById =
    getTavernHelperMethod<(generationId: string) => unknown>('stopGenerationById') ??
    getOptionalGlobalFunction<(generationId: string) => unknown>('stopGenerationById');
  const generationId =
    typeof generateConfig.generation_id === 'string' && generateConfig.generation_id.trim()
      ? generateConfig.generation_id.trim()
      : '';

  return new Promise((resolve, reject) => {
    let settled = false;
    let stopHandle: StopHandle | null = null;
    let timer = 0;
    let abortHandler: (() => void) | null = null;

    const cleanup = () => {
      window.clearTimeout(timer);
      stopHandle?.stop();
      stopHandle = null;
      if (abortHandler) signal?.removeEventListener('abort', abortHandler);
      abortHandler = null;
    };

    const stopCapture = () => {
      if (!generationId || !stopById) return;
      try {
        stopById(generationId);
      } catch {
        // Rejecting the local capture still takes precedence when the host stop call fails.
      }
    };

    timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      stopCapture();
      cleanup();
      reject(new Error('捕获酒馆提示词超时'));
    }, timeoutMs);

    abortHandler = () => {
      if (settled) return;
      settled = true;
      stopCapture();
      cleanup();
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('生成已停止', 'AbortError'));
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    stopHandle = onRuntimeEvent(eventName, async (...eventArgs) => {
      if (settled) return;
      const eventGenerationId = getGenerationIdFromEventArgs(...eventArgs);
      if (generationId && eventGenerationId && eventGenerationId !== generationId) return;

      const payload = eventArgs[0];
      settled = true;
      stopCapture();

      cleanup();
      try {
        const raw = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
        const messageRecords = Array.isArray(raw.messages) ? raw.messages : [];
        const messages = await Promise.all(
          messageRecords.map(async (message, index) => {
            const record = message && typeof message === 'object' ? (message as Record<string, unknown>) : {};
            const content = normalizePromptContent(record.content);
            return {
              content,
              id: index,
              role: typeof record.role === 'string' ? record.role : 'unknown',
              token: await countPromptTokens(content),
            } satisfies CapturedTavernPromptMessage;
          }),
        );
        resolve({
          maxTokens: Number.isFinite(Number(raw.max_tokens)) ? Number(raw.max_tokens) : null,
          messages,
          model: typeof raw.model === 'string' ? raw.model : '',
          preset:
            typeof generateConfig.preset_name === 'string' && generateConfig.preset_name.trim()
              ? generateConfig.preset_name.trim()
              : getLoadedPresetNameSafe(),
          raw,
          totalTokens: messages.reduce((sum, message) => sum + message.token, 0),
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('捕获酒馆提示词失败'));
      }
    });

    const userInput = typeof generateConfig.user_input === 'string' ? generateConfig.user_input : '';
    const captureOptions = {
      for_ui: true,
      generation_id: generationId || undefined,
      max_chat_history: generateConfig.max_chat_history,
      quiet: true,
    };
    const capturePromise = sillyTavernGenerateFn
      ? sillyTavernGenerateFn(userInput, captureOptions)
      : helperGenerateFn?.(generateConfig);

    Promise.resolve(capturePromise).catch(error => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error('捕获酒馆提示词失败'));
    });
  });
}

function stringifyPresetPreview(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function') return '[Function]';
    return value;
  }
  if (seen.has(value)) return '[Circular]';
  if (depth >= 4) return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 40).map(item => stringifyPresetPreview(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 120)) {
    if (typeof entry === 'function') continue;
    result[key] = stringifyPresetPreview(entry, depth + 1, seen);
  }
  return result;
}

function isExpandablePresetValue(value: unknown): value is Record<string, unknown> | unknown[] {
  return Boolean(value) && typeof value === 'object';
}

export function getSelectedPresetPreviewSafe(apiId?: string, presetNameOverride = '') {
  const fn = getOptionalGlobalFunction<(apiId?: string) => unknown>('getPresetManager');

  try {
    const getPresetFn = getOptionalGlobalFunction<(presetName: string) => unknown>('getPreset');
    const presetName = presetNameOverride.trim();
    if (presetName && getPresetFn) {
      const preset = getPresetFn(presetName);
      if (!isExpandablePresetValue(preset)) return '';
      const text = JSON.stringify(stringifyPresetPreview(preset), null, 2);
      return text.length > 10000 ? `${text.slice(0, 10000)}\n...（预设内容过长，已截断）` : text;
    }
  } catch {
    // fall through to preset manager fallback
  }

  if (!fn) return '';

  try {
    const manager = fn(apiId) as
      | {
          findPreset?: (name: string) => unknown;
          getCompletionPresetByName?: (name: string) => unknown;
          getSelectedPresetName?: () => unknown;
          getPreset?: (name: string) => unknown;
          selected_preset?: unknown;
          selectedPreset?: unknown;
        }
      | null
      | undefined;
    const overriddenName = presetNameOverride.trim();
    const name = overriddenName || manager?.getSelectedPresetName?.();
    const presetName = typeof name === 'string' ? name : '';
    const preset = presetName
      ? (manager?.getCompletionPresetByName?.(presetName) ??
        manager?.findPreset?.(presetName) ??
        manager?.getPreset?.(presetName) ??
        manager?.selectedPreset ??
        manager?.selected_preset)
      : (manager?.selectedPreset ?? manager?.selected_preset);
    if (!isExpandablePresetValue(preset)) return '';
    const text = JSON.stringify(stringifyPresetPreview(preset), null, 2);
    return text.length > 10000 ? `${text.slice(0, 10000)}\n...（预设内容过长，已截断）` : text;
  } catch {
    return '';
  }
}

export function executeSlashCommandSafe(command: string, options?: Record<string, unknown>) {
  const fn = getOptionalGlobalFunction<(command: string, options?: Record<string, unknown>) => Promise<unknown>>(
    'executeSlashCommandsWithOptions',
  );
  if (fn) {
    return fn(command, {
      abortController: null,
      handleExecutionErrors: true,
      handleParserErrors: true,
      source: 'tavern-phone-generate',
      ...options,
    });
  }

  const fallback = getOptionalGlobalFunction<(command: string) => Promise<unknown>>('executeSlashCommands');
  if (fallback) {
    return fallback(command);
  }

  throw new Error('未检测到酒馆斜杠命令接口');
}

export function getChatHistoryBriefSafe(scope: string) {
  const fn = requiredTavernHelperMethod<(scope: string) => Promise<unknown>>('getChatHistoryBrief');
  return fn(scope);
}

export function getChatHistoryDetailSafe(files: unknown[], isGroup: boolean) {
  const fn =
    requiredTavernHelperMethod<(files: unknown[], isGroup: boolean) => Promise<unknown>>('getChatHistoryDetail');
  return fn(files, isGroup);
}

export function stopGenerationByIdSafe(generationId: string) {
  let stopped = false;
  const controller = generationAbortControllers.get(generationId);
  if (controller) {
    controller.abort();
    generationAbortControllers.delete(generationId);
    stopped = true;
  }

  const fn = getOptionalGlobalFunction<(generationId: string) => boolean>('stopGenerationById');
  if (!fn) return stopped;
  return fn(generationId) || stopped;
}
