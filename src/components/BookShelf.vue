<template>
  <div class="pc-bookshelf" :class="variant">
    <div v-for="row in rows" :key="row[0]?.id" class="pc-shelf-row">
      <button v-for="book in row" :key="book.id" class="pc-book-item" type="button" @click="$emit('select', book.id)">
        <span class="pc-book-cover" :data-paper="paper">
          <i :class="book.icon"></i>
          <b>{{ book.count }}</b>
        </span>
        <span class="pc-book-title">{{ book.title }}</span>
        <small>{{ book.subtitle }}</small>
      </button>
    </div>
    <div v-if="showCreate" class="pc-shelf-row">
      <button class="pc-book-item" type="button" @click="$emit('create')">
        <span class="pc-book-cover pc-add-cover">
          <i class="fa-solid fa-plus"></i>
        </span>
        <span class="pc-book-title">{{ createLabel }}</span>
        <small>{{ createSubtitle }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';

interface BookShelfCard {
  count: number | string;
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

const props = withDefaults(
  defineProps<{
    books: BookShelfCard[];
    createLabel?: string;
    createSubtitle?: string;
    showCreate?: boolean;
    variant?: 'diary' | 'extras';
  }>(),
  {
    createLabel: '新建',
    createSubtitle: '生成入口',
    showCreate: true,
    variant: 'diary',
  },
);
const settingsStore = useSettingsStore();
const paper = computed(() => settingsStore.settings.visualTheme.paperTextureId);

defineEmits<{
  create: [];
  select: [id: string];
}>();

const rows = computed(() => {
  const result: BookShelfCard[][] = [];
  for (let index = 0; index < props.books.length; index += 3) {
    result.push(props.books.slice(index, index + 3));
  }
  return result;
});
</script>

<style scoped>
.pc-bookshelf {
  display: grid;
  gap: 24px;
  padding: 8px 0;
}

.pc-shelf-row {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding: 0 2px 12px;
  border-bottom: 4px solid color-mix(in srgb, var(--pc-border) 70%, transparent 30%);
  scrollbar-width: none;
}

.pc-shelf-row::-webkit-scrollbar {
  display: none;
}

.pc-book-item {
  display: grid;
  width: 84px;
  flex: 0 0 auto;
  justify-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-book-cover {
  position: relative;
  display: grid;
  width: 70px;
  height: 100px;
  place-items: center;
  overflow: hidden;
  border-radius: 4px 8px 8px 4px;
  box-shadow:
    -2px 0 5px rgba(0, 0, 0, 0.18),
    2px 4px 8px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--pc-border);
  background-color: var(--pc-surface-strong);
  background-image: var(--pc-paper-texture);
  background-size: 180px 180px;
  color: var(--pc-text);
  font-size: 24px;
}

.pc-book-cover[data-paper='a4'] {
  border-color: color-mix(in srgb, var(--pc-accent) 24%, var(--pc-border) 76%);
  background-image:
    linear-gradient(90deg, transparent 0 14%, color-mix(in srgb, var(--pc-accent) 16%, transparent 84%) 14% 17%, transparent 17%),
    var(--pc-paper-texture);
  color: color-mix(in srgb, var(--pc-accent) 68%, var(--pc-text) 32%);
}

.pc-book-cover[data-paper='graphite'] {
  border-color: color-mix(in srgb, #d8dde3 42%, var(--pc-border) 58%);
  background-color: #202226;
  color: #e5e7eb;
}

.pc-book-cover[data-paper='parchment'] {
  border-color: #73502f;
  background-color: #d6ae72;
  color: #4a2d1a;
}

.pc-book-cover[data-paper='velvet'] {
  border-color: #b78745;
  background-color: #3b182b;
  color: #e3bd78;
}

.pc-book-cover[data-paper='xuan'] {
  border-color: color-mix(in srgb, var(--pc-text) 34%, var(--pc-border) 66%);
  background-color: #eeeade;
  color: #1d2925;
}

.pc-book-cover[data-paper='cypress'] {
  border-color: #668f7d;
  background-color: #10241f;
  color: #d9eee4;
}

.pc-book-cover[data-paper='sky'] {
  border-color: color-mix(in srgb, var(--pc-accent) 42%, var(--pc-border) 58%);
  background-color: #dff2ff;
  background-image:
    linear-gradient(145deg, transparent 0 64%, rgba(244, 114, 182, 0.13) 64% 74%, transparent 74%),
    var(--pc-paper-texture);
  color: #16557b;
}

.pc-book-cover:is([data-paper='ocean'], [data-paper='cardstock']) {
  border-color: color-mix(in srgb, var(--pc-accent) 62%, white 38%);
  background-color: var(--pc-bg);
  color: color-mix(in srgb, var(--pc-accent) 65%, white 35%);
}

.extras .pc-book-cover {
  width: 76px;
  height: 110px;
  border-radius: 6px 16px 16px 6px;
}

.pc-book-cover::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
  background: rgba(255, 255, 255, 0.32);
  content: '';
}

.pc-book-cover b {
  position: absolute;
  right: 6px;
  bottom: 5px;
  font-size: 10px;
}

.pc-add-cover {
  border: 1px dashed var(--pc-border);
  background: var(--pc-surface-strong);
  box-shadow: none;
  color: var(--pc-muted);
}

.pc-book-title,
small {
  width: 100%;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-book-title {
  font-size: 11px;
  font-weight: 650;
}

small {
  color: var(--pc-muted);
  font-size: 10px;
}
</style>
