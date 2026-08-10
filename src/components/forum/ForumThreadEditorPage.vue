<template>
  <section class="pc-forum-thread-editor-page">
    <article class="pc-page-section">
      <template v-if="!editing">
        <SearchableCombobox
          v-if="!insideBoard"
          :input-label="t`选择或搜索论坛板块`"
          :model-value="boardId"
          :options="boardOptions"
          :placeholder="t`选择或搜索论坛板块`"
          :toggle-title="t`展开论坛板块`"
          @update:model-value="boardId = $event"
        />
        <SearchableCombobox
          v-if="!insideBoard && boardId === customBoardId"
          :input-label="t`选择论坛板块类型`"
          :model-value="boardTypeId"
          :options="boardTypeOptions"
          :placeholder="t`选择论坛板块类型`"
          :toggle-title="t`展开论坛板块类型`"
          @update:model-value="$emit('select-board-type', $event)"
        />
        <input
          v-if="!insideBoard && boardId === customBoardId"
          v-model="boardName"
          class="pc-field"
          type="text"
          :placeholder="t`新板块名称`"
        />
        <textarea
          v-if="!insideBoard && boardId === customBoardId"
          v-model="boardTypePrompt"
          class="pc-area compact"
          :placeholder="t`板块类型提示词（可编辑）`"
          @input="$emit('customize-board-type')"
        ></textarea>
      </template>

      <input v-model="author" class="pc-field" type="text" :placeholder="t`主楼作者`" />
      <input v-model="threadTitle" class="pc-field" type="text" :placeholder="t`帖子标题`" />
      <textarea v-model="content" class="pc-area pc-saved-content-area" :placeholder="t`主楼正文`"></textarea>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">{{ t`保存` }}</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';

interface ForumEditorOption {
  group?: string;
  label: string;
  value: string;
}

defineProps<{
  boardOptions: ForumEditorOption[];
  boardTypeOptions: ForumEditorOption[];
  customBoardId: string;
  editing: boolean;
  insideBoard: boolean;
  title?: string;
}>();

const author = defineModel<string>('author', { required: true });
const boardId = defineModel<string>('boardId', { required: true });
const boardName = defineModel<string>('boardName', { required: true });
const boardTypeId = defineModel<string>('boardTypeId', { required: true });
const boardTypePrompt = defineModel<string>('boardTypePrompt', { required: true });
const content = defineModel<string>('content', { required: true });
const threadTitle = defineModel<string>('threadTitle', { required: true });

defineEmits<{
  cancel: [];
  'customize-board-type': [];
  save: [];
  'select-board-type': [typeId: string];
}>();
</script>

<style scoped>
.pc-forum-thread-editor-page {
  min-height: 100%;
}

.pc-saved-content-area {
  min-height: 240px;
}
</style>
