<template>
  <section class="pc-diary-entry-editor-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">编辑日记</span>
      <h2>{{ editingTitle || '调整当前内容' }}</h2>

      <input v-if="showBookFields" v-model="perspectiveName" class="pc-field" type="text" placeholder="视角角色名" />
      <input v-if="showBookFields" v-model="bookTitle" class="pc-field" type="text" placeholder="书架名称（可留空）" />
      <input v-model="title" class="pc-field" type="text" placeholder="标题" />
      <input v-model="occurredAt" class="pc-field" type="text" placeholder="发生时间，例如 昨夜 23:10" />

      <div v-if="showOrder" class="pc-field-group">
        <label class="pc-field-label">目录顺序</label>
        <input v-model.number="directoryOrder" class="pc-field" type="number" min="0" step="1" />
      </div>

      <div class="pc-segment pc-diary-kind-segment">
        <button :class="['pc-segment-btn', { active: kind === 'normal' }]" type="button" @click="kind = 'normal'">
          普通日记
        </button>
        <button
          :class="['pc-segment-btn', { active: kind === 'read-reaction' }]"
          type="button"
          @click="kind = 'read-reaction'"
        >
          阅读反应
        </button>
      </div>

      <input
        v-if="kind === 'read-reaction'"
        v-model="readers"
        class="pc-field"
        type="text"
        placeholder="阅读者，用逗号分隔"
      />
      <textarea v-model="content" class="pc-area pc-diary-entry-content" placeholder="正文"></textarea>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  editingTitle: string;
  showBookFields: boolean;
  showOrder: boolean;
}>();

defineEmits<{ cancel: []; save: [] }>();

const bookTitle = defineModel<string>('bookTitle', { required: true });
const content = defineModel<string>('content', { required: true });
const directoryOrder = defineModel<number>('directoryOrder', { required: true });
const kind = defineModel<'normal' | 'read-reaction'>('kind', { required: true });
const occurredAt = defineModel<string>('occurredAt', { required: true });
const perspectiveName = defineModel<string>('perspectiveName', { required: true });
const readers = defineModel<string>('readers', { required: true });
const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-diary-entry-editor-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-diary-kind-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.pc-diary-entry-content {
  min-height: 260px;
}
</style>
