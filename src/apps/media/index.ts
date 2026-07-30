import MediaGenerateApp from './MediaGenerateApp.vue';
import { getMediaKindLabel, mediaField, MediaScopeDataSchema, useMediaStore, type MediaEntry } from './store';
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

function emptyOverview(): PhoneContentOverview {
  return { averageChars: 0, chars: 0, collections: 0, items: 0, latestUpdatedAt: '', scopeCount: 0 };
}

function getLatestIso(left: string, right: string) {
  if (!right) return left;
  if (!left) return right;
  return right.localeCompare(left) > 0 ? right : left;
}

function createMediaArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = MediaScopeDataSchema.safeParse(raw).success
    ? MediaScopeDataSchema.parse(raw)
    : MediaScopeDataSchema.parse({});
  return {
    appId: 'media',
    label: '媒体内容',
    collectionLabel: '类型',
    itemLabel: '媒体',
    collections: new Set(data.entries.map(entry => entry.kind)).size,
    entries: data.entries.map(entry => ({ id: entry.id, subtitle: getMediaKindLabel(entry.kind), title: entry.title })),
    items: data.entries.length,
  };
}

function createOverview(entries: MediaEntry[], scopeCount: number): PhoneContentOverview {
  const chars = entries.reduce((sum, entry) => sum + entry.title.length + entry.note.length + entry.url.length, 0);
  return {
    averageChars: entries.length ? Math.round(chars / entries.length) : 0,
    chars,
    collections: new Set(entries.map(entry => entry.kind)).size,
    items: entries.length,
    latestUpdatedAt: entries.map(entry => entry.updatedAt).reduce((latest, value) => getLatestIso(latest, value), ''),
    scopeCount,
  };
}

function createMediaContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(mediaField, currentScopeKey);
  const currentData = parsePrettified(MediaScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const allEntries: MediaEntry[] = [];
  const scopeKeys: string[] = [];
  const warnings: string[] = [];
  let scopeCount = 0;
  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(MediaScopeDataSchema, raw);
      if (!data.entries.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      allEntries.push(...data.entries);
    } catch (caughtError) {
      warnings.push(
        `媒体内容 ${scopeKey}：${caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError)}`,
      );
    }
  });
  const current = currentData.entries.length ? createOverview(currentData.entries, 1) : emptyOverview();
  const overview = createOverview(allEntries, scopeCount);
  return {
    current,
    domain: { ...overview, collectionLabel: '类型', id: 'media', itemLabel: '个', label: '媒体内容' },
    overview,
    scopeKeys,
    warnings,
  };
}

function createMediaReferenceTree(): PhoneReferenceTreeNode {
  const media = useMediaStore();
  return {
    id: 'app:media',
    kind: 'branch',
    label: '媒体内容',
    children: media.entries.map(entry => ({
      id: `media:${entry.id}`,
      kind: 'leaf',
      item: {
        id: `media:${entry.id}`,
        title: entry.title,
        content: [entry.url, entry.note].filter(Boolean).join('\n'),
        sourcePath: ['媒体内容', getMediaKindLabel(entry.kind)],
        updatedAt: entry.updatedAt,
        timeLabel: getMediaKindLabel(entry.kind),
      },
    })),
  };
}

export default definePhoneApp({
  id: 'media',
  name: '媒体生成',
  icon: 'fa-wand-magic-sparkles',
  description: 'ComfyUI 生成并保存媒体',
  accent: '#ff7a00',
  defaultRoute: 'root',
  defaultOrder: 135,
  archiveProvider: { field: mediaField, collect: createMediaArchiveDomain },
  backupDomains: [
    {
      key: 'media',
      exportData: currentScopeKey => readChatScopedEnvelope(mediaField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, mediaField, data);
      },
      rehydrateFromSettings: () => useMediaStore().rehydrateFromSettings(),
    },
  ],
  component: MediaGenerateApp,
  contentStatsProvider: createMediaContentStats,
  referenceProvider: createMediaReferenceTree,
  resetCurrentScope: () => useMediaStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useMediaStore().switchScope(scopeKey),
});
