<template>
  <section class="pc-extras-page pc-extras-detail-page">
    <ReaderDetailShell
      actions-class="six"
      :content="chapter.content"
      display-app-id="extras"
      :favorite-active="chapter.favorite"
      :next-disabled="!nextId"
      :previous-disabled="!previousId"
      :title="`第 ${chapter.chapterNumber} 章 · ${chapter.title}`"
      @bagu="emit('bagu')"
      @bottom="emit('bottom')"
      @catalog="emit('update:catalogOpen', true)"
      @edit="emit('edit')"
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
        <button class="pc-soft-btn" type="button" :title="t`续写`" @click="emit('continue')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t`续写` }}</span>
        </button>
        <button class="pc-soft-btn" type="button" :title="t`重写本章`" @click="emit('rewrite')">
          <i class="fa-solid fa-rotate"></i>
          <span>{{ t`重写` }}</span>
        </button>
        <button
          class="pc-soft-btn danger"
          type="button"
          :title="versions.length > 1 ? t`删除当前版本` : t`删除章节`"
          @click="emit('delete')"
        >
          <i class="fa-solid fa-trash"></i>
          <span>{{ t`删除` }}</span>
        </button>
      </template>

      <template #overlays>
        <CatalogModal
          :active-id="chapter.id"
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
import type { ExtraChapter, ExtraChapterVersion } from '@/type/extra';

defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  chapter: ExtraChapter;
  nextId: string;
  previousId: string;
  versions: ExtraChapterVersion[];
  viewedVersionId: string;
}>();

const emit = defineEmits<{
  bagu: [];
  bottom: [];
  continue: [];
  delete: [];
  edit: [];
  favorite: [];
  next: [];
  previous: [];
  rewrite: [];
  selectVersion: [versionId: string];
  selectCatalog: [chapterId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
}>();
</script>

<style scoped>
.pc-extras-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-extras-detail-page {
  height: 100%;
  min-height: 0;
  gap: 10px;
}
</style>
