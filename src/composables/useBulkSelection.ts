import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export function useBulkSelection(itemIds: MaybeRefOrGetter<string[]>) {
  const active = ref(false);
  const selectedIds = ref<string[]>([]);
  const selectedIdSet = computed(() => new Set(selectedIds.value));
  const ids = computed(() => toValue(itemIds));
  const allSelected = computed(() => Boolean(ids.value.length) && ids.value.every(id => selectedIdSet.value.has(id)));

  watch(ids, availableIds => {
    const available = new Set(availableIds);
    selectedIds.value = selectedIds.value.filter(id => available.has(id));
  });

  function start() {
    selectedIds.value = [];
    active.value = true;
  }

  function cancel() {
    selectedIds.value = [];
    active.value = false;
  }

  function setSelected(itemId: string, selected: boolean) {
    selectedIds.value = selected
      ? [...new Set([...selectedIds.value, itemId])]
      : selectedIds.value.filter(id => id !== itemId);
  }

  function toggleAll() {
    selectedIds.value = allSelected.value ? [] : [...ids.value];
  }

  return { active, allSelected, cancel, selectedIds, selectedIdSet, setSelected, start, toggleAll };
}
