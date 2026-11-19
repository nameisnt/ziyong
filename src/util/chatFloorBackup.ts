import { getCurrentChatScopeKey, parseChatScopeKey } from '@/store/chatScoped';
import type { TavernChatRenamedEvent } from '@/util/chatScopeRename';
import { cancelIdleTask, type IdleTaskHandle, scheduleIdleTask } from '@/util/idleTask';
import { getChatMessagesSafe, getOptionalGlobalFunction, getOptionalGlobalValue, onTavernEvent } from '@/util/runtime';
import { onTavernChatRename } from '@/util/tavernChatRenameObserver';

const DATABASE_NAME = 'sillytavern-phone-chat-floor-backups';
// v2 把「索引」和「楼层正文」拆成两个 store：打开档案列表时只读索引，不再整表反序列化正文。
const DATABASE_VERSION = 2;
const STORE_NAME = 'backups';
const BODY_STORE_NAME = 'backupBodies';
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

export const ChatFloorBackupSummarySchema = z.object({
  chat: z.object({
    id: z.string().min(1),
    title: z.string().default(''),
  }),
  createdAt: z.string(),
  key: z.string().min(1),
  kind: z.literal(FILE_KIND),
  messageCount: z.number().int().nonnegative(),
  owner: z.object({
    avatar: z.string().default(''),
    displayName: z.string().default(''),
    kind: z.enum(['char', 'group']),
    stableId: z.string().min(1),
  }),
  schemaVersion: z.literal(2),
  updatedAt: z.string(),
});

export type ChatFloorBackupSummary = z.infer<typeof ChatFloorBackupSummarySchema>;

function toBackupSummary(backup: ChatFloorBackup): ChatFloorBackupSummary {
  return {
    chat: backup.chat,
    createdAt: backup.createdAt,
    key: backup.key,
    kind: backup.kind,
    messageCount: backup.messages.length,
    owner: backup.owner,
    schemaVersion: 2,
    updatedAt: backup.updatedAt,
  };
}

