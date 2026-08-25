<template>
  <section class="pc-worldbook-entry-editor-page pc-saved-content-editor-page">
    <article v-if="entry" class="pc-page-section pc-worldbook-entry-editor pc-saved-content-editor">
      <header class="pc-compact-toolbar pc-worldbook-entry-editor-head">
        <span :title="bookName">{{ bookName }}</span>
        <strong>{{ copying ? '复制条目' : `条目 #${entry.uid}` }}</strong>
      </header>
      <label class="pc-field-group"
        ><span class="pc-field-label">{{ copying ? '副本名称' : '条目名称' }}</span
        ><input v-model="name" class="pc-field" type="text" placeholder="条目名称"
      /></label>
      <div class="pc-field-group">
        <span class="pc-field-label">激活策略</span>
        <SearchableCombobox
          :model-value="strategyType"
          :options="strategyOptions"
          input-label="选择激活策略"
          placeholder="选择激活策略"
          toggle-title="展开激活策略"
          @update:model-value="strategyType = $event as WorldbookEntry['strategy']['type']"
        />
      </div>
      <label v-if="strategyType === 'selective'" class="pc-field-group">
        <span class="pc-field-label">主关键词</span>
        <input v-model="keysText" class="pc-field" type="text" placeholder="用逗号分隔" />
      </label>
      <div class="pc-worldbook-basic-grid">
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
          ><span class="pc-field-label">插入顺序</span
          ><input v-model.number="order" class="pc-field" type="number" inputmode="numeric" step="1"
        /></label>
      </div>
      <template v-if="positionType === 'at_depth'">
        <div class="pc-worldbook-basic-grid">
          <label class="pc-field-group"
            ><span class="pc-field-label">插入深度</span
            ><input v-model.number="depth" class="pc-field" type="number" inputmode="numeric" min="0" step="1"
          /></label>
          <div class="pc-field-group">
            <span class="pc-field-label">消息身份</span>
            <SearchableCombobox
              :model-value="role"
              :options="roleOptions"
              input-label="选择消息身份"
              placeholder="选择消息身份"
              toggle-title="展开消息身份"
              @update:model-value="role = $event as WorldbookEntry['position']['role']"
            />
          </div>
        </div>
      </template>
      <label class="pc-field-group pc-worldbook-content-field pc-saved-content-field"
        ><span class="pc-field-label">条目内容</span
        ><textarea
          v-model="content"
          class="pc-area pc-area-long pc-saved-content-area"
          placeholder="世界书条目内容"
        ></textarea>
      </label>
      <div class="pc-form-actions pc-worldbook-entry-editor-actions">
        <button
          v-if="!copying"
          class="pc-icon-btn danger"
          type="button"
          aria-label="删除条目"
          :disabled="busy"
          title="删除条目"
          @click="$emit('remove')"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
        <button
          v-if="!copying"
          class="pc-soft-btn"
          type="button"
          :disabled="busy || !name.trim()"
          @click="$emit('convert-to-theater')"
        >
          <i class="fa-solid fa-masks-theater"></i><span>转为小剧场类型</span>
        </button>
        <button class="pc-soft-btn" type="button" :disabled="busy" @click="$emit('back')">
          {{ copying ? '取消' : '返回' }}
        </button>
        <button class="pc-primary-btn" type="button" :disabled="busy || !name.trim()" @click="$emit('save')">
          {{ busy ? '处理中' : copying ? '保存副本' : '保存' }}
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
  copying?: boolean;
  entry: WorldbookEntry | null;
  positionOptions: Array<{ label: string; value: WorldbookEntry['position']['type'] }>;
  roleOptions: Array<{ label: string; value: WorldbookEntry['position']['role'] }>;
  strategyOptions: Array<{ label: string; value: WorldbookEntry['strategy']['type'] }>;
}>();

const content = defineModel<string>('content', { required: true });
const depth = defineModel<number>('depth', { required: true });
const keysText = defineModel<string>('keysText', { required: true });
const name = defineModel<string>('name', { required: true });
const order = defineModel<number>('order', { required: true });
const positionType = defineModel<WorldbookEntry['position']['type']>('positionType', { required: true });
const role = defineModel<WorldbookEntry['position']['role']>('role', { required: true });
const strategyType = defineModel<WorldbookEntry['strategy']['type']>('strategyType', { required: true });

defineEmits<{ back: []; 'convert-to-theater': []; remove: []; save: [] }>();
</script>

<style scoped>
.pc-worldbook-entry-editor-page {
  min-height: 100%;
}
.pc-worldbook-entry-editor-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.pc-worldbook-entry-editor-head span {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-worldbook-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(96px, 0.5fr);
  gap: 10px;
}
.pc-worldbook-entry-editor-actions {
  margin-top: auto;
  padding-top: 10px;
}
.pc-soft-btn.danger {
  color: var(--pc-danger);
}
</style>
