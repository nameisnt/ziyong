import { z } from 'zod';

export type BundleKind = 'preset' | 'character' | 'worldbook';
export type ResourceKind = BundleKind | 'regex' | 'script' | 'chat' | 'theme';
export type JsonRecord = Record<string, unknown>;
export type BundleSource =
  | { kind: 'preset'; name: string; pluginId?: string }
  | { kind: 'worldbook'; name: string }
  | { kind: 'character'; name: string; avatar: string }
  | { kind: 'theme'; name: string; data: JsonRecord }
  | { kind: 'regex'; name: string; index: number };
const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['preset', 'character', 'worldbook', 'regex', 'script', 'chat', 'theme']),
  path: z.string().regex(/^resources\/[0-9]+\.(json|jsonl|png)$/),
  parentId: z.string().optional(),
  presetSource: z.enum(['plugin', 'tavern']).optional(),
});
export type BundleItem = z.infer<typeof itemSchema>;
const manifestSchema = z.object({
  format: z.literal('phone-resource-bundle'),
  version: z.literal(1),
  pluginVersion: z.string(),
  kind: z.enum(['preset', 'character', 'worldbook', 'mixed']),
  name: z.string().min(1),
  items: z.array(itemSchema).min(1),
});
export type BundleManifest = z.infer<typeof manifestSchema>;
export type ResourceBundle = { manifest: BundleManifest; files: Record<string, Uint8Array> };
export type ExportRow = { item: BundleItem; selected: boolean; read: () => Promise<Uint8Array> };
export type ImportRow = {
  item: BundleItem;
  selected: boolean;
  name: string;
  mode: 'skip' | 'copy' | 'replace';
  conflict: boolean;
  replaceable: boolean;
  status: 'pending' | 'success' | 'skipped' | 'failed';
  message: string;
  themeWrite?: JsonRecord;
};
export function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('数据不是有效对象');
  return value as JsonRecord;
}
export function encodeJson(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}
export function decodeJson(bytes: Uint8Array) {
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
export function readTheme(value: unknown) {
  const theme = asRecord(value);
  if (typeof theme.name !== 'string' || !theme.name.trim()) throw new Error('UI 主题缺少名称');
  if (!['main_text_color', 'blur_tint_color', 'custom_css', 'font_scale', 'chat_display'].some(key => key in theme))
    throw new Error('文件不包含酒馆 UI 主题字段');
  if ('custom_css' in theme && typeof theme.custom_css !== 'string') throw new Error('主题 custom_css 必须为文本');
  return theme;
}
export function splitPreset(value: unknown) {
  const raw = structuredClone(asRecord(value));
  if (!Array.isArray(raw.prompts)) throw new Error('预设缺少 prompts');
  const extensions = raw.extensions == null ? {} : asRecord(raw.extensions);
  const regexes = extensions.regex_scripts ?? [];
  const helper = extensions.tavern_helper == null ? null : asRecord(extensions.tavern_helper);
  const scripts = helper?.scripts ?? [];
  if (!Array.isArray(regexes) || !Array.isArray(scripts)) throw new Error('预设正则或脚本字段格式错误');
  // Keep other helper data and grouping fields in the original preset.
  delete extensions.regex_scripts;
  if (helper) delete helper.scripts;
  raw.extensions = extensions;
  return { raw, regexes: regexes.map(asRecord), scripts: scripts.map(asRecord) };
}
export function disableScript(value: JsonRecord): JsonRecord {
  const result = structuredClone(value);
  result.enabled = false;
  if (Array.isArray(result.scripts)) result.scripts = result.scripts.map(v => disableScript(asRecord(v)));
  return result;
}
export function assemblePreset(raw: JsonRecord, regexes: JsonRecord[], scripts: JsonRecord[]) {
  const result = structuredClone(raw);
  const extensions = asRecord(result.extensions ?? {});
  extensions.regex_scripts = structuredClone(regexes);
  if (scripts.length || extensions.tavern_helper) {
    const helper = asRecord(extensions.tavern_helper ?? {});
    helper.scripts = scripts.map(disableScript);
    extensions.tavern_helper = helper;
  }
  result.extensions = extensions;
  return result;
}
export function readChat(bytes: Uint8Array) {
  const rows = new TextDecoder()
    .decode(bytes)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim());
  const records = rows.map((line, index) => {
    try {
      return asRecord(JSON.parse(line));
    } catch {
      throw new Error(`聊天第 ${index + 1} 行不是有效 JSON 对象`);
    }
  });
  if (!records.length || !('chat_metadata' in records[0]! || 'user_name' in records[0]!))
    throw new Error('聊天缺少 JSONL 文件头');
  return records;
}
export function prepareChat(bytes: Uint8Array, worldbooks: string[]) {
  const records = readChat(bytes);
  const metadata = records[0]!.chat_metadata;
  const warnings: string[] = [];
  if (metadata != null) {
    const data = asRecord(metadata);
    for (const key of ['phone_branch_origin', 'main_chat']) {
      if (key in data) {
        delete data[key];
        warnings.push('旧分支来源未恢复');
      }
    }
    if (typeof data.world_info === 'string' && data.world_info && !worldbooks.includes(data.world_info)) {
      delete data.world_info;
      warnings.push('绑定世界书不存在，未恢复聊天世界书绑定');
    }
  }
  return {
    bytes: new TextEncoder().encode(records.map(row => JSON.stringify(row)).join('\n')),
    warnings: [...new Set(warnings)],
  };
}
export function validateBundle(files: Record<string, Uint8Array>): ResourceBundle {
  if (!files['manifest.json']) throw new Error('缺少组合包 manifest.json');
  const manifest = manifestSchema.parse(decodeJson(files['manifest.json']));
  const ids = new Set<string>(),
    paths = new Map<string, BundleItem>();
  const roots = manifest.items.filter(item => item.kind === manifest.kind);
  if (manifest.kind !== 'mixed' && (roots.length !== 1 || roots[0]!.parentId))
    throw new Error('组合包必须包含一个主体');
  const root = roots[0]!;
  const byId = new Map(manifest.items.map(item => [item.id, item]));
  for (const item of manifest.items) {
    const shared = paths.get(item.path);
    if (ids.has(item.id) || (shared && (shared.kind !== 'regex' || item.kind !== 'regex')))
      throw new Error(`重复资源：${item.name}`);
    ids.add(item.id);
    paths.set(item.path, item);
    if (manifest.kind === 'mixed') {
      const parent = item.parentId ? byId.get(item.parentId) : undefined;
      if (item.parentId) {
        if (
          !parent ||
          parent.parentId ||
          !(
            (parent.kind === 'preset' && ['regex', 'script'].includes(item.kind)) ||
            (parent.kind === 'character' && item.kind === 'chat')
          )
        )
          throw new Error(`附件归属错误：${item.name}`);
      } else if (item.kind === 'chat' || item.kind === 'script') throw new Error(`附件缺少主体：${item.name}`);
    } else if (item !== root) {
      const allowed =
        manifest.kind === 'preset' ? ['regex', 'script'] : manifest.kind === 'character' ? ['chat'] : ['regex'];
      if (!allowed.includes(item.kind) || item.parentId !== root.id) throw new Error(`附件归属错误：${item.name}`);
    }
    const bytes = files[item.path];
    if (!bytes) throw new Error(`缺少文件：${item.name} (${item.path})`);
    try {
      if (item.kind === 'character') {
        if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) throw new Error('不是 PNG 角色卡');
      } else if (item.kind === 'chat') readChat(bytes);
      else {
        const data = asRecord(decodeJson(bytes));
        if (item.kind === 'preset') splitPreset(data);
        if (item.kind === 'worldbook') asRecord(data.entries);
        if (item.kind === 'theme') readTheme(data);
        if (
          item.kind === 'regex' &&
          typeof data.findRegex !== 'string' &&
          !(byId.get(item.parentId || '')?.kind === 'preset' && typeof data.find_regex === 'string')
        )
          throw new Error('缺少正则表达式');
        if (item.kind === 'script') {
          if (data.type === 'folder') {
            if (
              !Array.isArray(data.scripts) ||
              data.scripts.some(v => asRecord(v).type !== 'script' || typeof asRecord(v).content !== 'string')
            )
              throw new Error('脚本分组无效');
          } else if (data.type !== 'script' || typeof data.content !== 'string') throw new Error('脚本无效');
        }
      }
    } catch (error) {
      throw new Error(`${item.name}：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { manifest, files };
}
