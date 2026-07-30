<template>
  <section ref="rootEl" class="pc-favorites-app">
    <section class="pc-favorites-page">
      <input
        :value="query"
        class="pc-search favorites-search"
        type="text"
        :placeholder="t`搜索标题/来源`"
        @input="onQueryInput"
      />

      <div class="favorites-toolbar">
        <select :value="filter" class="favorite-select" @change="onFilterSelect">
          <option
            v-for="option in filterOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <span>{{ `${visibleItems.length} 项` }}</span>
      </div>

      <section class="favorites-content">
        <div class="favorites-scroll">
          <div v-if="visibleItems.length" class="ios-list">
            <button v-for="item in visibleItems" :key="item.key" class="ios-item" type="button" @click="handleCardClick(item)">
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

function onFilterSelect(event: Event) {
  favorites.setFilter((event.target as HTMLSelectElement).value as FavoriteFilter);
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

.pc-search {
  width: 100%;
  height: 32px;
  min-height: 32px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 7px 10px;
  font-size: 12px;
}

.favorites-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.favorite-select {
  width: 100%;
  min-width: 0;
  height: 38px;
  border: 1px solid var(--pc-border);
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  padding: 0 34px 0 14px;
  font-size: 12px;
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

.ios-list {
  overflow: hidden;
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
}

.ios-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  width: 100%;
  gap: 8px;
  border: 0;
  border-bottom: 0.5px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 9px 12px;
  text-align: left;
}

.ios-item:last-child {
  border-bottom: 0;
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
