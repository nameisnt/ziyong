import type {
  PhoneOutputParserDefinition,
  PhoneOutputParserExtraction,
  PhoneOutputParserField,
} from '@/core/appRegistry';
import { usePromptStore } from '@/store/prompts';
import type { XmlParseResult } from '@/type/generation';
import {
  diagnoseTaggedRoot,
  extractJsonOutputCandidates,
  extractTaggedOutputCandidates,
  getIncompleteTaggedRootWarning,
  selectBestParsedCandidate,
  stripOutputCodeFence,
} from '@/util/parseCandidates';
import type { ZodType } from 'zod';

type DeclarativeParseResult =
  | { data: Record<string, unknown>; ok: true; warnings: string[] }
  | { ok: false; warnings: string[] };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractRootBlock(raw: string, rootPath?: string) {
  const normalized = stripOutputCodeFence(raw);
  const root = rootPath?.trim();
  if (!root) return normalized;
  const match = normalized.match(new RegExp(`<${escapeRegExp(root)}(?:\\s[^>]*)?>[\\s\\S]*?</${escapeRegExp(root)}>`, 'i'));
  return match?.[0] || '';
}

function serializeInnerMarkup(element: Element) {
  if (element instanceof HTMLElement) return element.innerHTML.trim();
  const serializer = new XMLSerializer();
  return Array.from(element.childNodes).map(node => serializer.serializeToString(node)).join('').trim();
}

function xmlChildElements(parent: Element, path: string) {
  const segments = path.split('/').map(item => item.trim()).filter(Boolean);
  let current = [parent];
  if (segments[0]?.toLowerCase() === parent.tagName.toLowerCase()) segments.shift();
  segments.forEach(segment => {
    current = current.flatMap(node => Array.from(node.children).filter(child => child.tagName.toLowerCase() === segment.toLowerCase()));
  });
  return current;
}

function readXmlValue(parent: Element, path: string, extraction: PhoneOutputParserExtraction = 'text') {
  const normalized = path.trim();
  if (!normalized || normalized === '#text') return parent.textContent?.trim() || '';
  if (normalized.startsWith('@')) return parent.getAttribute(normalized.slice(1))?.trim() || '';

  const segments = normalized.split('/').map(item => item.trim()).filter(Boolean);
  const tail = segments.at(-1) || '';
  if (tail.startsWith('@')) {
    const ownerPath = segments.slice(0, -1).join('/');
    const owner = ownerPath ? xmlChildElements(parent, ownerPath)[0] : parent;
    return owner?.getAttribute(tail.slice(1))?.trim() || '';
  }

  const element = xmlChildElements(parent, normalized)[0];
  if (!element) return '';
  return extraction === 'markup' ? serializeInnerMarkup(element) : element.textContent?.trim() || '';
}

function splitListValue(value: string, separator?: string) {
  if (!value.trim()) return [];
  if (!separator) return [value.trim()];
  try {
    return value.split(new RegExp(separator, 'g')).map(item => item.trim()).filter(Boolean);
  } catch {
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }
}

function parseXmlFields(
  parent: Element,
  fields: PhoneOutputParserField[],
  errors: string[],
  warnings: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  fields.forEach(field => {
    if (field.kind === 'object-list') {
      const nodes = xmlChildElements(parent, field.defaultPath);
      const values = nodes.map(node => parseXmlFields(node, field.children ?? [], errors, warnings));
      if (field.required && !values.length) {
        errors.push(`缺少必填字段「${field.label}」(<${field.defaultPath}>)`);
      }
      result[field.key] = values;
      return;
    }

    if (field.kind === 'text-list') {
      const nodes = xmlChildElements(parent, field.defaultPath);
      const values = nodes.length > 1
        ? nodes.flatMap(node => splitListValue(node.textContent?.trim() || '', field.separator))
        : splitListValue(nodes[0]?.textContent?.trim() || '', field.separator);
      if (field.required && !values.length) {
        errors.push(`缺少必填字段「${field.label}」(<${field.defaultPath}>)`);
      }
      result[field.key] = values;
      return;
    }

    const nodes = field.defaultPath.startsWith('@') ? [] : xmlChildElements(parent, field.defaultPath);
    if (nodes.length > 1) {
      warnings.push(`字段「${field.label}」出现 ${nodes.length} 次，已取第一个`);
    }
    const value = readXmlValue(parent, field.defaultPath, field.extraction);
    if (field.required && !value) {
      errors.push(`缺少必填字段「${field.label}」(<${field.defaultPath}>)`);
    }
    result[field.key] = value;
  });
  return result;
}

function getJsonPath(source: unknown, path: string) {
  const normalized = path.trim();
  if (!normalized || normalized === '$') return source;
  return normalized
    .replace(/^\$[./]?/, '')
    .split(/[./]/)
    .map(item => item.trim())
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, source);
}

