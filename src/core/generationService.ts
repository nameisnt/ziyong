import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { useGenerationOverrideStore } from '@/store/generationOverrides';
import { usePhoneStore } from '@/store/phone';
import type { TextProviderSettings } from '@/type/settings';
import type {
  FailedGenerationDraft,
  GenerationAdapter,
  GenerationExecutionResult,
  GenerationRequestParts,
} from '@/type/generation';
import { buildGenerationUserInput, buildPhoneUserInput } from '@/util/generation';
import { applyGenerationAliases, replaceGenerationAliases } from '@/util/generationAliases';
import { buildSourceSelection, type SummaryGenerationSourceMode } from '@/util/generationSource';
import { ensureCurrentScopeRecovery, runWithVisibilityTransaction } from '@/util/generationVisibility';
import {
  applyTextProviderSelection,
  resolveTextProviderSettings,
  type ResolvedTextProviderSettings,
} from '@/util/textProvider';
import {
  captureTavernPromptPreview,
  generateRawSafe,
  getChatMessagesSafe,
  getGenerationIdFromEventArgs,
  getIframeEventName,
  getLoadedPresetNameSafe,
  getSelectedPresetNameSafe,
  getSelectedPresetPreviewSafe,
  hasVisibilityTransactionRuntime,
  onRuntimeEvent,
  registerGenerationAbortController,
  registerMacroLikeSafe,
  releaseGenerationAbortController,
} from '@/util/runtime';
import { parsePrettified } from '@/util/zod';
import { waitForGenerationRateLimit, waitForGenerationRetry } from '@/core/generationRateLimit';
import { useSettingsStore } from '@/store/settings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(?:http\s*)?429|rate[\s_-]*limit|too many requests|请求过于频繁/i.test(message);
}

type GenerationLifecycle = {
  onFinish?: () => void;
  onRawOutput?: (rawOutput: string) => void;
  onSaved?: (result: unknown, saved: unknown) => void | Promise<void>;
  onStart?: (generationId: string) => void;
};

type GenerationSourceInput = {
  fromStartEnd?: number;
  mode: SummaryGenerationSourceMode;
  rangeText?: string;
  recentCount?: number;
  singleMessageId?: number;
};

export type GenerateContentOptions = {
  createFailedDraft: (input: Omit<FailedGenerationDraft, 'createdAt' | 'id'>) => FailedGenerationDraft;
  generationDefaults: {
    resultMode: 'preview' | 'save';
    stream: boolean;
    tavernPresetName?: string;
  };
  lifecycle?: GenerationLifecycle;
  rateLimitRpm?: number;
  references?: string;
  source: GenerationSourceInput;
  textProvider: TextProviderSettings;
};

function applyInteractiveGenerationOverride<
  TOptions extends Pick<GenerateContentOptions, 'generationDefaults' | 'textProvider'>,
>(adapterAppId: string, options: TOptions): TOptions {
  const phone = usePhoneStore();
  const route = phone.currentRoute;
  if (route.appId !== adapterAppId) return options;
  const override = useGenerationOverrideStore().getOverride(route.appId, route.page);
  if (!override) return options;
  return {
    ...options,
    generationDefaults: {
      ...options.generationDefaults,
      tavernPresetName: override.tavernPresetName,
    },
    textProvider: applyTextProviderSelection(options.textProvider, override.connectionSelection),
  };
}

function buildCustomApiConfig(textProvider: ResolvedTextProviderSettings) {
  if (textProvider.mode !== 'external') return undefined;

  const apiUrl = textProvider.apiUrl.trim();
  const model = textProvider.model.trim();
  if (!apiUrl || !model) {
    throw new Error('外部兼容 API 模式下需要先在设置里填写接口地址和模型名');
  }

  return {
    apiurl: apiUrl,
    key: textProvider.apiKey.trim() || undefined,
    max_tokens: textProvider.maxOutputTokens ?? undefined,
    model,
    source: 'openai',
  };
}

