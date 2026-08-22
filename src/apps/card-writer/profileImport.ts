export type CardWriterProfileKind = 'character' | 'event' | 'world';

export type CardWriterImportCandidate = {
  content: string;
  fields: Record<string, string>;
  kind: CardWriterProfileKind;
  sourceKey: string;
  tagName: string;
  title: string;
};

type ImportStage = { content: string; id: string; label: string };

const supportedTagPattern =
  /<(calendar|worldview_final|worldview|worldview_overview|worldview_area(?:_[^\s<>]+)?|worldview_detail(?:_[^\s<>]+)?|worldview_event(?:_[^\s<>]+)?|sample_basic|character|sample_palette|npc(?:_\d+)?)(\s+[^<>]*?)?>([\s\S]*?)<\/\1>/giu;

function readAttribute(attributes: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'iu').exec(attributes);
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function readLine(content: string, labels: string[]) {
  const alternatives = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(?:^|\\n)\\s*(?:${alternatives})\\s*[：:]\\s*([^\\r\\n]+)`, 'iu').exec(content)?.[1]?.trim() ?? '';
}

function cleanYamlValue(value: string) {
  return value.replace(/^['"]|['"]$/gu, '').trim();
}

function titleFromStage(stage: ImportStage) {
  return /[（(]([^）)]+)[）)]/u.exec(stage.label)?.[1]?.trim() ?? '';
}

function suffixTitle(tagName: string, prefix: string) {
  return tagName.startsWith(`${prefix}_`) ? tagName.slice(prefix.length + 1).trim() : '';
}

function calendarFields(content: string) {
  const fields: Record<string, string> = {};
  const calendarName = readLine(content, ['历法名称', '历法']);
  const eraName = readLine(content, ['纪元名称', '纪年名称', '纪元', '纪年']);
  const monthsPerYear = readLine(content, ['每年月份', '每年月数', '一年月数']);
  const monthDays = readLine(content, ['每月天数', '月份天数']);
  if (calendarName) fields.calendarName = cleanYamlValue(calendarName);
  if (eraName) fields.calendarEraName = cleanYamlValue(eraName);
  if (monthsPerYear) fields.calendarMonthsPerYear = cleanYamlValue(monthsPerYear);
  if (monthDays) fields.calendarMonthDays = cleanYamlValue(monthDays);
  return fields;
}

function characterFields(content: string) {
  const fields: Record<string, string> = {};
  const birthDate = readLine(content, ['出生日期', '生日']);
  const identity = readLine(content, ['身份', '职业', '社会身份']);
  if (birthDate) fields.birthDate = cleanYamlValue(birthDate);
  if (identity) fields.identity = cleanYamlValue(identity);
  return fields;
}

function candidateFromTag(stage: ImportStage, tagName: string, attributes: string, content: string, index: number) {
  const normalizedTag = tagName.toLowerCase();
  const attributeName = readAttribute(attributes, 'name') || readAttribute(attributes, 'title');
  const explicitName = cleanYamlValue(readLine(content, ['姓名', '名称', '标题']));
  const stageName = titleFromStage(stage);
  let kind: CardWriterProfileKind = 'world';
  let title = '';
  let fields: Record<string, string> = {};

  if (normalizedTag === 'sample_basic' || normalizedTag === 'character' || normalizedTag.startsWith('npc')) {
    kind = 'character';
    title =
      attributeName ||
      explicitName ||
      stageName ||
      (normalizedTag.startsWith('npc') ? `NPC ${index + 1}` : '未命名人物');
    fields = characterFields(content);
  } else if (normalizedTag === 'sample_palette') {
    kind = 'character';
    title = attributeName || stageName || explicitName || '未命名人物';
  } else if (normalizedTag === 'calendar') {
    title = attributeName || explicitName || readLine(content, ['历法名称', '历法']) || '世界历法';
    fields = calendarFields(content);
  } else if (normalizedTag.startsWith('worldview_event')) {
    kind = 'event';
    title = attributeName || suffixTitle(tagName, 'worldview_event') || explicitName || `世界事件 ${index + 1}`;
  } else if (normalizedTag.startsWith('worldview_area')) {
    title = attributeName || suffixTitle(tagName, 'worldview_area') || explicitName || `世界区域 ${index + 1}`;
  } else if (normalizedTag.startsWith('worldview_detail')) {
    title = attributeName || suffixTitle(tagName, 'worldview_detail') || explicitName || `世界设定 ${index + 1}`;
  } else {
    title = attributeName || explicitName || (normalizedTag === 'worldview_overview' ? '世界总纲' : '世界观总设定');
    fields = /<calendar\b/iu.test(content) ? {} : calendarFields(content);
  }

  return {
    content: content.trim(),
    fields: { ...fields, details: content.trim() },
    kind,
    sourceKey: `${stage.id}:${normalizedTag}:${index}`,
    tagName,
    title,
  } satisfies CardWriterImportCandidate;
}

function mergeCharacterCandidates(candidates: CardWriterImportCandidate[]) {
  const merged: CardWriterImportCandidate[] = [];
  candidates.forEach(candidate => {
    const existing = merged.find(item => item.kind === 'character' && item.title === candidate.title);
    if (!existing) {
      merged.push(candidate);
      return;
    }
    existing.content = [existing.content, candidate.content].filter(Boolean).join('\n\n');
    existing.fields = { ...existing.fields, ...candidate.fields, details: existing.content };
    existing.sourceKey = `${existing.sourceKey}+${candidate.sourceKey}`;
    existing.tagName = `${existing.tagName} + ${candidate.tagName}`;
  });
  return merged;
}

export function parseCardWriterProfileCandidates(stages: ImportStage[]) {
  const candidates: CardWriterImportCandidate[] = [];
  stages.forEach(stage => {
    let index = 0;
    const scan = (content: string) => {
      const pattern = new RegExp(supportedTagPattern.source, supportedTagPattern.flags);
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content))) {
        candidates.push(candidateFromTag(stage, match[1], match[2] ?? '', match[3], index));
        index += 1;
        scan(match[3]);
      }
    };
    scan(stage.content);
  });
  return mergeCharacterCandidates(candidates);
}
