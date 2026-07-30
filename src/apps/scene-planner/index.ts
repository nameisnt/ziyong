import ScenePlannerApp from './ScenePlannerApp.vue';
import { createScenePlannerGenerationAdapter, scenePlannerOutputFormat, scenePlannerOutputParser } from './generation';
import {
  getScenePlanStatusLabel,
  scenePlannerField,
  ScenePlannerScopeDataSchema,
  useScenePlannerStore,
  type ScenePlan,
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

function planContent(plan: ScenePlan) {
  return [
    `场景：${plan.title}`,
    `状态：${getScenePlanStatusLabel(plan.status)}`,
    plan.brief ? `用户想法：${plan.brief}` : '',
    plan.analysis ? `分析：\n${plan.analysis}` : '',
    plan.prompt ? `下一章提示词：\n${plan.prompt}` : '',
    plan.styleNote ? `文风要求：${plan.styleNote}` : '',
    plan.avoidNote ? `需要避免：${plan.avoidNote}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function createScenePlannerArchiveDomain(raw: unknown): PhoneArchiveDomain {
  const data = ScenePlannerScopeDataSchema.safeParse(raw).success
    ? ScenePlannerScopeDataSchema.parse(raw)
    : ScenePlannerScopeDataSchema.parse({});
  return {
    appId: 'scene-planner',
    label: '场景编排器',
    collectionLabel: '场景',
    itemLabel: '提示词',
    collections: data.plans.length ? 1 : 0,
    entries: data.plans.map(plan => ({
      id: plan.id,
      subtitle: getScenePlanStatusLabel(plan.status),
      title: plan.title,
    })),
    items: data.plans.length,
  };
}

function createOverview(plans: ScenePlan[], scopeCount: number): PhoneContentOverview {
  const chars = plans.reduce(
    (sum, plan) => sum + plan.title.length + plan.brief.length + plan.analysis.length + plan.prompt.length,
    0,
  );
  return {
    averageChars: plans.length ? Math.round(chars / plans.length) : 0,
    chars,
    collections: plans.length ? 1 : 0,
    items: plans.length,
    latestUpdatedAt: plans.reduce((latest, plan) => getLatestIso(latest, plan.updatedAt), ''),
    scopeCount,
  };
}

function createScenePlannerContentStats(currentScopeKey: string): PhoneContentStatsContribution {
  const envelope = readChatScopedEnvelope(scenePlannerField, currentScopeKey);
  const currentData = parsePrettified(ScenePlannerScopeDataSchema, envelope.scopes[currentScopeKey] ?? {});
  const allPlans: ScenePlan[] = [];
  const scopeKeys: string[] = [];
  const warnings: string[] = [];
  let scopeCount = 0;

  Object.entries(envelope.scopes).forEach(([scopeKey, raw]) => {
    try {
      const data = parsePrettified(ScenePlannerScopeDataSchema, raw);
      if (!data.plans.length) return;
      scopeCount += 1;
      scopeKeys.push(scopeKey);
      allPlans.push(...data.plans);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
      warnings.push(`场景编排器 ${scopeKey}：${message}`);
    }
  });

  const current = currentData.plans.length ? createOverview(currentData.plans, 1) : emptyOverview();
  const overview = createOverview(allPlans, scopeCount);
  return {
    current,
    domain: {
      ...overview,
      collectionLabel: '场景',
      id: 'scene-planner',
      itemLabel: '条',
      label: '场景编排器',
    },
    overview,
    scopeKeys,
    warnings,
  };
}

function createScenePlannerReferenceTree(): PhoneReferenceTreeNode {
  const planner = useScenePlannerStore();
  return {
    id: 'app:scene-planner',
    kind: 'branch',
    label: '场景编排器',
    children: planner.plans.map(plan => ({
      id: `scene-planner:${plan.id}`,
      kind: 'leaf',
      item: {
        id: `scene-planner:${plan.id}`,
        title: plan.title,
        content: planContent(plan),
        sourcePath: ['场景编排器', getScenePlanStatusLabel(plan.status)],
        updatedAt: plan.updatedAt,
        timeLabel: getScenePlanStatusLabel(plan.status),
      },
    })),
  };
}

export default definePhoneApp({
  id: 'scene-planner',
  name: '场景编排',
  icon: 'fa-comments',
  description: '沟通剧情想法并整理下一章提示词',
  accent: '#9b5de5',
  defaultRoute: 'root',
  defaultOrder: 66,
  archiveProvider: {
    field: scenePlannerField,
    collect: createScenePlannerArchiveDomain,
  },
  backupDomains: [
    {
      key: 'scene-planner',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(scenePlannerField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, scenePlannerField, data);
      },
      rehydrateFromSettings: () => useScenePlannerStore().rehydrateFromSettings(),
    },
  ],
  component: ScenePlannerApp,
  contentStatsProvider: createScenePlannerContentStats,
  generationProvider: () => [
    {
      actionId: 'generate',
      label: '生成提示词',
      createAdapter: () => createScenePlannerGenerationAdapter(useScenePlannerStore()),
    },
  ],
  promptDefinitions: [
    {
      key: 'scenePlanner',
      label: '场景编排',
      defaultPrompt: [
        '你是与用户沟通下一章写法的场景编排器。',
        '先理解用户提供的前情、人物状态、冲突、地点、情绪和推进目标，再给出简洁可确认的编排分析。',
        '随后生成一份可直接用于续写下一章的完整提示词。',
        '提示词必须要求直接输出正文，不得要求模型输出大纲或解释。',
        '不要替用户把结果插入聊天，只生成可复制内容。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'scene-planner.generate',
          label: '场景提示词',
          content: scenePlannerOutputFormat,
          parser: scenePlannerOutputParser,
        },
      ],
    },
  ],
  referenceProvider: createScenePlannerReferenceTree,
  resetCurrentScope: () => useScenePlannerStore().resetCurrentScope(),
  scopeSwitchHandler: scopeKey => useScenePlannerStore().switchScope(scopeKey),
});
