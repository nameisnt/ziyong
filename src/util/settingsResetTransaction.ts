import type { PhoneAppResetContext, PhoneAppResetHandler, PhoneAppResetRollback } from '@/core/appRegistry';

export interface PhoneAppResetTransactionOptions<TSnapshot> {
  captureSnapshot: () => TSnapshot | Promise<TSnapshot>;
  handlers: PhoneAppResetHandler[];
  persist: () => void | Promise<void>;
  rehydrate: () => void;
  restoreSnapshot: (snapshot: TSnapshot) => void;
}

/**
 * Runs current-chat resets in one failure boundary. Extension settings provide
 * the internal snapshot; handlers register compensation only for effects that
 * live outside those settings, such as worldbook entry switches.
 */
export async function executePhoneAppResetTransaction<TSnapshot>(
  options: PhoneAppResetTransactionOptions<TSnapshot>,
): Promise<void> {
  const snapshot = await options.captureSnapshot();
  const rollbacks: PhoneAppResetRollback[] = [];
  const context: PhoneAppResetContext = {
    addRollback: rollback => rollbacks.push(rollback),
  };

  try {
    for (const handler of options.handlers) {
      await handler(context);
    }
    await options.persist();
  } catch (primaryError) {
    const rollbackErrors: unknown[] = [];
    for (const rollback of [...rollbacks].reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    try {
      options.restoreSnapshot(snapshot);
      options.rehydrate();
      await options.persist();
    } catch (settingsRollbackError) {
      rollbackErrors.push(settingsRollbackError);
    }

    if (rollbackErrors.length) {
      throw new AggregateError(
        [primaryError, ...rollbackErrors],
        '清空当前聊天失败，且恢复清空前数据时发生错误',
      );
    }
    throw primaryError;
  }
}
