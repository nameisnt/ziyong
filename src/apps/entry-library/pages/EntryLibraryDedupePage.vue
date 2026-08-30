<template>
  <section class="pc-entry-library-page pc-page-grid pc-page-grid-compact">
    <article class="pc-section-card pc-entry-dedupe-summary">
      <strong>80% 内容相似查重</strong><span>{{ pairs.length }} 组疑似重复</span>
    </article>
    <article v-for="pair in pairs" :key="pairKey(pair)" class="pc-section-card pc-entry-duplicate-pair">
      <header>
        <strong>{{ Math.round(pair.score * 100) }}%</strong
        ><button
          class="pc-icon-btn"
          type="button"
          title="保留两条"
          aria-label="保留两条"
          @click="$emit('dismiss', pair)"
        >
          <i class="fa-solid fa-check"></i>
        </button>
      </header>
      <div class="pc-entry-duplicate-columns">
        <section v-for="item in [pair.left, pair.right]" :key="item.id">
          <strong>{{ item.title }}</strong>
          <p>{{ compact(item.content) }}</p>
          <button class="pc-soft-btn danger compact" type="button" @click="$emit('delete-item', item.id)">
            删除这条收藏
          </button>
        </section>
      </div>
    </article>
    <EmptyState v-if="!pairs.length" title="没有发现超过 80% 的重复内容" />
  </section>
</template>
<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { DuplicateEntryPair } from '../store';
defineProps<{ pairKey: (pair: DuplicateEntryPair) => string; pairs: DuplicateEntryPair[] }>();
defineEmits<{ 'delete-item': [itemId: string]; dismiss: [pair: DuplicateEntryPair] }>();
function compact(content: string) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}
</script>
<style scoped>
.pc-entry-dedupe-summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.pc-entry-dedupe-summary span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-entry-duplicate-pair {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.pc-entry-duplicate-pair > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pc-entry-duplicate-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pc-entry-duplicate-columns > section {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}
.pc-entry-duplicate-columns p {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--pc-muted);
  font-size: 11px;
}
</style>
