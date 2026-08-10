import CustomAppHost from './CustomAppHost.vue';
import {
  customAppAccent,
  customAppChatDataField,
  customAppGlobalDataField,
  CustomAppContentDataSchema,
  readCustomAppDefinitionsSnapshot,
  type CustomAppEntry,
} from './schema';
import { useCustomAppsStore } from './store';
import { simpleXmlOutput } from '@/apps/outputDefinitions';
import { createCustomAppGenerationAdapter } from './generation';
import {
  definePhoneApp,
  type PhoneAppModule,
  type PhoneContentConversionSource,
  type PhoneContentOverview,
  type PhoneContentStatsContribution,
  type PhoneReferenceTreeNode,
} from '@/core/appRegistry';
import { registerRegexTargetProvider } from '@/core/regexTargetRegistry';
import { readChatScopedEnvelope } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { parsePrettified } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

registerRegexTargetProvider(() =>
  readCustomAppDefinitionsSnapshot().map(definition => ({
    appId: definition.id,
    fields: ['title', 'content'],
    id: definition.id,
    label: definition.name,
    operations: ['extract', 'replace'],
  })),
);

function createReferenceTree(appId: string, appName: string): PhoneReferenceTreeNode {
  const customApps = useCustomAppsStore();
  return {
    id: `app:${appId}`,
    kind: 'branch',
    label: appName,
    children: customApps.getEntries(appId).map(entry => ({
      id: `${appId}:${entry.id}`,
      kind: 'leaf',
      item: {
        id: `${appId}:${entry.id}`,
        title: entry.title,
        content: entry.content,
        sourcePath: [appName],
        updatedAt: entry.updatedAt,
        timeLabel: entry.sourceLabel || undefined,
      },
    })),
  };
}

function createOverview(entries: CustomAppEntry[], scopeCount: number): PhoneContentOverview {
  const chars = entries.reduce((sum, entry) => sum + entry.content.length, 0);
  return {
    averageChars: entries.length ? Math.round(chars / entries.length) : 0,
    chars,
    collections: entries.length ? 1 : 0,
    items: entries.length,
    latestUpdatedAt: entries.reduce(
      (latest, entry) => (entry.updatedAt.localeCompare(latest) > 0 ? entry.updatedAt : latest),
      '',
    ),
    scopeCount,
  };
}

function conversionContent(source: PhoneContentConversionSource, preserveFrontend: boolean) {
  if (preserveFrontend || source.displayMode !== 'frontend') return source.content.trim();
  const document = new DOMParser().parseFromString(source.content, 'text/html');
  return document.body.textContent?.trim() || source.content.trim();
}

function createContentStats(
  definition: ReturnType<typeof readCustomAppDefinitionsSnapshot>[number],
  currentScopeKey: string,
): PhoneContentStatsContribution {
  let currentEntries: CustomAppEntry[] = [];
  const allEntries: CustomAppEntry[] = [];
  const scopeKeys: string[] = [];
  if (definition.dataScope === 'global') {
    const data = parsePrettified(CustomAppContentDataSchema, _.get(extension_settings, customAppGlobalDataField, {}));
    currentEntries = data.entries.filter(entry => entry.appId === definition.id);
    allEntries.push(...currentEntries);
    if (currentEntries.length) scopeKeys.push('global');
  } else {
    const envelope = readChatScopedEnvelope(customAppChatDataField, currentScopeKey);
    Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
      const data = parsePrettified(CustomAppContentDataSchema, raw);
      const entries = data.entries.filter(entry => entry.appId === definition.id);
      if (!entries.length) return;
      if (scopeKey === currentScopeKey) currentEntries = entries;
      allEntries.push(...entries);
      scopeKeys.push(scopeKey);
    });
  }
  const current = createOverview(currentEntries, currentEntries.length ? 1 : 0);
  const overview = createOverview(allEntries, scopeKeys.length);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: definition.name,
      id: definition.id,
      itemLabel: '条',
      label: definition.name,
    },
    overview,
    scopeKeys,
    warnings: [],
  };
}

