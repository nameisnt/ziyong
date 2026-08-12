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
      <div v-if="draft.domain === 'theater'" class="pc-field-group">
        <span class="pc-field-label">所属分组</span>
        <div class="pc-type-group-row">
          <select v-model="draft.groupId" class="pc-select">
            <option value="">未分组</option>
            <option v-for="group in theaterGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
          <button class="pc-icon-btn" type="button" title="新建分组" @click="createGroup">
            <i class="fa-solid fa-folder-plus"></i>
          </button>
        </div>
      </div>
      <textarea v-model="draft.prompt" class="pc-area" :placeholder="t`类型提示词正文`" />

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
import { usePhoneStore } from '@/store/phone';

const props = defineProps<{
  domains: PhoneTypePromptDomain[];
  prompt: TypePromptConfig | null;
}>();
const emit = defineEmits<{ back: [] }>();
const prompts = usePromptStore();
const phone = usePhoneStore();
const draft = reactive({
  domain: '',
  groupId: '',
  name: '',
  prompt: '',
});
const theaterGroups = computed(() => prompts.typePromptGroups.filter(group => group.domain === 'theater'));

function loadDraft() {
  draft.domain = props.prompt?.domain || props.domains[0]?.key || '';
  draft.groupId = props.prompt?.groupId || '';
  draft.name = props.prompt?.name || '';
  draft.prompt = props.prompt?.prompt || '';
}

async function createGroup() {
  const name = await phone.promptNotice('输入新的小剧场类型分组名称。', {
    confirmLabel: '创建',
    placeholder: '例如：论坛与社交媒体',
    title: '新建分组',
  });
  if (!name?.trim()) return;
  draft.groupId = prompts.createTypePromptGroup('theater', name).id;
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

.pc-type-group-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
</style>
