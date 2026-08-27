import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

const legacyRelationshipField = 'sillytavern_phone_relationships';
export const relationshipField = 'sillytavern_phone_relationships_mermaid';

export const RelationshipCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  relations: Array<{ from: string; label: string; to: string }>;
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
  return normalizeName(name).toLocaleLowerCase();
}

export const useRelationshipStore = defineStore('relationship', () => {
  if (_.has(extension_settings, legacyRelationshipField)) {
    _.unset(extension_settings, legacyRelationshipField);
    void saveSettingsDebounced();
  }

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

  function createCharacter(name: string) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const existing = findCharacterByName(normalized);
    if (existing) return existing;
    const timestamp = nowIso();
    const character: RelationshipCharacter = {
      id: createId('relationship_character'),
      name: normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.characters = [...data.value.characters, character];
    return character;
  }

  function updateCharacter(characterId: string, input: Partial<Pick<RelationshipCharacter, 'name'>>) {
    const character = getCharacter(characterId);
    const name = input.name?.trim();
    if (!character || !name) return null;
    character.name = name;
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

  function upsertLink(fromId: string, toId: string, label: string) {
    const normalized = label.trim();
    if (!fromId || !toId || fromId === toId || !normalized) return null;
    const existing = data.value.links.find(link => link.fromId === fromId && link.toId === toId);
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
    const fromId = input.fromId || link.fromId;
    const toId = input.toId || link.toId;
    const label = typeof input.label === 'string' ? input.label.trim() : link.label;
    if (!fromId || !toId || fromId === toId || !label) return null;
    Object.assign(link, { fromId, toId, label, updatedAt: nowIso() });
    return link;
  }

  function deleteLink(linkId: string) {
    data.value.links = data.value.links.filter(link => link.id !== linkId);
  }

  function mergeGenerated(result: RelationshipGeneratedResult) {
    const createdCharacters: RelationshipCharacter[] = [];
    const changedLinks: RelationshipLink[] = [];
    [...result.characters, ...result.relations.flatMap(relation => [relation.from, relation.to])]
      .map(normalizeName)
      .filter(Boolean)
      .forEach(name => {
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
    return { characters: createdCharacters, links: changedLinks };
  }

  return {
    ...failedDraftCollection,
    characters,
    createCharacter,
    data,
    deleteCharacter,
    deleteLink,
    findDuplicateCharacterName,
    getCharacter,
    getLink,
    links,
    mergeGenerated,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    updateCharacter,
    updateLink,
    upsertLink,
  };
});
