export interface BackupResourceTransactionOptions<TSnapshot> {
  captureSnapshot: () => TSnapshot;
  commitSettings: () => void | Promise<void>;
  replaceResource: () => void | Promise<void>;
  restoreResource: (snapshot: TSnapshot) => void | Promise<void>;
}

/**
 * Coordinates an external resource replacement with the settings transaction
 * that references it. The resource is restored if the settings commit fails;
 * both errors remain visible when that restoration also fails.
 */
export async function executeBackupResourceTransaction<TSnapshot>(
  options: BackupResourceTransactionOptions<TSnapshot>,
): Promise<void> {
  const snapshot = options.captureSnapshot();
  await options.replaceResource();
  try {
    await options.commitSettings();
  } catch (primaryError) {
    try {
      await options.restoreResource(snapshot);
    } catch (rollbackError) {
      throw new AggregateError([primaryError, rollbackError], '完整备份恢复失败，且恢复原插件文件时发生错误');
    }
    throw primaryError;
  }
}
