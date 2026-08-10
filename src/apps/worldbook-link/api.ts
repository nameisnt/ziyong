import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

export type WorldbookCategoryId = 'global' | 'character' | 'additional' | 'chat' | 'other';

export interface CurrentWorldbookGroups {
  additional: string[];
  character: string[];
  chat: string[];
  global: string[];
  globalDisabled: string[];
  globalEnabled: string[];
  other: string[];
}

interface RuntimeCharacter {
  avatar?: string;
  data?: {
    character_book?: { name?: string };
    extensions?: { world?: string };
    name?: string;
  };
  name?: string;
}

function requiredFunction<T extends (...args: never[]) => unknown>(name: string): T {
  const fn = getOptionalGlobalFunction<T>(name);
  if (!fn) throw new Error(`当前酒馆环境没有开放 ${name} 接口`);
  return fn;
}

function uniqueNames(names: Array<null | string | undefined>) {
  return [...new Set(names.map(name => name?.trim()).filter((name): name is string => Boolean(name)))];
}

function normalizedWorldbookName(name: string) {
  return name.trim().normalize('NFC');
}

function describeError(caughtError: unknown) {
  return caughtError instanceof Error ? caughtError.message : String(caughtError);
}

type RawWorldbookEntry = Record<string, unknown> & {
  comment?: unknown;
  content?: unknown;
  disable?: unknown;
  id?: unknown;
  uid?: unknown;
};

type RawWorldbook = Record<string, unknown> & {
  entries?: unknown;
};

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullablePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item ?? '').trim()).filter(Boolean);
}

function rawEntryUid(entry: RawWorldbookEntry, fallbackKey: string) {
  const candidates = [entry.uid, entry.id, fallbackKey];
  for (const candidate of candidates) {
    const uid = Number(candidate);
    if (Number.isFinite(uid)) return uid;
  }
  return null;
}

function rawEntryPosition(value: unknown): WorldbookEntry['position']['type'] {
  if (typeof value === 'string') {
    const validPositions: WorldbookEntry['position']['type'][] = [
      'before_character_definition',
      'after_character_definition',
      'before_example_messages',
      'after_example_messages',
      'before_author_note',
      'after_author_note',
      'at_depth',
      'outlet',
    ];
    if (validPositions.includes(value as WorldbookEntry['position']['type'])) {
      return value as WorldbookEntry['position']['type'];
    }
  }
  return (
    (
      {
        0: 'before_character_definition',
        1: 'after_character_definition',
        2: 'before_author_note',
        3: 'after_author_note',
        4: 'at_depth',
        5: 'before_example_messages',
        6: 'after_example_messages',
      } as const
    )[numberOr(value, 0)] || 'before_character_definition'
  );
}

function rawEntryRole(value: unknown): WorldbookEntry['position']['role'] {
  if (value === 'user' || value === 'assistant' || value === 'system') return value;
  return ({ 0: 'system', 1: 'user', 2: 'assistant' } as const)[numberOr(value, 0)] || 'system';
}

function rawEntryLogic(value: unknown): WorldbookEntry['strategy']['keys_secondary']['logic'] {
  if (value === 'and_any' || value === 'and_all' || value === 'not_all' || value === 'not_any') return value;
  return ({ 0: 'and_any', 1: 'not_all', 2: 'not_any', 3: 'and_all' } as const)[numberOr(value, 0)] || 'and_any';
}

function rawEntryStrategy(entry: RawWorldbookEntry): WorldbookEntry['strategy']['type'] {
  if (entry.constant === true) return 'constant';
  if (entry.vectorized === true) return 'vectorized';
  return 'selective';
}

function rawEntryEnabled(entry: RawWorldbookEntry) {
  if (typeof entry.disable === 'boolean') return !entry.disable;
  if (typeof entry.enabled === 'boolean') return entry.enabled;
  return true;
}