function buildSelectedSourceReferences(
  selection: {
    label: string;
    messageIds: number[];
  },
  visibleMessages: ChatMessage[],
) {
  const selectedMessages = selection.messageIds
    .map(messageId => visibleMessages.find(message => message.message_id === messageId))
    .filter((message): message is ChatMessage => Boolean(message));

  if (!selectedMessages.length) return '';

  return [
    `本次生成指定来源：${selection.label}`,
    '以下是本次生成需要重点参考的聊天楼层，请优先依据这些内容完成输出。',
    '不要照抄原楼层，不要输出“第 X 楼”这类来源标记，也不要把原始聊天记录原封不动返回。',
    ...selectedMessages.map(message => {
      const speaker =
        message.name?.trim() || (message.role === 'user' ? '用户' : message.role === 'assistant' ? 'AI' : '系统');
      return `第 ${message.message_id} 楼 · ${speaker}：\n${message.message.trim()}`;
    }),
  ].join('\n\n');
}

function buildSelectedSourcePreview(
  selection: {
    label: string;
    messageIds: number[];
  },
  visibleMessages: ChatMessage[],
) {
  const selectedMessages = selection.messageIds
    .map(messageId => visibleMessages.find(message => message.message_id === messageId))
    .filter((message): message is ChatMessage => Boolean(message));

  if (!selectedMessages.length) return selection.label;

  return [
    selection.label,
    ...selectedMessages.map(message => {
      const speaker =
        message.name?.trim() || (message.role === 'user' ? '用户' : message.role === 'assistant' ? 'AI' : '系统');
      return `第 ${message.message_id} 楼 · ${speaker}\n${message.message.trim()}`;
    }),
  ].join('\n\n');
}

function appendPreviewSection(lines: string[], title: string, content?: string) {
  const normalized = content?.trim();
  if (!normalized) return;
  lines.push(`[${title}]`);
  lines.push(normalized);
}

function bindStreamOutput(enabled: boolean, generationId: string, onRawOutput?: (rawOutput: string) => void) {
  if (!enabled || !onRawOutput) return null;
  const eventName = getIframeEventName('STREAM_TOKEN_RECEIVED_FULLY');
  if (!eventName) return null;

  return onRuntimeEvent(eventName, (...eventArgs: unknown[]) => {
    const eventGenerationId = getGenerationIdFromEventArgs(...eventArgs);
    if (eventGenerationId && eventGenerationId !== generationId) return;
    const payload = eventArgs[0];
    onRawOutput(typeof payload === 'string' ? payload : String(payload ?? ''));
  });
}

let phoneMacroCaptureTail = Promise.resolve();
const PHONE_USER_INPUT_MACRO_PATTERN = /\{\{\s*phoneUserInput\s*\}\}/gi;

