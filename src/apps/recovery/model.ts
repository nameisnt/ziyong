export interface RecoveryCharacter {
  avatar: string;
  id: number;
  name: string;
  ownerKey: string;
}

export interface ChatBackupSummary {
  backupCreatedAt: number;
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

export interface CleanupCandidate {
  actualChatItems: number;
  summary: ChatBackupSummary;
}

export interface CleanupRejectedBackup {
  reason: string;
  summary: ChatBackupSummary;
}

export interface CleanupScanResult {
  candidates: CleanupCandidate[];
  groupId: string;
  maxChatItems: number;
  rejected: CleanupRejectedBackup[];
}

export interface CleanupDeleteResult {
  deleted: ChatBackupSummary[];
  failed: CleanupRejectedBackup[];
}

export interface DuplicateBackupFingerprint {
  actualChatItems: number;
  byteLength: number;
  contentHash: string;
  headerHash: string;
  messageHashes: string[];
  summary: ChatBackupSummary;
}

export interface DuplicateBackupGroup {
  byteLength: number;
  contentHash: string;
  duplicates: DuplicateBackupFingerprint[];
  id: string;
  keeper: DuplicateBackupFingerprint;
  reclaimBytes: number;
}

export interface DuplicateScanResult {
  containedGroups: ContainedBackupGroup[];
  groups: DuplicateBackupGroup[];
  groupId: string;
  rejected: CleanupRejectedBackup[];
  scannedFiles: number;
}

export interface ContainedBackupGroup {
  contained: DuplicateBackupFingerprint[];
  id: string;
  keeper: DuplicateBackupFingerprint;
  reclaimBytes: number;
}

export interface DuplicateDeleteResult {
  deleted: ChatBackupSummary[];
  failed: CleanupRejectedBackup[];
  reclaimedBytes: number;
}

export interface SettingsSnapshotSummary {
  date: number;
  name: string;
  size: number;
}

export interface LoadedSettingsSnapshot {
  formatted: string;
  raw: string;
  summary: SettingsSnapshotSummary;
}

export interface SettingsSnapshotFingerprint {
  contentHash: string;
  summary: SettingsSnapshotSummary;
}

export interface SettingsDuplicateGroup {
  contentHash: string;
  duplicates: SettingsSnapshotFingerprint[];
  id: string;
  keeper: SettingsSnapshotFingerprint;
  reclaimBytes: number;
}

export interface SettingsDuplicateScanResult {
  groups: SettingsDuplicateGroup[];
  rejected: Array<{ name: string; reason: string }>;
  scannedFiles: number;
}

export interface SettingsDeleteResult {
  deleted: SettingsSnapshotSummary[];
  failed: Array<{ name: string; reason: string }>;
  reclaimedBytes: number;
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

export function extractBackupCreatedAt(fileName: string) {
  const match = /_(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.jsonl$/i.exec(fileName);
  if (!match) return 0;
  const [, year, month, day, hour, minute, second] = match;
  const value = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function normalizeBackupSummary(raw: unknown): ChatBackupSummary | null {
  if (!isRecord(raw)) return null;
  const fileName = textValue(raw.file_name);
  if (!/^chat_.+\.jsonl$/i.test(fileName)) return null;
  const lastMessageRaw = raw.last_mes;
  const parsedDate = typeof lastMessageRaw === 'number' ? lastMessageRaw : Date.parse(textValue(lastMessageRaw));
  const chatItems = Number(raw.chat_items);
  if (!Number.isInteger(chatItems) || chatItems < 0) return null;
  return {
    backupCreatedAt: extractBackupCreatedAt(fileName),
    chatItems,
    fileId: textValue(raw.file_id) || fileName.replace(/\.jsonl$/i, ''),
    fileName,
    fileSize: textValue(raw.file_size) || '未知大小',
    lastMessage: textValue(raw.mes),
    lastMessageAt: Number.isFinite(parsedDate) ? parsedDate : 0,
    ownerKey: extractBackupOwnerKey(fileName),
  };
}

export function assertCleanupThreshold(value: number) {
  if (!Number.isInteger(value) || value < 0) throw new Error('最大楼层数必须是大于等于 0 的整数');
  return value;
}

export function isCleanupCandidate(summary: ChatBackupSummary, actualChatItems: number, maxChatItems: number) {
  return summary.chatItems === actualChatItems && actualChatItems <= assertCleanupThreshold(maxChatItems);
}

export function createDuplicateBackupGroups(fingerprints: DuplicateBackupFingerprint[]) {
  const grouped = new Map<string, DuplicateBackupFingerprint[]>();
  fingerprints.forEach(fingerprint => {
    if (
      !fingerprint.summary.ownerKey ||
      fingerprint.summary.chatItems !== fingerprint.actualChatItems ||
      !fingerprint.contentHash ||
      fingerprint.byteLength <= 0
    ) {
      return;
    }
    const key = `${fingerprint.summary.ownerKey}\u0000${fingerprint.byteLength}\u0000${fingerprint.contentHash}`;
    const items = grouped.get(key) ?? [];
    items.push(fingerprint);
    grouped.set(key, items);
  });

  return [...grouped.entries()]
    .flatMap(([id, items]): DuplicateBackupGroup[] => {
      if (items.length < 2) return [];
      const ordered = [...items].sort(
        (a, b) =>
          b.summary.backupCreatedAt - a.summary.backupCreatedAt || b.summary.fileName.localeCompare(a.summary.fileName),
      );
      const [keeper, ...duplicates] = ordered;
      if (!keeper || !duplicates.length) return [];
      return [
        {
          byteLength: keeper.byteLength,
          contentHash: keeper.contentHash,
          duplicates,
          id,
          keeper,
          reclaimBytes: duplicates.reduce((total, item) => total + item.byteLength, 0),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.keeper.summary.backupCreatedAt - a.keeper.summary.backupCreatedAt ||
        a.keeper.summary.fileName.localeCompare(b.keeper.summary.fileName),
    );
}

export function isStrictMessagePrefix(shorter: DuplicateBackupFingerprint, longer: DuplicateBackupFingerprint) {
  if (
    !shorter.headerHash ||
    shorter.headerHash !== longer.headerHash ||
    !shorter.messageHashes.length ||
    shorter.messageHashes.length >= longer.messageHashes.length
  )
    return false;
  return shorter.messageHashes.every((hash, index) => hash === longer.messageHashes[index]);
}

export function createContainedBackupGroups(
  fingerprints: DuplicateBackupFingerprint[],
  exactGroups: DuplicateBackupGroup[] = createDuplicateBackupGroups(fingerprints),
) {
  const exactDuplicates = new Set(exactGroups.flatMap(group => group.duplicates.map(item => item.summary.fileName)));
  const eligible = fingerprints.filter(
    item =>
      item.summary.ownerKey &&
      item.actualChatItems === item.summary.chatItems &&
      item.messageHashes.length === item.actualChatItems &&
      item.actualChatItems > 0 &&
      !exactDuplicates.has(item.summary.fileName),
  );
  const byOwner = new Map<string, DuplicateBackupFingerprint[]>();
  eligible.forEach(item => {
    const ownerItems = byOwner.get(item.summary.ownerKey) ?? [];
    ownerItems.push(item);
    byOwner.set(item.summary.ownerKey, ownerItems);
  });

  const groups: ContainedBackupGroup[] = [];
  byOwner.forEach(ownerItems => {
    const ordered = [...ownerItems].sort(
      (a, b) =>
        b.actualChatItems - a.actualChatItems ||
        b.summary.backupCreatedAt - a.summary.backupCreatedAt ||
        b.summary.fileName.localeCompare(a.summary.fileName),
    );
    const assignments = new Map<
      string,
      { contained: DuplicateBackupFingerprint[]; keeper: DuplicateBackupFingerprint }
    >();
    ordered.forEach(candidate => {
      const keeper = ordered.find(item => isStrictMessagePrefix(candidate, item));
      if (!keeper) return;
      const group = assignments.get(keeper.summary.fileName) ?? { contained: [], keeper };
      group.contained.push(candidate);
      assignments.set(keeper.summary.fileName, group);
    });
    assignments.forEach(group => {
      const contained = group.contained.sort(
        (a, b) => b.actualChatItems - a.actualChatItems || b.summary.backupCreatedAt - a.summary.backupCreatedAt,
      );
      groups.push({
        contained,
        id: `${group.keeper.summary.ownerKey}\u0000${group.keeper.summary.fileName}`,
        keeper: group.keeper,
        reclaimBytes: contained.reduce((total, item) => total + item.byteLength, 0),
      });
    });
  });
  return groups.sort(
    (a, b) =>
      b.keeper.actualChatItems - a.keeper.actualChatItems ||
      b.keeper.summary.backupCreatedAt - a.keeper.summary.backupCreatedAt,
  );
}

export function normalizeSettingsSnapshotSummary(raw: unknown): SettingsSnapshotSummary | null {
  if (!isRecord(raw)) return null;
  const name = textValue(raw.name);
  const date = Number(raw.date);
  const size = Number(raw.size);
  if (!/^settings_.+_\d{8}-\d{6}\.json$/i.test(name)) return null;
  if (!Number.isFinite(date) || date <= 0 || !Number.isFinite(size) || size <= 0) return null;
  return { date, name, size };
}

export function formatSettingsSnapshotJson(raw: string) {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('设置快照根节点不是 JSON 对象');
  return JSON.stringify(parsed, null, 2);
}

export function createSettingsDuplicateGroups(fingerprints: SettingsSnapshotFingerprint[]) {
  const grouped = new Map<string, SettingsSnapshotFingerprint[]>();
  fingerprints.forEach(fingerprint => {
    if (!fingerprint.contentHash || fingerprint.summary.size <= 0) return;
    const items = grouped.get(fingerprint.contentHash) ?? [];
    items.push(fingerprint);
    grouped.set(fingerprint.contentHash, items);
  });

  return [...grouped.entries()]
    .flatMap(([contentHash, items]): SettingsDuplicateGroup[] => {
      if (items.length < 2) return [];
      const ordered = [...items].sort(
        (a, b) => b.summary.date - a.summary.date || b.summary.name.localeCompare(a.summary.name),
      );
      const [keeper, ...duplicates] = ordered;
      if (!keeper || !duplicates.length) return [];
      return [
        {
          contentHash,
          duplicates,
          id: contentHash,
          keeper,
          reclaimBytes: duplicates.reduce((total, item) => total + item.summary.size, 0),
        },
      ];
    })
    .sort((a, b) => b.keeper.summary.date - a.keeper.summary.date);
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
