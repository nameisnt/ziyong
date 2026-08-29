<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section v-if="open" class="pc-modal-backdrop pc-workbench-copy-backdrop" role="presentation" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-workbench-copy-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="复制其他聊天的工作流"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <h3>复制其他聊天的工作流</h3>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <EmptyState v-if="!sources.length" title="其他聊天还没有工作流" />

        <template v-else>
          <label class="pc-field-group">
            <span>来源聊天</span>
            <SearchableCombobox
              v-model="sourceScopeKey"
              input-label="选择来源聊天"
              :options="sourceOptions"
              placeholder="选择来源聊天"
            />
          </label>

          <div class="pc-workbench-copy-list">
            <label v-for="workflow in selectedSource?.workflows || []" :key="workflow.id" class="pc-switch-row">
              <input v-model="selectedWorkflowIds" type="checkbox" :value="workflow.id" />
              <span>
                <strong>{{ workflow.name }}</strong>
                <small>{{ workflow.stepCount }} 步</small>
              </span>
            </label>
          </div>

          <div class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="close">取消</button>
            <button class="pc-primary-btn" type="button" :disabled="!selectedWorkflowIds.length" @click="copy">
              复制到当前聊天
            </button>
          </div>
        </template>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';

export interface WorkbenchCopySource {
  label: string;
  scopeKey: string;
  workflows: Array<{ id: string; name: string; stepCount: number }>;
}

const props = defineProps<{
  open: boolean;
  sources: WorkbenchCopySource[];
}>();
const emit = defineEmits<{
  close: [];
  copy: [sourceScopeKey: string, workflowIds: string[]];
}>();
const dialogRef = ref<HTMLElement | null>(null);
const sourceScopeKey = ref('');
const selectedWorkflowIds = ref<string[]>([]);
const sourceOptions = computed(() => props.sources.map(source => ({ label: source.label, value: source.scopeKey })));
const selectedSource = computed(() => props.sources.find(source => source.scopeKey === sourceScopeKey.value) ?? null);

usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => props.open,
  onClose: close,
});

watch(
  () => props.open,
  open => {
    if (!open) return;
    sourceScopeKey.value = props.sources[0]?.scopeKey || '';
    selectedWorkflowIds.value = [];
  },
);
watch(sourceScopeKey, () => {
  selectedWorkflowIds.value = [];
});

function close() {
  emit('close');
}

function copy() {
  if (!sourceScopeKey.value || !selectedWorkflowIds.value.length) return;
  emit('copy', sourceScopeKey.value, selectedWorkflowIds.value);
}
</script>

<style scoped>
.pc-workbench-copy-backdrop {
  --pc-modal-z: 72;
}

.pc-workbench-copy-dialog {
  display: grid;
  width: min(100%, 360px);
  max-height: 86%;
  overflow: hidden;
  gap: 12px;
}

.pc-workbench-copy-dialog h3 {
  margin: 0;
}

.pc-workbench-copy-list {
  display: grid;
  min-height: 0;
  overflow-y: auto;
}

.pc-workbench-copy-list .pc-switch-row span {
  display: grid;
  min-width: 0;
}

.pc-workbench-copy-list small {
  color: var(--pc-muted);
}
</style>