function mergeBackupSummary(
  summary: ChatFloorBackupSummary,
  messages: ChatFloorBackupMessage[] | undefined,
): ChatFloorBackup | null {
  if (!messages || !messages.length) return null;
  const parsed = ChatFloorBackupSchema.safeParse({ ...summary, messages, schemaVersion: 1 });
  return parsed.success ? parsed.data : null;
}

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
        const database = request.result;
        const upgradeTransaction = request.transaction;
        const storeNames = Array.from(database.objectStoreNames);
        if (!storeNames.includes(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        if (!storeNames.includes(BODY_STORE_NAME)) database.createObjectStore(BODY_STORE_NAME, { keyPath: 'key' });
        // v1 的每条记录都带着 messages：迁移时拆成「索引 + 正文」，旧数据一条不丢。
        if (storeNames.includes(STORE_NAME) && upgradeTransaction) {
          const legacyStore = upgradeTransaction.objectStore(STORE_NAME);
          const legacyRequest = legacyStore.getAll();
          legacyRequest.addEventListener('success', () => {
            const indexes = upgradeTransaction.objectStore(STORE_NAME);
            const bodies = upgradeTransaction.objectStore(BODY_STORE_NAME);
            for (const legacy of legacyRequest.result as unknown[]) {
              const parsed = ChatFloorBackupSchema.safeParse(legacy);
              if (!parsed.success) continue;
              bodies.put({ key: parsed.data.key, messages: parsed.data.messages });
              indexes.put(toBackupSummary(parsed.data));
            }
          });
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

async function runStore<T>(
  mode: IDBTransactionMode,
  storeName: string,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const completed = transactionToPromise(transaction);
    const request = action(transaction.objectStore(storeName));
    const result = await requestToPromise(request);
    await completed;
    return result;
  } finally {
    database.close();
  }
}

async function runStoreTransaction(
  mode: IDBTransactionMode,
  storeNames: string | string[],
  action: (stores: IDBObjectStore[], transaction: IDBTransaction) => void,
) {
  const database = await openDatabase();
  try {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = database.transaction(names, mode);
    const completed = transactionToPromise(transaction);
    action(
      names.map(name => transaction.objectStore(name)),
      transaction,
    );
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

type CurrentChatMessage = ReturnType<typeof getChatMessagesSafe>[number];

function readCurrentMessageSource() {
  return getChatMessagesSafe('0-{{lastMessageId}}', { hide_state: 'all' }).filter(
    message => message.role === 'user' || message.role === 'assistant',
  );
}

function toBackupMessage(message: CurrentChatMessage): ChatFloorBackupMessage {
  return {
    data: cloneJsonRecord(message.data),
    extra: cloneJsonRecord(message.extra),
    isHidden: Boolean(message.is_hidden),
    message: message.message,
    messageId: message.message_id,
    name: message.name || '',
    role: message.role as 'assistant' | 'user',
  };
}

export function getCurrentChatFloorMessageCount() {
  return readCurrentMessageSource().length;
}

function sameCurrentMessages(left: ChatFloorBackupMessage[], right: CurrentChatMessage[]) {
  if (left.length !== right.length) return false;
  return left.every((message, index) => {
    const current = right[index];
    return (
      message.isHidden === Boolean(current.is_hidden) &&
      message.message === current.message &&
      message.messageId === current.message_id &&
      message.name === (current.name || '') &&
      message.role === current.role &&
      JSON.stringify(message.data) === JSON.stringify(current.data) &&
      JSON.stringify(message.extra) === JSON.stringify(current.extra)
    );
  });
}

export async function listChatFloorBackupIndexes() {
  const records = await runStore<unknown[]>('readonly', STORE_NAME, store => store.getAll());
  return records
    .map(record => ChatFloorBackupSummarySchema.safeParse(record))
    .filter((result): result is z.ZodSafeParseSuccess<ChatFloorBackupSummary> => result.success)
    .map(result => result.data)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listChatFloorBackups() {
  const summaries = await listChatFloorBackupIndexes();
  if (!summaries.length) return [];
  const bodies = await runStore<Array<{ key: string; messages: unknown }>>(
    'readonly',
    BODY_STORE_NAME,
    store => store.getAll(),
  );
  const messagesByKey = new Map(
    bodies.map(body => {
      const parsed = z.array(ChatFloorBackupMessageSchema).safeParse(body.messages);
      return [body.key, parsed.success ? parsed.data : []] as const;
    }),
  );
  return summaries
    .map(summary => mergeBackupSummary(summary, messagesByKey.get(summary.key)))
    .filter((backup): backup is ChatFloorBackup => backup !== null);
}

export async function getChatFloorBackup(key: string) {
  const record = await runStore<unknown>('readonly', STORE_NAME, store => store.get(key));
  const summary = ChatFloorBackupSummarySchema.safeParse(record);
  if (!summary.success) return null;
  const body = await runStore<{ key: string; messages: unknown } | undefined>(
    'readonly',
    BODY_STORE_NAME,
    store => store.get(key),
  );
  if (!body) return null;
  const messages = z.array(ChatFloorBackupMessageSchema).safeParse(body.messages);
  return mergeBackupSummary(summary.data, messages.success ? messages.data : []);
}

export async function saveChatFloorBackup(backup: ChatFloorBackup) {
  const parsed = ChatFloorBackupSchema.parse(backup);
  assertBackupIdentity(parsed);
  await runStoreTransaction('readwrite', [STORE_NAME, BODY_STORE_NAME], ([indexes, bodies]) => {
    indexes.put(toBackupSummary(parsed));
    bodies.put({ key: parsed.key, messages: parsed.messages });
  });
  return parsed;
}

export async function deleteChatFloorBackup(key: string) {
  await runStoreTransaction('readwrite', [STORE_NAME, BODY_STORE_NAME], ([indexes, bodies]) => {
    indexes.delete(key);
    bodies.delete(key);
  });
}

export async function replaceChatFloorBackups(backups: ChatFloorBackup[]) {
  const parsed = z.array(ChatFloorBackupSchema).parse(backups);
  parsed.forEach(assertBackupIdentity);
  await runStoreTransaction('readwrite', [STORE_NAME, BODY_STORE_NAME], ([indexes, bodies]) => {
    indexes.clear();
    bodies.clear();
    parsed.forEach(backup => {
      indexes.put(toBackupSummary(backup));
      bodies.put({ key: backup.key, messages: backup.messages });
    });
  });
}

export async function captureCurrentChatFloorBackup(
  options: { force?: boolean } = {},
): Promise<ChatFloorBackupCaptureResult> {
  const identity = getCurrentIdentity();
  if (!identity) return { backup: null, status: 'unavailable' };
  const currentMessages = readCurrentMessageSource();
  if (!currentMessages.length) return { backup: null, status: 'empty' };

  const key = buildChatFloorBackupKey(identity.ownerKind, identity.stableId, identity.chatId);
  const existing = await getChatFloorBackup(key);
  if (existing && existing.messages.length > currentMessages.length && !options.force) {
    return { backup: existing, currentMessageCount: currentMessages.length, status: 'protected-smaller' };
  }
  if (existing && sameCurrentMessages(existing.messages, currentMessages)) {
    return { backup: existing, status: 'unchanged' };
  }

  const now = new Date().toISOString();
  const backup = ChatFloorBackupSchema.parse({
    chat: { id: identity.chatId, title: identity.chatTitle },
    createdAt: existing?.createdAt ?? now,
    key,
    kind: FILE_KIND,
    messages: currentMessages.map(toBackupMessage),
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

export function rebindChatFloorBackupForImport(
  backup: ChatFloorBackup,
  target: {
    aliases: Iterable<string>;
    avatar: string;
    ownerId: string;
    name: string;
    chatId: string;
    chatTitle: string;
    kind: 'char' | 'group';
  },
) {
  const aliases = new Set([...target.aliases, target.avatar].filter(Boolean).map(normalizeIdentityPart));
  if (backup.owner.kind !== target.kind || !aliases.has(normalizeIdentityPart(backup.owner.stableId))) {
    throw new Error('备份中的角色卡或群组与目标档案不一致，已停止导入');
  }
  const stableId = target.kind === 'char' ? target.avatar || target.name : target.ownerId;
  return {
    ...backup,
    key: buildChatFloorBackupKey(target.kind, stableId, target.chatId),
    chat: { id: target.chatId, title: target.chatTitle },
    owner: { ...backup.owner, kind: target.kind, stableId, avatar: target.avatar, displayName: target.name },
  };
}

export async function restoreChatFloorBackupToCurrent(backup: ChatFloorBackup) {
  const identity = getCurrentIdentity();
  if (!identity) throw new Error('当前没有可识别的酒馆聊天');
  const currentKey = buildChatFloorBackupKey(identity.ownerKind, identity.stableId, identity.chatId);
  if (currentKey !== backup.key) throw new Error('当前酒馆聊天与这份楼层备份不一致，已停止插入');
  if (readCurrentMessageSource().length) throw new Error('当前聊天并非空聊天，不能插入楼层备份');

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
  const eventNames = ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED'];
  const handles = eventNames.map(name => onTavernEvent(name, schedule));
  handles.push(
    onTavernChatRename(async payload => {
      try {
        await migrateChatFloorBackupRename(payload);
      } catch (error) {
        // 后台迁移失败不打断改名：下一次楼层变化会按新键重建备份，无需打断用户的改名流程。
        console.warn('[功能性阅读器] 迁移改名聊天的楼层备份失败', error);
      } finally {
        schedule();
      }
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
