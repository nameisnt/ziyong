<template>
  <article v-if="drafts.length" class="pc-section-card pc-preview-draft-notice">
    <span class="pc-kicker">未保存预览（{{ drafts.length }} 份）</span>
    <div class="pc-preview-draft-actions">
      <button class="pc-soft-btn compact" type="button" @click="openManager">管理草稿</button>
      <button class="pc-primary-btn compact" type="button" @click="emit('open')">继续最新</button>
    </div>
  </article>

  <section v-if="managerOpen" class="pc-modal-backdrop pc-preview-draft-manager-mask" @click.self="closeManager">
    <article
      ref="managerDialogRef"
      class="pc-section-card pc-modal-dialog pc-preview-draft-manager"
      role="dialog"
      aria-modal="true"
      aria-label="管理未保存预览"
      tabindex="-1"
    >
      <header class="pc-preview-draft-manager-head">
        <div>
          <span class="pc-kicker">未保存预览</span>
          <h3>管理草稿</h3>
        </div>
        <button class="pc-icon-btn" type="button" aria-label="关闭草稿管理" title="关闭" @click="closeManager">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <div class="pc-preview-draft-manager-list" role="listbox" aria-label="选择未保存预览">
        <button
          v-for="item in drafts"
          :key="item.id"
          :class="['pc-preview-draft-manager-item', { active: selectedDraftIdSet.has(item.id) }]"
          type="button"
          role="option"
          :aria-selected="selectedDraftIdSet.has(item.id)"
          :data-draft-id="item.id"
          @click="toggleDraftSelection(item.id)"
        >
          <i :class="selectedDraftIdSet.has(item.id) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
          <strong :title="item.title">{{ item.title }}</strong>
          <span>{{ formatUpdatedAt(item.updatedAt) }}</span>
        </button>
      </div>

      <footer class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="!drafts.length" @click="toggleAllDrafts">
          {{ selectedDraftIds.length === drafts.length ? '取消全选' : '全选' }}
        </button>
        <button class="pc-soft-btn danger" type="button" :disabled="!selectedDraftIds.length" @click="confirmDiscardSelected">
          删除所选
        </button>
        <button class="pc-primary-btn" type="button" :disabled="selectedDraftIds.length !== 1" @click="openSelected">
          继续所选
        </button>
      </footer>
    </article>
  </section>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { usePhoneStore } from '@/store/phone';

const props = defineProps<{
  draft: GenerationPreviewDraft | null;
}>();

const emit = defineEmits<{
  discard: [id: string];
  open: [];
  'open-id': [id: string];
}>();

const phone = usePhoneStore();
const previewDrafts = usePreviewDraftStore();
const managerDialogRef = ref<HTMLElement | null>(null);
const managerOpen = ref(false);
const selectedDraftIds = ref<string[]>([]);
const drafts = computed(() => {
  if (!props.draft) return [];
  return previewDrafts.getPreviewDrafts(props.draft.appId, props.draft.page);
});
const selectedDraftIdSet = computed(() => new Set(selectedDraftIds.value));
const selectedDraft = computed(() =>
  selectedDraftIds.value.length === 1 ? drafts.value.find(item => item.id === selectedDraftIds.value[0]) ?? null : null,
);

usePhoneModalLifecycle({
  dialogRef: managerDialogRef,
  isOpen: () => managerOpen.value,
  onClose: closeManager,
});

function openManager() {
  selectedDraftIds.value = [];
  managerOpen.value = true;
}

function closeManager() {
  managerOpen.value = false;
}

function openSelected() {
  if (!selectedDraft.value) return;
  emit('open-id', selectedDraft.value.id);
  closeManager();
}

async function confirmDiscardSelected() {
  const selected = drafts.value.filter(item => selectedDraftIdSet.value.has(item.id));
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(`要删除所选 ${selected.length} 份未保存预览吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  selected.forEach(item => emit('discard', item.id));
  selectedDraftIds.value = [];
  closeManager();
}

function toggleDraftSelection(draftId: string) {
  selectedDraftIds.value = selectedDraftIdSet.value.has(draftId)
    ? selectedDraftIds.value.filter(id => id !== draftId)
    : [...selectedDraftIds.value, draftId];
}

function toggleAllDrafts() {
  selectedDraftIds.value = selectedDraftIds.value.length === drafts.value.length ? [] : drafts.value.map(item => item.id);
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  });
}
</script>

<style scoped>
.pc-preview-draft-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-preview-draft-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.pc-preview-draft-manager-mask {
  --pc-modal-z: 65;
}

.pc-preview-draft-manager {
  display: flex;
  width: min(88%, 360px);
  max-width: calc(100% - 20px);
  max-height: min(78%, 580px);
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  padding: 14px;
}

.pc-preview-draft-manager-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-preview-draft-manager-head h3 {
  margin: 2px 0 0;
  color: var(--pc-text);
  font-size: 17px;
}

.pc-preview-draft-manager-list {
  display: grid;
  min-height: 0;
  gap: 8px;
  overflow: auto;
}

.pc-preview-draft-manager-item {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 8px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface);
  color: var(--pc-text);
  padding: 10px;
  text-align: left;
}

.pc-preview-draft-manager-item > i {
  grid-row: 1 / 3;
  align-self: center;
  color: var(--pc-theme-accent);
}

.pc-preview-draft-manager-item.active {
  border-color: var(--pc-theme-accent);
  background: var(--pc-surface-strong);
}

.pc-preview-draft-manager-item strong,
.pc-preview-draft-manager-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preview-draft-manager-item strong {
  font-size: 14px;
}

.pc-preview-draft-manager-item span {
  color: var(--pc-muted);
  font-size: 12px;
}

@media (max-width: 350px) {
  .pc-preview-draft-notice {
    align-items: flex-start;
    flex-direction: column;
  }

  .pc-preview-draft-actions {
    width: 100%;
  }

  .pc-preview-draft-actions > button {
    flex: 1 1 0;
  }
}
</style>
