export interface BackupImportTransactionOptions<TSnapshot> {
  captureSnapshot: () => TSnapshot;
  commit: () => void;
  persist: () => void | Promise<void>;
  rehydrate: () => void;
  restoreSnapshot: (snapshot: TSnapshot) => void;
}

/**
 * Keeps backup writes and in-memory stores in the same failure boundary.
 * A failed commit, rehydrate, or persistence pass restores both persisted
 * settings and the stores that derive from them before reporting the error.
 */
export async function executeBackupImportTransaction<TSnapshot>(
  options: BackupImportTransactionOptions<TSnapshot>,
): Promise<void> {
  const snapshot = options.captureSnapshot();
  try {
    options.commit();
    options.rehydrate();
    await options.persist();
  } catch (primaryError) {
    options.restoreSnapshot(snapshot);
    try {
      options.rehydrate();
      await options.persist();
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        '备份导入失败，且恢复导入前数据时发生错误',
      );
    }
    throw primaryError;
  }
}
