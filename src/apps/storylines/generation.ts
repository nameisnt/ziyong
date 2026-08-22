import { objectListField, textField, textListField, xmlParser } from '@/apps/outputDefinitions';
import type { PhoneOutputParserDefinition } from '@/core/appRegistry';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parseConfiguredOutput, parseOutputWithConfig } from '@/util/outputParsing';
import {
  ForeshadowStatusSchema,
  StorylineBeatStatusSchema,
  StorylineKindSchema,
  StorylineStatusSchema,
  type useStorylinesStore,
} from './store';

export const StorylineGeneratedBeatSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(''),
  status: StorylineBeatStatusSchema.catch('done'),
});

export const StorylineGeneratedHookSchema = z.object({
  title: z.string().min(1),
  seed: z.string().default(''),
  payoff: z.string().default(''),
  status: ForeshadowStatusSchema.catch('seeded'),
  tags: z.array(z.string()).default([]),
});

export const StorylineGeneratedLineSchema = z.object({
  title: z.string().min(1),
  kind: StorylineKindSchema.catch('branch'),
  status: StorylineStatusSchema.catch('active'),
  summary: z.string().default(''),
  goal: z.string().default(''),
  stakes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  beats: z.array(StorylineGeneratedBeatSchema).default([]),
  hooks: z.array(StorylineGeneratedHookSchema).default([]),
});

export const StorylineGeneratedResultSchema = z.object({
  lines: z.array(StorylineGeneratedLineSchema).min(1),
});
export type StorylineGeneratedResult = z.infer<typeof StorylineGeneratedResultSchema>;

export const StorylineGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type StorylineGenerateConfig = z.infer<typeof StorylineGenerateConfigSchema>;

export const storylineOutputParser: PhoneOutputParserDefinition = xmlParser([
  objectListField(
    'lines',
    '剧情线',
    'line',
    [
      textField('title', '标题', 'title', { required: true }),
      textField('kind', '类型', 'kind'),
      textField('status', '状态', 'status'),
      textField('summary', '概述', 'summary'),
      textField('goal', '当前目标', 'goal'),
      textField('stakes', '风险与代价', 'stakes'),
      textListField('tags', '标签', 'tags', '[,，、\\n]'),
      objectListField('beats', '剧情节点', 'beat', [
        textField('title', '节点标题', 'title', { required: true }),
        textField('summary', '节点概述', 'summary'),
        textField('status', '节点状态', 'status'),
      ]),
      objectListField('hooks', '伏笔', 'hook', [
        textField('title', '伏笔标题', 'title', { required: true }),
        textField('seed', '埋设内容', 'seed'),
        textField('payoff', '回收情况', 'payoff'),
        textField('status', '伏笔状态', 'status'),
        textListField('tags', '伏笔标签', 'tags', '[,，、\\n]'),
      ]),
    ],
    true,
  ),
]);

export const storylineOutputFormat = [
  '请只输出一个完整 XML，不要输出 XML 之外的解释。',
  '根据已有剧情总结梳理已经发生的剧情，不要把未来猜测写成既成事实。',
  'kind 只能是 main、branch、character、relationship、mystery。',
  'line status 只能是 active、paused、resolved、archived。',
  'beat status 只能是 done、current、skipped。',
  'hook status 只能是 seeded、developing、ready、resolved、dropped。',
  '<result>',
  '  <line>',
  '    <title>剧情线标题</title>',
  '    <kind>main</kind>',
  '    <status>active</status>',
  '    <summary>这条剧情线目前为止的完整脉络</summary>',
  '    <goal>尚未完成时的当前目标，已完成可留空</goal>',
  '    <stakes>风险、代价或关键约束</stakes>',
  '    <tags>标签1、标签2</tags>',
  '    <beat>',
  '      <title>按发生顺序排列的节点标题</title>',
  '      <summary>节点发生了什么及造成的变化</summary>',
  '      <status>done</status>',
  '    </beat>',
  '    <hook>',
  '      <title>伏笔标题</title>',
  '      <seed>伏笔如何埋下</seed>',
  '      <payoff>当前回收情况或可能指向；不确定时留空</payoff>',
  '      <status>seeded</status>',
  '      <tags>标签1、标签2</tags>',
  '    </hook>',
  '  </line>',
  '</result>',
].join('\n');

