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
  createDuplicateBackupGroups,
  isCleanupCandidate,
  parseChatBackupJsonl,
  type CleanupDeleteResult,
  type CleanupScanResult,
  type ChatBackupSummary,
  type DuplicateBackupFingerprint,
  type DuplicateDeleteResult,
  type DuplicateScanResult,
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
  const duplicateScanning = ref(false);
  const duplicateDeleting = ref(false);
  const duplicateScanCompleted = ref(0);
  const duplicateScanTotal = ref(0);
  const duplicateScanResult = shallowRef<DuplicateScanResult | null>(null);
  const duplicateDeleteResult = shallowRef<DuplicateDeleteResult | null>(null);
  const importResult = ref<RecoveryImportResult | null>(null);
  const status = ref<'idle' | 'ready' | 'unsupported'>('idle');
  const importedSources = new Map<string, RecoveryImportResult>();
  const runImportSingleFlight = createSingleFlight();

  const groups = computed(() => groupChatBackups(backups.value, characters.value));
  const managementBusy = computed(
    () =>
      Boolean(deletingFileName.value) ||
      cleanupScanning.value ||
      cleanupDeleting.value ||
      duplicateScanning.value ||
      duplicateDeleting.value,
  );

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
    if (managementBusy.value) throw new Error('已有备份扫描或删除任务正在执行');
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
    if (managementBusy.value) {
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
    if (managementBusy.value) throw new Error('已有备份扫描或删除任务正在执行');
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

  async function hashBackupBlob(blob: Blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map(item => item.toString(16).padStart(2, '0'))
      .join('');
  }

  async function fingerprintBackup(summary: ChatBackupSummary): Promise<DuplicateBackupFingerprint> {
    const blob = await downloadNativeChatBackup(summary);
    const parsed = parseChatBackupJsonl(await blob.text());
    const mismatch = describeBackupMessageCountMismatch(summary.chatItems, parsed.messages.length);
    if (mismatch) throw new Error(mismatch);
    return {
      actualChatItems: parsed.messages.length,
      byteLength: blob.size,
      contentHash: await hashBackupBlob(blob),
      summary,
    };
  }

  function getScopedBackups(groupId: string) {
    return groupId ? (groups.value.find(group => group.id === groupId)?.backups ?? []) : backups.value;
  }

  function getDuplicateCoarseCandidates(scopedBackups: ChatBackupSummary[]) {
    const coarseGroups = new Map<string, ChatBackupSummary[]>();
    scopedBackups.forEach(summary => {
      const key = `${summary.ownerKey}\u0000${summary.chatItems}\u0000${summary.fileSize}`;
      const items = coarseGroups.get(key) ?? [];
      items.push(summary);
      coarseGroups.set(key, items);
    });
    return [...coarseGroups.values()].filter(items => items.length > 1).flat();
  }

  async function scanDuplicateBackups(groupId = '') {
    if (managementBusy.value) throw new Error('已有备份扫描或删除任务正在执行');
    duplicateScanning.value = true;
    duplicateScanCompleted.value = 0;
    duplicateScanTotal.value = 0;
    duplicateScanResult.value = null;
    duplicateDeleteResult.value = null;
    try {
      await refresh();
      if (error.value) throw new Error(error.value);
      const candidates = getDuplicateCoarseCandidates(getScopedBackups(groupId));
      duplicateScanTotal.value = candidates.length;
      const fingerprints: DuplicateBackupFingerprint[] = [];
      const rejected: DuplicateScanResult['rejected'] = [];
      let nextIndex = 0;
      const worker = async () => {
        while (nextIndex < candidates.length) {
          const index = nextIndex;
          nextIndex += 1;
          const summary = candidates[index];
          if (!summary) continue;
          try {
            fingerprints.push(await fingerprintBackup(summary));
          } catch (caughtError) {
            rejected.push({
              reason: caughtError instanceof Error ? caughtError.message : '重复备份预检失败',
              summary,
            });
          } finally {
            duplicateScanCompleted.value += 1;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, () => worker()));
      const result: DuplicateScanResult = {
        groups: createDuplicateBackupGroups(fingerprints),
        groupId,
        rejected,
        scannedFiles: candidates.length,
      };
      duplicateScanResult.value = result;
      return result;
    } finally {
      duplicateScanning.value = false;
    }
  }

  function findDuplicateCandidate(fileName: string) {
    for (const group of duplicateScanResult.value?.groups ?? []) {
      const fingerprint = group.duplicates.find(item => item.summary.fileName === fileName);
      if (fingerprint) return { fingerprint, group };
    }
    return null;
  }

  async function deleteDuplicateBackups(fileNames: string[]) {
    if (managementBusy.value) throw new Error('已有备份扫描或删除任务正在执行');
    const scan = duplicateScanResult.value;
    if (!scan) throw new Error('请先扫描完全相同的重复备份');
    const selected = [...new Set(fileNames)].map(findDuplicateCandidate).filter(item => Boolean(item));
    if (!selected.length) throw new Error('没有选择要删除的重复备份');
    duplicateDeleting.value = true;
    const result: DuplicateDeleteResult = { deleted: [], failed: [], reclaimedBytes: 0 };
    try {
      for (const group of scan.groups) {
        const groupCandidates = selected.filter(item => item?.group.id === group.id);
        if (!groupCandidates.length) continue;
        let currentKeeper: DuplicateBackupFingerprint;
        try {
          const keeperSummary = backups.value.find(item => item.fileName === group.keeper.summary.fileName);
          if (!keeperSummary) throw new Error('预定保留的备份已经不存在，整组未删除');
          currentKeeper = await fingerprintBackup(keeperSummary);
          if (
            currentKeeper.contentHash !== group.contentHash ||
            currentKeeper.byteLength !== group.byteLength ||
            currentKeeper.summary.ownerKey !== group.keeper.summary.ownerKey
          ) {
            throw new Error('预定保留的备份内容已经变化，整组未删除');
          }
        } catch (caughtError) {
          const reason = caughtError instanceof Error ? caughtError.message : '无法复核预定保留的备份';
          groupCandidates.forEach(item => {
            if (item) result.failed.push({ reason, summary: item.fingerprint.summary });
          });
          continue;
        }

        for (const item of groupCandidates) {
          if (!item) continue;
          try {
            const current = backups.value.find(backup => backup.fileName === item.fingerprint.summary.fileName);
            if (!current) throw new Error('重复备份已经不存在，未执行删除');
            const latest = await fingerprintBackup(current);
            if (
              latest.contentHash !== currentKeeper.contentHash ||
              latest.byteLength !== currentKeeper.byteLength ||
              latest.actualChatItems !== currentKeeper.actualChatItems ||
              latest.summary.ownerKey !== currentKeeper.summary.ownerKey
            ) {
              throw new Error('备份内容在确认后发生变化，未执行删除');
            }
            await deleteNativeChatBackup(current);
            result.deleted.push(current);
            result.reclaimedBytes += latest.byteLength;
            removeBackupSummary(current.fileName);
          } catch (caughtError) {
            result.failed.push({
              reason: caughtError instanceof Error ? caughtError.message : '删除重复备份失败',
              summary: item.fingerprint.summary,
            });
          }
        }
      }
      duplicateDeleteResult.value = result;
      await refresh();
      return result;
    } finally {
      duplicateDeleting.value = false;
    }
  }

  function resetDuplicates() {
    duplicateScanCompleted.value = 0;
    duplicateScanTotal.value = 0;
    duplicateScanResult.value = null;
    duplicateDeleteResult.value = null;
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
    duplicateResult?: DuplicateDeleteResult | null;
    duplicateScan?: DuplicateScanResult | null;
    loaded?: LoadedChatBackup | null;
    result?: RecoveryImportResult | null;
  }) {
    backups.value = input.backups;
    characters.value = input.characters;
    activeBackup.value = input.loaded ?? null;
    importResult.value = input.result ?? null;
    cleanupScanResult.value = input.cleanupScan ?? null;
    cleanupDeleteResult.value = input.cleanupResult ?? null;
    duplicateScanResult.value = input.duplicateScan ?? null;
    duplicateDeleteResult.value = input.duplicateResult ?? null;
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
    deleteDuplicateBackups,
    deletingFileName,
    duplicateDeleteResult,
    duplicateDeleting,
    duplicateScanCompleted,
    duplicateScanning,
    duplicateScanResult,
    duplicateScanTotal,
    error,
    groups,
    importActiveBackup,
    importResult,
    importing,
    loading,
    managementBusy,
    readBackup,
    reading,
    refresh,
    releaseActiveBackup,
    resetCleanup,
    resetDuplicates,
    scanCleanup,
    scanDuplicateBackups,
    setVisualFixture,
    status,
  };
});
