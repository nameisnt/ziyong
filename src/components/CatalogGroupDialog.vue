<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="$emit('close')">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-catalog-group-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="移入分组"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>移入分组 · {{ count }} 项</strong>
          <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="pc-catalog-group-target">
          <label class="pc-field-group">
            <span class="pc-field-label">{{ creating ? '新分组名称' : '目标分组' }}</span>
            <input
              v-if="creating"
              v-model="newName"
              class="pc-field"
              aria-label="新分组名称"
              @keydown.enter.prevent="apply"
            />
            <select v-else v-model="target" class="pc-select" aria-label="目标分组">
              <option value="">未分组</option>
              <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
            </select>
          </label>
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="creating ? '选择已有分组' : '新建分组'"
            :title="creating ? '选择已有分组' : '新建分组'"
            @click="creating = !creating"
          >
            <i :class="creating ? 'fa-solid fa-list' : 'fa-solid fa-folder-plus'"></i>
          </button>
        </div>
        <p v-if="error" class="pc-catalog-group-error" role="alert">{{ error }}</p>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="$emit('close')">取消</button>
          <button class="pc-primary-btn" type="button" :disabled="!count || Boolean(error)" @click="apply">
            <i class="fa-solid fa-folder"></i>移入分组
          </button>
        </div>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
const props = defineProps<{ groups: string[]; count: number; initialGroup?: string }>();
const emit = defineEmits<{ close: []; apply: [name: string] }>();
const dialogRef = ref<HTMLElement | null>(null);
const creating = ref(false);
const target = ref(props.initialGroup || '');
const newName = ref('');
const error = computed(() => {
  if (!creating.value) return '';
  const name = newName.value.trim();
  if (!name) return '请输入分组名称';
  if (name === '-' || name === '未分组') return '该名称保留给未分组';
  if (props.groups.includes(name)) return '分组已存在，请选择已有分组';
  return '';
});
function apply() {
  if (props.count && !error.value) emit('apply', creating.value ? newName.value.trim() : target.value);
}
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: () => emit('close') });
</script>
<style scoped>
.pc-catalog-group-dialog {
  display: grid;
  gap: 12px;
  width: min(420px, 100%);
  max-height: 90%;
  overflow: auto;
  overflow-wrap: anywhere;
}
.pc-catalog-group-target {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
}
.pc-catalog-group-error {
  color: var(--pc-danger);
}
</style>
