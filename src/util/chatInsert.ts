import {
  getChatMessagesSafe,
  getLastMessageIdSafe,
  getOptionalGlobalFunction,
  setChatMessagesSafe,
} from '@/util/runtime';

export type ChatInsertMode = 'append-last' | 'append-message' | 'new-before' | 'new-end';
export type ChatInsertRole = 'assistant' | 'system' | 'user';

export interface ChatInsertTemplateValues {
  content: string;
  referenceReplacements?: Array<{
    content: string;
    time?: string;
    title?: string;
    token: string;
  }>;
  references?: string[];
  source?: string;
  title?: string;
}

export interface ChatInsertOptions extends ChatInsertTemplateValues {
  hidden?: boolean;
  mode: ChatInsertMode;
  role: ChatInsertRole;
  separator?: string;
  targetMessageId?: number;
  template: string;
}

export interface ChatInsertResult {
  message: string;
  mode: ChatInsertMode;
  targetMessageId: number | 'end';
}

type CreateChatMessageInput = {
  data?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  is_hidden?: boolean;
  message: string;
  name?: string;
  role: ChatInsertRole;
};

function replaceAllLiteral(value: string, search: string, replacement: string) {
  return value.split(search).join(replacement);
}

export function formatChatInsertTemplate(template: string, values: ChatInsertTemplateValues) {
  const baseTemplate = template.trim() || '{{content}}';
  const referenceReplacements =
    values.referenceReplacements
      ?.map(item => ({
        content: item.content.trim(),
        time: item.time?.trim() || '',
        title: item.title?.trim() || '',
        token: item.token.trim(),
      }))
      .filter(item => item.token && (item.content || item.title || item.time)) ?? [];
  const references =
    values.references?.map(reference => reference.trim()).filter(Boolean) ??
    referenceReplacements.map(item => item.content);
  const replacements = [
    ['{{title}}', values.title?.trim() || ''],
    ['{{source}}', values.source?.trim() || ''],
    ['{{content}}', values.content.trim()],
    ['{{references}}', references.join('\n\n')],
    ...referenceReplacements.map(item => [item.token, item.content]),
    ...referenceReplacements.map(item => [`${item.token.slice(0, -2)}Title}}`, item.title]),
    ...referenceReplacements.map(item => [`${item.token.slice(0, -2)}Time}}`, item.time]),
  ];
  return replacements
    .reduce((text, [search, replacement]) => replaceAllLiteral(text, search, replacement), baseTemplate)
    .replace(/\{\{reference\d+\}\}/g, '')
    .replace(
      /\{\{(?:diary|extra|extras|theater|letter|letters|excerpt|digest|summary|forum)[\w-]*\d+(?:Title|Time)?\}\}/g,
      '',
    )
    .trim();
}

function resolveAppendTarget(mode: ChatInsertMode, targetMessageId?: number) {
  if (mode === 'append-last') return getLastMessageIdSafe();
  if (mode === 'append-message' || mode === 'new-before') {
    if (!Number.isInteger(targetMessageId) || Number(targetMessageId) < 0) {
      throw new Error('请填写有效的目标楼层号');
    }
    return Number(targetMessageId);
  }
  return 'end' as const;
}

function getAppendSeparator(existingMessage: string, separator: string | undefined) {
  if (!existingMessage.trim()) return '';
  if (existingMessage.endsWith('\n')) return '';
  return separator ?? '\n\n';
}

async function saveChatIfAvailable() {
  const saveChat = getOptionalGlobalFunction<() => Promise<void> | void>('saveChat');
  if (saveChat) await Promise.resolve(saveChat());
}

export async function applyChatInsert(options: ChatInsertOptions): Promise<ChatInsertResult> {
  const message = formatChatInsertTemplate(options.template, options);
  if (!message.trim()) {
    throw new Error('插入内容不能为空');
  }

  const targetMessageId = resolveAppendTarget(options.mode, options.targetMessageId);

  if (options.mode === 'new-end' || options.mode === 'new-before') {
    const createChatMessages =
      getOptionalGlobalFunction<
        (
          messages: CreateChatMessageInput[],
          options?: { insert_before?: number | 'end'; refresh?: 'affected' | 'all' | 'none' },
        ) => Promise<void>
      >('createChatMessages');
    if (!createChatMessages) {
      throw new Error('当前环境不支持 createChatMessages，无法创建新楼层');
    }

    await createChatMessages(
      [
        {
          is_hidden: options.hidden,
          message,
          role: options.role,
        },
      ],
      {
        insert_before: targetMessageId,
        refresh: 'affected',
      },
    );
    await saveChatIfAvailable();
    return {
      message,
      mode: options.mode,
      targetMessageId,
    };
  }

  if (targetMessageId === 'end') {
    throw new Error('追加模式需要有效目标楼层');
  }

  const targetMessage = getChatMessagesSafe(`0-${targetMessageId}`).find(
    message => message.message_id === targetMessageId,
  );
  if (!targetMessage) {
    throw new Error(`没有找到第 ${targetMessageId} 楼`);
  }

  const separator = getAppendSeparator(targetMessage.message, options.separator);
  await setChatMessagesSafe(
    [
      {
        message_id: targetMessage.message_id,
        message: `${targetMessage.message}${separator}${message}`,
      },
    ],
    { refresh: 'affected' },
  );
  await saveChatIfAvailable();

  return {
    message,
    mode: options.mode,
    targetMessageId,
  };
}