function parseWithDefault(raw: string): XmlParseResult<StorylineGeneratedResult> {
  const parsed = parseOutputWithConfig(raw, storylineOutputParser);
  if (!parsed.ok) return { ok: false, raw, warnings: parsed.warnings };
  const validated = StorylineGeneratedResultSchema.safeParse(parsed.data);
  if (!validated.success) {
    return {
      ok: false,
      raw,
      warnings: validated.error.issues.map(issue => `${issue.path.join('.') || '结果'}：${issue.message}`),
    };
  }
  return { data: validated.data, ok: true, raw, warnings: parsed.warnings };
}

function normalizedTitle(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function formatStorylineResult(result: StorylineGeneratedResult) {
  return result.lines
    .map(line => {
      const beats = line.beats.map((beat, index) => `${index + 1}. ${beat.title}：${beat.summary}`).join('\n');
      const hooks = line.hooks
        .map(hook => `- ${hook.title}：${hook.seed}${hook.payoff ? `；回收：${hook.payoff}` : ''}`)
        .join('\n');
      return [
        `## ${line.title}`,
        `${line.kind} / ${line.status}`,
        line.summary,
        line.goal ? `**当前目标：** ${line.goal}` : '',
        line.stakes ? `**风险与代价：** ${line.stakes}` : '',
        beats ? `### 剧情节点\n${beats}` : '',
        hooks ? `### 伏笔\n${hooks}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    })
    .join('\n\n');
}

export function createStorylineGenerationAdapter(storylines: ReturnType<typeof useStorylinesStore>) {
  return {
    appId: 'storylines',
    actionId: 'extract',
    configSchema: StorylineGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: '从来源楼层与引用的已有总结中提取剧情线、已发生节点和伏笔状态。合并同一事件的不同表述。',
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput('storylines.extract', raw, StorylineGeneratedResultSchema, () =>
        parseWithDefault(raw),
      );
    },
    save(result) {
      let beatCount = 0;
      let hookCount = 0;
      result.lines.forEach(generated => {
        const existing = storylines.lines.find(
          line => normalizedTitle(line.title) === normalizedTitle(generated.title),
        );
        const line = existing
          ? storylines.updateLine(existing.id, {
              goal: generated.goal,
              kind: generated.kind,
              relatedProfileIds: existing.relatedProfileIds,
              relatedProfiles: existing.relatedProfiles,
              stakes: generated.stakes,
              status: generated.status,
              summary: generated.summary,
              tags: generated.tags,
              title: generated.title,
            })
          : storylines.createLine({
              goal: generated.goal,
              kind: generated.kind,
              stakes: generated.stakes,
              status: generated.status,
              summary: generated.summary,
              tags: generated.tags,
              title: generated.title,
            });
        if (!line) return;

        generated.beats.forEach((generatedBeat, order) => {
          const existingBeat = storylines.data.beats.find(
            beat => beat.lineId === line.id && normalizedTitle(beat.title) === normalizedTitle(generatedBeat.title),
          );
          if (existingBeat) {
            storylines.updateBeat(existingBeat.id, {
              lineId: line.id,
              order,
              status: generatedBeat.status,
              summary: generatedBeat.summary,
              title: generatedBeat.title,
            });
          } else {
            storylines.createBeat({
              lineId: line.id,
              order,
              status: generatedBeat.status,
              summary: generatedBeat.summary,
              title: generatedBeat.title,
            });
          }
          beatCount += 1;
        });

        generated.hooks.forEach(generatedHook => {
          const existingHook = storylines.data.hooks.find(
            hook => hook.lineId === line.id && normalizedTitle(hook.title) === normalizedTitle(generatedHook.title),
          );
          if (existingHook) {
            storylines.updateHook(existingHook.id, {
              lineId: line.id,
              payoff: generatedHook.payoff,
              relatedProfileIds: existingHook.relatedProfileIds,
              relatedProfiles: existingHook.relatedProfiles,
              seed: generatedHook.seed,
              status: generatedHook.status,
              tags: generatedHook.tags,
              title: generatedHook.title,
            });
          } else {
            storylines.createHook({
              lineId: line.id,
              payoff: generatedHook.payoff,
              seed: generatedHook.seed,
              status: generatedHook.status,
              tags: generatedHook.tags,
              title: generatedHook.title,
            });
          }
          hookCount += 1;
        });
      });
      return {
        beatCount,
        hookCount,
        lineCount: result.lines.length,
      };
    },
  } satisfies GenerationAdapter<
    StorylineGenerateConfig,
    StorylineGeneratedResult,
    { beatCount: number; hookCount: number; lineCount: number }
  >;
}
