<template>
  <section class="pc-summary-page pc-summary-detail-page">
    <ReaderDetailShell
      :content="entry.content"
      display-app-id="summary"
      eraser-enabled
      :favorite-active="entry.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :title="entry.title"
      @bagu="emit('bagu')"
      @bottom="emit('bottom')"
      @catalog="emit('update:catalogOpen', true)"
      @edit="emit('edit')"
      @erase="emit('erase', $event)"
      @favorite="emit('favorite')"
      @next="emit('next')"
      @previous="emit('previous')"
      @top="emit('top')"
    >
      <template #kicker>
        <span class="pc-kicker">{{ entry.rangeLabel }}</span>
      </template>
      <template #actions>
        <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="emit('delete')">
          <i class="fa-solid fa-trash"></i>
          <span>{{ t`删除` }}</span>
        </button>
      </template>
      <template #overlays>
        <CatalogModal
          :active-id="entry.id"
          :items="catalogItems"
          :open="catalogOpen"
          @close="emit('update:catalogOpen', false)"
          @select="emit('selectCatalog', $event)"
        />
      </template>
    </ReaderDetailShell>
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import type { CatalogModalItem } from '@/type/catalog';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import type { SummaryEntry } from '@/type/summary';

defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  entry: SummaryEntry;
  nextId: string;
  previousId: string;
}>();

const emit = defineEmits<{
  bagu: [];
  bottom: [];
  delete: [];
  edit: [];
  erase: [content: string];
  favorite: [];
  next: [];
  previous: [];
  selectCatalog: [entryId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
}>();
</script>

<style scoped>
.pc-summary-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-summary-detail-page {
  height: 100%;
  min-height: 0;
  gap: 10px;
}
</style>
