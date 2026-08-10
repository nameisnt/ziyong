<template>
  <section class="pc-theater-detail-page">
    <ReaderDetailShell
      actions-class="six"
      :content="viewedEntry.content"
      :custom-content="viewedEntry.renderMode === 'frontend'"
      display-app-id="theater"
      :favorite-active="entry.favorite"
      :footer-always-visible="viewedEntry.renderMode === 'frontend'"
      :next-disabled="!nextEntryId"
      :previous-disabled="!previousEntryId"
      :title="viewedEntry.title"
      @bagu="$emit('bagu')"
      @bottom="$emit('bottom')"
      @catalog="catalogOpen = true"
      @edit="$emit('edit')"
      @favorite="$emit('favorite')"
      @next="$emit('next')"
      @previous="$emit('previous')"
      @top="$emit('top')"
    >
      <template #version-navigation>
        <VersionNavigator :versions="entry.versions" :viewed-version-id="viewedVersionId" @select="$emit('select-version', $event)" />
      </template>
      <template #before-content>
        <div class="pc-entry-tags">
          <CapsuleTag
            compact
            active
            icon="fa-solid fa-masks-theater"
            :label="entry.typeName || t`未分类小剧场`"
            @click="$emit('filter-type', entry.typeName || t`未分类小剧场`)"
          />
        </div>
      </template>
      <template #content="{ displayContent }">
        <FrontendFrame
          v-if="viewedEntry.renderMode === 'frontend'"
          :active="phoneOpen"
          :content="displayContent"
          :theme="theme"
          :title="viewedEntry.title"
          @navigate-blocked="$emit('navigate-blocked')"
        />
      </template>
      <template #actions>
        <button
          class="pc-soft-btn"
          type="button"
          :disabled="entry.versions.length <= 1"
          :title="entry.versions.length > 1 ? t`拆分为独立小剧场` : t`只有一个版本，无需拆分`"
          @click="$emit('split-version')"
        >
          <i class="fa-solid fa-code-branch"></i>
        </button>
        <button class="pc-soft-btn" type="button" :title="t`重新生成`" @click="$emit('rewrite')">
          <i class="fa-solid fa-rotate"></i>
        </button>
        <button
          class="pc-soft-btn danger"
          type="button"
          :title="entry.versions.length > 1 ? t`删除当前版本` : t`删除小剧场`"
          @click="$emit('remove')"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </template>
      <template #overlays>
        <CatalogModal
          :active-id="entry.id"
          :items="catalogItems"
          :open="catalogOpen"
          @close="catalogOpen = false"
          @select="$emit('select-catalog', $event)"
        />
      </template>
    </ReaderDetailShell>
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import CatalogModal from '@/components/CatalogModal.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import VersionNavigator from '@/components/VersionNavigator.vue';
import type { CatalogModalItem } from '@/type/catalog';
import type { TheaterEntry } from '@/type/theater';

defineProps<{
  catalogItems: CatalogModalItem[];
  entry: TheaterEntry;
  nextEntryId: string;
  phoneOpen: boolean;
  previousEntryId: string;
  theme: 'dark' | 'light';
  viewedEntry: TheaterEntry;
  viewedVersionId: string;
}>();

const catalogOpen = defineModel<boolean>('catalogOpen', { required: true });

defineEmits<{
  bagu: [];
  bottom: [];
  edit: [];
  favorite: [];
  'filter-type': [label: string];
  'navigate-blocked': [];
  next: [];
  previous: [];
  remove: [];
  rewrite: [];
  'select-catalog': [entryId: string];
  'select-version': [versionId: string];
  'split-version': [];
  top: [];
}>();
</script>

<style scoped>
.pc-theater-detail-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.pc-entry-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pc-soft-btn.danger {
  color: var(--pc-danger);
}
</style>