function convertRawWorldbookEntries(book: unknown, bookName: string): WorldbookEntry[] {
  if (!book || typeof book !== 'object') {
    throw new Error(`酒馆原始接口没有返回世界书“${bookName}”`);
  }
  const rawEntries = (book as RawWorldbook).entries;
  if (!rawEntries || typeof rawEntries !== 'object') {
    throw new Error(`世界书“${bookName}”的原始 entries 字段格式无效`);
  }
  const pairs = Array.isArray(rawEntries)
    ? rawEntries.map((entry, index) => [String(index), entry] as const)
    : Object.entries(rawEntries);

  const entries = pairs.flatMap(([key, rawEntry]): WorldbookEntry[] => {
    if (!rawEntry || typeof rawEntry !== 'object') return [];
    const entry = rawEntry as RawWorldbookEntry;
    const uid = rawEntryUid(entry, key);
    if (uid === null) return [];
    const primaryKeys = stringList(entry.key);
    const secondaryKeys = stringList(entry.keysecondary);
    const scanDepth = numberOr(entry.scanDepth, 0);
    return [
      {
        uid,
        name: String(entry.comment ?? entry.name ?? ''),
        enabled: rawEntryEnabled(entry),
        strategy: {
          type: rawEntryStrategy(entry),
          keys: primaryKeys,
          keys_secondary: {
            logic: rawEntryLogic(entry.selectiveLogic),
            keys: secondaryKeys,
          },
          scan_depth: scanDepth > 0 ? scanDepth : 'same_as_global',
        },
        position: {
          type: rawEntryPosition(entry.position),
          role: rawEntryRole(entry.role),
          depth: numberOr(entry.depth, 4),
          order: numberOr(entry.order, 100),
        },
        content: String(entry.content ?? ''),
        probability: numberOr(entry.probability, 100),
        recursion: {
          prevent_incoming: entry.excludeRecursion === true,
          prevent_outgoing: entry.preventRecursion === true,
          delay_until: nullablePositiveNumber(entry.delayUntilRecursion),
        },
        effect: {
          sticky: nullablePositiveNumber(entry.sticky),
          cooldown: nullablePositiveNumber(entry.cooldown),
          delay: nullablePositiveNumber(entry.delay),
        },
        extra: { rawWorldbookEntry: entry },
      } satisfies WorldbookEntry,
    ];
  });

  return entries.sort((left, right) => left.position.order - right.position.order || left.uid - right.uid);
}

async function loadRawWorldbook(bookName: string) {
  const loadWorldInfo = getOptionalGlobalFunction<(name: string) => Promise<unknown>>('loadWorldInfo');
  if (!loadWorldInfo) throw new Error('当前酒馆环境没有开放 loadWorldInfo 接口');
  const book = await loadWorldInfo(bookName);
  return { book, entries: convertRawWorldbookEntries(book, bookName) };
}

function normalizeWorldbookEntries(value: unknown, bookName: string): WorldbookEntry[] {
  if (!Array.isArray(value)) {
    throw new Error(`世界书“${bookName}”返回的条目列表格式无效`);
  }

  return value.map((rawEntry, index) => {
    if (!rawEntry || typeof rawEntry !== 'object') {
      throw new Error(`世界书“${bookName}”的第 ${index + 1} 个条目格式无效`);
    }
    const entry = rawEntry as WorldbookEntry;
    const uid = Number(entry.uid);
    if (!Number.isFinite(uid)) {
      throw new Error(`世界书“${bookName}”的第 ${index + 1} 个条目缺少有效 uid`);
    }
    return {
      ...entry,
      content: String(entry.content ?? ''),
      name: String(entry.name ?? ''),
      uid,
    };
  });
}

function normalizeCharacterId(value: null | string | undefined) {
  return String(value || '')
    .replace(/^.*[\\/]/, '')
    .toLocaleLowerCase();
}

function getRuntimeCharacters() {
  const characters = getOptionalGlobalValue<unknown>('characters');
  return Array.isArray(characters) ? (characters as RuntimeCharacter[]) : [];
}

function getEmbeddedWorldbookName(character: RuntimeCharacter) {
  const explicitName = character.data?.character_book?.name?.trim();
  if (explicitName) return explicitName;
  const characterName = character.name?.trim() || character.data?.name?.trim();
  return character.data?.character_book && characterName ? `${characterName}'s Lorebook` : null;
}

