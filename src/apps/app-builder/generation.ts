import { CustomAppDefinitionSchema, type CustomAppDefinition, type CustomAppEntry } from './schema';
import type { useCustomAppsStore } from './store';
import { SimpleXmlResultSchema, type GenerationAdapter, type SimpleXmlResult } from '@/type/generation';
import { parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { getSourceLastFloor } from '@/util/sourceFloor';

export const CustomAppGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  definition: CustomAppDefinitionSchema,
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type CustomAppGenerateConfig = z.infer<typeof CustomAppGenerateConfigSchema>;

function resolveGeneratedTitle(definition: CustomAppDefinition, result: SimpleXmlResult, index: number, floor?: number) {
  const firstLine = result.content.split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
  if (definition.naming.mode === 'first-line') return firstLine.slice(0, 80) || '未命名条目';
  if (definition.naming.mode === 'template') {
    return definition.naming.template
      .replaceAll('{{appName}}', definition.name)
      .replaceAll('{{index}}', String(index))
      .replaceAll('{{date}}', new Date().toLocaleDateString())
      .replaceAll('{{sourceFloor}}', typeof floor === 'number' ? String(floor) : '')
      .trim() || '未命名条目';
  }
  return result.title.trim() || firstLine.slice(0, 80) || '未命名条目';
}

export function createCustomAppGenerationAdapter(
  definition: CustomAppDefinition,
  customApps: ReturnType<typeof useCustomAppsStore>,
) {
  return {
    appId: definition.id,
    actionId: 'generate',
    configSchema: CustomAppGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: `请为“${config.definition.name}”生成一条可保存内容。`,
        taskTemplateVariables: { appName: config.definition.name },
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput(
        `${definition.id}.generate`,
        raw,
        SimpleXmlResultSchema,
        () => parseSimpleXmlResult(raw, definition.display.mode === 'frontend' ? { preserveContentMarkup: true } : undefined),
      );
    },
    save(result, context) {
      const floor = getSourceLastFloor(context.source);
      const entry = customApps.createEntry(definition.id, {
        title: resolveGeneratedTitle(definition, result, customApps.getEntries(definition.id).length + 1, floor),
        content: result.content,
        directoryOrder: floor,
        sourceFloorEnd: floor,
        sourceLabel: context.source.label,
      });
      return { entityId: entry.id, entry };
    },
  } satisfies GenerationAdapter<CustomAppGenerateConfig, SimpleXmlResult, { entityId: string; entry: CustomAppEntry }>;
}

export function resolveCustomGeneratedTitle(
  definition: CustomAppDefinition,
  result: SimpleXmlResult,
  index: number,
  floor?: number,
) {
  return resolveGeneratedTitle(definition, result, index, floor);
}
