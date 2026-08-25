import { useChatScopedDomain } from '@/store/chatScoped';
import {
  externalProfileReferenceKey,
  type ExternalProfileReferenceDraft,
} from '@/apps/profiles/profileReferences';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const relationshipField = 'sillytavern_phone_relationships';

export const RelationshipCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  profileEntryId: z.string().default(''),
  profileRowIndex: z.number().int().min(0).default(0),
  profileSheetKey: z.string().default(''),
  x: z.number().default(160),
  y: z.number().default(130),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RelationshipCharacter = z.infer<typeof RelationshipCharacterSchema>;

export const RelationshipLinkSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  label: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RelationshipLink = z.infer<typeof RelationshipLinkSchema>;

export const RelationshipScopeDataSchema = z.object({
  characters: z.array(RelationshipCharacterSchema).default([]),
  failedDrafts: z.array(z.custom<FailedGenerationDraft>()).default([]),
  links: z.array(RelationshipLinkSchema).default([]),
});
export type RelationshipScopeData = z.infer<typeof RelationshipScopeDataSchema>;

export type RelationshipGeneratedResult = {
  characters: string[];
  relations: Array<{
    from: string;
    label: string;
    to: string;
  }>;
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: string) {
  return name.trim();
}

function characterKey(name: string) {
  return normalizeName(name).toLowerCase();
}

function getAutoPosition(index: number, total: number) {
  const count = Math.max(total, 4);
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: Math.round(160 + Math.cos(angle) * 96),
    y: Math.round(130 + Math.sin(angle) * 76),
  };
}

