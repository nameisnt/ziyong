import { getCurrentChatScopeKey, parseChatScopeKey } from '@/store/chatScoped';
import type { TavernChatRenamedEvent } from '@/util/chatScopeRename';
import { cancelIdleTask, type IdleTaskHandle, scheduleIdleTask } from '@/util/idleTask';
import { getChatMessagesSafe, getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';

const DATABASE_NAME = 'sillytavern-phone-chat-floor-backups';
const DATABASE_VERSION = 1;
const STORE_NAME = 'backups';
const FILE_KIND = 'tavern-phone-chat-floor-backup';

const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});

export const ChatFloorBackupMessageSchema = z.object({
  data: JsonRecordSchema,
  extra: JsonRecordSchema,
  isHidden: z.boolean().default(false),
  message: z.string(),
  messageId: z.number().int().nonnegative(),
  name: z.string().default(''),
  role: z.enum(['assistant', 'user']),
});

export const ChatFloorBackupSchema = z.object({
  chat: z.object({
    id: z.string().min(1),
    title: z.string().default(''),
  }),
  createdAt: z.string(),
  key: z.string().min(1),
  kind: z.literal(FILE_KIND),
  messages: z.array(ChatFloorBackupMessageSchema).min(1),
  owner: z.object({
    avatar: z.string().default(''),
    displayName: z.string().default(''),
    kind: z.enum(['char', 'group']),
    stableId: z.string().min(1),
  }),
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
});

export type ChatFloorBackup = z.infer<typeof ChatFloorBackupSchema>;
export type ChatFloorBackupMessage = z.infer<typeof ChatFloorBackupMessageSchema>;

export type ChatFloorBackupCaptureResult =
  | { backup: ChatFloorBackup; status: 'created' | 'updated' }
  | { backup: ChatFloorBackup; currentMessageCount: number; status: 'protected-smaller' }
  | { backup: ChatFloorBackup; status: 'unchanged' }
  | { backup: null; status: 'empty' | 'unavailable' };

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('聊天备份数据库操作失败')), {
      once: true,
    });
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('聊天备份事务已中止')), {
      once: true,
    });
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('聊天备份事务失败')), {
      once: true,
    });
  });
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持本地聊天备份数据库'));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener(
      'upgradeneeded',
      () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
      { once: true },
    );
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('无法打开聊天备份数据库')), {
      once: true,
    });
  });
}

async function runStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const completed = transactionToPromise(transaction);
    const request = action(transaction.objectStore(STORE_NAME));
    const result = await requestToPromise(request);
    await completed;
    return result;
  } finally {
    database.close();
  }
}

async function runStoreTransaction(mode: IDBTransactionMode, action: (store: IDBObjectStore) => void) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const completed = transactionToPromise(transaction);
    action(transaction.objectStore(STORE_NAME));
    await completed;
  } finally {
    database.close();
  }
}

function normalizeIdentityPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.jsonl$/i, '');
}

export function buildChatFloorBackupKey(ownerKind: 'char' | 'group', ownerStableId: string, chatId: string) {
  return `${ownerKind}:${encodeURIComponent(normalizeIdentityPart(ownerStableId))}:chat:${encodeURIComponent(
    normalizeIdentityPart(chatId),
  )}`;
}

function cloneJsonRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (typeof item === 'bigint') return String(item);
        if (typeof item === 'function' || typeof item === 'symbol') return undefined;
        return item;
      }),
    ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getCurrentIdentity() {
  const scope = parseChatScopeKey(getCurrentChatScopeKey());
  if ((scope.kind !== 'char' && scope.kind !== 'group') || !scope.chatId || scope.chatId === '__no_chat__') return null;

  if (scope.kind === 'group') {
    return {
      avatar: '',
      chatId: scope.chatId,
      chatTitle: scope.chatId,
      displayName: `群聊 ${scope.ownerId}`,
      ownerKind: scope.kind,
      stableId: scope.ownerId,
    } as const;
  }

  const characters = getOptionalGlobalValue<unknown[]>('characters');
  const getCurrentCharacterId =
    getOptionalGlobalFunction<() => number | string | null | undefined>('getCurrentCharacterId');
  const characterIndex = Number(
    getCurrentCharacterId?.() ??
      getOptionalGlobalValue('this_chid') ??
      getOptionalGlobalValue('characterId') ??
      scope.ownerId,
  );
  const character =
    Number.isInteger(characterIndex) && characterIndex >= 0 && Array.isArray(characters)
      ? characters[characterIndex]
      : Array.isArray(characters)
        ? characters.find(candidate => {
            if (!candidate || typeof candidate !== 'object') return false;
            const name = (candidate as Record<string, unknown>).name;
            return typeof name === 'string' && name.trim() === scope.ownerId;
          })
        : null;
  const record = character && typeof character === 'object' ? (character as Record<string, unknown>) : {};
  const displayName = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : scope.ownerId;
  const avatar = typeof record.avatar === 'string' ? record.avatar.trim() : '';
  const stableId = avatar || displayName || scope.ownerId;
  return {
    avatar,
    chatId: scope.chatId,
    chatTitle: scope.chatId,
    displayName,
    ownerKind: scope.kind,
    stableId,
  } as const;
}

