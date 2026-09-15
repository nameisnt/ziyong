<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-bulk-delete-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>{{ title }}</strong>
          <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <p>{{ description }}</p>
        <div class="pc-bulk-delete-items">
          <p v-for="item in items" :key="item.id">{{ item.label }}</p>
        </div>
        <label v-if="!done" class="pc-setting-row">
          <span>确认删除以上 {{ items.length }} 个对象，此操作不可撤销</span>
          <BulkSelectionCheckbox v-model="confirmed" label="确认删除以上对象" :disabled="busy" />
        </label>
        <div v-if="busy || done" class="pc-bulk-delete-items" role="status">
          <p>{{ done ? '处理完成' : '正在处理' }} {{ results.length }} / {{ items.length }}</p>
          <p v-for="result in results" :key="result.id">
            {{ result.label }}：{{ result.deleted ? '已删除' : '未删除' }}{{ result.error ? `；${result.error}` : '' }}
          </p>
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="close">
            {{ done ? '关闭' : '取消' }}
          </button>
          <button
            v-if="!done"
            class="pc-primary-btn danger"
            type="button"
            :disabled="busy || !confirmed || !items.length"
            @click="execute"
          >
            <i class="fa-solid fa-trash"></i>{{ busy ? '正在删除' : '删除所选' }}
          </button>
        </div>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import BulkSelectionCheckbox from './BulkSelectionCheckbox.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
const props = defineProps<{
  title: string;
  description: string;
  items: { id: string; label: string }[];
  remove: (id: string) => Promise<{ deleted: boolean; error: string }>;
}>();
const emit = defineEmits<{ close: []; finished: [] }>();
const dialogRef = ref<HTMLElement | null>(null);
const confirmed = ref(false);
const busy = ref(false);
const done = ref(false);
const results = ref<{ id: string; label: string; deleted: boolean; error: string }[]>([]);
function close() {
  if (!busy.value) emit('close');
}
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: close });
async function execute() {
  if (busy.value || done.value || !confirmed.value) return;
  busy.value = true;
  try {
    for (const item of props.items) {
      try {
        results.value.push({ ...item, ...(await props.remove(item.id)) });
      } catch (error) {
        results.value.push({ ...item, deleted: false, error: String(error) });
      }
    }
  } finally {
    busy.value = false;
    done.value = true;
    emit('finished');
  }
}
</script>
<style scoped>
.pc-bulk-delete-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(480px, 100%);
  max-height: 90%;
  overflow: auto;
  overflow-wrap: anywhere;
}
.pc-bulk-delete-items {
  max-height: 180px;
  overflow: auto;
  flex-shrink: 0;
}
</style>
