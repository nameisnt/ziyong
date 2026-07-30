import { textField, xmlParser } from '@/apps/outputDefinitions';
import type { PhoneOutputParserDefinition } from '@/core/appRegistry';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parseConfiguredOutput, parseOutputWithConfig } from '@/util/outputParsing';
import type { useScenePlannerStore } from './store';

export const ScenePlannerGeneratedResultSchema = z.object({
  title: z.string().min(1),
  analysis: z.string().min(1),
  prompt: z.string().min(1),
});
export type ScenePlannerGeneratedResult = z.infer<typeof ScenePlannerGeneratedResultSchema>;

export const ScenePlannerGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  avoidNote: z.string().default(''),
  brief: z.string().min(1),
  outputFormat: z.string(),
  planId: z.string().default(''),
  styleNote: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type ScenePlannerGenerateConfig = z.infer<typeof ScenePlannerGenerateConfigSchema>;

export const scenePlannerOutputParser: PhoneOutputParserDefinition = xmlParser([
  textField('title', '场景标题', 'title', { required: true }),
  textField('analysis', '编排分析', 'analysis', { required: true }),
  textField('prompt', '下一章提示词', 'prompt', { required: true }),
]);

export const scenePlannerOutputFormat = [
  '请只输出一个完整 XML，不要输出 XML 之外的解释。',
  '<result>',
  '  <title>简洁的下一章场景标题</title>',
  '  <analysis>向用户说明核心冲突、人物状态、情绪走向、场景节奏和本章落点</analysis>',
  '  <prompt>可直接交给续写模型的完整下一章提示词；要求写正文，不要写大纲，不要提及本次分析过程</prompt>',
  '</result>',
].join('\n');

function parseWithDefault(raw: string): XmlParseResult<ScenePlannerGeneratedResult> {
  const parsed = parseOutputWithConfig(raw, scenePlannerOutputParser);
  if (!parsed.ok) return { ok: false, raw, warnings: parsed.warnings };
  const validated = ScenePlannerGeneratedResultSchema.safeParse(parsed.data);
  if (!validated.success) {
    return {
      ok: false,
      raw,
      warnings: validated.error.issues.map(issue => `${issue.path.join('.') || '结果'}：${issue.message}`),
    };
  }
  return { data: validated.data, ok: true, raw, warnings: parsed.warnings };
}

export function formatScenePlannerResult(result: ScenePlannerGeneratedResult) {
  return [
    '## 编排分析',
    result.analysis,
    '## 下一章提示词',
    result.prompt,
  ].join('\n\n');
}

export function createScenePlannerGenerationAdapter(planner: ReturnType<typeof useScenePlannerStore>) {
  return {
    appId: 'scene-planner',
    actionId: 'generate',
    configSchema: ScenePlannerGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: [
          '用户剧情想法：',
          config.brief,
          config.styleNote ? `文风与节奏要求：${config.styleNote}` : '',
          config.avoidNote ? `必须避免：${config.avoidNote}` : '',
        ].filter(Boolean).join('\n\n'),
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput(
        'scene-planner.generate',
        raw,
        ScenePlannerGeneratedResultSchema,
        () => parseWithDefault(raw),
      );
    },
    save(result, context) {
      const existing = context.config.planId ? planner.getPlan(context.config.planId) : null;
      const input = {
        analysis: result.analysis,
        avoidNote: context.config.avoidNote,
        brief: context.config.brief,
        prompt: result.prompt,
        status: 'ready' as const,
        styleNote: context.config.styleNote,
        title: result.title,
      };
      if (existing) {
        const updated = planner.updatePlan(existing.id, input);
        if (context.config.userRequirement.trim()) {
          planner.appendTurn(existing.id, 'user', context.config.userRequirement);
        }
        planner.appendTurn(existing.id, 'assistant', result.analysis);
        return updated!;
      }
      return planner.createPlan({
        ...input,
        turns: [
          {
            id: `scene_plan_turn_${Date.now()}`,
            role: 'user',
            content: context.config.brief,
            createdAt: new Date().toISOString(),
          },
          {
            id: `scene_plan_turn_${Date.now()}_assistant`,
            role: 'assistant',
            content: result.analysis,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    },
  } satisfies GenerationAdapter<ScenePlannerGenerateConfig, ScenePlannerGeneratedResult, ReturnType<typeof planner.createPlan>>;
}
