import {
  ContentXmlResultSchema,
  ForumXmlResultSchema,
  ForumRepliesXmlResultSchema,
  GenerationRequestPartsSchema,
  SimpleXmlResultSchema,
  type ContentXmlResult,
  type ForumRepliesXmlResult,
  type ForumXmlResult,
  type GenerationRequestParts,
  type SimpleXmlResult,
  type XmlParseResult,
} from '@/type/generation';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';
import { parsePrettified } from '@/util/zod';

function normalizeSegment(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function getTagCount(raw: string, tagName: string) {
  const matches = raw.match(new RegExp(`<${tagName}(\\s|>)`, 'g'));
  return matches?.length || 0;
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
  if (document.querySelector('parsererror')) {
    return null;
  }
  return document;
}

function getDirectChildText(parent: Element, tagName: string) {
  const child = Array.from(parent.children).find(item => item.tagName === tagName);
  return child?.textContent?.trim() || '';
}

function getDirectChildInnerXml(parent: Element, tagName: string) {
  const child = Array.from(parent.children).find(item => item.tagName === tagName);
  if (!child) return '';
  const serializer = new XMLSerializer();
  return Array.from(child.childNodes)
    .map(node => serializer.serializeToString(node))
    .join('')
    .trim();
}

function extractFirstTagInnerRaw(raw: string, tagName: string) {
  const match = raw.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1]?.trim() || '';
}

function normalizeMarkupText(raw: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(raw, 'text/html');
  return document.body.textContent?.trim() || '';
}

function createWarnings(raw: string) {
  const warnings: string[] = [];
  const resultCount = getTagCount(raw, 'result');
  if (resultCount > 1) {
    warnings.push(`检测到 ${resultCount} 个 <result>，已只取第一个完整结果`);
  }
  return warnings;
}

function parseResultCandidates<T>(raw: string, parse: (candidateRaw: string) => XmlParseResult<T>): XmlParseResult<T> {
  return parseTaggedOutputCandidates(raw, 'result', parse);
}

