<template>
  <div ref="shelfEl" class="pc-bookshelf" :class="variant">
    <div v-for="row in rows" :key="row[0]?.key" class="pc-shelf-row" :style="{ '--pc-shelf-column-count': row.length }">
      <button
        v-for="item in row"
        :key="item.key"
        :class="['pc-book-item', { opening: item.kind === 'book' && openingBookId === item.book.id }]"
        type="button"
        :disabled="Boolean(openingBookId)"
        @click="item.kind === 'create' ? emit('create') : openBook(item.book.id)"
      >
        <span :class="['pc-book-cover', { 'pc-add-cover': item.kind === 'create' }]" :data-paper="paper">
          <img
            v-if="item.kind === 'book' && item.book.coverUrl && !failedCoverIds.has(item.book.id)"
            class="pc-book-cover-image"
            :src="item.book.coverUrl"
            :alt="item.book.title"
            @error="failedCoverIds.add(item.book.id)"
          />
          <i v-else :class="item.kind === 'create' ? 'fa-solid fa-plus' : item.book.icon"></i>
          <b v-if="item.kind === 'book' && String(item.book.count)">{{ item.book.count }}</b>
        </span>
        <span class="pc-book-title">{{ item.kind === 'create' ? createLabel : item.book.title }}</span>
        <small v-if="item.kind === 'create' ? createSubtitle : item.book.subtitle">
          {{ item.kind === 'create' ? createSubtitle : item.book.subtitle }}
        </small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';

interface BookShelfCard {
  count: number | string;
  coverUrl?: string;
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

type ShelfItem = { book: BookShelfCard; key: string; kind: 'book' } | { key: string; kind: 'create' };

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
const shelfEl = ref<HTMLElement | null>(null);
const columnCount = ref(3);
const openingBookId = ref('');
const failedCoverIds = reactive(new Set<string>());
let openTimer: number | undefined;
let shelfObserver: ResizeObserver | undefined;

const emit = defineEmits<{
  create: [];
  select: [id: string];
}>();

function openBook(id: string) {
  if (openingBookId.value) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    emit('select', id);
    return;
  }
  openingBookId.value = id;
  openTimer = window.setTimeout(() => {
    openingBookId.value = '';
    emit('select', id);
  }, 210);
}

onScopeDispose(() => {
  if (openTimer !== undefined) window.clearTimeout(openTimer);
  shelfObserver?.disconnect();
});

const shelfItems = computed<ShelfItem[]>(() => [
  ...props.books.map(book => ({ book, key: `book:${book.id}`, kind: 'book' as const })),
  ...(props.showCreate ? [{ key: 'create', kind: 'create' as const }] : []),
]);

const rows = computed(() => {
  const result: ShelfItem[][] = [];
  for (let index = 0; index < shelfItems.value.length; index += columnCount.value) {
    result.push(shelfItems.value.slice(index, index + columnCount.value));
  }
  return result;
});

function updateColumnCount(width: number) {
  columnCount.value = Math.max(1, Math.floor((width + 15) / 99));
}

onMounted(() => {
  if (!shelfEl.value) return;
  updateColumnCount(shelfEl.value.clientWidth);
  shelfObserver = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width;
    if (width) updateColumnCount(width);
  });
  shelfObserver.observe(shelfEl.value);
});
</script>

<style scoped>
.pc-bookshelf {
  display: grid;
  gap: 24px;
  padding: 8px 0;
}

.pc-shelf-row {
  display: grid;
  grid-template-columns: repeat(var(--pc-shelf-column-count), minmax(0, 1fr));
  gap: 15px;
  padding: 0 2px 12px;
  border-bottom: 4px solid color-mix(in srgb, var(--pc-border) 70%, transparent 30%);
}

.pc-book-item {
  display: grid;
  width: 100%;
  min-width: 0;
  justify-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  perspective: 360px;
}

.pc-book-item:disabled {
  cursor: default;
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
  transform-origin: left center;
  transform-style: preserve-3d;
  transition:
    transform 0.21s ease-out,
    box-shadow 0.21s ease-out;
}

.pc-book-item.opening .pc-book-cover {
  transform: translateX(3px) rotateY(-28deg);
  box-shadow:
    -1px 0 2px rgba(0, 0, 0, 0.12),
    8px 5px 12px rgba(0, 0, 0, 0.18);
}

.pc-book-cover[data-paper='a4'] {
  border-color: color-mix(in srgb, var(--pc-accent) 24%, var(--pc-border) 76%);
  background-image:
    linear-gradient(
      90deg,
      transparent 0 14%,
      color-mix(in srgb, var(--pc-accent) 16%, transparent 84%) 14% 17%,
      transparent 17%
    ),
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

.pc-book-cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-add-cover {
  border-style: dashed;
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .pc-book-cover {
    transition: none;
  }
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
