<template>
  <section ref="rootEl" class="pc-favorites-app">
    <section class="pc-favorites-page">
      <label class="pc-search-field favorites-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input :value="query" type="search" :placeholder="t`搜索标题或来源`" @input="onQueryInput" />
      </label>

      <div class="pc-compact-toolbar pc-directory-toolbar favorites-toolbar">
        <SearchableCombobox
          :model-value="filter"
          :options="filterOptions"
          :placeholder="t`选择或搜索类型`"
          @update:model-value="favorites.setFilter($event as FavoriteFilter)"
        />
        <span class="pc-list-row-meta">{{ `${visibleItems.length} 项` }}</span>
      </div>

      <section class="favorites-content">
        <div class="favorites-scroll">
          <div v-if="visibleItems.length" class="pc-directory-list ios-list">
            <button
              v-for="item in visibleItems"
              :key="item.key"
              class="pc-list-row ios-item"
              type="button"
              @click="handleCardClick(item)"
            >
              <span class="item-icon" :style="{ '--favorite-accent': getTypeAccent(item.appId) }">
                <i :class="getTypeIcon(item.appId)"></i>
              </span>
              <span class="item-main">
                <b>{{ item.title }}</b>
                <small>{{ item.bookTitle }} · {{ item.subtitle }}</small>
              </span>
              <em>{{ getTypeLabel(item.appId) }}</em>
              <i class="fa-solid fa-chevron-right chevron"></i>
            </button>
          </div>
          <EmptyState v-else :title="query ? t`没有匹配的内容。` : t`还没有收藏内容。`" />
        </div>
      </section>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegisteredPhoneApps, getRegisteredPhoneApp } from '@/core/appRegistry';
import { useFavoritesStore, type FavoriteFilter, type FavoriteItem } from '@/store/favorites';
import { storeToRefs } from 'pinia';

const favorites = useFavoritesStore();

const rootEl = ref<HTMLElement | null>(null);
const { counts, filter, query, visibleItems } = storeToRefs(favorites);

const filterOptions = computed(() => [
  { value: 'all' as const, label: `全部 ${counts.value.all}` },
  ...getRegisteredPhoneApps()
    .filter(app => counts.value[app.id])
    .map(app => ({ value: app.id, label: `${app.name} ${counts.value[app.id] ?? 0}` })),
]);

onMounted(() => {
  nextTick(() => {
    const screen = getScreenElement();
    if (screen) screen.scrollTop = favorites.listScrollTop;
  });
});

function getScreenElement() {
  return rootEl.value?.closest('.pc-screen') as HTMLElement | null;
}

function rememberCurrentScroll() {
  favorites.rememberScroll(getScreenElement()?.scrollTop ?? 0);
}

function onQueryInput(event: Event) {
  favorites.setQuery((event.target as HTMLInputElement).value);
}

function handleCardClick(item: FavoriteItem) {
  if (item.exists && !item.exists()) {
    toastr.warning('原内容已经不存在，收藏列表会自动刷新');
    return;
  }

  rememberCurrentScroll();
  item.open?.();
}

function getTypeLabel(appId: FavoriteItem['appId']) {
  return getRegisteredPhoneApp(appId)?.name || appId;
}

function getTypeIcon(appId: FavoriteItem['appId']) {
  const icon = getRegisteredPhoneApp(appId)?.icon || 'fa-bookmark';
  return `fa-solid ${icon}`;
}

function getTypeAccent(appId: FavoriteItem['appId']) {
  return getRegisteredPhoneApp(appId)?.accent || 'var(--pc-theme-accent)';
}
</script>

<style scoped>
.pc-favorites-app,
.pc-favorites-page {
  min-height: 100%;
}

.pc-favorites-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.favorites-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.favorites-toolbar span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 38px;
  border-radius: 999px;
  background: color-mix(in srgb, #ffb703 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-muted);
  font-size: 11px;
  white-space: nowrap;
}

.ios-item small,
.ios-item em,
.chevron {
  color: var(--pc-muted);
}

.favorites-content {
  min-height: 0;
  overflow: hidden;
}

.favorites-scroll {
  display: grid;
  align-content: start;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

.ios-item {
  grid-template-columns: auto 1fr auto auto;
}

.item-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--favorite-accent, var(--pc-theme-accent)) 86%, var(--pc-surface-strong) 14%);
  color: #fff;
  font-size: 12px;
}

.item-main {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.ios-item b,
.ios-item small,
.ios-item em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ios-item b {
  font-size: 13px;
}

.ios-item small,
.ios-item em,
.chevron {
  font-size: 11px;
  font-style: normal;
}
</style>
