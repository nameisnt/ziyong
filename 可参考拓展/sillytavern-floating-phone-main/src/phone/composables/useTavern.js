const FALLBACK = {
  characters: [],
  variables: {},
  currentCharacterId: null,
  user: null,
  worldBooks: [],
};

function getWindow() {
  return typeof window === 'undefined' ? {} : window;
}

function getTavernHelper() {
  return getWindow().TavernHelper || getWindow().tavernHelper || null;
}

function getSillyTavern() {
  const win = getWindow();
  return win.SillyTavern || win.sillyTavern || win.tavern || null;
}

function getContext() {
  const win = getWindow();
  try {
    const source = getTavernHelper() || getSillyTavern();
    if (typeof source?.getContext === 'function') return source.getContext();
    if (typeof win.getContext === 'function') return win.getContext();
  } catch (error) {
    console.warn('[useTavern] getContext failed:', error);
  }
  return null;
}

async function callFirst(candidates, fallback) {
  for (const candidate of candidates) {
    try {
      if (typeof candidate === 'function') {
        const result = await candidate();
        if (result !== undefined && result !== null) return result;
      }
    } catch (error) {
      console.warn('[useTavern] read candidate failed:', error);
    }
  }
  return fallback;
}

function normalizeCharacter(character, context) {
  if (!character) return null;

  const avatar = character.avatar || character.avatar_url || character.img || character.image || '';

  return {
    id: character.id ?? character.key ?? context?.this_chid ?? null,
    name: character.name || character.name2 || context?.name2 || '暂无数据',
    avatar,
    description: character.description || character.desc || '',
    personality: character.personality || '',
    scenario: character.scenario || '',
    first_mes: character.first_mes || character.firstMessage || '',
    creatorcomment: character.creatorcomment || character.creator_notes || '',
    raw: character,
  };
}

function getCharacterListFromContext(context) {
  const list = context?.characters || getWindow().characters || [];
  return Array.isArray(list) ? list : Object.values(list || {});
}

function getCurrentCharacterFromContext(context) {
  const characters = getCharacterListFromContext(context);
  const id = context?.this_chid ?? context?.characterId ?? context?.character_id ?? FALLBACK.currentCharacterId;

  if (id !== null && id !== undefined && characters[id]) return characters[id];
  if (id !== null && id !== undefined) {
    const matched = characters.find(character => String(character?.id ?? character?.key ?? '') === String(id));
    if (matched) return matched;
  }

  return context?.character || context?.currentCharacter || null;
}

function getUserFromContext(context) {
  const win = getWindow();
  const persona = context?.persona || context?.userPersona || context?.power_user?.persona || win.power_user?.persona;
  const selectedPersona = context?.selected_persona || context?.power_user?.persona_description || win.power_user?.persona_description;

  return {
    name: context?.name1 || win.name1 || context?.user?.name || '暂无数据',
    description:
      context?.user?.description ||
      context?.user?.persona ||
      selectedPersona ||
      (typeof persona === 'string' ? persona : '') ||
      '',
    persona,
    raw: context?.user || win.power_user || null,
  };
}

function getVariablesFromContext(context) {
  const metadata = context?.chat_metadata || getWindow().chat_metadata || {};
  return {
    global: context?.variables || context?.extensionSettings?.variables || getWindow().extension_settings?.variables || {},
    chat: metadata.variables || metadata.tavern_variables || {},
    character: getCurrentCharacterFromContext(context)?.data?.extensions || {},
    metadata,
  };
}

function getWorldBooksFromContext(context) {
  const win = getWindow();
  const candidates = [
    context?.world_info,
    context?.worldInfo,
    context?.world_names,
    context?.selected_world_info,
    win.world_info,
    win.world_names,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') return Object.values(candidate);
  }

  return FALLBACK.worldBooks;
}

export function useTavern() {
  const tavern = getSillyTavern();

  async function getCharacters() {
    const helper = getTavernHelper();
    const context = getContext();

    return await callFirst(
      [
        () => helper?.getCharacters?.(),
        () => tavern?.getCharacters?.(),
        () => getCharacterListFromContext(context),
      ],
      FALLBACK.characters,
    );
  }

  async function getCurrentCharacter() {
    const helper = getTavernHelper();
    const context = getContext();

    const character = await callFirst(
      [
        () => helper?.getCurrentCharacter?.(),
        () => tavern?.getCurrentCharacter?.(),
        () => getCurrentCharacterFromContext(context),
      ],
      null,
    );

    return normalizeCharacter(character, context);
  }

  async function getUserProfile() {
    const helper = getTavernHelper();
    const context = getContext();

    return await callFirst(
      [
        () => helper?.getUserProfile?.(),
        () => helper?.getPersona?.(),
        () => tavern?.getUserProfile?.(),
        () => getUserFromContext(context),
      ],
      FALLBACK.user,
    );
  }

  async function getWorldBooks() {
    const helper = getTavernHelper();
    const context = getContext();

    return await callFirst(
      [
        () => helper?.getWorldBooks?.(),
        () => helper?.getWorldInfo?.(),
        () => tavern?.getWorldBooks?.(),
        () => getWorldBooksFromContext(context),
      ],
      FALLBACK.worldBooks,
    );
  }

  async function getVariables() {
    const helper = getTavernHelper();
    const context = getContext();

    return await callFirst(
      [
        () => helper?.getVariables?.(),
        () => helper?.variables?.getAll?.(),
        () => tavern?.getVariables?.(),
        () => getVariablesFromContext(context),
      ],
      FALLBACK.variables,
    );
  }

  async function setVariable(key, value) {
    const helper = getTavernHelper();
    if (helper?.setVariable) return await helper.setVariable(key, value);
    if (helper?.variables?.set) return await helper.variables.set(key, value);
    if (tavern?.setVariable) return await tavern.setVariable(key, value);
    FALLBACK.variables[key] = value;
  }

  async function getToken() {
    const helper = getTavernHelper();
    if (helper?.getToken) return await helper.getToken();
    if (tavern?.getToken) return await tavern.getToken();
    return null;
  }

  async function sendMessage(payload) {
    const helper = getTavernHelper();
    if (helper?.sendMessage) return await helper.sendMessage(payload);
    if (tavern?.sendMessage) return await tavern.sendMessage(payload);
    console.warn('[useTavern] sendMessage stub:', payload);
    return null;
  }

  async function getRoleAppData() {
    const context = getContext();
    const [character, characters, user, worldBooks, variables] = await Promise.all([
      getCurrentCharacter(),
      getCharacters(),
      getUserProfile(),
      getWorldBooks(),
      getVariables(),
    ]);

    return {
      character,
      characters: Array.isArray(characters) ? characters.map(item => normalizeCharacter(item, context) || item) : [],
      user,
      worldBooks: Array.isArray(worldBooks) ? worldBooks : [],
      variables: variables || FALLBACK.variables,
      raw: {
        context,
        tavern,
        hasTavernHelper: Boolean(getTavernHelper()),
      },
    };
  }

  return {
    tavern,
    getCharacters,
    getCurrentCharacter,
    getUserProfile,
    getWorldBooks,
    getVariables,
    getRoleAppData,
    setVariable,
    getToken,
    sendMessage,
  };
}
