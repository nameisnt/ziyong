<template>
  <section class="pc-summary-page pc-summary-detail-page pc-page-stack">
    <ReaderDetailShell
      actions-class="six"
      :cleanup-snapshot="cleanupSnapshot"
      :content="entry.content"
      :context-label="entry.rangeLabel"
      display-app-id="summary"
      :display-identity="[entry.id, viewedVersionId]"
      :display-versions="versions"
      :favorite-active="entry.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :reasoning="entry.generationRecord?.reasoning"
      reasoning-editable
      :title="entry.title"
      :updated-at="entry.updatedAt"
      :version-count="versions.length"
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
      <template #version-navigation>
        <VersionNavigator
          :versions="versions"
          :viewed-version-id="viewedVersionId"
          @select="emit('selectVersion', $event)"
        />
      </template>

      <template #kicker>
        <span class="pc-kicker">{{ entry.rangeLabel }}</span>
      </template>

      <template #actions>
        <button class="pc-soft-btn" type="button" :title="t`重写`" @click="emit('rewrite')">
          <i class="fa-solid fa-rotate"></i>
          <span>{{ t`重写` }}</span>
        </button>
        <button
          class="pc-soft-btn danger"
          type="button"
          :title="versions.length > 1 ? t`删除当前版本` : t`删除`"
          @click="emit('delete')"
        >
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
import VersionNavigator from '@/components/VersionNavigator.vue';
import type { ContentCleanupSnapshot } from '@/type/contentVersion';
import type { SummaryEntry, SummaryEntryVersion } from '@/type/summary';

withDefaults(
  defineProps<{
    catalogItems: CatalogModalItem[];
    catalogOpen: boolean;
    cleanupSnapshot?: ContentCleanupSnapshot;
    entry: SummaryEntry;
    nextId: string;
    previousId: string;
    versions: SummaryEntryVersion[];
    viewedVersionId: string;
  }>(),
  { cleanupSnapshot: undefined },
);

const emit = defineEmits<{
  bagu: [];
  bottom: [];
  delete: [];
  edit: [];
  favorite: [];
  next: [];
  previous: [];
  rewrite: [];
  selectCatalog: [entryId: string];
  selectVersion: [versionId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
  'update:reasoning': [reasoning: string];
}>();
</script>

<style scoped>
.pc-summary-detail-page {
  height: 100%;
  min-height: 0;
  gap: 10px;
}
</style>
