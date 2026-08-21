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
          :class="['pc-preview-draft-manager-item', { active: selectedDraftId === item.id }]"
          type="button"
          role="option"
          :aria-selected="selectedDraftId === item.id"
          :data-draft-id="item.id"
          @click="selectedDraftId = item.id"
        >
          <strong :title="item.title">{{ item.title }}</strong>
          <span>{{ formatUpdatedAt(item.updatedAt) }}</span>
        </button>
      </div>

      <footer class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" :disabled="!selectedDraft" @click="confirmDiscardSelected">
          删除所选
        </button>
        <button class="pc-primary-btn" type="button" :disabled="!selectedDraft" @click="openSelected">
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
const selectedDraftId = ref('');
const drafts = computed(() => {
  if (!props.draft) return [];
  return previewDrafts.getPreviewDrafts(props.draft.appId, props.draft.page);
});
const selectedDraft = computed(() => drafts.value.find(item => item.id === selectedDraftId.value) ?? null);

usePhoneModalLifecycle({
  dialogRef: managerDialogRef,
  isOpen: () => managerOpen.value,
  onClose: closeManager,
});

function openManager() {
  selectedDraftId.value = drafts.value[0]?.id ?? '';
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
  const selected = selectedDraft.value;
  if (!selected) return;
  const confirmed = await phone.confirmNotice(`要删除未保存预览“${selected.title || '未命名草稿'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  emit('discard', selected.id);
  if (selectedDraftId.value === selected.id) selectedDraftId.value = drafts.value.find(item => item.id !== selected.id)?.id ?? '';
  if (!drafts.value.length || (drafts.value.length === 1 && drafts.value[0]?.id === selected.id)) closeManager();
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
  gap: 3px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface);
  color: var(--pc-text);
  padding: 10px;
  text-align: left;
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
