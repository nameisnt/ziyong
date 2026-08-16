export interface SettingsResourceDeletion {
  deleteResource: () => Promise<void>;
  removeReference: () => void;
}

/**
 * Keep the settings reference intact until the backing file has been removed.
 * A failed remote deletion can then be retried without losing the resource path.
 */
export async function commitSettingsResourceDeletion(transaction: SettingsResourceDeletion) {
  await transaction.deleteResource();
  transaction.removeReference();
}
