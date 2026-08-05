<template>
  <section class="pc-extras-page pc-extras-detail-page">
    <ReaderDetailShell
      actions-class="six"
      :content="chapter.content"
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
      <template #before-content>
        <VersionNavigator
          :active-version-id="activeVersionId"
          :versions="versions"
          :viewed-version-id="viewedVersionId"
          @adopt="emit('adoptVersion', $event)"
          @delete="emit('deleteVersion', $event)"
          @select="emit('selectVersion', $event)"
        />
        <details v-if="generationRecords.length" class="pc-section-card pc-generation-history">
          <summary>
            <span>{{ t`版本生成记录` }}</span>
            <span class="pc-generation-history-count">{{ generationRecords.length }}</span>
          </summary>
          <div class="pc-generation-history-list">
            <article v-for="record in generationRecords" :key="record.id" class="pc-generation-history-item">
              <div class="pc-generation-history-head">
                <strong>{{ formatGenerationRecordDate(record.createdAt) }}</strong>
                <button class="pc-soft-btn" type="button" @click="emit('rewriteRecord', record.id)">
                  <i class="fa-solid fa-rotate"></i>
                  <span>{{ t`用于重写` }}</span>
                </button>
              </div>
              <p>{{ record.userRequirement || t`未填写追加要求` }}</p>
              <div class="pc-generation-history-meta">
                <span v-if="formatGenerationRecordVersion(record.id)">
                  {{ formatGenerationRecordVersion(record.id) }}
                </span>
                <span>{{ record.typeName || t`未指定类型` }}</span>
                <span>{{ formatGenerationRecordSource(record) }}</span>
                <span v-if="record.references.length">{{ `引用 ${record.references.length} 项` }}</span>
              </div>
            </article>
          </div>
        </details>
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
        <button class="pc-soft-btn danger" type="button" :title="t`删除整章（全部版本）`" @click="emit('delete')">
          <i class="fa-solid fa-trash"></i>
          <span>{{ t`删除整章` }}</span>
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
import type { ExtraChapter, ExtraChapterGenerationRecord, ExtraChapterVersion } from '@/type/extra';

const props = defineProps<{
  catalogItems: CatalogModalItem[];
  catalogOpen: boolean;
  chapter: ExtraChapter;
  activeVersionId: string;
  generationRecords: ExtraChapterGenerationRecord[];
  nextId: string;
  previousId: string;
  versions: ExtraChapterVersion[];
  viewedVersionId: string;
}>();

const emit = defineEmits<{
  bagu: [];
  adoptVersion: [versionId: string];
  bottom: [];
  continue: [];
  delete: [];
  deleteVersion: [versionId: string];
  edit: [];
  favorite: [];
  next: [];
  previous: [];
  rewrite: [];
  rewriteRecord: [recordId: string];
  selectVersion: [versionId: string];
  selectCatalog: [chapterId: string];
  top: [];
  'update:catalogOpen': [open: boolean];
}>();

function formatGenerationRecordDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '生成记录';
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
}

function formatGenerationRecordVersion(recordId: string) {
  const versionIndex = props.versions.findIndex(version => version.generationRecord?.id === recordId);
  if (versionIndex < 0) return '';
  const version = props.versions[versionIndex];
  return `版本 ${versionIndex + 1} · ${version?.id === props.activeVersionId ? '当前采用' : '候选版本'}`;
}

function formatGenerationRecordSource(record: ExtraChapterGenerationRecord) {
  if (record.sourceLabel.trim()) return record.sourceLabel;
  return {
    none: '未使用聊天楼层',
    all: '全部楼层',
    fromStart: `开头至 ${record.fromStartEnd} 楼`,
    latest: '最新楼层',
    range: record.rangeText.trim() ? `楼层 ${record.rangeText.trim()}` : '指定范围',
    recent: `最近 ${record.recentCount} 楼`,
    single: `第 ${record.singleMessageId} 楼`,
  }[record.sourceMode];
}
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

.pc-generation-history {
  display: block;
  margin-top: 12px;
  padding: 12px;
}

.pc-generation-history summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  font-weight: 800;
  list-style: none;
}

.pc-generation-history summary::-webkit-details-marker {
  display: none;
}

.pc-generation-history-count {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-generation-history-list {
  display: grid;
  gap: 8px;
  max-height: 220px;
  margin-top: 10px;
  overflow-y: auto;
}

.pc-generation-history-item {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface-strong);
}

.pc-generation-history-head,
.pc-generation-history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-generation-history-head {
  justify-content: space-between;
}

.pc-generation-history-head .pc-soft-btn {
  min-height: 34px;
  padding: 0 10px;
}

.pc-generation-history-item p {
  margin: 0;
  color: var(--pc-text);
  white-space: pre-wrap;
}

.pc-generation-history-meta {
  flex-wrap: wrap;
  color: var(--pc-muted);
  font-size: 12px;
}
</style>
