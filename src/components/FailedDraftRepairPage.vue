<template>
  <section class="pc-failed-draft-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">{{ sourceLabel }}</span>
      <h2>{{ title }}</h2>
      <slot name="before-editor"></slot>
      <div class="pc-field-group">
        <label v-if="rawLabel" class="pc-field-label">{{ rawLabel }}</label>
        <RawOutputEditor v-model="rawOutput" :placeholder="placeholder" @reparse="$emit('reparse')" />
      </div>
      <div class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" @click="$emit('delete')">{{ deleteLabel }}</button>
        <button class="pc-primary-btn" type="button" :disabled="reparseDisabled" @click="$emit('reparse')">
          {{ reparseLabel }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import RawOutputEditor from '@/components/RawOutputEditor.vue';

withDefaults(
  defineProps<{
    deleteLabel?: string;
    placeholder?: string;
    rawLabel?: string;
    reparseDisabled?: boolean;
    reparseLabel?: string;
    sourceLabel: string;
    title: string;
  }>(),
  {
    deleteLabel: '删除草稿',
    placeholder: '在这里修 XML 结构或补 title / content。',
    rawLabel: '',
    reparseDisabled: false,
    reparseLabel: '重新解析',
  },
);

defineEmits<{ delete: []; reparse: [] }>();
const rawOutput = defineModel<string>('rawOutput', { required: true });
</script>

<style scoped>
.pc-failed-draft-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}
</style>
