import type {
  PhoneOutputParserDefinition,
  PhoneOutputParserField,
  PhonePromptOutputFormat,
} from '@/core/appRegistry';

export function textField(
  key: string,
  label: string,
  defaultPath: string,
  options: Partial<Pick<PhoneOutputParserField, 'extraction' | 'required'>> = {},
): PhoneOutputParserField {
  return {
    defaultPath,
    extraction: options.extraction ?? 'text',
    key,
    kind: 'text',
    label,
    required: options.required ?? false,
  };
}

export function textListField(
  key: string,
  label: string,
  defaultPath: string,
  separator = '',
): PhoneOutputParserField {
  return {
    defaultPath,
    key,
    kind: 'text-list',
    label,
    separator,
  };
}

export function objectListField(
  key: string,
  label: string,
  defaultPath: string,
  children: PhoneOutputParserField[],
  required = false,
): PhoneOutputParserField {
  return {
    children,
    defaultPath,
    key,
    kind: 'object-list',
    label,
    required,
  };
}

export function xmlParser(
  fields: PhoneOutputParserField[],
  rootPath = 'result',
): PhoneOutputParserDefinition {
  return {
    fields,
    kind: 'xml',
    rootPath,
  };
}

export function simpleXmlOutput(
  id: string,
  label: string,
  content: string,
  options: { contentOnly?: boolean; preserveContentMarkup?: boolean } = {},
): PhonePromptOutputFormat {
  const fields = options.contentOnly
    ? [textField('content', '正文', 'content', {
        extraction: options.preserveContentMarkup ? 'markup' : 'text',
        required: true,
      })]
    : [
        textField('title', '标题', 'title', { required: true }),
        textField('content', '正文', 'content', {
          extraction: options.preserveContentMarkup ? 'markup' : 'text',
          required: true,
        }),
      ];
  return {
    content,
    id,
    label,
    parser: xmlParser(fields),
  };
}

export function cloneOutputFormat(
  source: PhonePromptOutputFormat,
  id: string,
  label = source.label,
): PhonePromptOutputFormat {
  return {
    ...source,
    id,
    label,
    parser: structuredClone(source.parser),
  };
}
