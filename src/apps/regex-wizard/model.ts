export type RegexWizardMode = 'boundary' | 'fields';
export type RegexWizardPurpose = 'extract-block' | 'extract-content' | 'remove-block';
export type RegexWizardBoundaryKind = 'literal' | 'tag';
export type RegexWizardClosingStyle = 'custom' | 'repeat' | 'standard';
export type RegexWizardWhitespace = 'exact' | 'flexible' | 'horizontal' | 'lines';
export type RegexWizardOccurrence = 'all' | 'first';
export type RegexWizardFieldKind = 'capture' | 'fixed' | 'ignore';
export type RegexWizardFieldStructure = 'line' | 'tag';

export type RegexWizardField = {
  fixedValue: string;
  id: string;
  kind: RegexWizardFieldKind;
  label: string;
  multiline: boolean;
  optional: boolean;
  tagName: string;
};

export type RegexWizardDraft = {
  allowAttributes: boolean;
  allowEmpty: boolean;
  boundaryKind: RegexWizardBoundaryKind;
  caseInsensitive: boolean;
  closingStyle: RegexWizardClosingStyle;
  customEnd: string;
  customStart: string;
  fields: RegexWizardField[];
  fieldsContainerTagName: string;
  fieldStructure: RegexWizardFieldStructure;
  mode: RegexWizardMode;
  occurrence: RegexWizardOccurrence;
  outputSeparator: string;
  purpose: RegexWizardPurpose;
  tagName: string;
  whitespace: RegexWizardWhitespace;
};

export type GeneratedRegexWizardRule = {
  flags: string;
  fullExpression: string;
  operation: 'extract' | 'replace';
  pattern: string;
  replacement: string;
};

export type RegexWizardTestMatch = {
  captures: Record<string, string>;
  full: string;
  index: number;
  output: string;
};

export type RegexWizardTestResult = {
  error: string;
  matches: RegexWizardTestMatch[];
};