function waitForCaptureTurn(previousCapture: Promise<void>, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (!signal) return previousCapture;
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('生成已停止', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    previousCapture.then(
      () => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      },
      error => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

async function captureWithPhoneUserInput(
  generateConfig: Record<string, unknown>,
  phoneUserInput: string,
  signal?: AbortSignal,
) {
  let releaseQueue = () => {};
  const previousCapture = phoneMacroCaptureTail;
  phoneMacroCaptureTail = new Promise<void>(resolve => {
    releaseQueue = resolve;
  });
  try {
    await waitForCaptureTurn(previousCapture, signal);
  } catch (error) {
    void previousCapture.then(releaseQueue, releaseQueue);
    throw error;
  }
  let macroRegistration: { stop: () => void } | null = null;
  try {
    signal?.throwIfAborted();
    macroRegistration = registerMacroLikeSafe(PHONE_USER_INPUT_MACRO_PATTERN, () => phoneUserInput);
    return await captureTavernPromptPreview(generateConfig, 15000, signal, content =>
      content.replace(PHONE_USER_INPUT_MACRO_PATTERN, phoneUserInput),
    );
  } finally {
    macroRegistration?.stop();
    releaseQueue();
  }
}

function createGenerationId(appId: string) {
  return `phone_${appId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const activePhoneGenerationIds = new Set<string>();
const recentPhoneGenerationIds = new Map<string, number>();
const PHONE_GENERATION_EVENT_TTL_MS = 10_000;

function pruneRecentPhoneGenerationIds() {
  const now = Date.now();
  recentPhoneGenerationIds.forEach((expiresAt, generationId) => {
    if (expiresAt <= now) recentPhoneGenerationIds.delete(generationId);
  });
}

function registerPhoneGeneration(generationId: string) {
  activePhoneGenerationIds.add(generationId);
  recentPhoneGenerationIds.delete(generationId);
  return () => {
    activePhoneGenerationIds.delete(generationId);
    recentPhoneGenerationIds.set(generationId, Date.now() + PHONE_GENERATION_EVENT_TTL_MS);
  };
}

export function hasActivePhoneGeneration() {
  return activePhoneGenerationIds.size > 0;
}

export function isPhoneGenerationEvent(...eventArgs: unknown[]) {
  pruneRecentPhoneGenerationIds();
  const generationId = getGenerationIdFromEventArgs(...eventArgs);
  return Boolean(
    generationId &&
    (generationId.startsWith('phone_') ||
      activePhoneGenerationIds.has(generationId) ||
      recentPhoneGenerationIds.has(generationId)),
  );
}

function cleanGenerateConfig(config: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
}

function resolveGenerationPresetName(options: Pick<GenerateContentOptions, 'generationDefaults'>) {
  const configuredPresetName = options.generationDefaults.tavernPresetName?.trim();
  if (configuredPresetName) return configuredPresetName;

  const loadedPresetName = getLoadedPresetNameSafe().trim();
  if (loadedPresetName && loadedPresetName !== 'in_use') return loadedPresetName;

  const selectedPresetName = getSelectedPresetNameSafe().trim();
  return selectedPresetName && selectedPresetName !== 'in_use' ? selectedPresetName : undefined;
}

function assertViewingCurrentChatForGeneration() {
  const phone = usePhoneStore();
  if (!phone.isViewingCurrentChat) {
    throw new Error('当前查看的是历史聊天，只能浏览已保存内容，不能发起 AI 生成');
  }
}

function prepareGenerationRequest<TConfig, TResult, TSaveResult = { entityId: string }>(
  adapter: GenerationAdapter<TConfig, TResult, TSaveResult>,
  config: TConfig,
  options: Pick<GenerateContentOptions, 'generationDefaults' | 'references' | 'source' | 'textProvider'>,
  generationId: string,
  textProvider = resolveTextProviderSettings(options.textProvider),
) {
  const parsedConfig = parsePrettified(adapter.configSchema, config);
  const scopeId = getCurrentChatScopeKey();
  const visibleMessages = getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'unhidden' });
  if (!visibleMessages.length) {
    throw new Error('当前聊天里没有可见楼层，暂时不能生成内容');
  }

  const source = buildSourceSelection({
    chatIdAtGeneration: String(SillyTavern.getCurrentChatId?.() || SillyTavern.chatId || ''),
    fromStartEnd: options.source.fromStartEnd,
    mode: options.source.mode,
    rangeText: options.source.rangeText,
    recentCount: options.source.recentCount,
    singleMessageId: options.source.singleMessageId,
    scopeId,
    visibleMessages,
  });

  const canUseVisibilityTransaction = source.requiresVisibilityTransaction && hasVisibilityTransactionRuntime();
  const baseRequest = adapter.buildRequest(parsedConfig);
  const fallbackReferences =
    !canUseVisibilityTransaction && source.requiresVisibilityTransaction
      ? buildSelectedSourceReferences(source.selection, visibleMessages)
      : '';
  const explicitReferences = options.references?.trim() || '';
  const generationAliases = useGenerationAliasesStore();
  const request = applyGenerationAliases(
    {
      ...baseRequest,
      references: [baseRequest.references?.trim() || '', explicitReferences, fallbackReferences]
        .filter(Boolean)
        .join('\n\n'),
    } satisfies GenerationRequestParts,
    generationAliases,
  );
  const formUserInput =
    isRecord(parsedConfig) && typeof parsedConfig.userRequirement === 'string'
      ? replaceGenerationAliases(parsedConfig.userRequirement, generationAliases) || ''
      : '';
  const phoneUserInput = buildPhoneUserInput(request, formUserInput);
  const userInput = buildGenerationUserInput(request);
  const customApi = buildCustomApiConfig(textProvider);
  const presetName = resolveGenerationPresetName(options);
  const generateConfig = cleanGenerateConfig({
    custom_api: customApi,
    generation_id: generationId,
    max_chat_history: source.maxChatHistory,
    preset_name: presetName,
    should_silence: true,
    should_stream: options.generationDefaults.stream,
    user_input: userInput,
  });

  return {
    canUseVisibilityTransaction,
    generateConfig,
    parsedConfig,
    phoneUserInput,
    request,
    scopeId,
    source,
    userInput,
    visibleMessages,
  };
}

function normalizeGenerationResult(rawResult: unknown) {
  if (typeof rawResult === 'string') return rawResult;
  if (!rawResult || typeof rawResult !== 'object') return String(rawResult ?? '');

  const record = rawResult as Record<string, unknown>;
  if (typeof record.pipe === 'string') return record.pipe;
  if (typeof record.text === 'string') return record.text;
  if (typeof record.content === 'string') return record.content;

  const message = record.message;
  if (message && typeof message === 'object' && typeof (message as Record<string, unknown>).content === 'string') {
    return String((message as Record<string, unknown>).content);
  }

  return String(rawResult);
}

type RawOrderedPrompt = {
  content: string;
  role: 'assistant' | 'system' | 'user';
};

function normalizeRawPromptRole(role: string): 'assistant' | 'system' | 'user' {
  return role === 'system' || role === 'assistant' || role === 'user' ? role : 'user';
}

function pushRolePrompt(prompts: RawOrderedPrompt[], role: string, content: string) {
  const normalized = content.trim();
  if (!normalized) return;
  prompts.push({
    content: normalized,
    role: normalizeRawPromptRole(role),
  });
}

function buildOrderedPromptsFromCapturedMessages(
  messages: Array<{
    content: string;
    role: string;
  }>,
  userInput: string,
) {
  const prompts: RawOrderedPrompt[] = [];
  const normalizedUserInput = userInput.trim();
  let insertedUserInput = false;
  const userInputBlockPattern = /<user_input\b[^>]*>[\s\S]*?<\/user_input>/i;

  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;

    const userInputBlock = content.match(userInputBlockPattern);
    if (userInputBlock?.[0]) {
      const userInputIndex = userInputBlock.index ?? content.indexOf(userInputBlock[0]);
      pushRolePrompt(prompts, message.role, content.slice(0, userInputIndex));
      pushRolePrompt(prompts, 'user', userInputBlock[0]);
      insertedUserInput = true;
      pushRolePrompt(prompts, message.role, content.slice(userInputIndex + userInputBlock[0].length));
      continue;
    }

    if (normalizedUserInput) {
      const userInputIndex = content.indexOf(normalizedUserInput);
      if (userInputIndex >= 0) {
        pushRolePrompt(prompts, message.role, content.slice(0, userInputIndex));
        pushRolePrompt(prompts, 'user', normalizedUserInput);
        insertedUserInput = true;
        pushRolePrompt(prompts, message.role, content.slice(userInputIndex + normalizedUserInput.length));
        continue;
      }
    }

    pushRolePrompt(prompts, message.role, content);
  }

  if (!insertedUserInput && normalizedUserInput) {
    pushRolePrompt(prompts, 'user', normalizedUserInput);
  }

  return prompts;
}

async function generateFromExternalCompatibleApi(
  textProvider: ResolvedTextProviderSettings,
  messages: RawOrderedPrompt[],
  shouldStream: boolean,
  signal: AbortSignal,
  onRawOutput?: (rawOutput: string) => void,
) {
  const apiUrl = textProvider.apiUrl.trim();
  const model = textProvider.model.trim();
  if (!apiUrl || !model) {
    throw new Error('外部兼容 API 模式下需要先在设置里填写接口地址并选择模型');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = textProvider.apiKey.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
    body: JSON.stringify({
      ...(textProvider.maxOutputTokens ? { max_tokens: textProvider.maxOutputTokens } : {}),
      messages,
      model,
      stream: shouldStream,
    }),
    headers,
    method: 'POST',
    signal,
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`外部 API 请求失败：HTTP ${response.status}${errorText ? ` ${errorText.slice(0, 180)}` : ''}`);
  }

  if (shouldStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let output = '';

    const consumeLine = (rawLine: string) => {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) return;
      const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
      if (!payload || payload === '[DONE]') return;

      let data: Record<string, any>;
      try {
        data = JSON.parse(payload) as Record<string, any>;
      } catch {
        return;
      }
      if (data.error) {
        const message = typeof data.error === 'string' ? data.error : data.error.message;
        throw new Error(String(message || '外部 API 流式生成失败'));
      }

      const content =
        data?.choices?.[0]?.delta?.content ??
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.delta?.content ??
        data?.content ??
        '';
      if (typeof content !== 'string' || !content) return;
      output += content;
      onRawOutput?.(output);
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) consumeLine(line);
      if (done) break;
    }
    if (buffer.trim()) consumeLine(buffer);
    return output.trim();
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.message?.content ?? data?.content ?? '';
  return String(content).trim() || JSON.stringify(data);
}

async function generateFromCapturedOrderedPrompts(
  generateConfig: Record<string, unknown>,
  textProvider: ResolvedTextProviderSettings,
  phoneUserInput: string,
  userInput: string,
  abortSignal: AbortSignal,
  onRawOutput?: (rawOutput: string) => void,
) {
  abortSignal.throwIfAborted();
  const captured = await captureWithPhoneUserInput(
    {
      ...generateConfig,
      generation_id: `${String(generateConfig.generation_id || 'phone_generation')}_capture`,
      should_stream: false,
    },
    phoneUserInput,
    abortSignal,
  );
  abortSignal.throwIfAborted();
  const orderedPrompts = buildOrderedPromptsFromCapturedMessages(captured.messages, userInput);

  if (!orderedPrompts.length) {
    throw new Error('捕获到的酒馆最终提示词为空，无法生成');
  }

  if (textProvider.mode === 'external') {
    return generateFromExternalCompatibleApi(
      textProvider,
      orderedPrompts,
      generateConfig.should_stream === true,
      abortSignal,
      onRawOutput,
    );
  }

  abortSignal.throwIfAborted();
  return generateRawSafe(
    cleanGenerateConfig({
      generation_id: generateConfig.generation_id,
      ordered_prompts: orderedPrompts,
      preset_name: generateConfig.preset_name,
      should_silence: true,
      should_stream: generateConfig.should_stream === true,
    }),
  );
}

export async function generateContent<TConfig, TResult, TSaveResult = { entityId: string }>(
  adapter: GenerationAdapter<TConfig, TResult, TSaveResult>,
  config: TConfig,
  requestedOptions: GenerateContentOptions,
): Promise<GenerationExecutionResult<TResult, TSaveResult>> {
  const options = applyInteractiveGenerationOverride(adapter.appId, requestedOptions);
  assertViewingCurrentChatForGeneration();
  const scopeId = getCurrentChatScopeKey();
  const recoveryResult = await ensureCurrentScopeRecovery(scopeId);
  if (recoveryResult.status !== 'none' && recoveryResult.status !== 'restored') {
    throw new Error(recoveryResult.message);
  }

  const generationId = createGenerationId(adapter.appId);
  const textProvider = resolveTextProviderSettings(options.textProvider);
  const abortController = registerGenerationAbortController(generationId);
  const streamListener =
    textProvider.mode === 'tavern'
      ? bindStreamOutput(options.generationDefaults.stream, generationId, options.lifecycle?.onRawOutput)
      : null;
  const releasePhoneGeneration = registerPhoneGeneration(generationId);

  try {
    options.lifecycle?.onStart?.(generationId);
    const prepared = prepareGenerationRequest(adapter, config, options, generationId, textProvider);
    const rpmLimit = options.rateLimitRpm ?? useSettingsStore().settings.generation.rpmLimit;
    await waitForGenerationRateLimit(rpmLimit, abortController.signal);

    const runGenerationTask = async () => {
      const maxRateLimitRetries = 2;
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await generateFromCapturedOrderedPrompts(
            prepared.generateConfig,
            textProvider,
            prepared.phoneUserInput,
            prepared.userInput,
            abortController.signal,
            options.lifecycle?.onRawOutput,
          );
        } catch (error) {
          if (!isRateLimitError(error) || attempt >= maxRateLimitRetries) throw error;
          await waitForGenerationRetry(2_000 * 2 ** attempt, abortController.signal);
          await waitForGenerationRateLimit(rpmLimit, abortController.signal);
        }
      }
    };
    const result = prepared.canUseVisibilityTransaction
      ? await runWithVisibilityTransaction({
          generationId,
          scopeId: prepared.source.selection.scopeId,
          selectedMessageIds: prepared.source.selection.messageIds,
          task: runGenerationTask,
        })
      : await runGenerationTask();

    abortController.signal.throwIfAborted();
    const rawOutput = normalizeGenerationResult(result);
    options.lifecycle?.onRawOutput?.(rawOutput);

    const parsed = adapter.parse(rawOutput, prepared.parsedConfig);
    abortController.signal.throwIfAborted();
    if (!parsed.ok) {
      const draft = options.createFailedDraft({
        actionId: adapter.actionId,
        appId: adapter.appId,
        context: isRecord(prepared.parsedConfig) ? { ...prepared.parsedConfig } : {},
        rawOutput,
        source: prepared.source.selection,
        warnings: parsed.warnings,
      });

      return {
        draft,
        rawOutput,
        source: prepared.source.selection,
        status: 'failed',
        warnings: parsed.warnings,
      };
    }

    if (options.generationDefaults.resultMode === 'save') {
      abortController.signal.throwIfAborted();
      const saved = await adapter.save(parsed.data, {
        config: prepared.parsedConfig,
        rawOutput: parsed.raw,
        scopeId: prepared.scopeId,
        source: prepared.source.selection,
        warnings: parsed.warnings,
      });
      await options.lifecycle?.onSaved?.(parsed.data, saved);

      return {
        data: parsed.data,
        rawOutput: parsed.raw,
        saved,
        source: prepared.source.selection,
        status: 'saved',
        warnings: parsed.warnings,
      };
    }

    return {
      data: parsed.data,
      rawOutput: parsed.raw,
      source: prepared.source.selection,
      status: 'preview',
      warnings: parsed.warnings,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('生成已停止');
    }
    throw error;
  } finally {
    releaseGenerationAbortController(generationId, abortController);
    streamListener?.stop();
    releasePhoneGeneration();
    options.lifecycle?.onFinish?.();
  }
}

export function buildGenerationPreview<TConfig, TResult, TSaveResult = { entityId: string }>(
  adapter: GenerationAdapter<TConfig, TResult, TSaveResult>,
  config: TConfig,
  requestedOptions: Pick<GenerateContentOptions, 'generationDefaults' | 'references' | 'source' | 'textProvider'>,
) {
  const options = applyInteractiveGenerationOverride(adapter.appId, requestedOptions);
  assertViewingCurrentChatForGeneration();
  const textProvider = resolveTextProviderSettings(options.textProvider);
  const prepared = prepareGenerationRequest(adapter, config, options, createGenerationId(adapter.appId), textProvider);
  const previewLines: string[] = [];
  const generationPresetName =
    typeof prepared.generateConfig.preset_name === 'string' ? prepared.generateConfig.preset_name : '';
  const selectedPresetPreview = generationPresetName
    ? getSelectedPresetPreviewSafe(undefined, generationPresetName)
    : '';

  appendPreviewSection(
    previewLines,
    '文本通道',
    textProvider.mode === 'external'
      ? [
          `模式：${textProvider.profileName || '外部兼容 API'}`,
          `接口：${textProvider.apiUrl || '未填写'}`,
          `模型：${textProvider.model || '未填写'}`,
        ].join('\n')
      : '模式：跟随酒馆当前 API / 模型',
  );
  if (generationPresetName) {
    appendPreviewSection(
      previewLines,
      '酒馆预设',
      [
        `本次预设：${generationPresetName}`,
        selectedPresetPreview
          ? `可读取预设配置：\n${selectedPresetPreview}`
          : '预设内容：生成会按本次预设名组装酒馆提示词；当前酒馆接口只返回名称或标识，未暴露可展开的完整预设内容。',
      ].join('\n\n'),
    );
  }
  appendPreviewSection(
    previewLines,
    '来源楼层',
    buildSelectedSourcePreview(prepared.source.selection, prepared.visibleMessages),
  );
  appendPreviewSection(previewLines, '引用内容', options.references);
  appendPreviewSection(previewLines, 'App 上下文', prepared.request.context);
  appendPreviewSection(previewLines, '本次任务', prepared.request.taskInstruction);
  appendPreviewSection(previewLines, 'App 预设', prepared.request.appPrompt);
  appendPreviewSection(previewLines, '类型预设', prepared.request.typePrompt);
  appendPreviewSection(previewLines, '追加要求', prepared.request.userRequirement);
  appendPreviewSection(previewLines, '输出格式', prepared.request.outputFormat);
  appendPreviewSection(previewLines, '{{phoneUserInput}} 宏内容', prepared.phoneUserInput);
  appendPreviewSection(previewLines, '最终发出内容', prepared.userInput);

  return {
    source: prepared.source.selection,
    text: previewLines.join('\n\n'),
  };
}

export async function captureGenerationPrompt<TConfig, TResult, TSaveResult = { entityId: string }>(
  adapter: GenerationAdapter<TConfig, TResult, TSaveResult>,
  config: TConfig,
  requestedOptions: Pick<GenerateContentOptions, 'generationDefaults' | 'references' | 'source' | 'textProvider'>,
) {
  const options = applyInteractiveGenerationOverride(adapter.appId, requestedOptions);
  assertViewingCurrentChatForGeneration();
  const scopeId = getCurrentChatScopeKey();
  const recoveryResult = await ensureCurrentScopeRecovery(scopeId);
  if (recoveryResult.status !== 'none' && recoveryResult.status !== 'restored') {
    throw new Error(recoveryResult.message);
  }

  const generationId = createGenerationId(adapter.appId);
  const textProvider = resolveTextProviderSettings(options.textProvider);
  const prepared = prepareGenerationRequest(adapter, config, options, generationId, textProvider);
  const releasePhoneGeneration = registerPhoneGeneration(generationId);
  const captureTask = () =>
    captureWithPhoneUserInput(
      {
        ...prepared.generateConfig,
        should_stream: false,
      },
      prepared.phoneUserInput,
    );

  try {
    return await (prepared.canUseVisibilityTransaction
      ? runWithVisibilityTransaction({
          generationId,
          scopeId: prepared.source.selection.scopeId,
          selectedMessageIds: prepared.source.selection.messageIds,
          task: captureTask,
        })
      : captureTask());
  } finally {
    releasePhoneGeneration();
  }
}
