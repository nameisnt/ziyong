<template>
  <section class="pc-worldbook-entry-editor-page">
    <article v-if="entry" class="pc-editor-card pc-worldbook-entry-editor">
      <header class="pc-worldbook-entry-editor-head">
        <span class="pc-kicker">{{ bookName }}</span>
        <h2 :title="entry.name || `条目 #${entry.uid}`">{{ entry.name || `条目 #${entry.uid}` }}</h2>
        <small>条目 #{{ entry.uid }}</small>
      </header>
      <label class="pc-field-group"
        ><span class="pc-field-label">条目名称</span
        ><input v-model="name" class="pc-field" type="text" placeholder="条目名称"
      /></label>
      <label class="pc-field-group pc-worldbook-content-field"
        ><span class="pc-field-label">条目内容</span
        ><textarea v-model="content" class="pc-area" placeholder="世界书条目内容"></textarea>
      </label>
      <div class="pc-field-group">
        <span class="pc-field-label">插入位置</span>
        <SearchableCombobox
          :model-value="positionType"
          :options="positionOptions"
          input-label="选择插入位置"
          placeholder="选择插入位置"
          toggle-title="展开插入位置"
          @update:model-value="positionType = $event as WorldbookEntry['position']['type']"
        />
      </div>
      <label class="pc-field-group"
        ><span class="pc-field-label">顺序</span><input v-model.number="order" class="pc-field" type="number" step="1"
      /></label>
      <template v-if="positionType === 'at_depth'">
        <div class="pc-field-group">
          <span class="pc-field-label">消息角色</span>
          <SearchableCombobox
            :model-value="role"
            :options="roleOptions"
            input-label="选择消息角色"
            placeholder="选择消息角色"
            toggle-title="展开消息角色"
            @update:model-value="role = $event as WorldbookEntry['position']['role']"
          />
        </div>
        <label class="pc-field-group"
          ><span class="pc-field-label">插入深度</span
          ><input v-model.number="depth" class="pc-field" type="number" min="0" step="1"
        /></label>
      </template>
      <div class="pc-form-actions pc-worldbook-entry-editor-actions">
        <button class="pc-soft-btn danger" type="button" :disabled="busy" @click="$emit('remove')">
          <i class="fa-solid fa-trash"></i><span>删除</span>
        </button>
        <button class="pc-soft-btn" type="button" :disabled="busy" @click="$emit('back')">返回</button>
        <button class="pc-primary-btn" type="button" :disabled="busy || !name.trim()" @click="$emit('save')">
          {{ busy ? '处理中' : '保存' }}
        </button>
      </div>
    </article>
    <EmptyState v-else title="正在读取世界书条目" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';

defineProps<{
  bookName: string;
  busy: boolean;
  entry: WorldbookEntry | null;
  positionOptions: Array<{ label: string; value: WorldbookEntry['position']['type'] }>;
  roleOptions: Array<{ label: string; value: WorldbookEntry['position']['role'] }>;
}>();

const content = defineModel<string>('content', { required: true });
const depth = defineModel<number>('depth', { required: true });
const name = defineModel<string>('name', { required: true });
const order = defineModel<number>('order', { required: true });
const positionType = defineModel<WorldbookEntry['position']['type']>('positionType', { required: true });
const role = defineModel<WorldbookEntry['position']['role']>('role', { required: true });

defineEmits<{ back: []; remove: []; save: [] }>();
</script>

<style scoped>
.pc-worldbook-entry-editor-page {
  min-height: 100%;
}
.pc-worldbook-entry-editor {
  display: flex;
  min-height: calc(100vh - 160px);
  flex-direction: column;
  gap: 14px;
}
.pc-worldbook-entry-editor-head {
  display: grid;
  gap: 4px;
}
.pc-worldbook-entry-editor-head h2 {
  overflow: hidden;
  margin: 0;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-worldbook-entry-editor-head small {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-worldbook-content-field {
  min-height: 260px;
  flex: 1;
}
.pc-worldbook-content-field .pc-area {
  min-height: 240px;
  flex: 1;
  resize: vertical;
}
.pc-worldbook-entry-editor-actions {
  margin-top: auto;
  padding-top: 10px;
}
.pc-soft-btn.danger {
  color: var(--pc-danger);
}
</style>
