import DigestApp from './DigestApp.vue';
import { digestField, DigestScopeDataSchema, useDigestStore, type DigestEntry } from './store';
import { createDigestGenerationAdapter } from './generation';
import { simpleXmlOutput } from '@/apps/outputDefinitions';
import {
  definePhoneApp,
  type PhoneContentOverview,
  type PhoneContentStatsContribution,
  type PhoneReferenceTreeNode,
} from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { parsePrettified } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

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

function createOverview(entries: DigestEntry[], scopeCount: number): PhoneContentOverview {
  const chars = entries.reduce((sum, entry) => sum + entry.content.trim().length, 0);
  return {
    averageChars: entries.length ? Math.round(chars / entries.length) : 0,
    chars,
    collections: entries.length ? 1 : 0,
    items: entries.length,
    latestUpdatedAt: entries.reduce((latest, entry) => getLatestIso(latest, entry.updatedAt), ''),
    scopeCount,
  };
}

function createDigestContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(digestField, currentScopeKey);
  const currentData = parsePrettified(DigestScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const allEntries: DigestEntry[] = [];
  let scopeCount = 0;
  const scopeKeys: string[] = [];
  const warnings: string[] = [];

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(DigestScopeDataSchema, raw);
      if (!data.entries.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      allEntries.push(...data.entries);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`摘抄 ${scopeKey}：${message}`);
    }
  });

  const current = currentData.entries.length ? createOverview(currentData.entries, 1) : emptyOverview();
  const overview = createOverview(allEntries, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '摘抄库',
      id: 'digest',
      itemLabel: '条',
      label: '摘抄',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createDigestFavoriteItems() {
  const digest = useDigestStore();
  const phone = usePhoneStore();
  return digest.entries
    .filter(entry => entry.favorite)
    .map(entry => ({
      key: `digest:${entry.id}`,
      appId: 'digest',
      entryId: entry.id,
      title: entry.title,
      preview: entry.content.slice(0, 120),
      bookTitle: '摘抄',
      subtitle: entry.sourceLabel || (entry.kind === 'ai' ? 'AI 摘抄' : '手动摘抄'),
      updatedAt: entry.updatedAt,
      exists: () => Boolean(digest.getEntry(entry.id)),
      open: () => phone.pushRoute('digest', 'entry', entry.title, { entryId: entry.id }, 'favorites'),
      removeFavorite: () => {
        if (digest.getEntry(entry.id)?.favorite) digest.toggleFavorite(entry.id);
      },
    }));
}

function createDigestReferenceTree(): PhoneReferenceTreeNode {
  const digest = useDigestStore();
  return {
    id: 'app:digest',
    kind: 'branch',
    label: '摘抄',
    children: digest.entries.map(entry => ({
      id: `digest:${entry.id}`,
      kind: 'leaf',
      item: {
        id: `digest:${entry.id}`,
        title: entry.title,
        content: entry.content,
        sourcePath: ['摘抄', entry.sourceLabel || (entry.kind === 'ai' ? 'AI 摘抄' : '手动摘抄')],
        updatedAt: entry.updatedAt,
        timeLabel: entry.sourceLabel || (entry.kind === 'ai' ? 'AI 摘抄' : '手动摘抄'),
      },
    })),
  };
}

export default definePhoneApp({
  id: 'digest',
  name: '摘抄',
  icon: 'fa-highlighter',
  description: '原文摘抄与句段收藏',
  accent: '#3d8bfd',
  defaultRoute: 'root',
  defaultOrder: 65,
  backupDomains: [
    {
      key: 'digests',
      exportData: currentScopeKey => readChatScopedEnvelope(digestField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, digestField, data);
      },
      rehydrateFromSettings: () => useDigestStore().rehydrateFromSettings(),
    },
  ],
  component: DigestApp,
  contentStatsProvider: createDigestContentStats,
  favoriteProvider: createDigestFavoriteItems,
  generationProvider: () => [
    {
      actionId: 'generate',
      label: '生成摘抄',
      createAdapter: () => createDigestGenerationAdapter(useDigestStore()),
    },
  ],
  promptDefinitions: [
    {
      key: 'digest',
      label: '摘抄',
      defaultPrompt: [
        '你负责从聊天内容中挑选值得保存的原文摘抄。',
        'content 必须由来源文本中的原句或连续原文片段组成，可以用换行分隔多段，但不得改写、概括、扩写或替换措辞。',
        'title 可以简短概括摘抄主题，但 content 必须忠实保留文内文字。',
      ].join('\n'),
      outputFormats: [
        simpleXmlOutput(
          'digest.generate',
          '摘抄输出',
          [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '<result>',
            '  <title>摘抄标题</title>',
            '  <content>必须是来源文本中的原句或连续原文片段，不得改写、概括或扩写</content>',
            '</result>',
          ].join('\n'),
        ),
      ],
    },
  ],
  referenceProvider: createDigestReferenceTree,
  resetCurrentScope: () => useDigestStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useDigestStore().switchScope(scopeKey),
});
