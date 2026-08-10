import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

export type DirectorySortKey = 'diaryDesc' | 'extrasDesc' | 'lettersDesc' | 'summaryDesc';

export function useDirectorySort(key: DirectorySortKey) {
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);

  return computed({
    get: () => settings.value.directorySort[key],
    set: value => {
      settings.value.directorySort[key] = value;
    },
  });
}
