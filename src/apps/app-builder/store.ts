import { getCurrentChatScopeKey, readChatScopedEnvelope, useChatScopedDomain } from '@/store/chatScoped';
import { parsePrettified } from '@/util/zod';
import type { FailedGenerationDraft } from '@/type/generation';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import {
  createCustomAppDefinition,
  customAppChatDataField,
  customAppDefinitionsField,
  customAppGlobalDataField,
  CustomAppContentDataSchema,
  CustomAppDefinitionSchema,
  CustomAppDefinitionsSettingsSchema,
  touchCustomAppCatalog,
  type CustomAppContentData,
  type CustomAppDefinition,
  type CustomAppEntry,
} from './schema';

function nowIso() {
  return new Date().toISOString();
}

function createEntryId() {
  return `custom_entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanTags(tags: string[]) {
  return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
}

export const useCustomAppsStore = defineStore('custom-apps', () => {
  const definitionSettings = ref(
    parsePrettified(CustomAppDefinitionsSettingsSchema, _.get(extension_settings, customAppDefinitionsField, {})),
  );
  const globalData = ref(
    parsePrettified(CustomAppContentDataSchema, _.get(extension_settings, customAppGlobalDataField, {})),
  );
  const chatDomain = useChatScopedDomain({
    field: customAppChatDataField,
    schema: CustomAppContentDataSchema,
    createDefault: () => CustomAppContentDataSchema.parse({}),
  });

  function persistDefinitions() {
    _.set(
      extension_settings,
      customAppDefinitionsField,
      CustomAppDefinitionsSettingsSchema.parse(klona(definitionSettings.value)),
    );
    touchCustomAppCatalog();
    void saveSettingsDebounced();
  }

  watch(definitionSettings, persistDefinitions, { deep: true, flush: 'sync' });
  watch(
    globalData,
    value => {
      _.set(extension_settings, customAppGlobalDataField, CustomAppContentDataSchema.parse(klona(value)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const definitions = computed(() => [...definitionSettings.value.definitions]);

  function getDefinition(appId: string) {
    return definitionSettings.value.definitions.find(definition => definition.id === appId) ?? null;
  }

  function createDefinition(template: 'ai' | 'blank' | 'extract' | 'frontend' = 'extract') {
    const definition = createCustomAppDefinition(template);
    definitionSettings.value.definitions.push(definition);
    return definition;
  }

  function saveDefinition(input: CustomAppDefinition) {
    const parsed = CustomAppDefinitionSchema.parse({
      ...klona(input),
      name: input.name.trim() || '自制 App',
      description: input.description.trim(),
      updatedAt: nowIso(),
    });
    const index = definitionSettings.value.definitions.findIndex(definition => definition.id === parsed.id);
    const previous = index >= 0 ? definitionSettings.value.definitions[index] : null;
    if (previous && previous.dataScope !== parsed.dataScope) {
      const source = getData(previous);
      const target = getData(parsed);
      const movingEntries = source.entries.filter(entry => entry.appId === parsed.id);
      const movingDrafts = source.failedDrafts.filter(draft => draft.appId === parsed.id);
      source.entries = source.entries.filter(entry => entry.appId !== parsed.id);
      source.failedDrafts = source.failedDrafts.filter(draft => draft.appId !== parsed.id);
      target.entries = [...target.entries.filter(entry => entry.appId !== parsed.id), ...movingEntries];
      target.failedDrafts = [...target.failedDrafts.filter(draft => draft.appId !== parsed.id), ...movingDrafts];
    }
    if (index >= 0) definitionSettings.value.definitions[index] = parsed;
    else definitionSettings.value.definitions.push(parsed);
    return parsed;
  }

  function duplicateDefinition(appId: string) {
    const source = getDefinition(appId);
    if (!source) return null;
    const copy = createCustomAppDefinition('blank');
    Object.assign(copy, klona(source), {
      id: copy.id,
      name: `${source.name} 副本`,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
    });
    definitionSettings.value.definitions.push(copy);
    return copy;
  }

  function getData(definition: CustomAppDefinition): CustomAppContentData {
    return definition.dataScope === 'global' ? globalData.value : chatDomain.data.value;
  }

  function getEntries(appId: string) {
    const definition = getDefinition(appId);
    if (!definition) return [];
    return getData(definition)
      .entries.filter(entry => entry.appId === appId)
      .sort(
        (left, right) => left.directoryOrder - right.directoryOrder || left.createdAt.localeCompare(right.createdAt),
      );
  }

  function getEntry(appId: string, entryId: string) {
    return getEntries(appId).find(entry => entry.id === entryId) ?? null;
  }

  function createEntry(
    appId: string,
    input: Pick<CustomAppEntry, 'content' | 'title'> &
      Partial<Pick<CustomAppEntry, 'directoryOrder' | 'sourceFloorEnd' | 'sourceLabel' | 'sourceText' | 'tags'>>,
  ) {
    const definition = getDefinition(appId);
    if (!definition) throw new Error('自制 App 不存在');
    const data = getData(definition);
    const timestamp = nowIso();
    const nextOrder =
      data.entries
        .filter(entry => entry.appId === appId)
        .reduce((maximum, entry) => Math.max(maximum, entry.directoryOrder), 0) + 1;
    const entry: CustomAppEntry = {
      id: createEntryId(),
      appId,
      title: input.title.trim() || '未命名条目',
      content: input.content.trim(),
      sourceText: input.sourceText?.trim() || '',
      sourceLabel: input.sourceLabel?.trim() || '',
      sourceFloorEnd: input.sourceFloorEnd,
      tags: cleanTags(input.tags ?? []),
      favorite: false,
      directoryOrder: input.directoryOrder ?? input.sourceFloorEnd ?? nextOrder,
      conversions: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.entries.push(entry);
    return entry;
  }

  function updateEntry(
    appId: string,
    entryId: string,
    input: Pick<CustomAppEntry, 'content' | 'directoryOrder' | 'sourceLabel' | 'sourceText' | 'tags' | 'title'>,
  ) {
    const entry = getEntry(appId, entryId);
    if (!entry) return null;
    entry.title = input.title.trim() || '未命名条目';
    entry.content = input.content.trim();
    entry.sourceLabel = input.sourceLabel.trim();
    entry.sourceText = input.sourceText.trim();
    entry.tags = cleanTags(input.tags);
    entry.directoryOrder = Math.max(0, Math.round(input.directoryOrder));
    entry.updatedAt = nowIso();
    return entry;
  }

  function deleteEntry(appId: string, entryId: string) {
    const definition = getDefinition(appId);
    if (!definition) return;
    const data = getData(definition);
    data.entries = data.entries.filter(entry => entry.id !== entryId);
  }

  function toggleFavorite(appId: string, entryId: string) {
    const entry = getEntry(appId, entryId);
    if (!entry) return;
    entry.favorite = !entry.favorite;
    entry.updatedAt = nowIso();
  }

  function recordConversion(
    appId: string,
    entryIds: string[],
    target: { appId: string; appName: string; entryIds: string[] },
  ) {
    const createdAt = nowIso();
    const hasOneToOneTargets = target.entryIds.length === entryIds.length;
    entryIds.forEach((entryId, index) => {
      const entry = getEntry(appId, entryId);
      if (!entry) return;
      entry.conversions.push({
        id: `custom_conversion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        targetAppId: target.appId,
        targetAppName: target.appName,
        targetEntryIds: hasOneToOneTargets ? [target.entryIds[index]!] : [...target.entryIds],
        createdAt,
      });
      entry.updatedAt = createdAt;
    });
  }

  function getFailedDrafts(appId: string) {
    const definition = getDefinition(appId);
    if (!definition) return [];
    return getData(definition)
      .failedDrafts.filter(draft => draft.appId === appId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  function getFailedDraft(appId: string, draftId: string) {
    return getFailedDrafts(appId).find(draft => draft.id === draftId) ?? null;
  }

  function createFailedDraft(
    appId: string,
    input: Omit<FailedGenerationDraft, 'createdAt' | 'id' | 'rawOutputSemantics'> &
      Partial<Pick<FailedGenerationDraft, 'rawOutputSemantics'>>,
  ) {
    const definition = getDefinition(appId);
    if (!definition) throw new Error('自制 App 不存在');
    const data = getData(definition);
    const draft: FailedGenerationDraft = {
      ...input,
      appId,
      createdAt: nowIso(),
      id: `custom_failed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      rawOutputSemantics: input.rawOutputSemantics ?? 'legacy-unknown',
    };
    const sameAppDrafts = data.failedDrafts.filter(item => item.appId === appId);
    const otherDrafts = data.failedDrafts.filter(item => item.appId !== appId);
    data.failedDrafts = [...[draft, ...sameAppDrafts].slice(0, 30), ...otherDrafts];
    return draft;
  }

  function updateFailedDraft(appId: string, draftId: string, rawOutput: string, warnings: string[]) {
    const draft = getFailedDraft(appId, draftId);
    if (!draft) return null;
    draft.rawOutput = rawOutput;
    draft.warnings = [...warnings];
    return draft;
  }

  function deleteFailedDraft(appId: string, draftId: string) {
    const definition = getDefinition(appId);
    if (!definition) return;
    const data = getData(definition);
    data.failedDrafts = data.failedDrafts.filter(draft => draft.id !== draftId);
  }

  function deleteDefinition(appId: string) {
    definitionSettings.value.definitions = definitionSettings.value.definitions.filter(item => item.id !== appId);
    globalData.value.entries = globalData.value.entries.filter(entry => entry.appId !== appId);
    globalData.value.failedDrafts = globalData.value.failedDrafts.filter(draft => draft.appId !== appId);
    const envelope = readChatScopedEnvelope(customAppChatDataField, getCurrentChatScopeKey());
    Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
      const data = parsePrettified(CustomAppContentDataSchema, raw);
      envelope.scopes[scopeKey] = {
        ...data,
        entries: data.entries.filter(entry => entry.appId !== appId),
        failedDrafts: data.failedDrafts.filter(draft => draft.appId !== appId),
      };
    });
    _.set(extension_settings, customAppChatDataField, envelope);
    chatDomain.rehydrateFromSettings();
  }

  function rehydrateFromSettings() {
    definitionSettings.value = parsePrettified(
      CustomAppDefinitionsSettingsSchema,
      _.get(extension_settings, customAppDefinitionsField, {}),
    );
    globalData.value = parsePrettified(
      CustomAppContentDataSchema,
      _.get(extension_settings, customAppGlobalDataField, {}),
    );
    chatDomain.rehydrateFromSettings();
    touchCustomAppCatalog();
  }

  return {
    chatData: chatDomain.data,
    createDefinition,
    createEntry,
    createFailedDraft,
    definitions,
    deleteDefinition,
    deleteEntry,
    deleteFailedDraft,
    duplicateDefinition,
    getDefinition,
    getEntries,
    getEntry,
    getFailedDraft,
    getFailedDrafts,
    globalData,
    rehydrateFromSettings,
    recordConversion,
    resetCurrentScope: chatDomain.resetCurrentScope,
    saveDefinition,
    scopeKey: chatDomain.scopeKey,
    switchScope: chatDomain.switchScope,
    toggleFavorite,
    updateEntry,
    updateFailedDraft,
  };
});
