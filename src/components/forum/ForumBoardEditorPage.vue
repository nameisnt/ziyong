<template>
  <section class="pc-forum-board-editor-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">{{ editing ? t`编辑板块` : t`新建板块` }}</span>
      <h2>{{ title || t`建立一个新的板块` }}</h2>
      <SearchableCombobox
        :empty-label="t`没有匹配的板块类型`"
        :input-label="t`选择论坛板块类型`"
        :model-value="typeId"
        :options="typeOptions"
        :placeholder="t`选择论坛板块类型`"
        :toggle-title="t`展开论坛板块类型`"
        @update:model-value="$emit('select-type', $event)"
      />
      <input v-model="name" class="pc-field" type="text" :placeholder="t`板块名称`" />
      <textarea
        v-model="typePrompt"
        class="pc-area compact"
        :placeholder="t`板块类型提示词（可编辑）`"
        @input="$emit('customize-type')"
      ></textarea>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">{{ t`保存` }}</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';

interface BoardTypeOption {
  group?: string;
  label: string;
  value: string;
}

defineProps<{
  editing: boolean;
  title?: string;
  typeId: string;
  typeOptions: BoardTypeOption[];
}>();

const name = defineModel<string>('name', { required: true });
const typePrompt = defineModel<string>('typePrompt', { required: true });

defineEmits<{
  cancel: [];
  'customize-type': [];
  save: [];
  'select-type': [typeId: string];
}>();
</script>

<style scoped>
.pc-forum-board-editor-page {
  min-height: 100%;
}

.pc-forum-board-editor-page h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}
</style>
