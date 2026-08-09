import EntryLibraryApp from './EntryLibraryApp.vue';
import { createEntryLibraryContentReceiver } from '@/apps/contentReceivers';
import { entryLibraryField, EntryLibrarySettingsSchema, useEntryLibraryStore } from './store';
import { definePhoneApp, type PhoneReferenceTreeNode } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

function createReferenceTree(): PhoneReferenceTreeNode {
  const library = useEntryLibraryStore();
  return {
    children: library.groups.map(group => ({
      children: library.getGroupItems(group.id).map(item => ({
        id: `entry-library:${item.id}`,
        item: {
          content: item.content,
          id: `entry-library:${item.id}`,
          sourcePath: ['条目库', group.name],
          title: item.title,
          updatedAt: item.updatedAt,
        },
        kind: 'leaf' as const,
      })),
      id: `entry-library-group:${group.id}`,
      kind: 'branch' as const,
      label: group.name,
    })),
    id: 'app:entry-library',
    kind: 'branch',
    label: '条目库',
  };
}

export default definePhoneApp({
  id: 'entry-library',
  name: '条目库',
  icon: 'fa-box-archive',
  description: '收藏并绑定预设或世界书条目',
  accent: '#14a06f',
  defaultRoute: 'root',
  defaultOrder: 118,
  contentReceiver: createEntryLibraryContentReceiver(),
  backupDomains: [
    {
      key: 'entry-library',
      exportData: () => _.get(extension_settings, entryLibraryField, EntryLibrarySettingsSchema.parse({})),
      importData: data => {
        _.set(extension_settings, entryLibraryField, data);
      },
      rehydrateFromSettings: () => useEntryLibraryStore().rehydrateFromSettings(),
    },
  ],
  component: EntryLibraryApp,
  referenceProvider: createReferenceTree,
});
