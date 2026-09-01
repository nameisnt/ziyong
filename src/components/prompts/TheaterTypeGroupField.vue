<template>
  <div class="pc-field-group pc-theater-type-group-field">
    <span class="pc-field-label">{{ label }}</span>
    <div class="pc-compact-toolbar">
      <SearchableCombobox
        v-model="groupId"
        :disabled="disabled"
        :empty-label="t`没有匹配的分组`"
        :input-label="t`选择所属分组`"
        :options="groupOptions"
        :placeholder="t`选择所属分组`"
        :toggle-title="t`展开所属分组`"
      />
      <button
        class="pc-icon-btn"
        type="button"
        :disabled="disabled"
        title="新建分组"
        aria-label="新建分组"
        @click="createGroup"
      >
        <i class="fa-solid fa-folder-plus"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';

const groupId = defineModel<string>({ required: true });
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    domain?: string;
    label?: string;
    subjectLabel?: string;
  }>(),
  {
    disabled: false,
    domain: 'theater',
    label: '所属分组',
    subjectLabel: '小剧场类型',
  },
);
const phone = usePhoneStore();
const prompts = usePromptStore();
const groupOptions = computed(() => [
  { label: '未分组', value: '' },
  ...prompts.typePromptGroups
    .filter(group => group.domain === props.domain)
    .map(group => ({ label: group.name, value: group.id })),
]);

async function createGroup() {
  const name = await phone.promptNotice(`输入新的${props.subjectLabel}分组名称。`, {
    confirmLabel: '创建',
    placeholder: '例如：论坛与社交媒体',
    title: '新建分组',
  });
  if (!name?.trim()) return;
  groupId.value = prompts.createTypePromptGroup(props.domain, name).id;
}
</script>
