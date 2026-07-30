import type { RelationshipGeneratedResult, useRelationshipStore } from './store';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parsePrettified } from '@/util/zod';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';

export const RelationshipGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  characterNames: z.string(),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type RelationshipGenerateConfig = z.infer<typeof RelationshipGenerateConfigSchema>;

export const RelationshipGeneratedResultSchema = z
  .object({
    characters: z.array(z.string()).default([]),
    relations: z
      .array(
        z.object({
          from: z.string(),
          label: z.string(),
          to: z.string(),
        }),
      )
      .default([]),
  })
  .refine(result => result.characters.length > 0 || result.relations.length > 0, {
    message: '没有解析到人物或关系',
  });

function getTagCount(raw: string, tagName: string) {
  return raw.match(new RegExp(`<${tagName}(\\s|>)`, 'g'))?.length || 0;
}

function extractFirstResultBlock(raw: string) {
  const start = raw.indexOf('<result');
  if (start === -1) return null;
  const openEnd = raw.indexOf('>', start);
  if (openEnd === -1) return null;
  const close = raw.indexOf('</result>', openEnd + 1);
  if (close === -1) return null;
  return raw.slice(start, close + '</result>'.length);
}

function parseXmlDocument(raw: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(raw, 'application/xml');
  if (document.querySelector('parsererror')) return null;
  return document;
}

function getDirectChildText(parent: Element, tagName: string) {
  const child = Array.from(parent.children).find(item => item.tagName === tagName);
  return child?.textContent?.trim() || '';
}

function createWarnings(raw: string) {
  const warnings: string[] = [];
  const resultCount = getTagCount(raw, 'result');
  if (resultCount > 1) warnings.push(`检测到 ${resultCount} 个 <result>，已只取第一个完整结果`);
  return warnings;
}

function parseRelationshipXmlCandidate(raw: string): XmlParseResult<RelationshipGeneratedResult> {
  const resultBlock = extractFirstResultBlock(raw);
  if (!resultBlock) {
    return {
      ok: false,
      raw,
      warnings: ['没有找到完整的 <result> 输出'],
    };
  }

  const document = parseXmlDocument(resultBlock);
  if (!document) {
    return {
      ok: false,
      raw,
      warnings: ['XML 标签未正确闭合或嵌套，无法解析'],
    };
  }

  const root = document.documentElement;
  const charactersParent = Array.from(root.children).find(item => item.tagName === 'characters');
  const relationsParent = Array.from(root.children).find(item => item.tagName === 'relations');
  const characters = charactersParent
    ? Array.from(charactersParent.children)
        .filter(item => item.tagName === 'character')
        .map(item => item.textContent?.trim() || '')
        .filter(Boolean)
    : [];
  const relationCandidates = relationsParent
    ? Array.from(relationsParent.children).filter(item => item.tagName === 'relation')
    : [];
  const relations = relationCandidates
    .map(item => ({
      from: getDirectChildText(item, 'from'),
      label: getDirectChildText(item, 'label'),
      to: getDirectChildText(item, 'to'),
    }))
    .filter(item => item.from && item.to && item.label);

  if (!characters.length && !relations.length) {
    const warnings = relationCandidates.length
      ? ['关系条目不完整，每条 <relation> 都需要 <from>、<to> 和 <label>']
      : ['没有找到 <characters>/<character> 或 <relations>/<relation> 内容'];
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: [
      ...createWarnings(raw),
      relationCandidates.length > relations.length
        ? `有 ${relationCandidates.length - relations.length} 条关系缺少 from、to 或 label，已忽略`
        : '',
    ].filter(Boolean),
    data: parsePrettified(RelationshipGeneratedResultSchema, {
      characters,
      relations,
    }),
  };
}

export function parseRelationshipXmlResult(raw: string): XmlParseResult<RelationshipGeneratedResult> {
  return parseTaggedOutputCandidates(raw, 'result', parseRelationshipXmlCandidate);
}

export function createRelationshipGenerationAdapter(relationshipStore: ReturnType<typeof useRelationshipStore>) {
  return {
    appId: 'relationship',
    actionId: 'generate',
    configSchema: RelationshipGenerateConfigSchema,
    buildRequest(config) {
      const characterNames = config.characterNames.trim();
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: characterNames ? `请重点判断这些角色之间的当前单向关系：${characterNames}` : '',
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput('relationship.generate', raw, RelationshipGeneratedResultSchema, () =>
        parseRelationshipXmlResult(raw),
      );
    },
    save(result) {
      return relationshipStore.mergeGenerated(result);
    },
  } satisfies GenerationAdapter<
    RelationshipGenerateConfig,
    RelationshipGeneratedResult,
    ReturnType<typeof relationshipStore.mergeGenerated>
  >;
}
