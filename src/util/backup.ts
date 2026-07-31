import { getRegisteredPhoneBackupDomains } from '@/core/appRegistry';
import { baguField } from '@/store/bagu';
import { promptField } from '@/store/prompts';
import { recoveryField } from '@/store/recovery';
import { readerSettingsField } from '@/store/reader';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { PhoneBackupSchema, type PhoneBackup } from '@/type/backup';
import { parsePrettified } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { setting_field, Settings } from '@/type/settings';

export interface PhoneBackupScopeOption {
  collections: number;
  domainLabels: string[];
  items: number;
  label: string;
  scopeKey: string;
}

const backupDomainLabels: Record<string, string> = {
  'chat-insert': '插入工具',
  'cloud-media': '云媒体配置',
  comfy: 'ComfyUI',
  diaries: '日记',
  digests: '摘抄',
  'generation-aliases': '生成称呼替换',
  'generation-tasks': '生成任务',
  'entry-library': '条目库',
  extras: '番外',
  forum: '论坛',
  letters: '书信',
  media: '媒体生成',
  profiles: '资料表',
  'preview-drafts': '未保存预览',
  'preset-link': '预设绑定',
  'regex-display': '正则显示',
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

export function buildPhoneBackup(): PhoneBackup {
  const scopeKey = getCurrentChatScopeKey();
  const domains = Object.fromEntries(
    getRegisteredPhoneBackupDomains().map(domain => [domain.key, domain.exportData(scopeKey)]),
  );

  return parsePrettified(PhoneBackupSchema, {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: sanitizeSettingsForJsonBackup(_.get(extension_settings, setting_field, {})),
      prompts: _.get(extension_settings, promptField, {}),
      bagu: _.get(extension_settings, baguField, {}),
      reader: _.get(extension_settings, readerSettingsField, {}),
      recoveries: _.get(extension_settings, recoveryField, {}),
      domains,
    },
  });
}

export function downloadPhoneBackup() {
  const backup = buildPhoneBackup();
  downloadBackupObject(backup, `sillytavern-phone-backup-${timestampLabel(new Date())}.json`);
}

export function buildCurrentChatPhoneBackup(): PhoneBackup {
  const scopeKey = getCurrentChatScopeKey();
  const domains = Object.fromEntries(
    getRegisteredPhoneBackupDomains().map(domain => {
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
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: sanitizeSettingsForJsonBackup(_.get(extension_settings, setting_field, {})),
      prompts: _.get(extension_settings, promptField, {}),
      bagu: _.get(extension_settings, baguField, {}),
      reader: _.get(extension_settings, readerSettingsField, {}),
      recoveries: {},
      domains,
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

  getRegisteredPhoneBackupDomains().forEach(domain => {
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

export async function importPhoneBackupScopeToCurrentChat(backup: PhoneBackup, sourceScopeKey: string) {
  const targetScopeKey = getCurrentChatScopeKey();
  let importedDomains = 0;

  getRegisteredPhoneBackupDomains().forEach(domain => {
    const sourceEnvelope = cloneChatScopedEnvelope(getBackupDomainData(backup, domain.key));
    const sourceScopeData = sourceEnvelope.scopes[sourceScopeKey];
    if (typeof sourceScopeData === 'undefined') return;

    const currentEnvelope = cloneChatScopedEnvelope(domain.exportData(targetScopeKey));
    currentEnvelope.scopes = {
      ...currentEnvelope.scopes,
      [targetScopeKey]: klona(sourceScopeData),
    };
    domain.importData(currentEnvelope);
    importedDomains += 1;
  });

  if (!importedDomains) {
    throw new Error('这份备份里没有可导入到当前聊天的创作内容');
  }

  await saveSettingsDebounced();
  return {
    importedDomains,
    sourceScopeKey,
    targetScopeKey,
  };
}

export async function clearAllPhoneGeneratedContent() {
  getRegisteredPhoneBackupDomains().forEach(domain => {
    domain.importData(createEmptyEnvelope());
  });
  await saveSettingsDebounced();
}

export async function applyPhoneBackup(backup: PhoneBackup) {
  _.set(extension_settings, setting_field, sanitizeSettingsForJsonBackup(backup.data.settings));
  _.set(extension_settings, promptField, backup.data.prompts);
  _.set(extension_settings, baguField, backup.data.bagu);
  _.set(extension_settings, readerSettingsField, backup.data.reader);
  _.set(extension_settings, recoveryField, backup.data.recoveries);
  getRegisteredPhoneBackupDomains().forEach(domain => {
    const data = backup.data.domains[domain.key] ?? _.get(backup.data, domain.key);
    if (typeof data !== 'undefined') {
      domain.importData(data);
    }
  });
  await saveSettingsDebounced();
}
