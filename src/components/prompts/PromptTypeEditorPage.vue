<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <div class="pc-chip-row">
        <button
          v-for="domain in domains"
          :key="domain.key"
          :class="['pc-tab-btn', { active: draft.domain === domain.key }]"
          type="button"
          @click="draft.domain = domain.key"
        >
          {{ domain.label }}
        </button>
      </div>

      <input v-model="draft.name" class="pc-field" type="text" :placeholder="t`类型名称`" />
      <textarea v-model="draft.prompt" class="pc-area" :placeholder="t`类型提示词正文`" />
      <div v-if="draft.domain === 'theater'" class="pc-field-group">
        <span class="pc-field-label">{{ t`默认渲染方式` }}</span>
        <span class="pc-segment">
          <button
            :class="['pc-segment-btn', { active: draft.renderMode === 'markdown' }]"
            type="button"
            @click="draft.renderMode = 'markdown'"
          >
            Markdown
          </button>
          <button
            :class="['pc-segment-btn', { active: draft.renderMode === 'frontend' }]"
            type="button"
            @click="draft.renderMode = 'frontend'"
          >
            {{ t`网页渲染` }}
          </button>
        </span>
      </div>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="save">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PhoneTypePromptDomain } from '@/core/appRegistry';
import { usePromptStore, type TypePromptConfig } from '@/store/prompts';

const props = defineProps<{
  domains: PhoneTypePromptDomain[];
  prompt: TypePromptConfig | null;
}>();
const emit = defineEmits<{ back: [] }>();
const prompts = usePromptStore();
const draft = reactive({
  domain: '',
  name: '',
  prompt: '',
  renderMode: 'markdown' as 'frontend' | 'markdown',
});

function loadDraft() {
  draft.domain = props.prompt?.domain || props.domains[0]?.key || '';
  draft.name = props.prompt?.name || '';
  draft.prompt = props.prompt?.prompt || '';
  draft.renderMode = props.prompt?.renderMode === 'frontend' ? 'frontend' : 'markdown';
}

function save() {
  if (!draft.prompt.trim()) return;
  if (props.prompt) prompts.updateTypePrompt(props.prompt.id, draft);
  else prompts.createTypePrompt(draft);
  emit('back');
}

watch([() => props.domains, () => props.prompt], loadDraft, { immediate: true });
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