function getCharacterWorldbookGroups(
  allWorldbookNames: string[],
  currentPrimary: string | null,
  getCharNames: (characterName: string) => CharWorldbooks,
) {
  const available = new Set(allWorldbookNames);
  const getCharacterNames = getOptionalGlobalFunction<() => string[]>('getCharacterNames');
  const getCurrentId = getOptionalGlobalFunction<() => string | null>('getCurrentCharacterId');
  const getCurrentName = getOptionalGlobalFunction<() => string | null>('getCurrentCharacterName');
  const currentId = normalizeCharacterId(getCurrentId?.());
  const currentName = getCurrentName?.()?.trim() || '';
  const currentNames = uniqueNames([currentPrimary]);
  const otherNames: string[] = [];

  const runtimeCharacters = getRuntimeCharacters();
  for (const character of runtimeCharacters) {
    const characterId = normalizeCharacterId(character.avatar);
    const characterName = character.name?.trim() || character.data?.name?.trim() || '';
    const isCurrent = currentId ? characterId === currentId : Boolean(currentName && characterName === currentName);
    const primary = character.data?.extensions?.world?.trim();
    const embedded = getEmbeddedWorldbookName(character);
    const target = isCurrent ? currentNames : otherNames;
    if (primary && available.has(primary)) target.push(primary);
    if (embedded && available.has(embedded)) target.push(embedded);
  }

  // Public APIs are the stable source for primary bindings. Runtime character data
  // supplements embedded character books and disambiguates duplicate display names.
  const characterNames = uniqueNames(getCharacterNames?.() ?? []);
  for (const characterName of characterNames) {
    if (currentName && characterName === currentName) continue;
    try {
      const primary = getCharNames(characterName).primary;
      if (primary && available.has(primary)) otherNames.push(primary);
    } catch {
      // A single unreadable character should not hide the remaining results.
    }
  }

  const current = uniqueNames(currentNames);
  const currentSet = new Set(current);
  return {
    current,
    other: uniqueNames(otherNames).filter(name => !currentSet.has(name)),
  };
}

export function getCurrentWorldbookGroups(): CurrentWorldbookGroups {
  const getAllNames = requiredFunction<() => string[]>('getWorldbookNames');
  const getGlobalNames = requiredFunction<() => string[]>('getGlobalWorldbookNames');
  const getCharNames = requiredFunction<(characterName: string) => CharWorldbooks>('getCharWorldbookNames');
  const getChatName = requiredFunction<(chatName: 'current') => string | null>('getChatWorldbookName');
  const character = getCharNames('current');
  const allWorldbookNames = uniqueNames(getAllNames());
  const characterGroups = getCharacterWorldbookGroups(allWorldbookNames, character.primary, getCharNames);
  const additional = uniqueNames(character.additional);
  const chat = uniqueNames([getChatName('current')]);
  const other = characterGroups.other;
  const excluded = new Set([...characterGroups.current, ...other, ...additional, ...chat]);
  const globalEnabledSet = new Set(uniqueNames(getGlobalNames()));
  const global = allWorldbookNames.filter(name => !excluded.has(name));
  const globalEnabled = global.filter(name => globalEnabledSet.has(name));
  const globalDisabled = global.filter(name => !globalEnabledSet.has(name));
  return {
    additional,
    character: characterGroups.current,
    chat,
    global: [...globalEnabled, ...globalDisabled],
    globalDisabled,
    globalEnabled,
    other,
  };
}

export async function getWorldbookEntries(bookName: string) {
  const getWorldbook = getOptionalGlobalFunction<(worldbookName: string) => Promise<WorldbookEntry[]>>('getWorldbook');
  let firstError: unknown = new Error('当前酒馆环境没有开放 getWorldbook 接口');
  let rawReadError: unknown = null;
  try {
    if (getWorldbook) return normalizeWorldbookEntries(await getWorldbook(bookName), bookName);
  } catch (error) {
    firstError = error;
  }

  try {
    return (await loadRawWorldbook(bookName)).entries;
  } catch (error) {
    rawReadError = error;
    // Try a canonically equivalent name next. Some imported books preserve a
    // different Unicode normalization form than the name shown by the picker.
  }

  const getWorldbookNames = getOptionalGlobalFunction<() => string[]>('getWorldbookNames');
  const normalizedTarget = normalizedWorldbookName(bookName);
  let matches: string[] = [];
  try {
    matches = uniqueNames(getWorldbookNames?.() ?? []).filter(
      candidate => normalizedWorldbookName(candidate) === normalizedTarget,
    );
  } catch {
    // Keep the original read error when the name-list fallback is also unavailable.
  }
  const fallbackName = matches.length === 1 && matches[0] !== bookName ? matches[0] : '';
  if (!fallbackName) {
    const rawDetail = rawReadError ? `；原始读取失败：${describeError(rawReadError)}` : '';
    throw new Error(`无法读取世界书“${bookName}”：${describeError(firstError)}${rawDetail}`);
  }

  if (getWorldbook) {
    try {
      return normalizeWorldbookEntries(await getWorldbook(fallbackName), fallbackName);
    } catch {
      // The helper conversion can fail on legacy entries with missing arrays.
    }
  }
  try {
    return (await loadRawWorldbook(fallbackName)).entries;
  } catch (fallbackError) {
    throw new Error(`无法读取世界书“${bookName}”（已尝试匹配“${fallbackName}”）：${describeError(fallbackError)}`);
  }
}