function parseJsonFields(
  source: unknown,
  fields: PhoneOutputParserField[],
  errors: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  fields.forEach(field => {
    const value = getJsonPath(source, field.defaultPath);
    if (field.kind === 'object-list') {
      const items = Array.isArray(value) ? value : [];
      const parsed = items.map(item => parseJsonFields(item, field.children ?? [], errors));
      if (value != null && !Array.isArray(value)) errors.push(`字段「${field.label}」应为列表`);
      if (field.required && !parsed.length) errors.push(`缺少必填字段「${field.label}」(${field.defaultPath})`);
      result[field.key] = parsed;
      return;
    }
    if (field.kind === 'text-list') {
      const items = Array.isArray(value)
        ? value.map(item => String(item ?? '').trim()).filter(Boolean)
        : splitListValue(String(value ?? ''), field.separator);
      if (field.required && !items.length) errors.push(`缺少必填字段「${field.label}」(${field.defaultPath})`);
      result[field.key] = items;
      return;
    }
    const text = value == null ? '' : String(value).trim();
    if (field.required && !text) errors.push(`缺少必填字段「${field.label}」(${field.defaultPath})`);
    result[field.key] = text;
  });
  return result;
}

function parseLabelFields(raw: string, config: PhoneOutputParserDefinition, errors: string[]) {
  const source = config.rootPath ? extractRootBlock(raw, config.rootPath) : stripOutputCodeFence(raw);
  if (!source) {
    errors.push(...(config.rootPath ? diagnoseTaggedRoot(raw, config.rootPath) : ['没有找到可解析文本']));
    return {};
  }

  const positions = config.fields
    .filter(field => field.kind === 'text')
    .map(field => {
      const match = new RegExp(`(?:^|\\n)\\s*${escapeRegExp(field.defaultPath)}\\s*[：:]\\s*`, 'i').exec(source);
      return match
        ? { field, labelStart: match.index, valueStart: match.index + match[0].length }
        : { field, labelStart: -1, valueStart: -1 };
    });
  const found = positions.filter(item => item.valueStart >= 0).sort((left, right) => left.valueStart - right.valueStart);
  const result: Record<string, unknown> = {};
  config.fields.forEach(field => {
    if (field.kind !== 'text') {
      result[field.key] = [];
      return;
    }
    const currentIndex = found.findIndex(item => item.field.key === field.key);
    const position = positions.find(item => item.field.key === field.key);
    const end = currentIndex >= 0 && currentIndex < found.length - 1 ? found[currentIndex + 1]!.labelStart : source.length;
    const value = position && position.valueStart >= 0
      ? source.slice(position.valueStart, end).replace(/<\/[^>]+>\s*$/, '').trim()
      : '';
    if (field.required && !value) {
      errors.push(`缺少必填字段「${field.label}」（应使用“${field.defaultPath}：”）`);
    }
    result[field.key] = value;
  });
  return result;
}

function parseJsonSource(raw: string) {
  const normalized = stripOutputCodeFence(raw);
  const objectStart = normalized.indexOf('{');
  const arrayStart = normalized.indexOf('[');
  const starts = [objectStart, arrayStart].filter(index => index >= 0);
  if (!starts.length) throw new Error('没有找到 JSON 对象或数组');
  const start = Math.min(...starts);
  const end = Math.max(normalized.lastIndexOf('}'), normalized.lastIndexOf(']'));
  if (end < start) throw new Error('JSON 内容不完整');
  return JSON.parse(normalized.slice(start, end + 1)) as unknown;
}

function getOutputCandidates(raw: string, config: PhoneOutputParserDefinition) {
  if (config.kind === 'text') {
    const normalized = stripOutputCodeFence(raw);
    return normalized ? [{ index: 0, raw: normalized }] : [];
  }
  if (config.kind === 'json') return extractJsonOutputCandidates(raw);
  const rootName = config.rootPath?.trim();
  return rootName
    ? extractTaggedOutputCandidates(raw, rootName)
    : [{ index: 0, raw: stripOutputCodeFence(raw) }];
}

