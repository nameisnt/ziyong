import { getRegisteredPhoneBackupDomains, getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';
import { baguField } from '@/store/bagu';
import { promptField } from '@/store/prompts';
import { recoveryField } from '@/store/recovery';
import { readerSettingsField } from '@/store/reader';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import {
  getEmbeddedPluginPresets,
  isFullPhoneBackup,
  PhoneBackupFullDataSchema,
  PhoneBackupSchema,
  type PhoneBackup,
  type PluginPresetBackupBundle,
} from '@/type/backup';
import { parsePrettified } from '@/util/zod';
import { executeBackupImportTransaction } from '@/util/backupTransaction';
import { executeBackupResourceTransaction } from '@/util/backupResourceTransaction';
import {
  analyzeBackupDomainCoverage,
  assertFullBackupImportAllowed,
  selectCurrentChatBackupDomains,
  selectGeneratedContentDomains,
} from '@/util/backupPolicy';
import {
  ChatFloorBackupSchema,
  listChatFloorBackups,
  replaceChatFloorBackups,
  type ChatFloorBackup,
} from '@/util/chatFloorBackup';
import { getOptionalGlobalFunction } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { setting_field, Settings } from '@/type/settings';
import { migrateHomeLayoutDockCapacity } from '@/core/appLayout';

export interface PhoneBackupScopeOption {
  collections: number;
  domainLabels: string[];
  items: number;
  label: string;
  scopeKey: string;
}

export interface PhoneBackupImportPlan {
  domainsToReplace: string[];
  missingDomainLabels: string[];
  target: 'full' | 'current-chat';
  unknownDomainKeys: string[];
}

const backupDomainLabels: Record<string, string> = {
  'chat-insert': '插入工具',
  diaries: '日记',
  digests: '摘抄',
  'generation-aliases': '生成称呼替换',
  'generation-tasks': '生成任务',
  'entry-library': '条目库',
  extras: '番外',
  forum: '论坛',
  letters: '书信',
  media: '媒体生成',
  'mvu-modifier': 'MVU 收藏与记录',
  profiles: '资料表',
  'preview-drafts': '未保存预览',
  'preset-link': '预设绑定',
  'regex-display': '正则显示',
  'status-display': '状态栏方案',
  relationship: '关系网',
  relationships: '关系网',
  summaries: '总结',
  theater: '小剧场',
  theme: '主题',
  timekeeper: '时间确认',
  workbench: '工作台',
  'world-slots': '世界书槽位',
};

function timestampLabel(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  const second = String(value.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isChatScopedEnvelope(value: unknown): value is {
  __chatScoped: true;
  legacyScopeMigrations?: Record<string, unknown>;
  scopes: Record<string, unknown>;
} {
  return isRecord(value) && value.__chatScoped === true && isRecord(value.scopes);
}

type ChatScopedBackupEnvelope = {
  __chatScoped: true;
  legacyScopeMigrations: Record<string, string>;
  scopes: Record<string, unknown>;
};

type StagedPhoneBackupDomainImport = {
  data: unknown;
  domain: ReturnType<typeof getRegisteredPhoneBackupDomains>[number];
};

type PreparedFullPhoneBackupImport = {
  chatFloorBackups: ChatFloorBackup[];
  data: z.infer<typeof PhoneBackupFullDataSchema>;
  embeddedPluginPresets: PluginPresetBackupBundle | null;
  homeIconAssets: Array<{ data: string; id: string; name: string }>;
  plan: PhoneBackupImportPlan;
  stagedDomains: StagedPhoneBackupDomainImport[];
  stagedSettings: Settings;
  worldbooks: PhoneBackupWorldbook[];
};

type PhoneBackupWorldbook = { entries: unknown[]; name: string };

function decodeHomeIconBackupData(value: string) {
  let binary = '';
  try {
    binary = atob(value);
  } catch {
    throw new Error('图标资源不是有效的 base64 数据');
  }
  if (!binary.length || binary.length > 5 * 1024 * 1024) throw new Error('图标资源为空或超过 5 MB');
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function uploadHomeIconBackupAsset(asset: { data: string; id: string; name: string }) {
  const extension = asset.name.split('.').pop()?.toLowerCase() || '';
  if (!['gif', 'jpeg', 'jpg', 'png', 'webp'].includes(extension)) throw new Error(`图标资源格式不支持：${asset.name}`);
  decodeHomeIconBackupData(asset.data);
  const fileName = `phone-icon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      data: asset.data,
      name: fileName,
    }),
  });
  if (!response.ok) throw new Error(`图标资源上传失败：HTTP ${response.status}`);
  const result = await response.json();
  return String(result.path || `user/files/${fileName}`).replace(/^\/+/, '');
}

async function deleteImportedHomeIcon(path: string) {
  if (!path) return;
  const response = await fetch('/api/files/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ path }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`图标资源回滚删除失败：HTTP ${response.status}`);
}

type PreparedChatPhoneBackupImport = {
  plan: PhoneBackupImportPlan;
  stagedDomains: StagedPhoneBackupDomainImport[];
  sourceScopeKey: string;
  targetScopeKey: string;
};

function getBackupDomainData(backup: PhoneBackup, key: string) {
  return backup.data.domains[key] ?? _.get(backup.data, key);
}

function createEmptyEnvelope(): ChatScopedBackupEnvelope {
  return {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {},
  };
}

function cloneChatScopedEnvelope(raw: unknown): ChatScopedBackupEnvelope {
  if (!isChatScopedEnvelope(raw)) return createEmptyEnvelope();
  const legacyScopeMigrations = isRecord(raw.legacyScopeMigrations)
    ? Object.fromEntries(
        Object.entries(raw.legacyScopeMigrations).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : {};
  return {
    __chatScoped: true,
    legacyScopeMigrations,
    scopes: klona(raw.scopes),
  };
}

function stageDomainImports(
  entries: Array<{ data: unknown; domain: StagedPhoneBackupDomainImport['domain'] }>,
  domainVersions: Record<string, number> = {},
): StagedPhoneBackupDomainImport[] {
  return entries.map(entry => {
    const sourceVersion = domainVersions[entry.domain.key] ?? 1;
    if (sourceVersion > entry.domain.schemaVersion) {
      throw new Error(`备份域“${entry.domain.key}”版本 ${sourceVersion} 高于当前支持的 ${entry.domain.schemaVersion}`);
    }
    if (sourceVersion < entry.domain.schemaVersion && !entry.domain.migrateImport) {
      throw new Error(`备份域“${entry.domain.key}”缺少从版本 ${sourceVersion} 的迁移`);
    }
    const sourceData =
      sourceVersion < entry.domain.schemaVersion ? entry.domain.migrateImport!(entry.data, sourceVersion) : entry.data;
    const parsed = entry.domain.schema.safeParse(sourceData);
    if (!parsed.success) {
      throw new Error(`备份域“${entry.domain.key}”校验失败：${parsed.error.issues[0]?.message ?? '数据格式无效'}`);
    }
    return {
      data: klona(parsed.data),
      domain: entry.domain,
    };
  });
}

function getBackupDomainVersions() {
  return Object.fromEntries(getRegisteredPhoneBackupDomains().map(domain => [domain.key, domain.schemaVersion]));
}

function buildImportPlan(
  target: PhoneBackupImportPlan['target'],
  stagedDomains: StagedPhoneBackupDomainImport[],
  missingDomains: StagedPhoneBackupDomainImport['domain'][],
  unknownDomainKeys: string[],
): PhoneBackupImportPlan {
  return {
    domainsToReplace: stagedDomains.map(({ domain }) => backupDomainLabels[domain.key] ?? domain.key),
    missingDomainLabels: missingDomains.map(domain => backupDomainLabels[domain.key] ?? domain.key),
    target,
    unknownDomainKeys,
  };
}

function restoreExtensionSettings(snapshot: typeof extension_settings) {
  Object.keys(extension_settings).forEach(key => delete extension_settings[key]);
  Object.assign(extension_settings, snapshot);
}

async function commitBackupImport(commit: () => void, rehydrateHandlers: Array<() => void>) {
  const handlers = [...new Set(rehydrateHandlers)];
  await executeBackupImportTransaction({
    captureSnapshot: () => klona(extension_settings),
    commit,
    persist: () => saveSettingsDebounced(),
    rehydrate: () => handlers.forEach(handler => handler()),
    restoreSnapshot: restoreExtensionSettings,
  });
}

function getDomainRehydrateHandlers(stagedDomains: StagedPhoneBackupDomainImport[]) {
  return stagedDomains
    .map(({ domain }) => domain.rehydrateFromSettings)
    .filter((handler): handler is () => void => Boolean(handler));
}

function countBackupScopeData(domainKey: string, raw: unknown) {
  if (!isRecord(raw)) {
    return { collections: 0, items: 0 };
  }

  if (domainKey === 'summaries') {
    const books = Array.isArray(raw.books) ? raw.books : [];
    return {
      collections: books.length,
      items: books.reduce((sum, book) => sum + (Array.isArray(book.entries) ? book.entries.length : 0), 0),
    };
  }

  if (domainKey === 'diaries' || domainKey === 'letters') {
    const books = Array.isArray(raw.books) ? raw.books : [];
    return {
      collections: books.length,
      items: books.reduce((sum, book) => sum + (Array.isArray(book.entries) ? book.entries.length : 0), 0),
    };
  }

  if (domainKey === 'extras') {
    const books = Array.isArray(raw.books) ? raw.books : [];
    return {
      collections: books.length,
      items: books.reduce(
        (sum, book) =>
          sum +
          (Array.isArray(book.chapters) ? book.chapters.length : 0) +
          (Array.isArray(book.summaries) ? book.summaries.length : 0),
        0,
      ),
    };
  }

  if (domainKey === 'forum') {
    const boards = Array.isArray(raw.boards) ? raw.boards.filter(isRecord) : [];
    return {
      collections: boards.length,
      items: boards.reduce((sum, board) => {
        const threads = Array.isArray(board.threads) ? board.threads.filter(isRecord) : [];
        return (
          sum +
          threads.reduce(
            (threadSum, thread) => threadSum + 1 + (Array.isArray(thread.replies) ? thread.replies.length : 0),
            0,
          )
        );
      }, 0),
    };
  }

  if (domainKey === 'theater') {
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    return {
      collections: entries.length ? 1 : 0,
      items: entries.length,
    };
  }

  if (domainKey === 'digests') {
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    return {
      collections: entries.length ? 1 : 0,
      items: entries.length,
    };
  }

  if (domainKey === 'media' || domainKey === 'profiles') {
    const entries = Array.isArray(raw.entries) ? raw.entries.filter(isRecord) : [];
    return {
      collections: new Set(entries.map(entry => (typeof entry.kind === 'string' ? entry.kind : ''))).size,
      items: entries.length,
    };
  }

  if (domainKey === 'relationship' || domainKey === 'relationships') {
    const characters = Array.isArray(raw.characters) ? raw.characters : [];
    const links = Array.isArray(raw.links) ? raw.links : [];
    return {
      collections: characters.length ? 1 : 0,
      items: links.length,
    };
  }

  if (domainKey === 'world-slots') {
    const slots = Array.isArray(raw.slots) ? raw.slots : [];
    return {
      collections: (typeof raw.bookName === 'string' && raw.bookName.trim()) || slots.length ? 1 : 0,
      items: slots.length,
    };
  }

  if (domainKey === 'timekeeper') {
    const people = Array.isArray(raw.people) ? raw.people : [];
    const hasTimeSettings = ['calendar', 'eraName', 'current', 'delta'].some(key => typeof raw[key] !== 'undefined');
    return {
      collections: people.length || hasTimeSettings ? 1 : 0,
      items: people.length || hasTimeSettings ? Math.max(people.length, 1) : 0,
    };
  }

  if (domainKey === 'generation-tasks') {
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    return {
      collections: tasks.length ? 1 : 0,
      items: tasks.length,
    };
  }

  if (domainKey === 'preview-drafts') {
    const drafts = Array.isArray(raw.drafts) ? raw.drafts : [];
    return {
      collections: drafts.length ? 1 : 0,
      items: drafts.length,
    };
  }

  return { collections: 0, items: 0 };
}

function formatScopeLabel(scopeKey: string) {
  const marker = ':chat:';
  const index = scopeKey.lastIndexOf(marker);
  if (index < 0) return scopeKey;
  const owner = scopeKey.slice(0, index);
  const ownerName = owner.includes(':') ? owner.slice(owner.indexOf(':') + 1) : owner;
  const chatName = scopeKey.slice(index + marker.length);
  return `${ownerName || '未知角色'} / ${chatName === '__no_chat__' ? '未知聊天（旧数据）' : chatName || '未命名聊天'}`;
}

function sanitizeSettingsForJsonBackup(rawSettings: unknown) {
  const parsed = parsePrettified(Settings, klona(rawSettings ?? {}));
  parsed.layout = migrateHomeLayoutDockCapacity(parsed.layout);
  parsed.interfaceSize.dockColumns = Math.min(4, Math.max(3, parsed.interfaceSize.dockColumns));
  parsed.textProvider.externalProfiles.forEach(profile => {
    profile.apiKey = '';
  });
  if (parsed.wallpaper.mode === 'custom') {
    parsed.wallpaper.mode = parsed.wallpaper.presetId ? 'preset' : 'none';
  }
  parsed.wallpaper.customPath = '';
  parsed.wallpaper.customName = '';
  parsed.wallpaper.customWallpapers = [];
  parsed.wallpaper.selectedCustomId = '';
  parsed.customFont = {
    fonts: [],
    name: '',
    path: '',
    selectedFontId: '',
  };
  if (parsed.fontFamily.startsWith('TavernPhoneImportedFont')) {
    parsed.fontFamily = '';
  }
  (['light', 'dark'] as const).forEach(mode => {
    const profile = parsed.themeProfiles[mode];
    if (profile.wallpaperMode === 'custom') {
      profile.wallpaperMode = profile.wallpaperPresetId ? 'preset' : 'none';
    }
    profile.wallpaperCustomId = '';
    if (profile.fontFamily.startsWith('TavernPhoneImportedFont')) profile.fontFamily = '';
    if (profile.readerFontFamily.startsWith('TavernPhoneImportedFont')) profile.readerFontFamily = '';
  });
  return parsed;
}

export function buildPhoneBackup(
  options: {
    chatFloorBackups?: ChatFloorBackup[];
    homeIconAssets?: Array<{ data: string; id: string; name: string }>;
    pluginPresets?: PluginPresetBackupBundle;
    worldbooks?: PhoneBackupWorldbook[];
  } = {},
): PhoneBackup {
  const scopeKey = getCurrentChatScopeKey();
  const registeredDomains = getRegisteredPhoneBackupDomains();
  const domains = Object.fromEntries(registeredDomains.map(domain => [domain.key, domain.exportData(scopeKey)]));
  const pluginPresets = options.pluginPresets ? klona(options.pluginPresets) : null;

  return parsePrettified(PhoneBackupSchema, {
    backupKind: 'full',
    schemaVersion: options.chatFloorBackups ? 4 : options.homeIconAssets ? 3 : pluginPresets ? 2 : 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: sanitizeSettingsForJsonBackup(_.get(extension_settings, setting_field, {})),
      prompts: _.get(extension_settings, promptField, {}),
      bagu: _.get(extension_settings, baguField, {}),
      reader: _.get(extension_settings, readerSettingsField, {}),
      recoveries: _.get(extension_settings, recoveryField, {}),
      domains,
      domainVersions: Object.fromEntries(registeredDomains.map(domain => [domain.key, domain.schemaVersion])),
      ...(pluginPresets ? { pluginPresets } : {}),
      ...(options.homeIconAssets ? { homeIconAssets: options.homeIconAssets } : {}),
      ...(options.chatFloorBackups
        ? { chatFloorBackups: options.chatFloorBackups, worldbooks: options.worldbooks ?? [] }
        : {}),
    },
  });
}

async function readAssociatedWorldbooks(backups: ChatFloorBackup[]) {
  if (!backups.length) return [];
  const getCharWorldbookNames = getOptionalGlobalFunction<
    (characterName: string) => { additional: string[]; primary: string | null }
  >('getCharWorldbookNames');
  const getChatWorldbookName = getOptionalGlobalFunction<(chatName: 'current') => string | null>(
    'getChatWorldbookName',
  );
  const names = new Set<string>();
  backups
    .filter(backup => backup.owner.kind === 'char')
    .forEach(backup => {
      try {
        const binding = getCharWorldbookNames?.(backup.owner.displayName);
        if (binding?.primary) names.add(binding.primary);
        binding?.additional.forEach(name => names.add(name));
      } catch {
        // Orphaned chat backups still belong in the export even when their character card is gone.
      }
    });
  const currentChatWorldbook = getChatWorldbookName?.('current');
  if (currentChatWorldbook) names.add(currentChatWorldbook);
  if (!names.size) return [];
  const getWorldbook = getOptionalGlobalFunction<(name: string) => Promise<unknown[]>>('getWorldbook');
  if (!getWorldbook) throw new Error('当前环境无法读取聊天关联的世界书');
  return Promise.all([...names].map(async name => ({ entries: await getWorldbook(name), name })));
}

async function readHomeIconBackupAssets(settings: Settings) {
  return Promise.all(
    settings.homeIconAssets.map(async asset => {
      const response = await fetch(`/${asset.path.replace(/^\/+/, '')}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`图标资源读取失败：${asset.name}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error(`图标资源为空或超过 5 MB：${asset.name}`);
      let binary = '';
      bytes.forEach(byte => { binary += String.fromCharCode(byte); });
      return { data: btoa(binary), id: asset.id, name: asset.name };
    }),
  );
}

export async function buildCompletePhoneBackup() {
  const presetStore = usePluginPresetStore();
  const settings = sanitizeSettingsForJsonBackup(_.get(extension_settings, setting_field, {}));
  const chatFloorBackups = await listChatFloorBackups();
  return buildPhoneBackup({
    chatFloorBackups,
    homeIconAssets: await readHomeIconBackupAssets(settings),
    pluginPresets: await presetStore.exportBackupBundle(),
    worldbooks: await readAssociatedWorldbooks(chatFloorBackups),
  });
}

export async function downloadPhoneBackup() {
  const backup = await buildCompletePhoneBackup();
  downloadBackupObject(backup, `sillytavern-phone-backup-${timestampLabel(new Date())}.json`);
}

export function buildCurrentChatPhoneBackup(): PhoneBackup {
  const scopeKey = getCurrentChatScopeKey();
  const registeredDomains = getRegisteredPhoneBackupDomains();
  const chatDomains = selectCurrentChatBackupDomains(registeredDomains);
  const domains = Object.fromEntries(
    chatDomains.map(domain => {
      const envelope = cloneChatScopedEnvelope(domain.exportData(scopeKey));
      const currentScopeData = envelope.scopes[scopeKey];
      return [
        domain.key,
        {
          __chatScoped: true,
          legacyScopeMigrations: {},
          scopes: typeof currentScopeData === 'undefined' ? {} : { [scopeKey]: currentScopeData },
        },
      ];
    }),
  );

  return parsePrettified(PhoneBackupSchema, {
    backupKind: 'current-chat',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      domains,
      domainVersions: Object.fromEntries(chatDomains.map(domain => [domain.key, domain.schemaVersion])),
    },
  });
}

export function downloadCurrentChatPhoneBackup() {
  const backup = buildCurrentChatPhoneBackup();
  downloadBackupObject(backup, `sillytavern-phone-current-chat-${timestampLabel(new Date())}.json`);
}

function downloadBackupObject(backup: PhoneBackup, filename: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function parsePhoneBackupFile(file: File) {
  const text = await file.text();
  return parsePrettified(PhoneBackupSchema, JSON.parse(text));
}

export function listPhoneBackupScopeOptions(backup: PhoneBackup): PhoneBackupScopeOption[] {
  const scopes = new Map<string, PhoneBackupScopeOption>();

  getRegisteredPhoneBackupDomains()
    .filter(domain => domain.scope === 'chat')
    .forEach(domain => {
      const envelope = cloneChatScopedEnvelope(getBackupDomainData(backup, domain.key));
      Object.entries(envelope.scopes).forEach(([scopeKey, rawScopeData]) => {
        const count = countBackupScopeData(domain.key, rawScopeData);
        if (!count.collections && !count.items) return;

        const previous = scopes.get(scopeKey) ?? {
          collections: 0,
          domainLabels: [],
          items: 0,
          label: formatScopeLabel(scopeKey),
          scopeKey,
        };
        previous.collections += count.collections;
        previous.items += count.items;
        previous.domainLabels = [...new Set([...previous.domainLabels, backupDomainLabels[domain.key] ?? domain.key])];
        scopes.set(scopeKey, previous);
      });
    });

  return [...scopes.values()].sort(
    (left, right) => right.items - left.items || left.label.localeCompare(right.label, 'zh-CN'),
  );
}

function preparePhoneBackupScopeImport(backup: PhoneBackup, sourceScopeKey: string): PreparedChatPhoneBackupImport {
  const targetScopeKey = getCurrentChatScopeKey();
  const registeredDomains = getRegisteredPhoneBackupDomains().filter(domain => domain.scope === 'chat');
  const entries = registeredDomains.flatMap(domain => {
    const sourceEnvelope = cloneChatScopedEnvelope(getBackupDomainData(backup, domain.key));
    const sourceScopeData = sourceEnvelope.scopes[sourceScopeKey];
    if (typeof sourceScopeData === 'undefined') return [];

    const currentEnvelope = cloneChatScopedEnvelope(domain.exportData(targetScopeKey));
    currentEnvelope.scopes = {
      ...currentEnvelope.scopes,
      [targetScopeKey]: klona(sourceScopeData),
    };
    return [{ data: currentEnvelope, domain }];
  });
  const stagedDomains = stageDomainImports(entries, backup.data.domainVersions);
  if (!stagedDomains.length) {
    throw new Error('这份备份里没有可导入到当前聊天的创作内容');
  }
  const coverage = analyzeBackupDomainCoverage(
    registeredDomains,
    stagedDomains.map(({ domain }) => domain.key),
    Object.keys(backup.data.domains),
  );
  return {
    plan: buildImportPlan('current-chat', stagedDomains, coverage.missingDomains, coverage.unknownDomainKeys),
    stagedDomains,
    sourceScopeKey,
    targetScopeKey,
  };
}

export function planPhoneBackupScopeImport(backup: PhoneBackup, sourceScopeKey: string): PhoneBackupImportPlan {
  return preparePhoneBackupScopeImport(backup, sourceScopeKey).plan;
}

export async function importPhoneBackupScopeToCurrentChat(backup: PhoneBackup, sourceScopeKey: string) {
  const { stagedDomains, targetScopeKey } = preparePhoneBackupScopeImport(backup, sourceScopeKey);

  await commitBackupImport(() => {
    stagedDomains.forEach(({ data, domain }) => domain.importData(data));
  }, getDomainRehydrateHandlers(stagedDomains));
  return {
    importedDomains: stagedDomains.length,
    sourceScopeKey,
    targetScopeKey,
  };
}

export async function clearAllPhoneGeneratedContent() {
  const stagedDomains = stageDomainImports(
    selectGeneratedContentDomains(getRegisteredPhoneBackupDomains()).map(domain => ({
      data: createEmptyEnvelope(),
      domain,
    })),
    getBackupDomainVersions(),
  );
  await commitBackupImport(() => {
    stagedDomains.forEach(({ data, domain }) => {
      domain.importData(data);
    });
  }, getDomainRehydrateHandlers(stagedDomains));
}

function prepareFullPhoneBackupImport(
  backup: PhoneBackup,
  options: { allowLegacy?: boolean } = {},
): PreparedFullPhoneBackupImport {
  assertFullBackupImportAllowed(backup.backupKind ?? 'legacy', options.allowLegacy);

  const data = isFullPhoneBackup(backup) ? backup.data : parsePrettified(PhoneBackupFullDataSchema, backup.data);
  const registeredDomains = getRegisteredPhoneBackupDomains();
  const entries = registeredDomains.flatMap(domain => {
    const domainData = getBackupDomainData(backup, domain.key);
    return typeof domainData === 'undefined' ? [] : [{ data: domainData, domain }];
  });
  const stagedDomains = stageDomainImports(entries, data.domainVersions);
  const stagedSettings = sanitizeSettingsForJsonBackup(data.settings);
  const hasEmbeddedFiles = backup.backupKind === 'full' && (backup.schemaVersion === 3 || backup.schemaVersion === 4);
  const homeIconAssets = hasEmbeddedFiles ? backup.data.homeIconAssets : [];
  const chatFloorBackups =
    backup.backupKind === 'full' && backup.schemaVersion === 4
      ? z.array(ChatFloorBackupSchema).parse(backup.data.chatFloorBackups)
      : [];
  const worldbooks =
    backup.backupKind === 'full' && backup.schemaVersion === 4
      ? backup.data.worldbooks.map(worldbook => ({ entries: worldbook.entries, name: worldbook.name }))
      : [];
  if (!hasEmbeddedFiles) {
    stagedSettings.homeIconAssets = [];
    stagedSettings.visualTheme.appIconAssetIds = {};
    stagedSettings.themeProfiles.light.visualTheme.appIconAssetIds = {};
    stagedSettings.themeProfiles.dark.visualTheme.appIconAssetIds = {};
    stagedSettings.layout.folders.forEach(folder => { folder.iconAssetId = ''; });
  } else {
    const settingsIds = [...new Set(stagedSettings.homeIconAssets.map(asset => asset.id))].sort();
    const backupIds = [...new Set(homeIconAssets.map(asset => asset.id))].sort();
    if (
      settingsIds.length !== stagedSettings.homeIconAssets.length ||
      backupIds.length !== homeIconAssets.length ||
      settingsIds.join('\n') !== backupIds.join('\n')
    ) throw new Error('图标资源清单与设置引用不一致');
    const knownAssetIds = new Set(settingsIds);
    const referencedAssetIds = [
      ...Object.values(stagedSettings.visualTheme.appIconAssetIds),
      ...Object.values(stagedSettings.themeProfiles.light.visualTheme.appIconAssetIds),
      ...Object.values(stagedSettings.themeProfiles.dark.visualTheme.appIconAssetIds),
      ...stagedSettings.layout.folders.map(folder => folder.iconAssetId),
    ].filter(Boolean);
    if (referencedAssetIds.some(assetId => !knownAssetIds.has(assetId))) throw new Error('图标资源引用指向不存在的资源');
    homeIconAssets.forEach(asset => decodeHomeIconBackupData(asset.data));
  }
  const coverage = analyzeBackupDomainCoverage(
    registeredDomains,
    stagedDomains.map(({ domain }) => domain.key),
    Object.keys(backup.data.domains),
  );
  const embeddedPluginPresets = getEmbeddedPluginPresets(backup);
  const plan = buildImportPlan('full', stagedDomains, coverage.missingDomains, coverage.unknownDomainKeys);
  if (embeddedPluginPresets) plan.domainsToReplace.unshift('插件预设');
  if (homeIconAssets.length) plan.domainsToReplace.unshift('首页图标资源');
  if (chatFloorBackups.length) plan.domainsToReplace.unshift('聊天楼层备份');
  if (worldbooks.length) plan.domainsToReplace.unshift('关联世界书');
  return {
    chatFloorBackups,
    data,
    embeddedPluginPresets,
    homeIconAssets,
    plan,
    stagedDomains,
    stagedSettings,
    worldbooks,
  };
}

export function planPhoneFullBackupImport(
  backup: PhoneBackup,
  options: { allowLegacy?: boolean } = {},
): PhoneBackupImportPlan {
  return prepareFullPhoneBackupImport(backup, options).plan;
}

async function captureWorldbookSnapshot(worldbooks: PhoneBackupWorldbook[]) {
  if (!worldbooks.length) return { existing: [] as PhoneBackupWorldbook[], missingNames: [] as string[] };
  const getWorldbookNames = getOptionalGlobalFunction<() => string[]>('getWorldbookNames');
  const getWorldbook = getOptionalGlobalFunction<(name: string) => Promise<unknown[]>>('getWorldbook');
  if (!getWorldbookNames || !getWorldbook) throw new Error('当前环境无法恢复备份中的关联世界书');
  const existingNames = new Set(getWorldbookNames());
  const existing = await Promise.all(
    worldbooks
      .filter(worldbook => existingNames.has(worldbook.name))
      .map(async worldbook => ({ entries: await getWorldbook(worldbook.name), name: worldbook.name })),
  );
  return {
    existing,
    missingNames: worldbooks.filter(worldbook => !existingNames.has(worldbook.name)).map(worldbook => worldbook.name),
  };
}

async function replaceWorldbooks(worldbooks: PhoneBackupWorldbook[]) {
  if (!worldbooks.length) return;
  const replaceWorldbook = getOptionalGlobalFunction<
    (name: string, entries: unknown[], options?: { render?: 'none' }) => Promise<boolean>
  >('createOrReplaceWorldbook');
  if (!replaceWorldbook) throw new Error('当前环境无法写入备份中的关联世界书');
  for (const worldbook of worldbooks) await replaceWorldbook(worldbook.name, worldbook.entries, { render: 'none' });
}

async function restoreWorldbookSnapshot(snapshot: Awaited<ReturnType<typeof captureWorldbookSnapshot>>) {
  await replaceWorldbooks(snapshot.existing);
  if (!snapshot.missingNames.length) return;
  const deleteWorldbook = getOptionalGlobalFunction<(name: string) => Promise<boolean>>('deleteWorldbook');
  if (!deleteWorldbook) throw new Error('当前环境无法回滚新增的关联世界书');
  for (const name of snapshot.missingNames) await deleteWorldbook(name);
}

export async function applyPhoneBackup(backup: PhoneBackup, options: { allowLegacy?: boolean } = {}) {
  const prepared = prepareFullPhoneBackupImport(backup, options);
  const { chatFloorBackups, data, embeddedPluginPresets, homeIconAssets, stagedDomains, stagedSettings, worldbooks } =
    prepared;

  const commitSettings = () =>
    commitBackupImport(() => {
      _.set(extension_settings, setting_field, stagedSettings);
      _.set(extension_settings, promptField, klona(data.prompts));
      _.set(extension_settings, baguField, klona(data.bagu));
      _.set(extension_settings, readerSettingsField, klona(data.reader));
      _.set(extension_settings, recoveryField, klona(data.recoveries));
      stagedDomains.forEach(({ data: domainData, domain }) => {
        domain.importData(domainData);
      });
    }, getRegisteredPhoneBackupRehydrateHandlers());

  if (!embeddedPluginPresets && !homeIconAssets.length && !chatFloorBackups.length && !worldbooks.length) {
    await commitSettings();
    return;
  }

  const presetStore = usePluginPresetStore();
  const currentPluginPresets = embeddedPluginPresets ? await presetStore.exportBackupBundle() : null;
  const currentChatFloorBackups = chatFloorBackups.length ? await listChatFloorBackups() : [];
  const currentWorldbooks = await captureWorldbookSnapshot(worldbooks);
  const uploadedPaths: string[] = [];
  const restoreResources = async () => {
    await Promise.all(uploadedPaths.map(deleteImportedHomeIcon));
    if (embeddedPluginPresets && currentPluginPresets) await presetStore.replaceBackupBundle(currentPluginPresets);
    if (chatFloorBackups.length) await replaceChatFloorBackups(currentChatFloorBackups);
    await restoreWorldbookSnapshot(currentWorldbooks);
  };
  await executeBackupResourceTransaction({
    captureSnapshot: () => true,
    commitSettings,
    replaceResource: async () => {
      try {
        for (const asset of homeIconAssets) {
          const path = await uploadHomeIconBackupAsset(asset);
          uploadedPaths.push(path);
          const stagedAsset = stagedSettings.homeIconAssets.find(item => item.id === asset.id);
          if (stagedAsset) stagedAsset.path = path;
        }
        if (embeddedPluginPresets) await presetStore.replaceBackupBundle(embeddedPluginPresets);
        if (chatFloorBackups.length) await replaceChatFloorBackups(chatFloorBackups);
        await replaceWorldbooks(worldbooks);
      } catch (error) {
        await restoreResources();
        throw error;
      }
    },
    restoreResource: restoreResources,
  });
}
