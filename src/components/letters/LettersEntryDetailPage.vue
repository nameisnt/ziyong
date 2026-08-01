<template>
  <section class="pc-letters-page pc-letters-detail-page">
    <ReaderDetailShell
      actions-class="five"
      :content="entry.content"
      :favorite-active="entry.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :title="entry.title"
      @bagu="emit('bagu')"
      @bottom="emit('bottom')"
      @catalog="emit('update:catalogOpen', true)"
      @edit="emit('edit')"
      @favorite="emit('favorite')"
      @next="emit('next')"
      @previous="emit('previous')"
      @top="emit('top')"
    >
      <template #actions>
        <button class="pc-soft-btn" type="button" :title="t`回信`" @click="emit('reply')">
          <i class="fa-solid fa-reply"></i>
        </button>
        <button class="pc-soft-btn danger" type="button" :title="t`删除`" @click="emit('delete')">
          <i class="fa-solid fa-trash"></i>
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
import CatalogModal, { type CatalogModalItem } from '@/components/CatalogModal.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import type { LetterEntry } from '@/type/letter';

defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  entry: LetterEntry;
  nextId: string;
  previousId: string;
}>();

const emit = defineEmits<{
  bagu: [];
  bottom: [];
  delete: [];
  edit: [];
  favorite: [];
  next: [];
  previous: [];
  reply: [];
  selectCatalog: [entryId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
}>();
</script>

<style scoped>
.pc-letters-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-letters-detail-page {
  height: 100%;
  min-height: 0;
  gap: 10px;
}
</style>
