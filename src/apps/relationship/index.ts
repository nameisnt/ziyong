const RelationshipApp = defineAsyncComponent(() => import('./RelationshipApp.vue'));
import {
  relationshipField,
  RelationshipScopeDataSchema,
  useRelationshipStore,
  type RelationshipLink,
  type RelationshipScopeData,
} from './store';
import { createRelationshipGenerationAdapter } from './generation';
import { objectListField, textField, textListField, xmlParser } from '@/apps/outputDefinitions';
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

function getLinkText(scopeData: RelationshipScopeData, link: RelationshipLink) {
  const from = scopeData.characters.find(character => character.id === link.fromId)?.name || '';
  const to = scopeData.characters.find(character => character.id === link.toId)?.name || '';
  if (!from || !to) return '';
  return `${from} 是 ${to} 的 ${link.label}`;
}

function buildRelationshipContent(scopeData: RelationshipScopeData) {
  const characterLine = scopeData.characters.length
    ? `人物：${scopeData.characters.map(character => character.name).join('、')}`
    : '';
  const linkLines = scopeData.links.map(link => getLinkText(scopeData, link)).filter(Boolean);
  return [characterLine, ...linkLines].filter(Boolean).join('\n');
}

function createRelationshipArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = RelationshipScopeDataSchema.safeParse(raw).success
    ? RelationshipScopeDataSchema.parse(raw)
    : RelationshipScopeDataSchema.parse({});
  const characterById = new Map(data.characters.map(character => [character.id, character]));
  const entries = data.links.map(link => {
    const from = characterById.get(link.fromId)?.name || '未知人物';
    const to = characterById.get(link.toId)?.name || '未知人物';
    return {
      id: link.id,
      title: `${from} 是 ${to} 的`,
      subtitle: link.label,
    };
  });
  return {
    appId: 'relationship',
    label: '关系网',
    collectionLabel: '人物',
    itemLabel: '关系',
    collections: data.characters.length,
    entries,
    items: entries.length,
  };
}

function createOverview(scopeData: RelationshipScopeData, scopeCount: number): PhoneContentOverview {
  const content = buildRelationshipContent(scopeData);
  const latestUpdatedAt = [
    ...scopeData.characters.map(character => character.updatedAt),
    ...scopeData.links.map(link => link.updatedAt),
  ].reduce((latest, value) => getLatestIso(latest, value), '');
  return {
    averageChars: scopeData.links.length ? Math.round(content.length / scopeData.links.length) : 0,
    chars: content.length,
    collections: scopeData.characters.length ? 1 : 0,
    items: scopeData.links.length,
    latestUpdatedAt,
    scopeCount,
  };
}

function createRelationshipContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(relationshipField, currentScopeKey);
  const currentData = parsePrettified(RelationshipScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const merged: RelationshipScopeData = {
    characters: [],
    failedDrafts: [],
    links: [],
  };
  let scopeCount = 0;
  const scopeKeys: string[] = [];
  const warnings: string[] = [];

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(RelationshipScopeDataSchema, raw);
      if (!data.characters.length && !data.links.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      merged.characters.push(...data.characters);
      merged.links.push(...data.links);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`关系网 ${scopeKey}：${message}`);
    }
  });

  const current =
    currentData.characters.length || currentData.links.length ? createOverview(currentData, 1) : emptyOverview();
  const overview = createOverview(merged, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '关系网',
      id: 'relationship',
      itemLabel: '条',
      label: '关系网',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createRelationshipReferenceTree(): PhoneReferenceTreeNode {
  const relationship = useRelationshipStore();
  const content = buildRelationshipContent(relationship.data);
  const latestUpdatedAt = [
    ...relationship.data.characters.map(character => character.updatedAt),
    ...relationship.data.links.map(link => link.updatedAt),
  ].reduce((latest, value) => getLatestIso(latest, value), '');
  return {
    id: 'app:relationship',
    kind: 'branch',
    label: '关系网',
    children: content.trim()
      ? [
          {
            id: 'relationship:current',
            kind: 'leaf',
            item: {
              id: 'relationship:current',
              title: '当前关系网',
              content,
              sourcePath: ['关系网'],
              updatedAt: latestUpdatedAt,
              timeLabel: latestUpdatedAt,
            },
          },
        ]
      : [],
  };
}

export default definePhoneApp({
  id: 'relationship',
  name: '关系网',
  icon: 'fa-diagram-project',
  description: '人物之间的单向关系图',
  accent: '#34c759',
  defaultRoute: 'root',
  defaultOrder: 68,
  archiveProvider: {
    field: relationshipField,
    collect: createRelationshipArchiveDomain,
  },
  backupDomains: [
    {
      category: 'content',
      key: 'relationships',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(relationshipField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, relationshipField, data);
      },
      migrateImport: data => data,
      rehydrateFromSettings: () => useRelationshipStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(RelationshipScopeDataSchema),
      schemaVersion: 2,
      scope: 'chat',
    },
  ],
  component: RelationshipApp,
  contentStatsProvider: createRelationshipContentStats,
  generationProvider: () => [
    {
      actionId: 'generate',
      label: '生成关系网',
      createAdapter: () => createRelationshipGenerationAdapter(useRelationshipStore()),
    },
  ],
  generationRecoveryProvider: scopeKey => {
    const store = useRelationshipStore();
    if (store.scopeKey !== scopeKey) return [];
    return store.failedDrafts.map(draft => ({ appId: 'relationship', id: draft.id, kind: 'failed-draft' as const, routePage: 'failed-draft', routeParams: { draftId: draft.id }, scopeKey, title: typeof draft.context.title === 'string' ? draft.context.title : '待修复生成草稿' }));
  },
  taskTemplateDefinitions: [
    {
      actionId: 'generate',
      label: '生成关系网',
      defaultTemplate: '请重点判断以下范围内角色之间的当前单向关系：{{characterScope}}。',
      variables: [
        { key: 'characterScope', label: '关系分析范围' },
        { key: 'characterNames', label: '指定角色名' },
        { key: 'focusInstruction', label: '完整指定角色要求（程序生成）' },
      ],
    },
  ],
  promptDefinitions: [
    {
      key: 'relationship',
      label: '关系网',
      defaultPrompt: [
        '你负责从聊天上下文中识别人物之间的当前单向关系。',
        '每条关系表示“from 是 to 的 label”，例如 from=父亲、to=儿子、label=父亲；反向关系需要另写一条。',
        '只输出上下文中能判断的当前关系；不确定、过期、猜测性的关系不要输出。',
        '关系词要短，优先使用身份、情感、立场或互动关系词。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'relationship.generate',
          label: '关系网输出',
          content: [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '每条 relation 表示“from 是 to 的 label”；如果反向关系也成立，请另写一条 relation。',
            '<result>',
            '  <characters>',
            '    <character>人物名字</character>',
            '  </characters>',
            '  <relations>',
            '    <relation>',
            '      <from>谁</from>',
            '      <to>是谁的</to>',
            '      <label>关系词</label>',
            '    </relation>',
            '  </relations>',
            '</result>',
          ].join('\n'),
          parser: xmlParser([
            textListField('characters', '人物列表', 'characters/character'),
            objectListField('relations', '关系列表', 'relations/relation', [
              textField('from', '关系起点', 'from', { required: true }),
              textField('to', '关系终点', 'to', { required: true }),
              textField('label', '关系名称', 'label', { required: true }),
            ]),
          ]),
        },
      ],
    },
  ],
  referenceProvider: createRelationshipReferenceTree,
  resetCurrentScope: () => useRelationshipStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useRelationshipStore().switchScope(scopeKey),
});
