import { getRegisteredPhoneApps, getRegisteredPhoneFavoriteItems, type PhoneFavoriteItem } from '@/core/appRegistry';

export type FavoriteFilter = 'all' | string;
export type FavoriteItem = PhoneFavoriteItem;

export const useFavoritesStore = defineStore('favorites', () => {
  const filter = ref<FavoriteFilter>('all');
  const query = ref('');
  const listScrollTop = ref(0);

  const allItems = computed<FavoriteItem[]>(() => getRegisteredPhoneFavoriteItems());

  const counts = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {
      all: allItems.value.length,
    };
    getRegisteredPhoneApps().forEach(app => {
      result[app.id] = allItems.value.filter(item => item.appId === app.id).length;
    });
    return result;
  });

  const visibleItems = computed(() => {
    const filteredByType =
      filter.value === 'all' ? allItems.value : allItems.value.filter(item => item.appId === filter.value);

    const normalized = query.value.trim().toLowerCase();
    if (!normalized) return filteredByType;

    return filteredByType.filter(
      item =>
        item.title.toLowerCase().includes(normalized) ||
        item.bookTitle.toLowerCase().includes(normalized) ||
        item.subtitle.toLowerCase().includes(normalized),
    );
  });

  function setFilter(next: FavoriteFilter) {
    filter.value = next;
  }

  function setQuery(next: string) {
    query.value = next;
  }

  function rememberScroll(top: number) {
    listScrollTop.value = Math.max(0, top);
  }

  function clearSelection() {
    filter.value = 'all';
    query.value = '';
    listScrollTop.value = 0;
  }

  function removeFavorite(item: FavoriteItem) {
    item.removeFavorite?.();
  }

  return {
    allItems,
    clearSelection,
    counts,
    filter,
    listScrollTop,
    query,
    rememberScroll,
    removeFavorite,
    setFilter,
    setQuery,
    visibleItems,
  };
});