export async function setGlobalWorldbookEnabled(bookName: string, enabled: boolean) {
  const getGlobalNames = requiredFunction<() => string[]>('getGlobalWorldbookNames');
  const rebindGlobal = requiredFunction<(worldbookNames: string[]) => Promise<void>>('rebindGlobalWorldbooks');
  const nextNames = new Set(uniqueNames(getGlobalNames()));
  if (enabled) nextNames.add(bookName);
  else nextNames.delete(bookName);
  await rebindGlobal([...nextNames]);
  return [...nextNames];
}

export async function setWorldbookEntryStates(bookName: string, states: Map<number, boolean>, disableUnknown: boolean) {
  const updateWorldbook =
    getOptionalGlobalFunction<
      (
        worldbookName: string,
        updater: (entries: WorldbookEntry[]) => WorldbookEntry[],
        options?: { render?: 'debounced' | 'immediate' },
      ) => Promise<WorldbookEntry[]>
    >('updateWorldbookWith');
  let changed = 0;
  if (updateWorldbook) {
    try {
      const entries = await updateWorldbook(
        bookName,
        currentEntries =>
          currentEntries.map(entry => {
            const target = states.has(entry.uid) ? states.get(entry.uid) : disableUnknown ? false : entry.enabled;
            if (target === undefined || target === entry.enabled) return entry;
            changed += 1;
            return { ...entry, enabled: target };
          }),
        { render: 'immediate' },
      );
      return { changed, entries };
    } catch {
      changed = 0;
    }
  }

  const saveWorldInfo =
    getOptionalGlobalFunction<(name: string, data: unknown, immediately?: boolean) => Promise<void>>('saveWorldInfo');
  if (!saveWorldInfo) throw new Error('当前酒馆环境没有开放 saveWorldInfo 接口');
  const { book, entries } = await loadRawWorldbook(bookName);
  const rawEntries = (book as RawWorldbook).entries;
  const pairs = Array.isArray(rawEntries)
    ? rawEntries.map((entry, index) => [String(index), entry] as const)
    : Object.entries(rawEntries as object);
  pairs.forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const entry = value as RawWorldbookEntry;
    const uid = rawEntryUid(entry, key);
    if (uid === null) return;
    const currentEnabled = rawEntryEnabled(entry);
    const target = states.has(uid) ? states.get(uid) : disableUnknown ? false : currentEnabled;
    if (target === undefined || target === currentEnabled) return;
    entry.disable = !target;
    if (typeof entry.enabled === 'boolean') entry.enabled = target;
    changed += 1;
  });
  await saveWorldInfo(bookName, book, true);
  await getOptionalGlobalFunction<() => Promise<void>>('updateWorldInfoList')?.();
  getOptionalGlobalFunction<(file: string, loadIfNotSelected?: boolean) => void>('reloadWorldInfoEditor')?.(
    bookName,
    false,
  );
  const enabledByUid = new Map(
    pairs.flatMap(([key, value]) => {
      if (!value || typeof value !== 'object') return [];
      const entry = value as RawWorldbookEntry;
      const uid = rawEntryUid(entry, key);
      return uid === null ? [] : ([[uid, rawEntryEnabled(entry)]] as const);
    }),
  );
  return {
    changed,
    entries: entries.map(entry => ({ ...entry, enabled: enabledByUid.get(entry.uid) ?? entry.enabled })),
  };
}

export function setWorldbookEntryEnabled(bookName: string, uid: number, enabled: boolean) {
  return setWorldbookEntryStates(bookName, new Map([[uid, enabled]]), false);
}

export type WorldbookEntryEditorPatch = Pick<WorldbookEntry, 'content' | 'name' | 'position'>;

function rawPositionValue(type: WorldbookEntry['position']['type']) {
  return (
    {
      after_author_note: 3,
      after_character_definition: 1,
      after_example_messages: 6,
      at_depth: 4,
      before_author_note: 2,
      before_character_definition: 0,
      before_example_messages: 5,
      outlet: 7,
    } as const
  )[type];
}

function rawRoleValue(role: WorldbookEntry['position']['role']) {
  return ({ assistant: 2, system: 0, user: 1 } as const)[role];
}

