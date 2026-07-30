import { PendingVisibilityRecoveryMapSchema, type PendingVisibilityRecovery } from '@/type/recovery';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const recoveryField = 'sillytavern_phone_pending_recoveries';

export const useRecoveryStore = defineStore('recovery', () => {
  const data = ref(validateInplace(PendingVisibilityRecoveryMapSchema, _.get(extension_settings, recoveryField, {})));

  async function persist(nextData: typeof data.value) {
    const parsed = validateInplace(PendingVisibilityRecoveryMapSchema, klona(nextData));
    _.set(extension_settings, recoveryField, parsed);
    await Promise.resolve(saveSettingsDebounced());
  }

  watch(
    data,
    nextData => {
      void persist(nextData);
    },
    { deep: true },
  );

  const entries = computed(() =>
    Object.values(data.value).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  );

  async function setRecovery(item: PendingVisibilityRecovery) {
    data.value = {
      ...data.value,
      [item.scopeId]: item,
    };
    await persist(data.value);
  }

  async function deleteRecovery(scopeId: string) {
    if (!(scopeId in data.value)) return;
    const nextData = { ...data.value };
    delete nextData[scopeId];
    data.value = nextData;
    await persist(data.value);
  }

  async function clearAllRecoveries() {
    data.value = {};
    await persist(data.value);
  }

  function rehydrateFromSettings() {
    data.value = validateInplace(PendingVisibilityRecoveryMapSchema, _.get(extension_settings, recoveryField, {}));
  }

  return {
    clearAllRecoveries,
    data,
    deleteRecovery,
    entries,
    rehydrateFromSettings,
    setRecovery,
  };
});