export function buildGenerationUserInput(parts: GenerationRequestParts) {
  const parsed = parsePrettified(GenerationRequestPartsSchema, parts);
  return [
    normalizeSegment(parsed.taskInstruction),
    normalizeSegment(parsed.appPrompt),
    normalizeSegment(parsed.typePrompt),
    normalizeSegment(parsed.userRequirement),
    normalizeSegment(parsed.outputFormat),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildGenerationChatTail(parts: GenerationRequestParts) {
  const parsed = parsePrettified(GenerationRequestPartsSchema, parts);
  return [normalizeSegment(parsed.context), normalizeSegment(parsed.references)].filter(Boolean).join('\n\n');
}

export function buildPhoneUserInput(parts: GenerationRequestParts, formUserInput: string) {
  const parsed = parsePrettified(GenerationRequestPartsSchema, parts);
  return [
    normalizeSegment(parsed.taskInstruction),
    normalizeSegment(parsed.appPrompt),
    normalizeSegment(parsed.typePrompt),
    normalizeSegment(formUserInput),
    normalizeSegment(parsed.outputFormat),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseSimpleXmlCandidate(
  raw: string,
  options?: { preserveContentMarkup?: boolean },
): XmlParseResult<SimpleXmlResult> {
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
  const title = getDirectChildText(root, 'title');
  const content = options?.preserveContentMarkup
    ? getDirectChildInnerXml(root, 'content')
    : getDirectChildText(root, 'content');

  if (!title || !content) {
    const warnings = [
      !title ? '缺少必填字段「标题」(<title>)' : '',
      !content ? '缺少必填字段「正文」(<content>)' : '',
    ].filter(Boolean);
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(SimpleXmlResultSchema, {
      title,
      content,
    }),
  };
}

export function parseSimpleXmlResult(
  raw: string,
  options?: { preserveContentMarkup?: boolean },
): XmlParseResult<SimpleXmlResult> {
  return parseResultCandidates(raw, candidate => parseSimpleXmlCandidate(candidate, options));
}

export function parseTheaterXmlResult(
  raw: string,
  options?: { preserveContentMarkup?: boolean },
): XmlParseResult<SimpleXmlResult> {
  if (!options?.preserveContentMarkup) {
    return parseSimpleXmlResult(raw);
  }

  return parseResultCandidates(raw, candidate => parseTheaterXmlCandidate(candidate));
}

function parseTheaterXmlCandidate(raw: string): XmlParseResult<SimpleXmlResult> {
  const resultBlock = extractFirstResultBlock(raw);
  if (!resultBlock) {
    return {
      ok: false,
      raw,
      warnings: ['没有找到完整的 <result> 输出'],
    };
  }

  const document = parseXmlDocument(resultBlock);
  if (document) {
    const root = document.documentElement;
    const title = getDirectChildText(root, 'title');
    const content = getDirectChildInnerXml(root, 'content');

    if (!title || !content) {
      const warnings = [
        !title ? '缺少必填字段「标题」(<title>)' : '',
        !content ? '缺少必填字段「正文」(<content>)' : '',
      ].filter(Boolean);
      return {
        ok: false,
        raw,
        warnings,
      };
    }

    return {
      ok: true,
      raw,
      warnings: createWarnings(raw),
      data: parsePrettified(SimpleXmlResultSchema, {
        title,
        content,
      }),
    };
  }

  const title = normalizeMarkupText(extractFirstTagInnerRaw(resultBlock, 'title'));
  const content = extractFirstTagInnerRaw(resultBlock, 'content');
  if (!title || !content) {
    const warnings = [
      !title ? '缺少必填字段「标题」(<title>)' : '',
      !content ? '缺少必填字段「正文」(<content>)' : '',
    ].filter(Boolean);
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: [...createWarnings(raw), '已按 <content> 标签边界提取 Frontend 原始 HTML'],
    data: parsePrettified(SimpleXmlResultSchema, {
      title,
      content,
    }),
  };
}

function parseContentXmlCandidate(
  raw: string,
  options?: { preserveContentMarkup?: boolean },
): XmlParseResult<ContentXmlResult> {
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
  const content = options?.preserveContentMarkup
    ? getDirectChildInnerXml(root, 'content')
    : getDirectChildText(root, 'content');

  if (!content) {
    return {
      ok: false,
      raw,
      warnings: ['缺少必填字段「正文」(<content>)'],
    };
  }

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(ContentXmlResultSchema, {
      content,
    }),
  };
}

export function parseContentXmlResult(
  raw: string,
  options?: { preserveContentMarkup?: boolean },
): XmlParseResult<ContentXmlResult> {
  return parseResultCandidates(raw, candidate => parseContentXmlCandidate(candidate, options));
}

function parseForumXmlCandidate(raw: string): XmlParseResult<ForumXmlResult> {
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
  const board = getDirectChildText(root, 'board');
  const title = getDirectChildText(root, 'title');
  const author = getDirectChildText(root, 'author');
  const content = getDirectChildText(root, 'content');
  const repliesParent = Array.from(root.children).find(item => item.tagName === 'replies');
  const replyElements = repliesParent
    ? Array.from(repliesParent.children).filter(item => item.tagName === 'reply')
    : Array.from(root.children).filter(item => item.tagName === 'reply');
  const replies = replyElements.map(reply => ({
    author: getDirectChildText(reply, 'author'),
    content: getDirectChildText(reply, 'content'),
    isOriginalPoster: getDirectChildText(reply, 'is_op'),
  }));

  const incompleteReplyIndex = replies.findIndex(reply => !reply.author || !reply.content || !reply.isOriginalPoster);
  if (!board || !title || !author || !content || incompleteReplyIndex >= 0) {
    const warnings = [
      !board ? '缺少必填字段「板块名称」(<board>)' : '',
      !title ? '缺少必填字段「帖子标题」(<title>)' : '',
      !author ? '缺少必填字段「主楼作者」(<author>)' : '',
      !content ? '缺少必填字段「主楼正文」(<content>)' : '',
      incompleteReplyIndex >= 0 && !replies[incompleteReplyIndex]!.author
        ? `第 ${incompleteReplyIndex + 1} 条回复缺少 <author>`
        : '',
      incompleteReplyIndex >= 0 && !replies[incompleteReplyIndex]!.content
        ? `第 ${incompleteReplyIndex + 1} 条回复缺少 <content>`
        : '',
      incompleteReplyIndex >= 0 && !replies[incompleteReplyIndex]!.isOriginalPoster
        ? `第 ${incompleteReplyIndex + 1} 条回复缺少 <is_op>`
        : '',
    ].filter(Boolean);
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(ForumXmlResultSchema, {
      board,
      title,
      author,
      content,
      replies,
    }),
  };
}

export function parseForumXmlResult(raw: string): XmlParseResult<ForumXmlResult> {
  return parseResultCandidates(raw, parseForumXmlCandidate);
}

function parseForumRepliesXmlCandidate(raw: string): XmlParseResult<ForumRepliesXmlResult> {
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
  const repliesParent = Array.from(root.children).find(item => item.tagName === 'replies');
  const replyElements = repliesParent
    ? Array.from(repliesParent.children).filter(item => item.tagName === 'reply')
    : Array.from(root.children).filter(item => item.tagName === 'reply');
  const replies = replyElements.map(reply => ({
    author: getDirectChildText(reply, 'author'),
    content: getDirectChildText(reply, 'content'),
    isOriginalPoster: getDirectChildText(reply, 'is_op'),
  }));

  if (!replies.length || replies.some(reply => !reply.author || !reply.content || !reply.isOriginalPoster)) {
    const incompleteIndex = replies.findIndex(reply => !reply.author || !reply.content || !reply.isOriginalPoster);
    const warnings = !replies.length
      ? ['缺少必填字段「回复列表」(<reply>)']
      : [
          !replies[incompleteIndex]!.author ? `第 ${incompleteIndex + 1} 条回复缺少 <author>` : '',
          !replies[incompleteIndex]!.content ? `第 ${incompleteIndex + 1} 条回复缺少 <content>` : '',
          !replies[incompleteIndex]!.isOriginalPoster ? `第 ${incompleteIndex + 1} 条回复缺少 <is_op>` : '',
        ].filter(Boolean);
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(ForumRepliesXmlResultSchema, {
      replies,
    }),
  };
}

export function parseForumRepliesXmlResult(raw: string): XmlParseResult<ForumRepliesXmlResult> {
  return parseResultCandidates(raw, parseForumRepliesXmlCandidate);
}
