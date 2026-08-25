<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <input v-model="name" class="pc-field" type="text" :placeholder="t`分组名称`" />
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePromptStore, type QuickPhraseGroup } from '@/store/prompts';

const props = defineProps<{
  group: QuickPhraseGroup | null;
  kind: 'phrase' | 'template';
}>();
const emit = defineEmits<{ back: [] }>();
const prompts = usePromptStore();
const name = ref('');

function save() {
  if (props.kind === 'phrase') {
    if (props.group) prompts.renameQuickPhraseGroup(props.group.id, name.value);
    else prompts.createQuickPhraseGroup(name.value);
  } else if (props.group) {
    prompts.renameQuickTemplateGroup(props.group.id, name.value);
  } else {
    prompts.createQuickTemplateGroup(name.value);
  }
  emit('back');
}

watch(
  () => props.group,
  group => {
    name.value = group?.name || '';
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-prompts-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-prompts-editor {
  display: grid;
  gap: 14px;
}
</style>
