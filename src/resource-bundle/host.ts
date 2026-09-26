// eslint-disable-next-line import-x/no-nodejs-modules
import {
  characters,
  getCharacters,
  getPastCharacterChats,
  getRequestHeaders,
  name1,
  saveSettings,
} from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { isEqual } from 'lodash';
import { worldInfoCache } from '@sillytavern/scripts/world-info';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { createTavernPreset, getCurrentTavernPresetName, type TavernPreset } from '@/apps/preset-manager/api';
import { getOptionalGlobalFunction, getSillyTavernContext, getTavernEventName } from '@/util/runtime';
import { RUNNING_VERSION } from '@/core/releaseInfo';
import {
  asRecord,
  assemblePreset,
  decodeJson,
  encodeJson,
  prepareChat,
  readTheme,
  splitPreset,
  type BundleManifest,
  type BundleSource,
  type ExportRow,
  type ImportRow,
  type JsonRecord,
  type ResourceBundle,
} from './model';

type PresetManager = {
  getCompletionPresetByName: (name: string) => unknown;
  getPresetList: () => { presets: JsonRecord[]; preset_names: Record<string, number> };
  savePreset: (name: string, data: JsonRecord, options: { skipUpdate: boolean }) => Promise<void>;
  select: JQuery<HTMLSelectElement>;
};
function presetManager() {
  const get = getOptionalGlobalFunction<(api: string) => PresetManager>('getPresetManager');
  if (!get) throw new Error('酒馆预设管理接口不可用');
  return get('openai');
}
function required<T extends (...args: never[]) => unknown>(name: string): T {
  const fn = getOptionalGlobalFunction<T>(name);
  if (!fn) throw new Error(`酒馆接口 ${name} 不可用`);
  return fn;
}
function cloneJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
async function post(path: string, data: unknown) {
  const multipart = data instanceof FormData;
  const headers = new Headers(getRequestHeaders());
  if (multipart) headers.delete('Content-Type');
  const response = await fetch(path, {
    method: 'POST',
    headers,
    cache: 'no-cache',
    body: multipart ? data : JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`${path} (${response.status}) ${(await response.text()).slice(0, 600)}`);
  return response;
}
function globalRegexes() {
  const values: unknown = extension_settings.regex ?? [];
  if (!Array.isArray(values)) throw new Error('全局正则数据格式无效');
  return values.map(asRecord);
}
async function savedThemes() {
  const data = asRecord(await (await post('/api/settings/get', {})).json());
  if (!Array.isArray(data.themes)) throw new Error('酒馆 UI 主题目录读取失败');
  return data.themes.map(readTheme);
}
async function verifyTheme(data: JsonRecord) {
  const saved = (await savedThemes()).find(theme => theme.name === data.name);
  if (!saved || Object.keys(data).some(key => !isEqual(saved[key], data[key])))
    throw new Error(`UI 主题 ${String(data.name)} 写入后核对失败；重试只会重新核对，不会重复写入`);
  return { message: `已导入 UI 主题 ${String(data.name)}；请刷新酒馆后在 UI 主题列表选择，当前外观未切换` };
}
export async function planExport(source: BundleSource) {
  const rows: ExportRow[] = [];
  function add(kind: ExportRow['item']['kind'], name: string, read: ExportRow['read'], selected = true) {
    const id = String(rows.length);
    const item: ExportRow['item'] = {
      id,
      kind,
      name,
      path: `resources/${id}.${kind === 'character' ? 'png' : kind === 'chat' ? 'jsonl' : 'json'}`,
    };
    if (rows.length) item.parentId = '0';
    rows.push({ item, selected, read });
    return item;
  }
  if (source.kind === 'preset') {
    const store = usePluginPresetStore();
    if (source.pluginId) await store.whenReady();
    const original = source.pluginId
      ? store.exportPreset(source.pluginId)
      : presetManager().getCompletionPresetByName(source.name);
    const data = splitPreset(cloneJson(Array.isArray(original) ? { prompts: original } : original));
    const main = add('preset', source.name, async () => encodeJson(data.raw));
    main.presetSource = source.pluginId ? 'plugin' : 'tavern';
    data.regexes.forEach((regex, i) =>
      add('regex', String(regex.scriptName || regex.script_name || `正则 ${i + 1}`), async () => encodeJson(regex)),
    );
    data.scripts.forEach((script, i) =>
      add('script', String(script.name || `脚本 ${i + 1}`), async () => encodeJson(script)),
    );
  } else if (source.kind === 'theme') {
    const data = cloneJson(readTheme(source.data));
    add('theme', source.name, async () => encodeJson(data));
  } else if (source.kind === 'regex') {
    const regex = globalRegexes()[source.index];
    if (!regex || String(regex.scriptName || `正则 ${source.index + 1}`) !== source.name)
      throw new Error('正则目录已变化，请刷新后重新选择');
    const data = cloneJson(regex);
    add('regex', source.name, async () => encodeJson(data));
  } else if (source.kind === 'worldbook') {
    const data = cloneJson(await required<(name: string) => Promise<unknown>>('loadWorldInfo')(source.name));
    asRecord(asRecord(data).entries);
    add('worldbook', source.name, async () => encodeJson(data));
  } else {
    const owner = { avatar: source.avatar, name: source.name };
    const id = characters.findIndex(character => asRecord(character).avatar === owner.avatar);
    if (id < 0) throw new Error('角色卡不存在，请刷新目录');
    add(
      'character',
      source.name,
      async () =>
        new Uint8Array(
          await (
            await post('/api/characters/export', {
              avatar_url: owner.avatar,
              format: 'png',
            })
          ).arrayBuffer(),
        ),
    );
    const chats = await getPastCharacterChats(id);
    if (!Array.isArray(chats)) throw new Error('聊天目录读取失败');
    for (const raw of chats) {
      const chat = asRecord(raw);
      const fileName = String(chat.file_name || '');
      if (!fileName) throw new Error('聊天目录含缺少文件名的记录');
      add(
        'chat',
        fileName,
        async () => {
          const data: unknown = await (
            await post('/api/chats/export', {
              avatar_url: owner.avatar,
              file: /\.jsonl$/i.test(fileName) ? fileName : `${fileName}.jsonl`,
              exportfilename: fileName,
              format: 'jsonl',
              is_group: false,
            })
          ).json();
          const raw = asRecord(data).result;
          if (typeof raw !== 'string' || !raw.trim()) throw new Error('聊天文件为空或已不存在');
          return new TextEncoder().encode(raw);
        },
        false,
      );
    }
  }
  const manifest: BundleManifest = {
    format: 'phone-resource-bundle',
    version: 1,
    pluginVersion: RUNNING_VERSION,
    name: source.name,
    kind: source.kind === 'regex' || source.kind === 'theme' ? 'mixed' : source.kind,
    items: rows.map(row => row.item),
  };
  return { rows, manifest };
}

export type ImportContext = {
  presetTarget: 'plugin' | 'tavern';
  characterAvatar: string;
  characterName: string;
};
export async function listExportSources(): Promise<BundleSource[]> {
  const store = usePluginPresetStore();
  await store.whenReady();
  await getCharacters();
  return [
    ...getCharacterTargets().map(character => ({ kind: 'character' as const, ...character })),
    ...Object.keys(presetManager().getPresetList().preset_names).map(name => ({ kind: 'preset' as const, name })),
    ...store.items.map(item => ({ kind: 'preset' as const, name: item.name, pluginId: item.id })),
    ...required<() => string[]>('getWorldbookNames')().map(name => ({ kind: 'worldbook' as const, name })),
    ...globalRegexes().map((regex, index) => ({
      kind: 'regex' as const,
      name: String(regex.scriptName || `正则 ${index + 1}`),
      index,
    })),
    ...(await savedThemes()).map(data => ({ kind: 'theme' as const, name: String(data.name), data })),
  ];
}
async function chatNames(context: ImportContext) {
  if (!context.characterAvatar) return [];
  const index = characters.findIndex(value => asRecord(value).avatar === context.characterAvatar);
  if (index < 0) throw new Error('目标角色卡不存在，请刷新目录');
  const chats: unknown = await getPastCharacterChats(index);
  if (!Array.isArray(chats)) throw new Error('目标角色卡的聊天目录读取失败');
  return chats.map(value => String(asRecord(value).file_name || '').replace(/\.jsonl$/i, ''));
}
export async function refreshChatConflicts(rows: ImportRow[], context: ImportContext) {
  const names = await chatNames(context);
  for (const row of rows.filter(row => row.item.kind === 'chat'))
    row.conflict = names.includes(row.name.replace(/\.jsonl$/i, ''));
}
export function getCharacterTargets() {
  return characters.map(value => {
    const character = asRecord(value);
    return { avatar: String(character.avatar), name: String(character.name) };
  });
}
async function existingNames(row: ImportRow, context: ImportContext) {
  if (row.item.kind === 'theme') return (await savedThemes()).map(theme => String(theme.name));
  if (row.item.kind === 'preset')
    return context.presetTarget === 'plugin'
      ? usePluginPresetStore().items.map(item => item.name)
      : Object.keys(presetManager().getPresetList().preset_names);
  if (row.item.kind === 'character') return getCharacterTargets().map(character => character.name);
  if (row.item.kind === 'worldbook') return required<() => string[]>('getWorldbookNames')();
  if (row.item.kind === 'regex') return globalRegexes().map(rule => String(rule.scriptName));
  return [];
}
export async function planImport(bundle: ResourceBundle, context: ImportContext): Promise<ImportRow[]> {
  if (bundle.manifest.items.some(item => item.kind === 'preset') && context.presetTarget === 'plugin')
    await usePluginPresetStore().whenReady();
  if (bundle.manifest.items.some(item => item.kind === 'character')) await getCharacters();
  const rows = bundle.manifest.items.map(item => ({
    item,
    name: item.name,
    selected: true,
    mode: 'skip' as const,
    conflict: false,
    replaceable: false,
    status: 'pending' as const,
    message: '',
  }));
  const plannedNames = new Map<string, Set<string>>();
  const themeNames = rows.some(row => row.item.kind === 'theme')
    ? (await savedThemes()).map(theme => String(theme.name))
    : [];
  for (const row of rows) {
    if (bundle.manifest.items.find(item => item.id === row.item.parentId)?.kind === 'preset') continue;
    const scope = `${row.item.kind}:${row.item.parentId || ''}`;
    const prior = plannedNames.get(scope) ?? new Set<string>();
    row.conflict =
      (row.item.kind === 'theme' ? themeNames : await existingNames(row, context)).includes(row.name) ||
      prior.has(row.name);
    prior.add(row.name);
    plannedNames.set(scope, prior);
    row.replaceable =
      row.item.kind === 'worldbook' ||
      row.item.kind === 'theme' ||
      (row.item.kind === 'preset' && context.presetTarget === 'tavern' && row.name !== getCurrentTavernPresetName());
  }
  return rows;
}
function uniqueName(name: string, names: string[]) {
  if (!names.includes(name)) return name;
  let n = 2;
  while (names.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}
async function saveNativePreset(name: string, data: JsonRecord) {
  const manager = presetManager();
  const list = manager.getPresetList();
  const select = manager.select[0];
  if (!select) throw new Error('酒馆预设选择器尚未就绪');
  await manager.savePreset(name, data, { skipUpdate: true });
  // Update the catalog without the native updateList(), which activates the preset.
  const index = list.preset_names[name];
  if (index !== undefined) list.presets[index] = data;
  else {
    const newIndex = list.presets.length;
    list.presets.push(data);
    list.preset_names[name] = newIndex;
    select.add(new Option(name, String(newIndex), false, false));
  }
}
export async function importResource(
  bundle: ResourceBundle,
  row: ImportRow,
  rows: ImportRow[],
  context: ImportContext,
) {
  if (row.item.kind === 'theme' && row.themeWrite) return verifyTheme(row.themeWrite);
  const names = row.item.kind === 'chat' ? await chatNames(context) : await existingNames(row, context);
  const conflict = names.includes(row.item.kind === 'chat' ? row.name.replace(/\.jsonl$/i, '') : row.name);
  if (['preset', 'worldbook', 'theme'].includes(row.item.kind) && (!row.name.trim() || /[\\/:*?"<>|]/.test(row.name)))
    throw new Error('资源名称含文件名不支持的字符，请修改名称后重试');
  if (conflict && row.mode === 'skip') return { skipped: true, message: '同名资源已存在，已跳过' };
  if (
    conflict &&
    row.mode === 'replace' &&
    (!row.replaceable || (row.item.kind === 'preset' && row.name === getCurrentTavernPresetName()))
  )
    throw new Error('该资源不能替换，请另存为');
  const name = row.mode === 'copy' ? uniqueName(row.name, names) : row.name;
  const bytes = bundle.files[row.item.path]!;
  if (row.item.kind === 'theme') {
    const data = { ...readTheme(decodeJson(bytes)), name };
    await post('/api/themes/save', data);
    // A confirmed write is not repeated if the subsequent read-back fails.
    row.themeWrite = data;
    return verifyTheme(data);
  }
  if (row.item.kind === 'preset') {
    const attachments = rows.filter(child => child.selected && child.item.parentId === row.item.id);
    const data = assemblePreset(
      asRecord(decodeJson(bytes)),
      attachments
        .filter(child => child.item.kind === 'regex')
        .map(child => asRecord(decodeJson(bundle.files[child.item.path]!))),
      attachments
        .filter(child => child.item.kind === 'script')
        .map(child => asRecord(decodeJson(bundle.files[child.item.path]!))),
    );
    if (context.presetTarget === 'plugin') await usePluginPresetStore().importPreset(data, `${name}.json`);
    else if (Array.isArray(data.prompt_order)) await saveNativePreset(name, data);
    else if (row.mode === 'replace' && conflict) {
      await required<(name: string, preset: TavernPreset) => Promise<void>>('replacePreset')(
        name,
        data as TavernPreset,
      );
    } else await createTavernPreset(name, data as TavernPreset);
    return { message: `已导入 ${name}；附带脚本默认停用` };
  }
  if (row.item.kind === 'worldbook') {
    const updateList = required<() => Promise<void>>('updateWorldInfoList');
    const form = new FormData();
    form.append('avatar', new Blob([new Uint8Array(bytes)], { type: 'application/json' }), `${name}.json`);
    const result = asRecord(await (await post('/api/worldinfo/import', form)).json());
    if (!result.name) throw new Error('酒馆未返回导入世界书名称');
    const bookName = String(result.name);
    const book = asRecord(decodeJson(bytes));
    worldInfoCache.set(bookName, book);
    try {
      await updateList();
      getOptionalGlobalFunction<(name: string, loadIfNotSelected: boolean) => void>('reloadWorldInfoEditor')?.(
        bookName,
        false,
      );
      const events = getSillyTavernContext()?.eventSource as
        { emit?: (event: string, ...args: unknown[]) => Promise<unknown> } | undefined;
      const updated = getTavernEventName('WORLDINFO_UPDATED');
      if (updated) await events?.emit?.(updated, bookName, book);
    } catch (error) {
      return { message: `已导入 ${String(result.name)}；目录刷新失败，请刷新页面：${String(error)}` };
    }
    return { message: `已导入 ${String(result.name)}` };
  }
  if (row.item.kind === 'regex') {
    const rule = { ...asRecord(decodeJson(bytes)), id: crypto.randomUUID(), scriptName: name, disabled: true };
    const before = globalRegexes();
    const events = getSillyTavernContext()?.eventSource;
    const updated = getTavernEventName('SETTINGS_UPDATED');
    if (!events?.on || !updated) throw new Error('酒馆设置保存确认接口不可用');
    let saved = false;
    const confirm = () => {
      saved = true;
    };
    events.on(updated, confirm);
    extension_settings.regex = [...before, rule];
    try {
      await saveSettings();
      if (!saved) throw new Error('酒馆未确认全局正则保存成功');
    } catch (error) {
      extension_settings.regex = before;
      throw error;
    } finally {
      events.off?.(updated, confirm);
    }
    return { message: `已导入 ${name}（默认停用）` };
  }
  if (row.item.kind === 'character') {
    const form = new FormData();
    form.append('avatar', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'character.png');
    form.append('file_type', 'png');
    form.append('user_name', name1);
    const result = asRecord(await (await post('/api/characters/import', form)).json());
    if (result.error || typeof result.file_name !== 'string')
      throw new Error(String(result.error || '角色卡导入未返回文件名'));
    context.characterAvatar = `${result.file_name}.png`;
    context.characterName = row.item.name;
    try {
      await getCharacters();
    } catch (error) {
      return { message: `角色卡已导入；目录刷新失败，请刷新页面：${String(error)}` };
    }
    return { message: `已导入角色卡 ${row.item.name}` };
  }
  if (row.item.kind === 'chat') {
    if (!context.characterAvatar) throw new Error('请先导入角色卡或选择已有目标角色卡');
    const prepared = prepareChat(bytes, required<() => string[]>('getWorldbookNames')());
    const targetStem = uniqueName(row.name.replace(/\.jsonl$/i, ''), names);
    const form = new FormData();
    form.append('avatar', new Blob([new Uint8Array(prepared.bytes)], { type: 'application/jsonl' }), row.item.name);
    form.append('file_type', 'jsonl');
    form.append('avatar_url', context.characterAvatar);
    form.append('character_name', context.characterName);
    form.append('user_name', name1);
    // Initialize native chat directories with a complete request; TT requires a file name.
    await post('/api/chats/get', {
      avatar_url: context.characterAvatar,
      file_name: targetStem,
      allow_not_found: true,
    });
    const result = asRecord(await (await post('/api/chats/import', form)).json());
    if (result.error || !Array.isArray(result.fileNames) || !result.fileNames.length)
      throw new Error(typeof result.error === 'string' ? result.error : '酒馆未确认聊天导入，请检查服务端日志');
    const importedName = String(result.fileNames[0]);
    const targetName = `${targetStem}.jsonl`;
    let finalName = importedName;
    if (targetName !== importedName) {
      try {
        const renamed = asRecord(
          await (
            await post('/api/chats/rename', {
              avatar_url: context.characterAvatar,
              is_group: false,
              original_file: importedName,
              renamed_file: targetName,
            })
          ).json(),
        );
        if (renamed.ok !== true) throw new Error('酒馆未确认改名');
        finalName = typeof renamed.sanitizedFileName === 'string' ? `${renamed.sanitizedFileName}.jsonl` : targetName;
      } catch (error) {
        prepared.warnings.push(`聊天已保存，恢复名称失败：${String(error)}`);
      }
    }
    return {
      message: `已创建聊天 ${finalName}${prepared.warnings.length ? `；${prepared.warnings.join('；')}` : ''}`,
    };
  }
  throw new Error('预设附件随预设主体一起导入');
}
