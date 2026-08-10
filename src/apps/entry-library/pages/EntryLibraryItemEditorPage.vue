<template>
  <section class="pc-entry-library-page">
    <article class="pc-editor-card pc-entry-item-editor">
      <label class="pc-field-group"><span>名称</span><input v-model="title" class="pc-field" type="text" /></label>
      <label class="pc-field-group"
        ><span>分组</span
        ><select v-model="groupId" class="pc-select">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select></label
      >
      <label class="pc-field-group"
        ><span>顺序</span><input v-model.number="order" class="pc-field" type="number" min="1" :max="orderMax"
      /></label>
      <label class="pc-field-group pc-entry-content-field"
        ><span>内容</span><textarea v-model="content" class="pc-area"></textarea>
      </label>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('back')">取消</button
        ><button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import type { EntryLibraryGroup } from '../store';
defineProps<{ groups: EntryLibraryGroup[]; orderMax: number }>();
const content = defineModel<string>('content', { required: true });
const groupId = defineModel<string>('groupId', { required: true });
const order = defineModel<number>('order', { required: true });
const title = defineModel<string>('title', { required: true });
defineEmits<{ back: []; save: [] }>();
</script>
<style scoped>
.pc-entry-library-page {
  min-height: 100%;
}
.pc-entry-item-editor {
  display: grid;
  gap: 12px;
}
.pc-entry-content-field .pc-area {
  min-height: 300px;
}
</style>
