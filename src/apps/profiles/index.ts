import ProfilesApp from './ProfilesApp.vue';
import { createProfileGenerationAdapter } from './generation';
import { objectListField, textField, textListField, xmlParser } from '@/apps/outputDefinitions';
import {
  getProfileKindLabel,
  profilesField,
  ProfilesScopeDataSchema,
  useProfilesStore,
  type ProfileEntry,
} from './store';
import {
  definePhoneApp,
  type PhoneArchiveDomain,
  type PhoneContentOverview,
  type PhoneContentStatsContribution,
  type PhoneReferenceTreeNode,
} from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { parsePrettified } from '@/util/zod';
import { getProfileListPreview } from './rendering';
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

function entryContent(entry: ProfileEntry) {
  const table = useProfilesStore().getTable(entry.tableId);
  const enabledColumnIds = new Set((table?.columns ?? []).filter(column => column.enabled).map(column => column.id));
  const fieldLines = (table?.columns ?? [])
    .filter(column => column.enabled && !['title', 'summary', 'tags', 'content'].includes(column.id))
    .map(column => (entry.fields[column.id] ? `${column.label}：${entry.fields[column.id]}` : ''))
    .filter(Boolean);
  return [
    enabledColumnIds.has('summary') && entry.summary ? `摘要：${entry.summary}` : '',
    enabledColumnIds.has('tags') && entry.tags.length ? `标签：${entry.tags.join('、')}` : '',
    ...fieldLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function createProfilesArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = ProfilesScopeDataSchema.safeParse(raw).success
    ? ProfilesScopeDataSchema.parse(raw)
    : ProfilesScopeDataSchema.parse({});
  return {
    appId: 'profiles',
    label: '资料表',
    collectionLabel: '分类',
    itemLabel: '资料',
    collections: new Set(data.entries.map(entry => entry.kind)).size,
    entries: data.entries.map(entry => ({
      id: entry.id,
      subtitle: getProfileKindLabel(entry.kind),
      title: entry.title,
    })),
    items: data.entries.length,
  };
}

function createOverview(entries: ProfileEntry[], scopeCount: number): PhoneContentOverview {
  const chars = entries.reduce(
    (sum, entry) => sum + entry.title.length + entry.summary.length + Object.values(entry.fields).join('').length,
    0,
  );
  const latestUpdatedAt = entries
    .map(entry => entry.updatedAt)
    .reduce((latest, value) => getLatestIso(latest, value), '');
  return {
    averageChars: entries.length ? Math.round(chars / entries.length) : 0,
    chars,
    collections: new Set(entries.map(entry => entry.kind)).size,
    items: entries.length,
    latestUpdatedAt,
    scopeCount,
  };
}

function createProfilesContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(profilesField, currentScopeKey);
  const currentData = parsePrettified(ProfilesScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const allEntries: ProfileEntry[] = [];
  const scopeKeys: string[] = [];
  const warnings: string[] = [];
  let scopeCount = 0;

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(ProfilesScopeDataSchema, raw);
      if (!data.entries.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      allEntries.push(...data.entries);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`资料表 ${scopeKey}：${message}`);
    }
  });

  const current = currentData.entries.length ? createOverview(currentData.entries, 1) : emptyOverview();
  const overview = createOverview(allEntries, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '分类',
      id: 'profiles',
      itemLabel: '条',
      label: '资料表',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createProfilesFavoriteItems() {
  const profiles = useProfilesStore();
  const phone = usePhoneStore();
  return profiles.entries
    .filter(entry => entry.favorite)
    .map(entry => ({
      key: `profiles:${entry.id}`,
      appId: 'profiles',
      entryId: entry.id,
      title: entry.title,
      preview: getProfileListPreview(entry, profiles.getTable(entry.tableId)),
      bookTitle: getProfileKindLabel(entry.kind),
      subtitle: entry.tags.join('、') || getProfileKindLabel(entry.kind),
      updatedAt: entry.updatedAt,
      exists: () => Boolean(profiles.getEntry(entry.id)),
      open: () => phone.pushRoute('profiles', 'entry', entry.title, { entryId: entry.id }, 'favorites'),
      removeFavorite: () => {
        if (profiles.getEntry(entry.id)?.favorite) profiles.toggleFavorite(entry.id);
      },
    }));
}

function createProfilesReferenceTree(): PhoneReferenceTreeNode {
  const profiles = useProfilesStore();
  return {
    id: 'app:profiles',
    kind: 'branch',
    label: '资料表',
    children: profiles.entries.map(entry => ({
      id: `profiles:${entry.id}`,
      kind: 'leaf',
      item: {
        id: `profiles:${entry.id}`,
        title: entry.title,
        content: entryContent(entry),
        sourcePath: ['资料表', getProfileKindLabel(entry.kind)],
        updatedAt: entry.updatedAt,
      },
    })),
  };
}

export default definePhoneApp({
  id: 'profiles',
  name: '资料表',
  icon: 'fa-address-card',
  description: '人物、地点、组织、物品与世界观资料',
  accent: '#4c9aff',
  defaultRoute: 'root',
  defaultOrder: 69,
  archiveProvider: {
    field: profilesField,
    collect: createProfilesArchiveDomain,
  },
  backupDomains: [
    {
      key: 'profiles',
      exportData: currentScopeKey => readChatScopedEnvelope(profilesField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, profilesField, data);
      },
      rehydrateFromSettings: () => useProfilesStore().rehydrateFromSettings(),
    },
  ],
  component: ProfilesApp,
  contentStatsProvider: createProfilesContentStats,
  favoriteProvider: createProfilesFavoriteItems,
  generationProvider: () => [
    {
      actionId: 'generate',
      label: '生成资料卡片',
      createAdapter: () => createProfileGenerationAdapter(useProfilesStore()),
    },
  ],
  taskTemplateDefinitions: [
    {
      actionId: 'generate',
      label: '生成资料卡片',
      defaultTemplate: [
        '目标资料表：{{tableName}}',
        '{{kindInstruction}}',
        '{{fieldInstruction}}',
        '{{titleInstruction}}',
      ].join('\n'),
      variables: [
        { key: 'tableName', label: '资料表名' },
        { key: 'kindInstruction', label: '资料类型要求' },
        { key: 'fieldInstruction', label: '启用字段要求' },
        { key: 'titleInstruction', label: '标题提示' },
      ],
    },
  ],
  promptDefinitions: [
    {
      key: 'profiles',
      label: '资料表',
      defaultPrompt: [
        '你负责根据聊天上下文整理可复用的资料卡片。',
        '资料必须来自上下文中能确认的信息；不确定的信息请明确写成“未知”或不要写。',
        '各字段要结构清楚，适合作为后续世界书、角色设定或剧情资料引用。',
        '不要输出 XML 之外的解释。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'profiles.generate',
          label: '资料卡片输出',
          content: [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '字段值必须基于上下文已确认信息；没有可靠信息时留空。',
            '<result>',
            '  <title>资料标题</title>',
            '  <summary>一句话摘要，可留空</summary>',
            '  <tags>标签1、标签2</tags>',
            '  <fields>',
            '    <field id="字段id">字段值</field>',
            '  </fields>',
            '</result>',
          ].join('\n'),
          parser: xmlParser([
            textField('title', '资料标题', 'title', { required: true }),
            textField('summary', '一句话摘要', 'summary'),
            textListField('tags', '标签', 'tags', '[,，、\\n]'),
            objectListField('fields', '资料字段', 'fields/field', [
              textField('id', '字段 ID', '@id', { required: true }),
              textField('value', '字段值', '#text'),
            ]),
          ]),
        },
      ],
    },
  ],
  referenceProvider: createProfilesReferenceTree,
  resetCurrentScope: () => useProfilesStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useProfilesStore().switchScope(scopeKey),
});
