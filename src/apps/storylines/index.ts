import StorylinesApp from './StorylinesApp.vue';
import { createStorylinesContentReceiver } from '@/apps/contentReceivers';
import { createStorylineGenerationAdapter, storylineOutputFormat, storylineOutputParser } from './generation';
import {
  getBeatStatusLabel,
  getForeshadowStatusLabel,
  getStorylineKindLabel,
  getStorylineStatusLabel,
  storylinesField,
  StorylinesScopeDataSchema,
  useStorylinesStore,
  type Foreshadow,
  type Storyline,
  type StorylinesScopeData,
} from './store';
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

function lineContent(line: Storyline, data: StorylinesScopeData) {
  const beats = data.beats
    .filter(beat => beat.lineId === line.id)
    .sort((left, right) => left.order - right.order)
    .map(beat => `- ${beat.title}（${getBeatStatusLabel(beat.status)}）：${beat.summary}`.trim());
  const hooks = data.hooks
    .filter(hook => hook.lineId === line.id)
    .map(
      hook =>
        `- ${hook.title}（${getForeshadowStatusLabel(hook.status)}）：埋设 ${hook.seed || '未写'}；回收 ${hook.payoff || '未写'}`,
    );
  return [
    `剧情线：${line.title}`,
    `类型：${getStorylineKindLabel(line.kind)} / 状态：${getStorylineStatusLabel(line.status)}`,
    line.summary ? `概述：${line.summary}` : '',
    line.goal ? `目标：${line.goal}` : '',
    line.stakes ? `风险与代价：${line.stakes}` : '',
    line.tags.length ? `标签：${line.tags.join('、')}` : '',
    beats.length ? ['节点', ...beats].join('\n') : '',
    hooks.length ? ['伏笔', ...hooks].join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function hookContent(hook: Foreshadow, data: StorylinesScopeData) {
  const line = data.lines.find(item => item.id === hook.lineId);
  return [
    `伏笔：${hook.title}`,
    `状态：${getForeshadowStatusLabel(hook.status)}`,
    line ? `所属剧情线：${line.title}` : '',
    hook.seed ? `埋设：${hook.seed}` : '',
    hook.payoff ? `回收：${hook.payoff}` : '',
    hook.tags.length ? `标签：${hook.tags.join('、')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function createStorylinesArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = StorylinesScopeDataSchema.safeParse(raw).success
    ? StorylinesScopeDataSchema.parse(raw)
    : StorylinesScopeDataSchema.parse({});
  return {
    appId: 'storylines',
    label: '剧情线',
    collectionLabel: '剧情线',
    itemLabel: '节点/伏笔',
    collections: data.lines.length,
    entries: [
      ...data.lines.map(line => ({
        id: line.id,
        subtitle: `${getStorylineKindLabel(line.kind)} · ${getStorylineStatusLabel(line.status)}`,
        title: line.title,
      })),
      ...data.hooks.map(hook => ({
        id: hook.id,
        subtitle: `伏笔 · ${getForeshadowStatusLabel(hook.status)}`,
        title: hook.title,
      })),
    ],
    items: data.lines.length + data.beats.length + data.hooks.length,
  };
}

function createOverview(data: StorylinesScopeData, scopeCount: number): PhoneContentOverview {
  const chars = [
    ...data.lines.map(line => line.title + line.summary + line.goal + line.stakes),
    ...data.beats.map(beat => beat.title + beat.summary),
    ...data.hooks.map(hook => hook.title + hook.seed + hook.payoff),
  ].reduce((sum, text) => sum + text.length, 0);
  const latestUpdatedAt = [
    ...data.lines.map(line => line.updatedAt),
    ...data.beats.map(beat => beat.updatedAt),
    ...data.hooks.map(hook => hook.updatedAt),
  ].reduce((latest, value) => getLatestIso(latest, value), '');
  return {
    averageChars:
      data.lines.length + data.beats.length + data.hooks.length
        ? Math.round(chars / (data.lines.length + data.beats.length + data.hooks.length))
        : 0,
    chars,
    collections: data.lines.length,
    items: data.lines.length + data.beats.length + data.hooks.length,
    latestUpdatedAt,
    scopeCount,
  };
}

function createStorylinesContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(storylinesField, currentScopeKey);
  const currentData = parsePrettified(StorylinesScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const merged: StorylinesScopeData = { beats: [], failedDrafts: [], hooks: [], lines: [] };
  const scopeKeys: string[] = [];
  const warnings: string[] = [];
  let scopeCount = 0;

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(StorylinesScopeDataSchema, raw);
      if (!data.lines.length && !data.beats.length && !data.hooks.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      merged.lines.push(...data.lines);
      merged.beats.push(...data.beats);
      merged.hooks.push(...data.hooks);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`剧情线 ${scopeKey}：${message}`);
    }
  });

  const current =
    currentData.lines.length || currentData.beats.length || currentData.hooks.length
      ? createOverview(currentData, 1)
      : emptyOverview();
  const overview = createOverview(merged, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '剧情线',
      id: 'storylines',
      itemLabel: '项',
      label: '剧情线',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createStorylinesReferenceTree(): PhoneReferenceTreeNode {
  const storylines = useStorylinesStore();
  return {
    id: 'app:storylines',
    kind: 'branch',
    label: '剧情线',
    children: [
      ...storylines.lines.map(line => ({
        id: `storylines:${line.id}`,
        kind: 'leaf' as const,
        item: {
          id: `storylines:${line.id}`,
          title: line.title,
          content: lineContent(line, storylines.data),
          sourcePath: ['剧情线', getStorylineKindLabel(line.kind)],
          updatedAt: line.updatedAt,
          timeLabel: getStorylineStatusLabel(line.status),
        },
      })),
      ...storylines.hooks.map(hook => ({
        id: `storylines-hook:${hook.id}`,
        kind: 'leaf' as const,
        item: {
          id: `storylines-hook:${hook.id}`,
          title: hook.title,
          content: hookContent(hook, storylines.data),
          sourcePath: ['伏笔板', getForeshadowStatusLabel(hook.status)],
          updatedAt: hook.updatedAt,
          timeLabel: getForeshadowStatusLabel(hook.status),
        },
      })),
    ],
  };
}

export default definePhoneApp({
  id: 'storylines',
  name: '剧情梳理',
  icon: 'fa-route',
  description: '从已有总结提炼剧情线、节点与伏笔',
  accent: '#ff7a59',
  defaultRoute: 'root',
  defaultOrder: 67,
  contentReceiver: createStorylinesContentReceiver(),
  archiveProvider: {
    field: storylinesField,
    collect: createStorylinesArchiveDomain,
  },
  backupDomains: [
    {
      category: 'content',
      key: 'storylines',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(storylinesField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, storylinesField, data);
      },
      migrateImport: data => data,
      rehydrateFromSettings: () => useStorylinesStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(StorylinesScopeDataSchema),
      schemaVersion: 2,
      scope: 'chat',
    },
  ],
  component: StorylinesApp,
  contentStatsProvider: createStorylinesContentStats,
  generationProvider: () => [
    {
      actionId: 'extract',
      label: '梳理剧情',
      createAdapter: () => createStorylineGenerationAdapter(useStorylinesStore()),
    },
  ],
  generationRecoveryProvider: scopeKey => {
    const store = useStorylinesStore();
    if (store.scopeKey !== scopeKey) return [];
    return store.failedDrafts.map(draft => ({ appId: 'storylines', id: draft.id, kind: 'failed-draft' as const, routePage: 'failed-draft', routeParams: { draftId: draft.id }, scopeKey, title: typeof draft.context.title === 'string' ? draft.context.title : '待修复生成草稿' }));
  },
  taskTemplateDefinitions: [
    {
      actionId: 'extract',
      label: '梳理剧情',
      defaultTemplate: '从来源楼层与引用的已有总结中提取剧情线、已发生节点和伏笔状态。合并同一事件的不同表述。',
    },
  ],
  promptDefinitions: [
    {
      key: 'storylines',
      label: '剧情梳理',
      defaultPrompt: [
        '你负责把已有剧情总结整理成可持续更新的剧情线。',
        '只记录来源中已经发生或明确确认的信息，不要虚构未来剧情。',
        '区分主线、支线、人物线、关系线与谜团线，并按发生顺序排列节点。',
        '伏笔状态必须依据来源判断，不确定时保守标记。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'storylines.extract',
          label: '剧情梳理',
          content: storylineOutputFormat,
          parser: storylineOutputParser,
        },
      ],
    },
  ],
  referenceProvider: createStorylinesReferenceTree,
  resetCurrentScope: () => useStorylinesStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useStorylinesStore().switchScope(scopeKey),
});
