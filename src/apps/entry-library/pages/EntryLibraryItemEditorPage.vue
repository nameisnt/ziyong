<template>
  <section class="pc-entry-library-page pc-saved-content-editor-page">
    <article class="pc-page-section pc-entry-item-editor pc-saved-content-editor">
      <label class="pc-field-group"><span>名称</span><input v-model="title" class="pc-field" type="text" /></label>
      <div class="pc-field-group">
        <span>分组</span>
        <SearchableCombobox v-model="groupId" :options="groupOptions" placeholder="选择或搜索分组" />
      </div>
      <label class="pc-field-group"
        ><span>顺序</span><input v-model.number="order" class="pc-field" type="number" min="1" :max="orderMax"
      /></label>
      <label class="pc-field-group pc-entry-content-field pc-saved-content-field"
        ><span>内容</span><textarea v-model="content" class="pc-area pc-saved-content-area"></textarea>
      </label>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">取消</button
        ><button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { EntryLibraryGroup } from '../store';
const props = defineProps<{ groups: EntryLibraryGroup[]; orderMax: number }>();
const content = defineModel<string>('content', { required: true });
const groupId = defineModel<string>('groupId', { required: true });
const order = defineModel<number>('order', { required: true });
const title = defineModel<string>('title', { required: true });
defineEmits<{ back: []; save: [] }>();
const groupOptions = computed(() => props.groups.map(group => ({ label: group.name, value: group.id })));
</script>
<style scoped>
.pc-entry-library-page {
  min-height: 100%;
}
</style>
