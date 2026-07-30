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

function normalizeCharacterId(value: null | string | undefined) {
  return String(value || '').replace(/^.*[\\/]/, '').toLocaleLowerCase();
}

function getRuntimeCharacters() {
  const characters = getOptionalGlobalValue<unknown>('characters');
  return Array.isArray(characters) ? characters as RuntimeCharacter[] : [];
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
    const isCurrent = currentId
      ? characterId === currentId
      : Boolean(currentName && characterName === currentName);
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
  const getWorldbook = requiredFunction<(worldbookName: string) => Promise<WorldbookEntry[]>>('getWorldbook');
  return getWorldbook(bookName);
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
  const updateWorldbook = requiredFunction<(
    worldbookName: string,
    updater: (entries: WorldbookEntry[]) => WorldbookEntry[],
    options?: { render?: 'debounced' | 'immediate' },
  ) => Promise<WorldbookEntry[]>>('updateWorldbookWith');
  let changed = 0;
  const entries = await updateWorldbook(bookName, currentEntries => currentEntries.map(entry => {
    const target = states.has(entry.uid) ? states.get(entry.uid) : disableUnknown ? false : entry.enabled;
    if (target === undefined || target === entry.enabled) return entry;
    changed += 1;
    return { ...entry, enabled: target };
  }), { render: 'immediate' });
  return { changed, entries };
}

export function setWorldbookEntryEnabled(bookName: string, uid: number, enabled: boolean) {
  return setWorldbookEntryStates(bookName, new Map([[uid, enabled]]), false);
}
