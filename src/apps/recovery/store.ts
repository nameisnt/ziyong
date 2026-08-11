import {
  confirmCharacterChatVisible,
  downloadNativeChatBackup,
  importNativeCharacterBackup,
  listNativeChatBackups,
  refreshRecoveryCharacters,
} from '@/apps/recovery/api';
import {
  createRecoveryCharacters,
  createSingleFlight,
  describeBackupMessageCountMismatch,
  groupChatBackups,
  parseChatBackupJsonl,
  type ChatBackupSummary,
  type ParsedChatBackup,
  type RecoveryCharacter,
} from '@/apps/recovery/model';

export interface LoadedChatBackup {
  blob: Blob;
  messageCountMismatch: string;
  parsed: ParsedChatBackup;
  summary: ChatBackupSummary;
}

export interface RecoveryImportResult {
  fileName: string;
  target: RecoveryCharacter;
  verified: boolean;
}

export const useChatRecoveryStore = defineStore('chat-recovery', () => {
  const backups = ref<ChatBackupSummary[]>([]);
  const characters = ref<RecoveryCharacter[]>([]);
  const activeBackup = shallowRef<LoadedChatBackup | null>(null);
  const error = ref('');
  const loading = ref(false);
  const reading = ref(false);
  const importing = ref(false);
  const importResult = ref<RecoveryImportResult | null>(null);
  const status = ref<'idle' | 'ready' | 'unsupported'>('idle');
  const importedSources = new Map<string, RecoveryImportResult>();
  const runImportSingleFlight = createSingleFlight();

  const groups = computed(() => groupChatBackups(backups.value, characters.value));

  async function refresh() {
    loading.value = true;
    error.value = '';
    try {
      const [rawCharacters, summaries] = await Promise.all([refreshRecoveryCharacters(), listNativeChatBackups()]);
      characters.value = createRecoveryCharacters(rawCharacters);
      backups.value = summaries;
      status.value = 'ready';
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : '读取聊天备份失败';
      status.value = caughtError instanceof Error && caughtError.name === 'RecoveryApiUnavailableError' ? 'unsupported' : 'ready';
    } finally {
      loading.value = false;
    }
  }

  async function readBackup(summary: ChatBackupSummary) {
    reading.value = true;
    error.value = '';
    try {
      const blob = await downloadNativeChatBackup(summary);
      const parsed = parseChatBackupJsonl(await blob.text());
      activeBackup.value = {
        blob,
        messageCountMismatch: describeBackupMessageCountMismatch(summary.chatItems, parsed.messages.length),
        parsed,
        summary,
      };
      importResult.value = null;
      return activeBackup.value;
    } finally {
      reading.value = false;
    }
  }

  function releaseActiveBackup() {
    activeBackup.value = null;
    importResult.value = null;
  }

  function resolveCurrentTarget(targetId: number) {
    const expected = characters.value.find(character => character.id === targetId);
    if (!expected) throw new Error('目标角色卡已经不存在，请返回书架刷新后重新选择');
    return expected;
  }

  async function importActiveBackup(targetId: number) {
    return runImportSingleFlight(async () => {
      const loaded = activeBackup.value;
      if (!loaded) throw new Error('尚未读取要导入的聊天备份');
      if (!loaded.parsed.messages.length) throw new Error('这份备份只有 metadata，没有可导入的聊天楼层');
      if (loaded.messageCountMismatch) throw new Error(loaded.messageCountMismatch);
      const previous = importedSources.get(loaded.summary.fileName);
      if (previous) return previous;
      importing.value = true;
      error.value = '';
      try {
        const rawCharacters = await refreshRecoveryCharacters();
        const currentCharacters = createRecoveryCharacters(rawCharacters);
        const expected = resolveCurrentTarget(targetId);
        const target = currentCharacters.find(
          character => character.id === expected.id && character.avatar === expected.avatar && character.name === expected.name,
        );
        if (!target) throw new Error('目标角色卡在确认后发生变化，已停止导入');
        const fileName = await importNativeCharacterBackup(loaded.blob, loaded.summary, target);
        let verified = false;
        try {
          verified = await confirmCharacterChatVisible(target.id, fileName);
        } catch {
          // Native import already succeeded. Preserve that result so a verification outage cannot create a duplicate import.
        }
        const result = {
          fileName,
          target,
          verified,
        };
        importedSources.set(loaded.summary.fileName, result);
        importResult.value = result;
        await refresh();
        return result;
      } finally {
        importing.value = false;
      }
    });
  }

  function setVisualFixture(input: {
    backups: ChatBackupSummary[];
    characters: RecoveryCharacter[];
    loaded?: LoadedChatBackup | null;
    result?: RecoveryImportResult | null;
  }) {
    backups.value = input.backups;
    characters.value = input.characters;
    activeBackup.value = input.loaded ?? null;
    importResult.value = input.result ?? null;
    error.value = '';
    status.value = 'ready';
  }

  return {
    activeBackup,
    backups,
    characters,
    error,
    groups,
    importActiveBackup,
    importResult,
    importing,
    loading,
    readBackup,
    reading,
    refresh,
    releaseActiveBackup,
    setVisualFixture,
    status,
  };
});