export function createCustomAppRuntimeModules(): PhoneAppModule[] {
  return readCustomAppDefinitionsSnapshot().map((definition, index) =>
    definePhoneApp({
      id: definition.id,
      name: definition.name,
      icon: definition.icon,
      description: definition.description || '自制内容 App',
      accent: customAppAccent(definition.id),
      defaultRoute: 'root',
      defaultOrder: 150 + index,
      component: CustomAppHost,
      contentSourceProvider: () => {
        const customApps = useCustomAppsStore();
        return customApps.getEntries(definition.id).map(entry => ({
          appId: definition.id,
          appName: definition.name,
          content: entry.content,
          displayMode: definition.display.mode,
          entryId: entry.id,
          sourceFloorEnd: entry.sourceFloorEnd,
          sourceLabel: entry.sourceLabel || definition.name,
          tags: [...entry.tags],
          title: entry.title,
        }));
      },
      contentReceiver: {
        scope: definition.dataScope,
        batchModes: ['separate', 'merge'],
        createDraft: () => ({}),
        fields: () => [],
        receive: context => {
          const customApps = useCustomAppsStore();
          const created = context.sources.map(source =>
            customApps.createEntry(definition.id, {
              content: conversionContent(source, definition.display.mode === 'frontend'),
              directoryOrder: source.sourceFloorEnd,
              sourceFloorEnd: source.sourceFloorEnd,
              sourceLabel: `${source.appName}转换`,
              sourceText: source.content,
              tags: source.tags,
              title: source.title || '未命名条目',
            }),
          );
          const first = created[0];
          return {
            count: created.length,
            itemIds: created.map(entry => entry.id),
            message: `已转换 ${created.length} 条${definition.name}内容`,
            openRoute:
              first && created.length === 1
                ? { page: 'entry', params: { entryId: first.id }, title: first.title }
                : { page: 'root', title: definition.name },
          };
        },
      },
      contentStatsProvider: currentScopeKey => createContentStats(definition, currentScopeKey),
      tutorialGuideRequired: false,
      favoriteProvider: () => {
        const customApps = useCustomAppsStore();
        const phone = usePhoneStore();
        return customApps
          .getEntries(definition.id)
          .filter(entry => entry.favorite)
          .map(entry => ({
            key: `${definition.id}:${entry.id}`,
            appId: definition.id,
            entryId: entry.id,
            title: entry.title,
            preview: entry.content.slice(0, 120),
            bookTitle: definition.name,
            subtitle: entry.sourceLabel || '自制内容',
            updatedAt: entry.updatedAt,
            exists: () => Boolean(customApps.getEntry(definition.id, entry.id)),
            open: () => phone.pushRoute(definition.id, 'entry', entry.title, { entryId: entry.id }, 'favorites'),
            removeFavorite: () => customApps.toggleFavorite(definition.id, entry.id),
          }));
      },
      generationProvider: definition.creation.generate
        ? () => [
            {
              actionId: 'generate',
              label: `生成${definition.name}`,
              createAdapter: () => createCustomAppGenerationAdapter(definition, useCustomAppsStore()),
            },
          ]
        : undefined,
      promptDefinitions: definition.creation.generate
        ? [
            {
              key: definition.id,
              label: definition.name,
              defaultPrompt: definition.generation.defaultAppPrompt,
              outputFormats: [
                simpleXmlOutput(
                  `${definition.id}.generate`,
                  `${definition.name}输出`,
                  [
                    '请只输出一个完整 XML，不要输出 XML 之外的解释。',
                    '<result>',
                    '  <title>标题</title>',
                    '  <content>正文</content>',
                    '</result>',
                  ].join('\n'),
                ),
              ],
            },
          ]
        : [],
      referenceProvider: definition.referenceEnabled
        ? () => createReferenceTree(definition.id, definition.name)
        : undefined,
      taskTemplateDefinitions: definition.creation.generate
        ? [
            {
              actionId: 'generate',
              label: `生成${definition.name}`,
              defaultTemplate: definition.generation.defaultTaskTemplate,
              variables: [{ key: 'appName', label: '自制 App 名称' }],
            },
          ]
        : [],
    }),
  );
}
