<template>
  <div ref="shelfEl" class="pc-bookshelf" :class="variant">
    <div
      v-for="row in rows"
      :key="row[0]?.key"
      class="pc-shelf-row"
      :style="{ '--pc-shelf-column-count': columnCount }"
    >
      <button
        v-for="item in row"
        :key="item.key"
        :class="['pc-book-item', { opening: item.kind === 'book' && openingBookId === item.book.id }]"
        type="button"
        :disabled="Boolean(openingBookId)"
        @click="item.kind === 'create' ? emit('create') : openBook(item.book.id, $event)"
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

  <Teleport v-if="openingBook && bookTransitionStyle" to="#tavern-phone-root .pc-phone-shell">
    <div :class="['pc-book-transition-layer', `is-${openingPhase}`]" aria-hidden="true">
      <div class="pc-book-transition-volume" :style="bookTransitionStyle">
        <span class="pc-book-transition-page"></span>
        <span class="pc-book-cover pc-book-transition-cover" :data-paper="paper">
          <img
            v-if="openingBook.coverUrl && !failedCoverIds.has(openingBook.id)"
            class="pc-book-cover-image"
            :src="openingBook.coverUrl"
            alt=""
            @error="failedCoverIds.add(openingBook.id)"
          />
          <i v-else :class="openingBook.icon"></i>
          <b v-if="String(openingBook.count)">{{ openingBook.count }}</b>
        </span>
      </div>
    </div>
  </Teleport>
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
const openingPhase = ref<'idle' | 'lifting' | 'turning'>('idle');
const bookTransitionMetrics = ref<{
  height: number;
  left: number;
  targetHeight: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
  top: number;
  width: number;
} | null>(null);
const failedCoverIds = reactive(new Set<string>());
let openTimer: number | undefined;
let turnTimer: number | undefined;
let liftFrame: number | undefined;
let shelfObserver: ResizeObserver | undefined;

const emit = defineEmits<{
  create: [];
  select: [id: string];
}>();

const openingBook = computed(() => props.books.find(book => book.id === openingBookId.value) ?? null);
const bookTransitionStyle = computed(() => {
  const metrics = bookTransitionMetrics.value;
  if (!metrics) return null;
  return {
    '--pc-book-start-height': `${metrics.height}px`,
    '--pc-book-start-left': `${metrics.left}px`,
    '--pc-book-start-top': `${metrics.top}px`,
    '--pc-book-start-width': `${metrics.width}px`,
    '--pc-book-target-height': `${metrics.targetHeight}px`,
    '--pc-book-target-left': `${metrics.targetLeft}px`,
    '--pc-book-target-top': `${metrics.targetTop}px`,
    '--pc-book-target-width': `${metrics.targetWidth}px`,
  };
});

function openBook(id: string, event: MouseEvent) {
  if (openingBookId.value) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    emit('select', id);
    return;
  }

  const button = event.currentTarget as HTMLElement;
  const cover = button.querySelector<HTMLElement>('.pc-book-cover');
  const shell = button.closest<HTMLElement>('.pc-phone-shell');
  if (!cover || !shell) {
    emit('select', id);
    return;
  }
  const coverBounds = cover.getBoundingClientRect();
  const shellBounds = shell.getBoundingClientRect();
  const aspectRatio = coverBounds.width / coverBounds.height;
  const targetWidth = Math.min(shellBounds.width * 0.9, shellBounds.height * 0.76 * aspectRatio);
  const targetHeight = targetWidth / aspectRatio;

  bookTransitionMetrics.value = {
    height: coverBounds.height,
    left: coverBounds.left - shellBounds.left,
    targetHeight,
    targetLeft: shellBounds.width / 2,
    targetTop: (shellBounds.height - targetHeight) / 2,
    targetWidth,
    top: coverBounds.top - shellBounds.top,
    width: coverBounds.width,
  };
  openingBookId.value = id;
  openingPhase.value = 'idle';
  liftFrame = window.requestAnimationFrame(() => {
    openingPhase.value = 'lifting';
  });
  turnTimer = window.setTimeout(() => {
    openingPhase.value = 'turning';
  }, 170);
  openTimer = window.setTimeout(() => {
    openingBookId.value = '';
    openingPhase.value = 'idle';
    bookTransitionMetrics.value = null;
    emit('select', id);
  }, 540);
}

onScopeDispose(() => {
  if (openTimer !== undefined) window.clearTimeout(openTimer);
  if (turnTimer !== undefined) window.clearTimeout(turnTimer);
  if (liftFrame !== undefined) window.cancelAnimationFrame(liftFrame);
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

.pc-book-item.opening .pc-book-cover {
  opacity: 0;
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

.pc-book-transition-layer {
  position: absolute;
  z-index: 100;
  inset: 0;
  overflow: hidden;
  pointer-events: auto;
  perspective: 1200px;
}

.pc-book-transition-volume {
  position: absolute;
  top: var(--pc-book-start-top);
  left: var(--pc-book-start-left);
  width: var(--pc-book-start-width);
  height: var(--pc-book-start-height);
  transform-style: preserve-3d;
  transition:
    top 0.17s cubic-bezier(0.2, 0.78, 0.22, 1),
    left 0.17s cubic-bezier(0.2, 0.78, 0.22, 1),
    width 0.17s cubic-bezier(0.2, 0.78, 0.22, 1),
    height 0.17s cubic-bezier(0.2, 0.78, 0.22, 1);
}

.pc-book-transition-layer:is(.is-lifting, .is-turning) .pc-book-transition-volume {
  top: var(--pc-book-target-top);
  left: var(--pc-book-target-left);
  width: var(--pc-book-target-width);
  height: var(--pc-book-target-height);
}

.pc-book-transition-page {
  position: absolute;
  z-index: 1;
  inset: 0;
  border: 1px solid var(--pc-border);
  border-radius: 4px 10px 10px 4px;
  background-color: var(--pc-bg);
  background-image: var(--pc-paper-texture);
  background-position: center;
  background-size: cover;
  box-shadow: 8px 8px 28px rgba(0, 0, 0, 0.18);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}

.pc-book-transition-cover {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: visible;
  transition:
    transform 0.34s cubic-bezier(0.3, 0.72, 0.2, 1),
    box-shadow 0.34s ease-out;
}

.pc-book-transition-layer.is-turning .pc-book-transition-page {
  opacity: 1;
}

.pc-book-transition-layer.is-turning .pc-book-transition-cover {
  transform: rotateY(-162deg);
  box-shadow: -12px 8px 28px rgba(0, 0, 0, 0.22);
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
