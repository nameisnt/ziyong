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
    const hadPrevious = Object.hasOwn(extension_settings, recoveryField);
    const previous = _.get(extension_settings, recoveryField);
    _.set(extension_settings, recoveryField, parsed);
    try {
      await Promise.resolve(saveSettingsDebounced());
    } catch (error) {
      if (hadPrevious) _.set(extension_settings, recoveryField, previous);
      else delete extension_settings[recoveryField];
      throw error;
    }
    return parsed;
  }

  const entries = computed(() =>
    Object.values(data.value).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  );

  async function setRecovery(item: PendingVisibilityRecovery) {
    const nextData = {
      ...data.value,
      [item.scopeId]: item,
    };
    data.value = await persist(nextData);
  }

  async function deleteRecovery(scopeId: string) {
    if (!(scopeId in data.value)) return;
    const nextData = { ...data.value };
    delete nextData[scopeId];
    data.value = await persist(nextData);
  }

  async function clearAllRecoveries() {
    const nextData = {};
    data.value = await persist(nextData);
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
