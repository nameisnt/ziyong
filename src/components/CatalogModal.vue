<template>
  <div v-if="open" class="pc-catalog-mask" @click.self="emit('close')">
    <section class="pc-catalog-card" role="dialog" aria-modal="true" :aria-label="title">
      <header class="pc-catalog-head">
        <strong>{{ title }}</strong>
        <button class="pc-catalog-close" type="button" :title="t`关闭`" @click="emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <div class="pc-catalog-list">
        <button
          v-for="item in items"
          :key="item.id"
          :ref="el => setItemRef(item.id, el)"
          :class="['pc-catalog-item', { active: item.id === activeId }]"
          type="button"
          :title="item.title"
          @click="emit('select', item.id)"
        >
          <span>{{ item.title }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogModalItem } from '@/type/catalog';

const props = withDefaults(
  defineProps<{
    activeId?: string;
    items: CatalogModalItem[];
    open: boolean;
    title?: string;
  }>(),
  {
    activeId: '',
    title: '目录',
  },
);

const emit = defineEmits<{
  close: [];
  select: [id: string];
}>();

const itemRefs = new Map<string, HTMLElement>();

function setItemRef(itemId: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) {
    itemRefs.set(itemId, element);
    return;
  }
  itemRefs.delete(itemId);
}

function scrollActiveIntoView() {
  if (!props.open || !props.activeId) return;
  const activeElement = itemRefs.get(props.activeId);
  activeElement?.scrollIntoView({
    block: 'center',
    inline: 'nearest',
  });
}

watch(
  () => [props.open, props.activeId, props.items.length] as const,
  () => {
    if (!props.open) {
      itemRefs.clear();
      return;
    }
    void nextTick(scrollActiveIntoView);
  },
  { flush: 'post', immediate: true },
);
</script>

<style scoped>
.pc-catalog-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.26);
}

.pc-catalog-card {
  display: flex;
  flex-direction: column;
  width: min(82%, 300px);
  min-width: 0;
  max-width: calc(100% - 28px);
  height: min(72%, 520px);
  max-height: calc(100% - 36px);
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: var(--pc-bg);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.2);
}

.pc-catalog-head {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 10px;
}

.pc-catalog-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-catalog-close {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-bg) 96%, var(--pc-text) 4%);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-catalog-list {
  display: grid;
  align-content: start;
  gap: 8px;
  flex: 1 1 auto;
  grid-auto-rows: 46px;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 14px 14px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.pc-catalog-item {
  display: block;
  width: 100%;
  height: 46px;
  min-width: 0;
  border: 0;
  border-radius: 14px;
  background: color-mix(in srgb, var(--pc-bg) 96%, var(--pc-text) 4%);
  color: var(--pc-text);
  cursor: pointer;
  padding: 0 14px;
  text-align: left;
}

.pc-catalog-item.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-bg) 86%);
}

.pc-catalog-item span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
