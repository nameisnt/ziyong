<template>
  <div class="pc-bookshelf" :class="variant">
    <div v-for="row in rows" :key="row[0]?.id" class="pc-shelf-row">
      <button v-for="book in row" :key="book.id" class="pc-book-item" type="button" @click="$emit('select', book.id)">
        <span class="pc-book-cover" :style="{ background: book.gradient }">
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
interface BookShelfCard {
  count: number | string;
  gradient: string;
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
  color: #fff;
  font-size: 24px;
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
