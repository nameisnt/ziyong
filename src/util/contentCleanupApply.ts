import type { ContentCleanupSnapshot, ContentVersionBase } from '@/type/contentVersion';
import { applyRegexDisplayRules } from '@/util/regexDisplay';

/** 按版本里固化的快照清洗正文；没有快照的旧内容原样返回。 */
export function applyContentCleanup(
  content: string,
  snapshot: ContentCleanupSnapshot | undefined,
  enabled = true,
): { content: string; errors: string[] } {
  if (!snapshot?.rules.length || !snapshot.enabled || !enabled) return { content, errors: [] };
  const result = applyRegexDisplayRules(
    content,
    snapshot.rules.map((rule, index) => ({
      enabled: true,
      flags: rule.flags,
      id: `cleanup_${index}`,
      name: '',
      operation: 'replace' as const,
      pattern: rule.find,
      renderMode: rule.renderMode,
      replacement: rule.replace,
    })),
  );
  return { content: result.content, errors: result.errors };
}

/** 清洗后是否还有可引用的正文。 */
export function hasCleanupContent(version: Pick<ContentVersionBase, 'cleanup' | 'content'>) {
  return Boolean(applyContentCleanup(version.content, version.cleanup).content.trim());
}