export const useRelationshipStore = defineStore('relationship', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: relationshipField,
    schema: RelationshipScopeDataSchema,
    createDefault: () => validateInplace(RelationshipScopeDataSchema, {}),
  });

  const characters = computed(() =>
    [...data.value.characters].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  );
  const links = computed(() =>
    [...data.value.links].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  );
  const failedDraftCollection = createFailedDraftCollection(data, 'relationship_failed');

  function getCharacter(characterId: string) {
    return data.value.characters.find(character => character.id === characterId) ?? null;
  }

  function findCharacterByName(name: string) {
    const key = characterKey(name);
    return data.value.characters.find(character => characterKey(character.name) === key) ?? null;
  }

  function findDuplicateCharacterName(name: string, exceptCharacterId = '') {
    const key = characterKey(name);
    if (!key) return null;
    return (
      data.value.characters.find(
        character => character.id !== exceptCharacterId && characterKey(character.name) === key,
      ) ?? null
    );
  }

  function createCharacter(name: string, profile: ExternalProfileReferenceDraft | null = null) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const existing = findCharacterByName(normalized);
    if (existing) return existing;

    const timestamp = nowIso();
    const position = getAutoPosition(data.value.characters.length, data.value.characters.length + 1);
    const character: RelationshipCharacter = {
      ...position,
      id: createId('relationship_character'),
      name: normalized,
      profileEntryId: '',
      profileRowIndex: profile?.profileRowIndex || 0,
      profileSheetKey: profile?.profileSheetKey || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.characters = [...data.value.characters, character];
    return character;
  }

  function createCharacterFromProfile(profile: ExternalProfileReferenceDraft, displayName: string) {
    const name = normalizeName(displayName);
    if (!profile.profileSheetKey || !profile.profileRowIndex || !name) return null;
    const referenceKey = externalProfileReferenceKey(profile);
    const linked = data.value.characters.find(
      character =>
        character.profileSheetKey &&
        character.profileRowIndex &&
        externalProfileReferenceKey(character) === referenceKey,
    );
    if (linked) return linked;
    const sameName = findCharacterByName(name);
    if (sameName) {
      if (sameName.profileSheetKey && sameName.profileRowIndex) return null;
      sameName.profileEntryId = '';
      sameName.profileRowIndex = profile.profileRowIndex;
      sameName.profileSheetKey = profile.profileSheetKey;
      sameName.name = name;
      sameName.updatedAt = nowIso();
      return sameName;
    }
    return createCharacter(name, profile);
  }

  function setCharacterProfileDraft(characterId: string, patch: Partial<ExternalProfileReferenceDraft>) {
    const character = getCharacter(characterId);
    if (!character) return false;
    if (typeof patch.profileSheetKey === 'string') {
      character.profileSheetKey = patch.profileSheetKey;
      character.profileRowIndex = 0;
      if (!patch.profileSheetKey) character.profileEntryId = '';
    }
    if (typeof patch.profileRowIndex === 'number') character.profileRowIndex = patch.profileRowIndex;
    character.updatedAt = nowIso();
    return true;
  }

  function linkCharacterProfile(
    characterId: string,
    profile: ExternalProfileReferenceDraft | null,
    displayName = '',
  ) {
    const character = getCharacter(characterId);
    if (!character) return false;
    if (!profile?.profileSheetKey || !profile.profileRowIndex) {
      character.profileEntryId = '';
      character.profileRowIndex = 0;
      character.profileSheetKey = '';
      character.updatedAt = nowIso();
      return true;
    }
    const referenceKey = externalProfileReferenceKey(profile);
    const duplicate = data.value.characters.find(
      item =>
        item.id !== characterId &&
        item.profileSheetKey &&
        item.profileRowIndex &&
        externalProfileReferenceKey(item) === referenceKey,
    );
    if (duplicate) return false;
    character.profileEntryId = '';
    character.profileRowIndex = profile.profileRowIndex;
    character.profileSheetKey = profile.profileSheetKey;
    const normalizedName = normalizeName(displayName);
    if (normalizedName) character.name = normalizedName;
    character.updatedAt = nowIso();
    return true;
  }

  function updateCharacter(characterId: string, input: Partial<Pick<RelationshipCharacter, 'name' | 'x' | 'y'>>) {
    const character = getCharacter(characterId);
    if (!character) return null;
    if (typeof input.name === 'string') {
      const normalized = normalizeName(input.name);
      if (normalized) character.name = normalized;
    }
    if (typeof input.x === 'number') character.x = Math.min(306, Math.max(14, Math.round(input.x)));
    if (typeof input.y === 'number') character.y = Math.min(246, Math.max(14, Math.round(input.y)));
    character.updatedAt = nowIso();
    return character;
  }

  function deleteCharacter(characterId: string) {
    data.value.characters = data.value.characters.filter(character => character.id !== characterId);
    data.value.links = data.value.links.filter(link => link.fromId !== characterId && link.toId !== characterId);
  }

  function getLink(linkId: string) {
    return data.value.links.find(link => link.id === linkId) ?? null;
  }

  function findLink(fromId: string, toId: string) {
    return data.value.links.find(link => link.fromId === fromId && link.toId === toId) ?? null;
  }

  function upsertLink(fromId: string, toId: string, label: string) {
    const normalized = label.trim();
    if (!fromId || !toId || fromId === toId || !normalized) return null;
    const existing = findLink(fromId, toId);
    const timestamp = nowIso();
    if (existing) {
      existing.label = normalized;
      existing.updatedAt = timestamp;
      return existing;
    }

    const link: RelationshipLink = {
      id: createId('relationship_link'),
      fromId,
      toId,
      label: normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.links = [...data.value.links, link];
    return link;
  }

  function updateLink(linkId: string, input: Partial<Pick<RelationshipLink, 'fromId' | 'label' | 'toId'>>) {
    const link = getLink(linkId);
    if (!link) return null;
    const nextFromId = input.fromId || link.fromId;
    const nextToId = input.toId || link.toId;
    const nextLabel = typeof input.label === 'string' ? input.label.trim() : link.label;
    if (!nextFromId || !nextToId || nextFromId === nextToId || !nextLabel) return null;
    link.fromId = nextFromId;
    link.toId = nextToId;
    link.label = nextLabel;
    link.updatedAt = nowIso();
    return link;
  }

  function deleteLink(linkId: string) {
    data.value.links = data.value.links.filter(link => link.id !== linkId);
  }

  function mergeGenerated(result: RelationshipGeneratedResult) {
    const createdCharacters: RelationshipCharacter[] = [];
    const changedLinks: RelationshipLink[] = [];
    const names = [...result.characters, ...result.relations.flatMap(relation => [relation.from, relation.to])]
      .map(normalizeName)
      .filter(Boolean);

    names.forEach(name => {
      const before = findCharacterByName(name);
      const character = createCharacter(name);
      if (character && !before) createdCharacters.push(character);
    });

    result.relations.forEach(relation => {
      const from = findCharacterByName(relation.from);
      const to = findCharacterByName(relation.to);
      if (!from || !to) return;
      const link = upsertLink(from.id, to.id, relation.label);
      if (link) changedLinks.push(link);
    });

    return {
      characters: createdCharacters,
      links: changedLinks,
    };
  }

  return {
    ...failedDraftCollection,
    characters,
    createCharacter,
    createCharacterFromProfile,
    data,
    deleteCharacter,
    deleteLink,
    findDuplicateCharacterName,
    getCharacter,
    getLink,
    links,
    linkCharacterProfile,
    mergeGenerated,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    setCharacterProfileDraft,
    switchScope,
    updateCharacter,
    updateLink,
    upsertLink,
  };
});
