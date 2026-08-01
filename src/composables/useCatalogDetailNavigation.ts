import type { CatalogModalItem } from '@/components/CatalogModal.vue';
import type { ComputedRef } from 'vue';

export function useCatalogDetailNavigation<T extends { id: string }>(
  items: ComputedRef<T[]>,
  activeItem: ComputedRef<T | null>,
  getTitle: (item: T) => string,
) {
  const activeIndex = computed(() => items.value.findIndex(item => item.id === activeItem.value?.id));
  const previousId = computed(() => (activeIndex.value > 0 ? items.value[activeIndex.value - 1]?.id || '' : ''));
  const nextId = computed(() => (activeIndex.value >= 0 ? items.value[activeIndex.value + 1]?.id || '' : ''));
  const catalogItems = computed<CatalogModalItem[]>(() =>
    items.value.map(item => ({
      id: item.id,
      title: getTitle(item),
    })),
  );

  return {
    catalogItems,
    nextId,
    previousId,
  };
}