function readCurrentMessages(): ChatFloorBackupMessage[] {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'all' })
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => ({
      data: cloneJsonRecord(message.data),
      extra: cloneJsonRecord(message.extra),
      isHidden: Boolean(message.is_hidden),
      message: message.message,
      messageId: message.message_id,
      name: message.name || '',
      role: message.role as 'assistant' | 'user',
    }));
}

export function getCurrentChatFloorMessageCount() {
  return readCurrentMessages().length;
}

function sameMessages(left: ChatFloorBackupMessage[], right: ChatFloorBackupMessage[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function listChatFloorBackups() {
  const records = await runStore<ChatFloorBackup[]>('readonly', store => store.getAll());
  return records
    .map(record => ChatFloorBackupSchema.safeParse(record))
    .filter((result): result is z.ZodSafeParseSuccess<ChatFloorBackup> => result.success)
    .map(result => result.data)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getChatFloorBackup(key: string) {
  const record = await runStore<ChatFloorBackup | undefined>('readonly', store => store.get(key));
  if (!record) return null;
  const parsed = ChatFloorBackupSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
}

export async function saveChatFloorBackup(backup: ChatFloorBackup) {
  const parsed = ChatFloorBackupSchema.parse(backup);
  assertBackupIdentity(parsed);
  await runStore<IDBValidKey>('readwrite', store => store.put(parsed));
  return parsed;
}

export async function deleteChatFloorBackup(key: string) {
  await runStore<undefined>('readwrite', store => store.delete(key));
}

export async function replaceChatFloorBackups(backups: ChatFloorBackup[]) {
  const parsed = z.array(ChatFloorBackupSchema).parse(backups);
  parsed.forEach(assertBackupIdentity);
  await runStoreTransaction('readwrite', store => {
    store.clear();
    parsed.forEach(backup => store.put(backup));
  });
}

export async function captureCurrentChatFloorBackup(
  options: { force?: boolean } = {},
): Promise<ChatFloorBackupCaptureResult> {
  const identity = getCurrentIdentity();
  if (!identity) return { backup: null, status: 'unavailable' };
  const messages = readCurrentMessages();
  if (!messages.length) return { backup: null, status: 'empty' };

  const key = buildChatFloorBackupKey(identity.ownerKind, identity.stableId, identity.chatId);
  const existing = await getChatFloorBackup(key);
  if (existing && existing.messages.length > messages.length && !options.force) {
    return { backup: existing, currentMessageCount: messages.length, status: 'protected-smaller' };
  }
  if (existing && sameMessages(existing.messages, messages)) return { backup: existing, status: 'unchanged' };

  const now = new Date().toISOString();
  const backup = ChatFloorBackupSchema.parse({
    chat: { id: identity.chatId, title: identity.chatTitle },
    createdAt: existing?.createdAt ?? now,
    key,
    kind: FILE_KIND,
    messages,
    owner: {
      avatar: identity.avatar,
      displayName: identity.displayName,
      kind: identity.ownerKind,
      stableId: identity.stableId,
    },
    schemaVersion: 1,
    updatedAt: now,
  });
  await saveChatFloorBackup(backup);
  return { backup, status: existing ? 'updated' : 'created' };
}

export async function parseChatFloorBackupFile(file: File) {
  if (file.size > 100 * 1024 * 1024) throw new Error('聊天备份文件超过 100 MB，已停止读取');
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('聊天备份不是有效的 JSON 文件');
  }
  const parsed = ChatFloorBackupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`聊天备份格式无效：${parsed.error.issues[0]?.message ?? '未知格式错误'}`);
  }
  assertBackupIdentity(parsed.data);
  return parsed.data;
}

function assertBackupIdentity(backup: ChatFloorBackup) {
  const expectedKey = buildChatFloorBackupKey(backup.owner.kind, backup.owner.stableId, backup.chat.id);
  if (backup.key !== expectedKey) throw new Error('聊天备份的角色卡或聊天身份校验失败');
}

function safeFilePart(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 60) || '未命名'
  );
}

