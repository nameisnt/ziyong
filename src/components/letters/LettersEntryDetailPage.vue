<template>
  <section class="pc-letters-page pc-letters-detail-page">
    <ReaderDetailShell
      actions-class="six"
      :content="entry.content"
      display-app-id="letters"
      eraser-enabled
      :favorite-active="entry.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :reasoning="viewedGenerationRecord?.reasoning"
      :source-label="viewedGenerationRecord?.replay.source.label"
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
      <template #version-navigation>
        <VersionNavigator
          :versions="versions"
          :viewed-version-id="viewedVersionId"
          @select="emit('selectVersion', $event)"
        />
      </template>
      <template #actions>
        <button class="pc-soft-btn" type="button" :title="t`回信`" @click="emit('reply')">
          <i class="fa-solid fa-reply"></i>
          <span>{{ t`回信` }}</span>
        </button>
        <button class="pc-soft-btn" type="button" :title="t`重写`" @click="emit('rewrite')">
          <i class="fa-solid fa-rotate"></i>
          <span>{{ t`重写` }}</span>
        </button>
        <button
          class="pc-soft-btn danger"
          type="button"
          :title="versions.length > 1 ? t`删除当前版本` : t`删除信件`"
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
import type { LetterEntry, LetterEntryVersion } from '@/type/letter';

const props = defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  entry: LetterEntry;
  nextId: string;
  previousId: string;
  versions: LetterEntryVersion[];
  viewedVersionId: string;
}>();

const viewedGenerationRecord = computed(
  () =>
    props.versions.find(version => version.id === props.viewedVersionId)?.generationRecord ||
    props.entry.generationRecord,
);

const emit = defineEmits<{
  bagu: [];
  bottom: [];
  delete: [];
  edit: [];
  erase: [content: string];
  favorite: [];
  next: [];
  previous: [];
  reply: [];
  rewrite: [];
  selectVersion: [versionId: string];
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
