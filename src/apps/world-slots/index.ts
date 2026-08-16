import WorldSlotsApp from './WorldSlotsApp.vue';
import { createWorldSlotsContentReceiver } from '@/apps/contentReceivers';
import { worldSlotsField, WorldSlotsScopeDataSchema, useWorldSlotsStore, type WorldSlot } from './store';
import {
  definePhoneApp,
  type PhoneArchiveDomain,
  type PhoneContentOverview,
  type PhoneContentStatsContribution,
  type PhoneReferenceTreeNode,
} from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { parsePrettified } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { createChatScopedBackupSchema } from '@/type/backup';

function emptyOverview(): PhoneContentOverview {
  return {
    averageChars: 0,
    chars: 0,
    collections: 0,
    items: 0,
    latestUpdatedAt: '',
    scopeCount: 0,
  };
}

function getLatestIso(left: string, right: string) {
  if (!right) return left;
  if (!left) return right;
  return right.localeCompare(left) > 0 ? right : left;
}

function slotContent(slot: WorldSlot) {
  return [`槽位：${slot.title}`, slot.keys.length ? `关键词：${slot.keys.join('、')}` : '', slot.content]
    .filter(Boolean)
    .join('\n');
}

function createWorldSlotsArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = WorldSlotsScopeDataSchema.safeParse(raw).success
    ? WorldSlotsScopeDataSchema.parse(raw)
    : WorldSlotsScopeDataSchema.parse({});
  return {
    appId: 'world-slots',
    label: '世界书槽位',
    collectionLabel: '世界书',
    itemLabel: '槽位',
    collections: data.slots.length ? 1 : 0,
    entries: data.slots.map(slot => ({
      id: slot.id,
      subtitle: slot.worldEntryId === null ? '未同步' : `#${slot.worldEntryId}`,
      title: slot.title,
    })),
    items: data.slots.length,
  };
}

function createOverview(slots: WorldSlot[], scopeCount: number): PhoneContentOverview {
  const chars = slots.reduce((sum, slot) => sum + slot.title.length + slot.content.length, 0);
  const latestUpdatedAt = slots.map(slot => slot.updatedAt).reduce((latest, value) => getLatestIso(latest, value), '');
  return {
    averageChars: slots.length ? Math.round(chars / slots.length) : 0,
    chars,
    collections: slots.length ? 1 : 0,
    items: slots.length,
    latestUpdatedAt,
    scopeCount,
  };
}

function createWorldSlotsContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(worldSlotsField, currentScopeKey);
  const currentData = parsePrettified(WorldSlotsScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const allSlots: WorldSlot[] = [];
  const scopeKeys: string[] = [];
  const warnings: string[] = [];
  let scopeCount = 0;

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(WorldSlotsScopeDataSchema, raw);
      if (!data.slots.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      allSlots.push(...data.slots);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`世界书槽位 ${scopeKey}：${message}`);
    }
  });

  const current = currentData.slots.length ? createOverview(currentData.slots, 1) : emptyOverview();
  const overview = createOverview(allSlots, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '世界书',
      id: 'world-slots',
      itemLabel: '槽位',
      label: '世界书槽位',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createWorldSlotsReferenceTree(): PhoneReferenceTreeNode {
  const worldSlots = useWorldSlotsStore();
  return {
    id: 'app:world-slots',
    kind: 'branch',
    label: '世界书槽位',
    children: worldSlots.slots.map(slot => ({
      id: `world-slots:${slot.id}`,
      kind: 'leaf',
      item: {
        id: `world-slots:${slot.id}`,
        title: slot.title,
        content: slotContent(slot),
        sourcePath: ['世界书槽位'],
        updatedAt: slot.updatedAt,
        timeLabel: slot.worldEntryId === null ? '未同步' : `#${slot.worldEntryId}`,
      },
    })),
  };
}

export default definePhoneApp({
  id: 'world-slots',
  name: '世界书槽位',
  icon: 'fa-book-atlas',
  description: '当前聊天专用世界书条目槽位',
  accent: '#20c997',
  defaultRoute: 'root',
  defaultOrder: 115,
  contentReceiver: createWorldSlotsContentReceiver(),
  archiveProvider: {
    field: worldSlotsField,
    collect: createWorldSlotsArchiveDomain,
  },
  backupDomains: [
    {
      category: 'content',
      key: 'world-slots',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(worldSlotsField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, worldSlotsField, data);
      },
      rehydrateFromSettings: () => useWorldSlotsStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(WorldSlotsScopeDataSchema),
      schemaVersion: 1,
      scope: 'chat',
    },
  ],
  component: WorldSlotsApp,
  contentSourceProvider: () => {
    const worldSlots = useWorldSlotsStore();
    return worldSlots.slots.map(slot => ({
      appId: 'world-slots',
      appName: '世界书槽位',
      content: slot.content,
      displayMode: 'markdown',
      entryId: slot.id,
      sourceLabel: '世界书槽位',
      tags: [...slot.keys],
      title: slot.title,
    }));
  },
  contentStatsProvider: createWorldSlotsContentStats,
  referenceProvider: createWorldSlotsReferenceTree,
  resetCurrentScope: transaction => useWorldSlotsStore().resetCurrentScope(transaction),
  scopeSwitchHandler: scopeKey => useWorldSlotsStore().switchScope(scopeKey),
});
