<template>
  <section class="pc-gallery-app">
    <section class="pc-gallery-page">
      <div class="pc-gallery-hero">
        <div>
          <span class="pc-kicker">{{ t`相册` }}</span>
          <h2>{{ imageEntries.length }} {{ t`张图片` }}</h2>
        </div>
        <button class="pc-primary-btn compact" type="button" @click="openEditor()">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新增` }}</span>
        </button>
      </div>

      <template v-if="route.page === 'root'">
        <div v-if="imageEntries.length" class="pc-gallery-grid">
          <button v-for="entry in imageEntries" :key="entry.id" class="pc-gallery-tile" type="button" @click="openViewer(entry.id)">
            <img :src="entry.url" :alt="entry.title" />
            <span>{{ entry.title }}</span>
          </button>
        </div>
        <EmptyState v-else :title="t`还没有图片`" />
      </template>

      <article v-else-if="route.page === 'viewer' && activeEntry" class="pc-gallery-viewer">
        <img :src="activeEntry.url" :alt="activeEntry.title" />
        <div class="pc-gallery-viewer-bar">
          <button class="pc-icon-btn" type="button" :title="t`上一张`" :aria-label="t`上一张`" @click="showRelativeImage(-1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <strong>{{ activeEntry.title }}</strong>
            <span>{{ activeIndex + 1 }} / {{ imageEntries.length }}</span>
          </div>
          <button class="pc-icon-btn" type="button" :title="t`下一张`" :aria-label="t`下一张`" @click="showRelativeImage(1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <p v-if="activeEntry.note">{{ activeEntry.note }}</p>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="openEditor(activeEntry.id)">{{ t`编辑` }}</button>
          <button class="pc-soft-btn" type="button" @click="downloadEntry(activeEntry)">{{ t`下载` }}</button>
          <button class="pc-soft-btn danger" type="button" @click="deleteEntry(activeEntry)">{{ t`删除` }}</button>
        </div>
      </article>
      <EmptyState v-else-if="route.page === 'viewer'" :title="t`图片不存在`">
        <button class="pc-soft-btn compact" type="button" @click="phone.replacePage('root', '相册')">{{ t`返回相册` }}</button>
      </EmptyState>

      <article v-else-if="route.page === 'editor'" class="pc-editor-card">
        <span class="pc-kicker">{{ editingEntry ? t`编辑图片` : t`新增图片` }}</span>
        <h2>{{ editingEntry?.title || t`图片条目` }}</h2>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="draft.url" class="pc-field" type="text" :placeholder="t`图片 URL 或上传后的 data 地址`" />
        <input class="pc-field" type="file" accept="image/*" @change="loadFile" />
        <textarea v-model="draft.note" class="pc-area compact" :placeholder="t`备注，可留空`"></textarea>
        <div class="pc-form-actions">
          <button v-if="editingEntry" class="pc-soft-btn danger" type="button" @click="deleteEntry(editingEntry)">{{ t`删除` }}</button>
          <button class="pc-soft-btn" type="button" @click="phone.replacePage('root', '相册')">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveDraft">{{ t`保存` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import { type MediaEntry, useMediaStore } from '@/apps/media/store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const media = useMediaStore();
const { entries } = storeToRefs(media);
const route = computed(() => phone.currentRoute);
const draft = reactive({
  note: '',
  source: 'link' as MediaEntry['source'],
  title: '',
  url: '',
});

const imageEntries = computed(() => entries.value.filter(entry => entry.kind === 'image'));
const activeEntry = computed(() => route.value.params?.entryId ? media.getEntry(route.value.params.entryId) : null);
const editingEntry = computed(() => route.value.page === 'editor' ? activeEntry.value : null);
const activeIndex = computed(() => activeEntry.value ? imageEntries.value.findIndex(entry => entry.id === activeEntry.value?.id) : -1);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.entryId] as const,
  ([appId, page]) => {
    if (appId !== 'gallery' || page !== 'editor') return;
    fillDraft(editingEntry.value);
  },
  { immediate: true },
);

function fillDraft(entry: MediaEntry | null) {
  draft.title = entry?.title || '';
  draft.url = entry?.url || '';
  draft.source = entry?.source || 'link';
  draft.note = entry?.note || '';
}

function openViewer(entryId: string) {
  phone.replacePage('viewer', '图片预览', { entryId });
}

function openEditor(entryId?: string) {
  phone.replacePage('editor', entryId ? '编辑图片' : '新增图片', entryId ? { entryId } : {});
}

function showRelativeImage(offset: number) {
  if (!imageEntries.value.length) return;
  const currentIndex = activeIndex.value < 0 ? 0 : activeIndex.value;
  const nextIndex = (currentIndex + offset + imageEntries.value.length) % imageEntries.value.length;
  openViewer(imageEntries.value[nextIndex].id);
}

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    draft.url = String(reader.result || '');
    draft.title = draft.title || file.name;
    draft.source = 'upload';
  };
  reader.readAsDataURL(file);
}

function saveDraft() {
  if (!draft.url.trim()) {
    toastr.warning('请先填写 URL 或上传图片');
    return;
  }
  const input = {
    kind: 'image' as const,
    note: draft.note,
    source: draft.source,
    title: draft.title || '未命名图片',
    url: draft.url,
  };
  const entry = editingEntry.value
    ? media.updateEntry(editingEntry.value.id, input)
    : media.createEntry(input);
  if (!entry) return;
  phone.replacePage('viewer', '图片预览', { entryId: entry.id });
  toastr.success('已保存图片');
}

function downloadEntry(entry: MediaEntry) {
  const link = document.createElement('a');
  link.href = entry.url;
  link.download = sanitizeFileName(entry.title || 'image');
  link.rel = 'noopener';
  link.click();
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'image';
}

async function deleteEntry(entry: MediaEntry) {
  const confirmed = await phone.confirmNotice(`要删除图片“${entry.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  media.deleteEntry(entry.id);
  phone.replacePage('root', '相册');
  toastr.success('已删除图片');
}
</script>

<style scoped>
.pc-gallery-app,
.pc-gallery-page {
  min-height: 100%;
}

.pc-gallery-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-gallery-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-gallery-hero h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.pc-gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-gallery-tile {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 0 0 10px;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-gallery-tile img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  background: var(--pc-surface-strong);
}

.pc-gallery-tile span {
  overflow: hidden;
  padding: 0 10px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-gallery-viewer {
  display: grid;
  gap: 12px;
}

.pc-gallery-viewer > img {
  display: block;
  width: 100%;
  max-height: 62vh;
  object-fit: contain;
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
}

.pc-gallery-viewer-bar {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  gap: 10px;
  align-items: center;
}

.pc-gallery-viewer-bar div {
  display: grid;
  min-width: 0;
  gap: 4px;
  text-align: center;
}

.pc-gallery-viewer-bar strong,
.pc-gallery-viewer-bar span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-gallery-viewer-bar span,
.pc-gallery-viewer p {
  color: var(--pc-muted);
}

.pc-gallery-viewer p {
  margin: 0;
  white-space: pre-wrap;
}

.pc-area.compact {
  min-height: 90px;
}
</style>
