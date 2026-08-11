import {
  confirmCharacterChatVisible,
  deleteNativeChatBackup,
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
  assertCleanupThreshold,
  isCleanupCandidate,
  parseChatBackupJsonl,
  type CleanupDeleteResult,
  type CleanupScanResult,
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
  const deletingFileName = ref('');
  const cleanupScanning = ref(false);
  const cleanupDeleting = ref(false);
  const cleanupScanResult = shallowRef<CleanupScanResult | null>(null);
  const cleanupDeleteResult = shallowRef<CleanupDeleteResult | null>(null);
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
      status.value =
        caughtError instanceof Error && caughtError.name === 'RecoveryApiUnavailableError' ? 'unsupported' : 'ready';
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

  function removeBackupSummary(fileName: string) {
    backups.value = backups.value.filter(backup => backup.fileName !== fileName);
    if (activeBackup.value?.summary.fileName === fileName) activeBackup.value = null;
  }

  async function deleteBackup(summary: ChatBackupSummary) {
    if (deletingFileName.value || cleanupDeleting.value) throw new Error('已有备份删除任务正在执行');
    const current = backups.value.find(backup => backup.fileName === summary.fileName);
    if (!current) throw new Error('这份备份已经不在当前书架中，请刷新后重试');
    deletingFileName.value = summary.fileName;
    try {
      await deleteNativeChatBackup(current);
      removeBackupSummary(current.fileName);
    } finally {
      deletingFileName.value = '';
    }
  }

  async function scanCleanup(maxChatItemsInput: number, groupId = '') {
    if (cleanupScanning.value || cleanupDeleting.value || deletingFileName.value) {
      throw new Error('已有备份清理任务正在执行');
    }
    const maxChatItems = assertCleanupThreshold(maxChatItemsInput);
    cleanupScanning.value = true;
    cleanupScanResult.value = null;
    cleanupDeleteResult.value = null;
    try {
      await refresh();
      if (error.value) throw new Error(error.value);
      const scopedBackups = groupId ? (groups.value.find(group => group.id === groupId)?.backups ?? []) : backups.value;
      const coarseCandidates = scopedBackups.filter(summary => summary.chatItems <= maxChatItems);
      const result: CleanupScanResult = { candidates: [], groupId, maxChatItems, rejected: [] };
      for (const summary of coarseCandidates) {
        try {
          const blob = await downloadNativeChatBackup(summary);
          const parsed = parseChatBackupJsonl(await blob.text());
          const mismatch = describeBackupMessageCountMismatch(summary.chatItems, parsed.messages.length);
          if (mismatch) {
            result.rejected.push({ reason: mismatch, summary });
          } else if (isCleanupCandidate(summary, parsed.messages.length, maxChatItems)) {
            result.candidates.push({ actualChatItems: parsed.messages.length, summary });
          }
        } catch (caughtError) {
          result.rejected.push({
            reason: caughtError instanceof Error ? caughtError.message : '备份预检失败',
            summary,
          });
        }
      }
      cleanupScanResult.value = result;
      return result;
    } finally {
      cleanupScanning.value = false;
    }
  }

  async function deleteCleanupCandidates(fileNames: string[]) {
    if (cleanupDeleting.value || deletingFileName.value) throw new Error('已有备份删除任务正在执行');
    const scan = cleanupScanResult.value;
    if (!scan) throw new Error('请先扫描要快速清理的备份');
    const selected = new Set(fileNames);
    const candidates = scan.candidates.filter(candidate => selected.has(candidate.summary.fileName));
    if (!candidates.length) throw new Error('没有选择要删除的备份');
    cleanupDeleting.value = true;
    const result: CleanupDeleteResult = { deleted: [], failed: [] };
    try {
      for (const candidate of candidates) {
        try {
          const current = backups.value.find(backup => backup.fileName === candidate.summary.fileName);
          if (!current || current.chatItems !== candidate.actualChatItems) {
            throw new Error('备份列表已变化，未执行删除');
          }
          const latestBlob = await downloadNativeChatBackup(current);
          const latestParsed = parseChatBackupJsonl(await latestBlob.text());
          if (!isCleanupCandidate(current, latestParsed.messages.length, scan.maxChatItems)) {
            throw new Error('备份内容在确认后发生变化，未执行删除');
          }
          await deleteNativeChatBackup(current);
          result.deleted.push(current);
          removeBackupSummary(current.fileName);
        } catch (caughtError) {
          result.failed.push({
            reason: caughtError instanceof Error ? caughtError.message : '删除失败',
            summary: candidate.summary,
          });
        }
      }
      cleanupDeleteResult.value = result;
      await refresh();
      return result;
    } finally {
      cleanupDeleting.value = false;
    }
  }

  function resetCleanup() {
    cleanupScanResult.value = null;
    cleanupDeleteResult.value = null;
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
          character =>
            character.id === expected.id && character.avatar === expected.avatar && character.name === expected.name,
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
    cleanupResult?: CleanupDeleteResult | null;
    cleanupScan?: CleanupScanResult | null;
    loaded?: LoadedChatBackup | null;
    result?: RecoveryImportResult | null;
  }) {
    backups.value = input.backups;
    characters.value = input.characters;
    activeBackup.value = input.loaded ?? null;
    importResult.value = input.result ?? null;
    cleanupScanResult.value = input.cleanupScan ?? null;
    cleanupDeleteResult.value = input.cleanupResult ?? null;
    error.value = '';
    status.value = 'ready';
  }

  return {
    activeBackup,
    backups,
    characters,
    cleanupDeleteResult,
    cleanupDeleting,
    cleanupScanning,
    cleanupScanResult,
    deleteBackup,
    deleteCleanupCandidates,
    deletingFileName,
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
    resetCleanup,
    scanCleanup,
    setVisualFixture,
    status,
  };
});