async function updateWorldbookEntryRaw(bookName: string, uid: number, patch: WorldbookEntryEditorPatch) {
  const saveWorldInfo =
    getOptionalGlobalFunction<(name: string, data: unknown, immediately?: boolean) => Promise<void>>('saveWorldInfo');
  if (!saveWorldInfo) throw new Error('当前酒馆环境没有开放世界书条目写入接口');
  const { book } = await loadRawWorldbook(bookName);
  const rawEntries = (book as RawWorldbook).entries;
  const pairs = Array.isArray(rawEntries)
    ? rawEntries.map((entry, index) => [String(index), entry] as const)
    : Object.entries(rawEntries as object);
  const targetPair = pairs.find(([key, value]) => {
    if (!value || typeof value !== 'object') return false;
    return rawEntryUid(value as RawWorldbookEntry, key) === uid;
  });
  if (!targetPair) throw new Error(`世界书条目 #${uid} 已不存在`);
  const target = targetPair[1] as RawWorldbookEntry;
  target.comment = patch.name;
  if ('name' in target) target.name = patch.name;
  target.content = patch.content;
  target.position = rawPositionValue(patch.position.type);
  target.role = rawRoleValue(patch.position.role);
  target.depth = patch.position.depth;
  target.order = patch.position.order;
  await saveWorldInfo(bookName, book, true);
  await getOptionalGlobalFunction<() => Promise<void>>('updateWorldInfoList')?.();
  getOptionalGlobalFunction<(file: string, loadIfNotSelected?: boolean) => void>('reloadWorldInfoEditor')?.(
    bookName,
    false,
  );
  return getWorldbookEntries(bookName);
}

export async function updateWorldbookEntry(bookName: string, uid: number, patch: WorldbookEntryEditorPatch) {
  const updateWorldbook =
    getOptionalGlobalFunction<
      (
        worldbookName: string,
        updater: (entries: WorldbookEntry[]) => WorldbookEntry[],
        options?: { render?: 'debounced' | 'immediate' },
      ) => Promise<WorldbookEntry[]>
    >('updateWorldbookWith');
  if (updateWorldbook) {
    try {
      let found = false;
      const entries = await updateWorldbook(
        bookName,
        currentEntries =>
          currentEntries.map(entry => {
            if (entry.uid !== uid) return entry;
            found = true;
            return {
              ...entry,
              content: patch.content,
              name: patch.name,
              position: { ...patch.position },
            };
          }),
        { render: 'immediate' },
      );
      if (!found) throw new Error(`世界书条目 #${uid} 已不存在`);
      return entries;
    } catch (error) {
      if (error instanceof Error && error.message.includes('已不存在')) throw error;
    }
  }
  return updateWorldbookEntryRaw(bookName, uid, patch);
}

export async function deleteWorldbookEntry(bookName: string, uid: number) {
  const updateWorldbook =
    getOptionalGlobalFunction<
      (
        worldbookName: string,
        updater: (entries: WorldbookEntry[]) => WorldbookEntry[],
        options?: { render?: 'debounced' | 'immediate' },
      ) => Promise<WorldbookEntry[]>
    >('updateWorldbookWith');
  if (updateWorldbook) {
    try {
      let found = false;
      const entries = await updateWorldbook(
        bookName,
        currentEntries =>
          currentEntries.filter(entry => {
            if (entry.uid !== uid) return true;
            found = true;
            return false;
          }),
        { render: 'immediate' },
      );
      if (!found) throw new Error(`世界书条目 #${uid} 已不存在`);
      return entries;
    } catch (error) {
      if (error instanceof Error && error.message.includes('已不存在')) throw error;
    }
  }

  const saveWorldInfo =
    getOptionalGlobalFunction<(name: string, data: unknown, immediately?: boolean) => Promise<void>>('saveWorldInfo');
  if (!saveWorldInfo) throw new Error('当前酒馆环境没有开放世界书条目删除接口');
  const { book } = await loadRawWorldbook(bookName);
  const rawEntries = (book as RawWorldbook).entries;
  let found = false;
  if (Array.isArray(rawEntries)) {
    const index = rawEntries.findIndex((value, entryIndex) => {
      if (!value || typeof value !== 'object') return false;
      return rawEntryUid(value as RawWorldbookEntry, String(entryIndex)) === uid;
    });
    if (index >= 0) {
      rawEntries.splice(index, 1);
      found = true;
    }
  } else if (rawEntries && typeof rawEntries === 'object') {
    const targetKey = Object.entries(rawEntries).find(([key, value]) => {
      if (!value || typeof value !== 'object') return false;
      return rawEntryUid(value as RawWorldbookEntry, key) === uid;
    })?.[0];
    if (targetKey !== undefined) {
      delete (rawEntries as Record<string, unknown>)[targetKey];
      found = true;
    }
  }
  if (!found) throw new Error(`世界书条目 #${uid} 已不存在`);
  await saveWorldInfo(bookName, book, true);
  await getOptionalGlobalFunction<() => Promise<void>>('updateWorldInfoList')?.();
  getOptionalGlobalFunction<(file: string, loadIfNotSelected?: boolean) => void>('reloadWorldInfoEditor')?.(
    bookName,
    false,
  );
  return getWorldbookEntries(bookName);
}