function parseSingleOutputWithConfig(raw: string, config: PhoneOutputParserDefinition): DeclarativeParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    let data: Record<string, unknown>;
    if (config.kind === 'xml') {
      const rootBlock = extractRootBlock(raw, config.rootPath || 'result');
      if (!rootBlock) {
        return {
          ok: false,
          warnings: diagnoseTaggedRoot(raw, config.rootPath || 'result'),
        };
      }
      const parser = new DOMParser();
      const document = parser.parseFromString(rootBlock, 'application/xml');
      if (document.querySelector('parsererror')) {
        const htmlDocument = parser.parseFromString(rootBlock, 'text/html');
        const rootTag = (config.rootPath || 'result').toLowerCase();
        const root = Array.from(htmlDocument.body.querySelectorAll('*')).find(item => item.tagName.toLowerCase() === rootTag);
        if (!root) return { ok: false, warnings: ['XML 标签未正确闭合或嵌套，无法识别根节点'] };
        warnings.push('XML 标签未完全闭合或嵌套不规范，已按标签边界兼容解析');
        data = parseXmlFields(root, config.fields, errors, warnings);
      } else {
        data = parseXmlFields(document.documentElement, config.fields, errors, warnings);
      }
    } else if (config.kind === 'json') {
      const source = getJsonPath(parseJsonSource(raw), config.rootPath || '$');
      data = parseJsonFields(source, config.fields, errors);
    } else if (config.kind === 'labels') {
      data = parseLabelFields(raw, config, errors);
    } else {
      const textFields = config.fields.filter(field => field.kind === 'text');
      if (textFields.length !== 1) {
        return { ok: false, warnings: ['纯文本解析只支持一个文本字段'] };
      }
      data = { [textFields[0]!.key]: stripOutputCodeFence(raw) };
      if (textFields[0]!.required && !data[textFields[0]!.key]) {
        errors.push(`缺少必填字段「${textFields[0]!.label}」`);
      }
    }
    return errors.length ? { ok: false, warnings: [...new Set(errors)] } : { data, ok: true, warnings };
  } catch (error) {
    return {
      ok: false,
      warnings: [error instanceof Error ? error.message : '解析失败'],
    };
  }
}

export function parseOutputWithConfig(raw: string, config: PhoneOutputParserDefinition): DeclarativeParseResult {
  if (config.kind === 'text') return parseSingleOutputWithConfig(raw, config);

  const rootName = config.rootPath?.trim();
  const candidates = getOutputCandidates(raw, config);
  const selected = selectBestParsedCandidate(
    raw,
    candidates,
    candidate => {
      const parsed = parseSingleOutputWithConfig(candidate.raw, config);
      return parsed.ok
        ? { data: parsed.data, ok: true, raw: candidate.raw, warnings: parsed.warnings }
        : { ok: false, raw: candidate.raw, warnings: parsed.warnings };
    },
    config.kind === 'json' ? ' JSON ' : ` <${rootName || 'result'}> `,
  );
  if (selected) {
    const incompleteWarning = rootName && config.kind !== 'json'
      ? getIncompleteTaggedRootWarning(raw, rootName, candidates.length)
      : '';
    const warnings = [...new Set([...selected.warnings, incompleteWarning].filter(Boolean))];
    return selected.ok
      ? { data: selected.data as Record<string, unknown>, ok: true, warnings }
      : { ok: false, warnings };
  }

  return parseSingleOutputWithConfig(raw, config);
}

export function parseConfiguredOutput<T>(
  outputId: string,
  raw: string,
  schema: ZodType<T>,
  fallback: () => XmlParseResult<T>,
): XmlParseResult<T> {
  const parser = usePromptStore().resolveOutputParser(outputId);
  if (!parser) return fallback();

  const rootName = parser.rootPath?.trim();
  const candidates = getOutputCandidates(raw, parser);
  const selected = selectBestParsedCandidate(
    raw,
    candidates,
    candidate => {
      const parsed = parseSingleOutputWithConfig(candidate.raw, parser);
      if (!parsed.ok) return { ok: false, raw: candidate.raw, warnings: parsed.warnings };

      const validated = schema.safeParse(parsed.data);
      if (!validated.success) {
        return {
          ok: false,
          raw: candidate.raw,
          warnings: validated.error.issues.map(issue => `${issue.path.join('.') || '结果'}：${issue.message}`),
        };
      }
      return {
        data: validated.data,
        ok: true,
        raw: candidate.raw,
        warnings: parsed.warnings,
      };
    },
    parser.kind === 'json' ? ' JSON ' : ` <${rootName || 'result'}> `,
  );

  if (!selected) {
    const parsed = parseSingleOutputWithConfig(raw, parser);
    if (!parsed.ok) return { ok: false, raw, warnings: parsed.warnings };
    const validated = schema.safeParse(parsed.data);
    if (!validated.success) {
      return {
        ok: false,
        raw,
        warnings: validated.error.issues.map(issue => `${issue.path.join('.') || '结果'}：${issue.message}`),
      };
    }
    return {
      data: validated.data,
      ok: true,
      raw,
      warnings: [...parsed.warnings, '已使用自定义解析规则'],
    };
  }

  const incompleteWarning = rootName && parser.kind !== 'json'
    ? getIncompleteTaggedRootWarning(raw, rootName, candidates.length)
    : '';
  if (selected.ok) {
    return {
      data: selected.data as T,
      ok: true,
      raw: selected.raw,
      warnings: [...new Set([...selected.warnings, incompleteWarning, '已使用自定义解析规则'].filter(Boolean))],
    };
  }
  return {
    ok: false,
    raw: selected.raw,
    warnings: [...new Set([...selected.warnings, incompleteWarning].filter(Boolean))],
  };
}