export function downloadChatFloorBackup(backup: ChatFloorBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `聊天楼层备份-${safeFilePart(backup.owner.displayName)}-${safeFilePart(backup.chat.title)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function isChatFloorBackupForTarget(
  backup: ChatFloorBackup,
  target: { aliases: Iterable<string>; avatar: string; chatId: string; kind: 'char' | 'group' },
) {
  if (
    backup.owner.kind !== target.kind ||
    normalizeIdentityPart(backup.chat.id) !== normalizeIdentityPart(target.chatId)
  ) {
    return false;
  }
  const aliases = new Set([...target.aliases, target.avatar].filter(Boolean).map(normalizeIdentityPart));
  return aliases.has(normalizeIdentityPart(backup.owner.stableId));
}

export async function restoreChatFloorBackupToCurrent(backup: ChatFloorBackup) {
  const identity = getCurrentIdentity();
  if (!identity) throw new Error('当前没有可识别的酒馆聊天');
  const currentKey = buildChatFloorBackupKey(identity.ownerKind, identity.stableId, identity.chatId);
  if (currentKey !== backup.key) throw new Error('当前酒馆聊天与这份楼层备份不一致，已停止插入');
  if (readCurrentMessages().length) throw new Error('当前聊天并非空聊天，不能插入楼层备份');

  const createChatMessages = getOptionalGlobalFunction<
    (
      messages: Array<{
        data?: Record<string, unknown>;
        extra?: Record<string, unknown>;
        is_hidden?: boolean;
        message: string;
        name?: string;
        role: 'assistant' | 'user';
      }>,
      options?: { insert_before?: number | 'end'; refresh?: 'affected' | 'all' | 'none' },
    ) => Promise<void>
  >('createChatMessages');
  if (!createChatMessages) throw new Error('当前环境不支持创建聊天楼层');

  await createChatMessages(
    backup.messages.map(message => ({
      data: cloneJsonRecord(message.data),
      extra: cloneJsonRecord(message.extra),
      is_hidden: message.isHidden,
      message: message.message,
      name: message.name,
      role: message.role,
    })),
    { insert_before: 'end', refresh: 'all' },
  );
  const saveChat = getOptionalGlobalFunction<() => Promise<void> | void>('saveChat');
  if (saveChat) await Promise.resolve(saveChat());
}

export async function migrateChatFloorBackupRename(event: TavernChatRenamedEvent) {
  const oldChatId = event.oldFileName?.trim().replace(/\.jsonl$/i, '') ?? '';
  const newChatId = event.newFileName?.trim().replace(/\.jsonl$/i, '') ?? '';
  if (!oldChatId || !newChatId || normalizeIdentityPart(oldChatId) === normalizeIdentityPart(newChatId)) return false;

  const groupId = event.groupId === null || typeof event.groupId === 'undefined' ? '' : String(event.groupId).trim();
  const currentIdentity = getCurrentIdentity();
  const ownerKind = groupId ? 'group' : 'char';
  const stableId = groupId || event.avatarId?.trim() || currentIdentity?.stableId || '';
  if (!stableId || (currentIdentity && currentIdentity.ownerKind !== ownerKind)) return false;

  const stableAliases = new Set([stableId, stableId.replace(/\.[^/.]+$/, '')].map(normalizeIdentityPart));
  const existing = (await listChatFloorBackups()).find(
    backup =>
      backup.owner.kind === ownerKind &&
      normalizeIdentityPart(backup.chat.id) === normalizeIdentityPart(oldChatId) &&
      (stableAliases.has(normalizeIdentityPart(backup.owner.stableId)) ||
        stableAliases.has(normalizeIdentityPart(backup.owner.stableId.replace(/\.[^/.]+$/, '')))),
  );
  if (!existing) return false;
  const oldKey = existing.key;
  const newKey = buildChatFloorBackupKey(ownerKind, existing.owner.stableId, newChatId);
  const alreadyMigrated = await getChatFloorBackup(newKey);
  const candidate = ChatFloorBackupSchema.parse({
    ...existing,
    chat: { id: newChatId, title: newChatId },
    key: newKey,
    updatedAt: new Date().toISOString(),
  });
  const keeper =
    alreadyMigrated && alreadyMigrated.messages.length > candidate.messages.length ? alreadyMigrated : candidate;
  await saveChatFloorBackup(keeper);
  await deleteChatFloorBackup(oldKey);
  return true;
}

export function startChatFloorBackupService() {
  let timer: ReturnType<typeof window.setTimeout> | null = null;
  let idleHandle: IdleTaskHandle | null = null;
  const schedule = () => {
    if (timer !== null) window.clearTimeout(timer);
    cancelIdleTask(idleHandle);
    idleHandle = null;
    timer = window.setTimeout(() => {
      timer = null;
      idleHandle = scheduleIdleTask(() => {
        idleHandle = null;
        void captureCurrentChatFloorBackup().catch(error => {
          console.warn('[功能性阅读器] 自动保存聊天楼层备份失败', error);
        });
      }, 3000);
    }, 2000);
  };
  const eventNames = [
    'CHAT_CHANGED',
    'MESSAGE_SENT',
    'MESSAGE_RECEIVED',
    'MESSAGE_EDITED',
    'MESSAGE_SWIPED',
  ];
  const handles = eventNames.map(name => onTavernEvent(name, schedule));
  handles.push(
    onTavernEvent('CHAT_RENAMED', payload => {
      void migrateChatFloorBackupRename((payload ?? {}) as TavernChatRenamedEvent)
        .catch(error => console.warn('[功能性阅读器] 迁移改名聊天的楼层备份失败', error))
        .finally(schedule);
    }),
  );
  schedule();
  return {
    stop() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      cancelIdleTask(idleHandle);
      idleHandle = null;
      handles.forEach(handle => handle.stop());
    },
  };
}
