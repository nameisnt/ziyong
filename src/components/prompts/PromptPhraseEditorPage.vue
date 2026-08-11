<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <textarea v-model="text" class="pc-area compact" :placeholder="placeholder" />
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePromptStore, type QuickPhrase, type QuickPhraseGroup } from '@/store/prompts';

const props = defineProps<{
  group: QuickPhraseGroup;
  item: QuickPhrase | null;
  kind: 'phrase' | 'template';
}>();
const emit = defineEmits<{ back: [] }>();
const prompts = usePromptStore();
const text = ref('');
const placeholder = computed(() => (props.kind === 'phrase' ? '输入这条快速短语' : '输入格式模板'));

function save() {
  if (!text.value.trim()) return;
  if (props.kind === 'phrase') {
    if (props.item) prompts.updateQuickPhrase(props.group.id, props.item.id, text.value);
    else prompts.createQuickPhrase(props.group.id, text.value);
  } else if (props.item) {
    prompts.updateQuickTemplate(props.group.id, props.item.id, text.value);
  } else {
    prompts.createQuickTemplate(props.group.id, text.value);
  }
  emit('back');
}

watch(
  () => props.item,
  item => {
    text.value = item?.text || '';
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
