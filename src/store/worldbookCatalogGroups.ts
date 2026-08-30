// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

type WorldbookCatalogGroupSettings = {
  bookAssignments: Record<string, string>;
  bookGroups: string[];
  entryAssignments: Record<string, Record<string, string>>;
  entryGroups: Record<string, string[]>;
  entryGroupModes: Record<string, Record<string, WorldbookEntryGroupSelectionMode>>;
};

export type WorldbookEntryGroupSelectionMode = 'multiple' | 'single';

const field = 'sillytavern_phone_worldbook_catalog_groups';

function readSettings(): WorldbookCatalogGroupSettings {
  const raw = _.get(extension_settings, field, {}) as Partial<WorldbookCatalogGroupSettings>;
  return {
    bookAssignments: raw.bookAssignments && typeof raw.bookAssignments === 'object' ? { ...raw.bookAssignments } : {},
    bookGroups: Array.isArray(raw.bookGroups) ? raw.bookGroups.map(String).filter(Boolean) : [],
    entryAssignments:
      raw.entryAssignments && typeof raw.entryAssignments === 'object' ? structuredClone(raw.entryAssignments) : {},
    entryGroups: raw.entryGroups && typeof raw.entryGroups === 'object' ? structuredClone(raw.entryGroups) : {},
    entryGroupModes:
      raw.entryGroupModes && typeof raw.entryGroupModes === 'object' ? structuredClone(raw.entryGroupModes) : {},
  };
}

export const useWorldbookCatalogGroupStore = defineStore('worldbookCatalogGroups', () => {
  const settings = ref(readSettings());

  function persist() {
    _.set(extension_settings, field, settings.value);
    void saveSettingsDebounced();
  }

  function normalizedGroup(requestedGroup: string) {
    const group = requestedGroup.trim();
    return !group || group === '-' ? '' : group;
  }

  function bookGroupOf(bookName: string) {
    return settings.value.bookAssignments[bookName] || '';
  }

  function assignBook(bookName: string, requestedGroup: string) {
    const group = normalizedGroup(requestedGroup);
    if (!group) delete settings.value.bookAssignments[bookName];
    else {
      if (!settings.value.bookGroups.includes(group)) settings.value.bookGroups.push(group);
      settings.value.bookAssignments[bookName] = group;
    }
    persist();
  }

  function createBookGroup(name: string) {
    const group = name.trim();
    if (group && !settings.value.bookGroups.includes(group)) {
      settings.value.bookGroups.push(group);
      persist();
    }
  }

  function entryGroupOf(bookName: string, uid: number) {
    return settings.value.entryAssignments[bookName]?.[String(uid)] || '';
  }

  function assignEntry(bookName: string, uid: number, requestedGroup: string) {
    const group = normalizedGroup(requestedGroup);
    const assignments = (settings.value.entryAssignments[bookName] ??= {});
    if (!group) delete assignments[String(uid)];
    else {
      const groups = (settings.value.entryGroups[bookName] ??= []);
      if (!groups.includes(group)) groups.push(group);
      assignments[String(uid)] = group;
    }
    persist();
  }

  function createEntryGroup(bookName: string, name: string) {
    const group = name.trim();
    const groups = (settings.value.entryGroups[bookName] ??= []);
    if (group && !groups.includes(group)) {
      groups.push(group);
      persist();
    }
  }

  function entryGroupMode(bookName: string, groupName: string): WorldbookEntryGroupSelectionMode {
    return settings.value.entryGroupModes[bookName]?.[groupName] === 'single' ? 'single' : 'multiple';
  }

  function setEntryGroupMode(bookName: string, groupName: string, mode: WorldbookEntryGroupSelectionMode) {
    const modes = (settings.value.entryGroupModes[bookName] ??= {});
    modes[groupName] = mode;
    persist();
  }

  function copyEntryGroup(bookName: string, sourceUid: number, targetUid: number) {
    const group = entryGroupOf(bookName, sourceUid);
    if (group) assignEntry(bookName, targetUid, group);
  }

  function removeEntry(bookName: string, uid: number) {
    const assignments = settings.value.entryAssignments[bookName];
    if (!assignments?.[String(uid)]) return;
    delete assignments[String(uid)];
    persist();
  }

  function migrateBook(oldName: string, newName: string) {
    const bookGroup = settings.value.bookAssignments[oldName];
    if (bookGroup) settings.value.bookAssignments[newName] = bookGroup;
    delete settings.value.bookAssignments[oldName];
    if (settings.value.entryGroups[oldName]) settings.value.entryGroups[newName] = settings.value.entryGroups[oldName];
    if (settings.value.entryGroupModes[oldName]) {
      settings.value.entryGroupModes[newName] = settings.value.entryGroupModes[oldName];
    }
    if (settings.value.entryAssignments[oldName]) {
      settings.value.entryAssignments[newName] = settings.value.entryAssignments[oldName];
    }
    delete settings.value.entryGroups[oldName];
    delete settings.value.entryGroupModes[oldName];
    delete settings.value.entryAssignments[oldName];
    persist();
  }

  return {
    assignBook,
    assignEntry,
    bookGroupOf,
    bookGroups: computed(() => settings.value.bookGroups),
    copyEntryGroup,
    createBookGroup,
    createEntryGroup,
    entryGroupOf,
    entryGroupMode,
    entryGroups: (bookName: string) => settings.value.entryGroups[bookName] ?? [],
    migrateBook,
    removeEntry,
    setEntryGroupMode,
  };
});
