export interface RecoveryCharacter {
  avatar: string;
  id: number;
  name: string;
  ownerKey: string;
}

export interface ChatBackupSummary {
  chatItems: number;
  fileId: string;
  fileName: string;
  fileSize: string;
  lastMessage: string;
  lastMessageAt: number;
  ownerKey: string;
}

export interface ChatBackupGroup {
  backups: ChatBackupSummary[];
  character: RecoveryCharacter | null;
  conflictCharacters: RecoveryCharacter[];
  id: string;
  kind: 'character' | 'conflict' | 'unknown';
  label: string;
}

export interface ParsedBackupMessage {
  content: string;
  id: string;
  isHidden: boolean;
  isUser: boolean;
  name: string;
  sendDate: string;
  title: string;
}

export interface ParsedChatBackup {
  characterName: string;
  header: Record<string, unknown>;
  messages: ParsedBackupMessage[];
  userName: string;
}

export function describeBackupMessageCountMismatch(listedCount: number, parsedCount: number) {
  if (listedCount === parsedCount) return '';
  return `备份列表记录 ${listedCount} 层，但实际解析到 ${parsedCount} 层；请刷新书架后重新读取，当前文件禁止导入。`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function normalizeBackupOwnerKey(avatar: string) {
  const base = avatar.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  const withoutControlCharacters = [...base]
    .filter(character => {
      const code = character.charCodeAt(0);
      return code > 31 && (code < 128 || code > 159);
    })
    .join('');
  return withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
}

export function extractBackupOwnerKey(fileName: string) {
  const match = /^chat_(.+)_(\d{8}-\d{6})\.jsonl$/i.exec(fileName);
  return match?.[1]?.toLowerCase() ?? '';
}

export function normalizeBackupSummary(raw: unknown): ChatBackupSummary | null {
  if (!isRecord(raw)) return null;
  const fileName = textValue(raw.file_name);
  if (!/^chat_.+\.jsonl$/i.test(fileName)) return null;
  const lastMessageRaw = raw.last_mes;
  const parsedDate = typeof lastMessageRaw === 'number' ? lastMessageRaw : Date.parse(textValue(lastMessageRaw));
  return {
    chatItems: Math.max(0, Number(raw.chat_items) || 0),
    fileId: textValue(raw.file_id) || fileName.replace(/\.jsonl$/i, ''),
    fileName,
    fileSize: textValue(raw.file_size) || '未知大小',
    lastMessage: textValue(raw.mes),
    lastMessageAt: Number.isFinite(parsedDate) ? parsedDate : 0,
    ownerKey: extractBackupOwnerKey(fileName),
  };
}

export function createRecoveryCharacters(characters: unknown[]): RecoveryCharacter[] {
  return characters.flatMap((raw, id) => {
    if (!isRecord(raw)) return [];
    const avatar = textValue(raw.avatar);
    const data = isRecord(raw.data) ? raw.data : null;
    const name = textValue(raw.name) || textValue(data?.name) || `角色 ${id + 1}`;
    if (!avatar) return [];
    return [{ avatar, id, name, ownerKey: normalizeBackupOwnerKey(avatar) }];
  });
}

export function groupChatBackups(backups: ChatBackupSummary[], characters: RecoveryCharacter[]): ChatBackupGroup[] {
  const characterByOwnerKey = new Map<string, RecoveryCharacter[]>();
  characters.forEach(character => {
    const matches = characterByOwnerKey.get(character.ownerKey) ?? [];
    matches.push(character);
    characterByOwnerKey.set(character.ownerKey, matches);
  });
  const groups = new Map<string, ChatBackupGroup>();
  backups.forEach(backup => {
    const candidates = characterByOwnerKey.get(backup.ownerKey) ?? [];
    const kind = candidates.length === 1 ? 'character' : candidates.length > 1 ? 'conflict' : 'unknown';
    const id = kind === 'character' ? `character:${candidates[0]!.id}` : `${kind}:${backup.ownerKey || 'unparsed'}`;
    const label =
      kind === 'character' ? candidates[0]!.name : kind === 'conflict' ? '角色卡匹配冲突' : '已删除或未识别的角色卡';
    const existing = groups.get(id) ?? {
      backups: [],
      character: kind === 'character' ? candidates[0]! : null,
      conflictCharacters: kind === 'conflict' ? candidates : [],
      id,
      kind,
      label,
    };
    existing.backups.push(backup);
    groups.set(id, existing);
  });
  return [...groups.values()]
    .map(group => ({
      ...group,
      backups: [...group.backups].sort(
        (a, b) => b.lastMessageAt - a.lastMessageAt || a.fileName.localeCompare(b.fileName),
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.kind === 'character') - Number(a.kind === 'character') || a.label.localeCompare(b.label, 'zh-CN'),
    );
}

export function parseChatBackupJsonl(text: string): ParsedChatBackup {
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();
  if (!lines.length) throw new Error('备份文件为空');
  const parsed = lines.map((line, index) => {
    if (!line.trim()) throw new Error(`备份第 ${index + 1} 行为空，文件可能已损坏`);
    try {
      const value: unknown = JSON.parse(line);
      if (!isRecord(value)) throw new Error('不是 JSON 对象');
      return value;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`备份第 ${index + 1} 行无法解析：${reason}`);
    }
  });
  const header = parsed[0]!;
  if (!isRecord(header.chat_metadata)) {
    throw new Error('备份第一行不是 SillyTavern 聊天 metadata');
  }
  const messages = parsed.slice(1).map((message, index) => {
    const extra = isRecord(message.extra) ? message.extra : null;
    const name =
      textValue(message.name) || (message.is_user ? textValue(header.user_name) : textValue(header.character_name));
    return {
      content: textValue(extra?.display_text) || textValue(message.mes),
      id: `backup-message-${index}`,
      isHidden: Boolean(message.is_system),
      isUser: Boolean(message.is_user),
      name: name || `楼层 ${index + 1}`,
      sendDate: textValue(message.send_date),
      title: `第 ${index + 1} 楼 · ${name || '未知发言者'}`,
    };
  });
  return {
    characterName: textValue(header.character_name),
    header,
    messages,
    userName: textValue(header.user_name),
  };
}

export function createSingleFlight() {
  let active: Promise<unknown> | null = null;
  return function run<T>(task: () => Promise<T>): Promise<T> {
    if (active) return active as Promise<T>;
    const current = task();
    active = current;
    const clear = () => {
      if (active === current) active = null;
    };
    void current.then(clear, clear);
    return current;
  };
}
