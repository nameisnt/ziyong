<template>
  <section class="pc-diary-page pc-diary-detail-page pc-page-stack">
    <ReaderDetailShell
      actions-class="five"
      :content="entry.content"
      :context-label="entry.kind === 'read-reaction' ? t`阅读感想` : t`日记`"
      display-app-id="diary"
      :favorite-active="entry.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :reasoning="entry.generationRecord?.reasoning"
      reasoning-editable
      :source-label="entry.generationRecord?.replay.source.label"
      :title="entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title"
      :updated-at="entry.updatedAt"
      @bagu="emit('bagu')"
      @bottom="emit('bottom')"
      @catalog="emit('update:catalogOpen', true)"
      @edit="emit('edit')"
      @favorite="emit('favorite')"
      @next="emit('next')"
      @previous="emit('previous')"
      @top="emit('top')"
      @update:reasoning="emit('update:reasoning', $event)"
    >
      <template v-if="entry.occurredAt" #meta>
        <div class="pc-detail-meta">
          <span>{{ entry.occurredAt }}</span>
        </div>
      </template>
      <template #after-content>
        <div v-if="entry.readers?.length" class="pc-reader-row">
          <strong>{{ t`阅读者` }}</strong>
          <span>{{ entry.readers.map(reader => reader.name).join('、') }}</span>
        </div>
      </template>
      <template #actions>
        <button class="pc-soft-btn" type="button" :title="t`让他人阅读`" @click="emit('readReaction')">
          <i class="fa-solid fa-book-open-reader"></i>
          <span>{{ t`他人阅读` }}</span>
        </button>
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
import type { DiaryEntry } from '@/type/diary';

defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  entry: DiaryEntry;
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
  readReaction: [];
  selectCatalog: [entryId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
  'update:reasoning': [reasoning: string];
}>();
</script>

<style scoped>
.pc-diary-detail-page {
  height: 100%;
  min-height: 0;
  gap: 10px;
}

.pc-reader-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.pc-reader-row span {
  color: var(--pc-muted);
}
</style>