export function createRegexWizardField(index = 0): RegexWizardField {
  return {
    fixedValue: '',
    id: `field_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'capture',
    label: `字段 ${index + 1}`,
    multiline: true,
    optional: false,
    tagName: '',
  };
}

export function createRegexWizardDraft(): RegexWizardDraft {
  return {
    allowAttributes: true,
    allowEmpty: false,
    boundaryKind: 'tag',
    caseInsensitive: false,
    closingStyle: 'standard',
    customEnd: '',
    customStart: '',
    fields: [createRegexWizardField(0)],
    fieldsContainerTagName: 'aa',
    fieldStructure: 'line',
    mode: 'boundary',
    occurrence: 'all',
    outputSeparator: '\n\n',
    purpose: 'extract-content',
    tagName: 'content',
    whitespace: 'flexible',
  };
}

function escapeRegexLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function validateTagName(tagName: string, label: string) {
  const normalized = tagName.trim();
  if (!normalized) throw new Error(`请填写${label}`);
  if (!/^[A-Za-z_][\w:.-]*$/u.test(normalized)) {
    throw new Error(`${label}只能使用字母、数字、下划线、冒号、点或连字符，且不能以数字开头`);
  }
  return normalized;
}

function buildTagBoundaries(tagName: string, closingStyle: RegexWizardClosingStyle, allowAttributes: boolean) {
  const escaped = escapeRegexLiteral(tagName);
  const start = allowAttributes ? `<${escaped}(?:\\s+[^<>]*?)?\\s*>` : `<${escaped}\\s*>`;
  const end = closingStyle === 'repeat' ? `<${escaped}\\s*>` : `<\\/${escaped}\\s*>`;
  return { end, start };
}

function whitespacePattern(mode: RegexWizardWhitespace) {
  if (mode === 'horizontal') return '[ \\t]*';
  if (mode === 'flexible') return '\\s*';
  if (mode === 'lines') return '[ \\t]*(?:\\r?\\n[ \\t]*)*';
  return '';
}

function contentPattern(multiline: boolean, allowEmpty: boolean) {
  if (multiline) return allowEmpty ? '[\\s\\S]*?' : '[\\s\\S]+?';
  return allowEmpty ? '[^\\r\\n]*?' : '[^\\r\\n]+?';
}

function escapeRegexDelimiter(pattern: string) {
  let output = '';
  let backslashes = 0;
  for (const char of pattern) {
    if (char === '\\') {
      backslashes += 1;
      output += char;
      continue;
    }
    if (char === '/' && backslashes % 2 === 0) output += '\\';
    output += char;
    backslashes = 0;
  }
  return output;
}

function buildBoundaryPattern(draft: RegexWizardDraft) {
  if (draft.boundaryKind === 'literal') {
    if (!draft.customStart) throw new Error('请填写开始标记');
    if (!draft.customEnd) throw new Error('请填写结束标记');
    return { end: escapeRegexLiteral(draft.customEnd), start: escapeRegexLiteral(draft.customStart) };
  }
  const tagName = validateTagName(draft.tagName, '标签名称');
  if (draft.closingStyle === 'custom') {
    if (!draft.customEnd) throw new Error('请填写自定义结束标记');
    return {
      end: escapeRegexLiteral(draft.customEnd),
      start: buildTagBoundaries(tagName, 'standard', draft.allowAttributes).start,
    };
  }
  return buildTagBoundaries(tagName, draft.closingStyle, draft.allowAttributes);
}

function buildFieldsPattern(draft: RegexWizardDraft) {
  if (!draft.fields.length) throw new Error('请至少添加一个字段');
  const gap = whitespacePattern(draft.whitespace);
  const captureNames: string[] = [];
  const segments = draft.fields.map((field, index) => {
    const fieldName = field.tagName.trim();
    if (!fieldName) {
      throw new Error(`请填写第 ${index + 1} 个字段的${draft.fieldStructure === 'line' ? '固定字段名' : '标签名称'}`);
    }
    let inner = contentPattern(field.multiline, draft.allowEmpty);
    if (field.kind === 'capture') {
      const captureName = `field${index + 1}`;
      captureNames.push(captureName);
      inner = `(?<${captureName}>${inner})`;
    } else if (field.kind === 'fixed') {
      if (!field.fixedValue) throw new Error(`请填写“${field.label || fieldName}”的固定内容`);
      inner = escapeRegexLiteral(field.fixedValue);
    }
    let segment = '';
    if (draft.fieldStructure === 'line') {
      segment = `^[ \\t]*${escapeRegexLiteral(fieldName)}[ \\t]*[：:][ \\t]*${inner}`;
    } else {
      const tagName = validateTagName(fieldName, `第 ${index + 1} 个字段的标签名称`);
      const boundaries = buildTagBoundaries(
        tagName,
        draft.closingStyle === 'repeat' ? 'repeat' : 'standard',
        draft.allowAttributes,
      );
      segment = `${boundaries.start}${gap}${inner}${gap}${boundaries.end}`;
    }
    return field.optional ? `(?:${segment})?` : segment;
  });
  const fieldsPattern = segments.join(gap);
  if (draft.fieldStructure === 'line') {
    const containerTagName = validateTagName(draft.fieldsContainerTagName, '外层标签名称');
    const boundaries = buildTagBoundaries(
      containerTagName,
      draft.closingStyle === 'repeat' ? 'repeat' : 'standard',
      draft.allowAttributes,
    );
    return {
      captureNames,
      pattern: `${boundaries.start}${gap}${fieldsPattern}${gap}${boundaries.end}`,
    };
  }
  return {
    captureNames,
    pattern: fieldsPattern,
  };
}

export function generateRegexWizardRule(draft: RegexWizardDraft): GeneratedRegexWizardRule {
  const gap = whitespacePattern(draft.whitespace);
  let blockPattern = '';
  let replacement = '';

  if (draft.mode === 'fields') {
    const generated = buildFieldsPattern(draft);
    blockPattern = generated.pattern;
    if (draft.purpose === 'extract-content') {
      if (!generated.captureNames.length) throw new Error('至少要有一个“提取内容”字段');
      replacement = generated.captureNames.map(name => `$<${name}>`).join(draft.outputSeparator);
    }
  } else {
    const boundaries = buildBoundaryPattern(draft);
    const inner = contentPattern(true, draft.allowEmpty);
    blockPattern = `${boundaries.start}${gap}(?<content>${inner})${gap}${boundaries.end}`;
    if (draft.purpose === 'extract-content') replacement = '$<content>';
  }

  if (draft.purpose === 'extract-block') {
    blockPattern = `(?<block>${blockPattern})`;
    replacement = '$<block>';
  }

  const flags = `${draft.occurrence === 'all' ? 'g' : ''}${draft.caseInsensitive ? 'i' : ''}${
    draft.mode === 'fields' && draft.fieldStructure === 'line' ? 'm' : ''
  }u`;
  const operation = draft.purpose === 'remove-block' ? 'replace' : 'extract';
  if (operation === 'replace') replacement = '';
  return {
    flags,
    fullExpression: `/${escapeRegexDelimiter(blockPattern)}/${flags}`,
    operation,
    pattern: blockPattern,
    replacement,
  };
}

export function testRegexWizardRule(generated: GeneratedRegexWizardRule, input: string): RegexWizardTestResult {
  if (!input) return { error: '', matches: [] };
  try {
    const expression = new RegExp(generated.pattern, generated.flags);
    const singleFlags = generated.flags.replace(/g/gu, '');
    const replacementExpression = new RegExp(generated.pattern, singleFlags);
    const rawMatches = expression.global
      ? [...input.matchAll(expression)]
      : [input.match(expression)].filter((match): match is RegExpMatchArray => Boolean(match));
    return {
      error: '',
      matches: rawMatches.slice(0, 50).map(match => ({
        captures: Object.fromEntries(Object.entries(match.groups ?? {}).map(([name, value]) => [name, value ?? ''])),
        full: match[0],
        index: match.index ?? 0,
        output: generated.operation === 'replace' ? '' : match[0].replace(replacementExpression, generated.replacement),
      })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '正则测试失败', matches: [] };
  }
}
