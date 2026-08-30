<template>
  <section class="pc-entry-library-page pc-page-grid pc-page-grid-compact">
    <article class="pc-page-section pc-entry-transfer-card">
      <div>
        <strong>导出条目库</strong
        ><small>{{ groupCount }} 个分组 · {{ itemCount }} 条收藏 · {{ bindingCount }} 条绑定</small>
      </div>
      <button class="pc-primary-btn" type="button" @click="$emit('export')">
        <i class="fa-solid fa-download"></i>导出 JSON
      </button>
    </article>
    <article class="pc-page-section pc-entry-transfer-card">
      <div><strong>导入条目库</strong><small>合并会保留当前内容，覆盖会替换整个条目库。</small></div>
      <div class="pc-segment">
        <button :class="['pc-segment-btn', { active: mode === 'merge' }]" type="button" @click="mode = 'merge'">
          合并</button
        ><button :class="['pc-segment-btn', { active: mode === 'replace' }]" type="button" @click="mode = 'replace'">
          覆盖
        </button>
      </div>
      <input
        ref="fileField"
        class="pc-hidden-input"
        type="file"
        accept="application/json,.json"
        @change="$emit('import', $event)"
      />
      <button class="pc-soft-btn" type="button" @click="fileField?.click()">
        <i class="fa-solid fa-upload"></i>选择 JSON 文件
      </button>
    </article>
  </section>
</template>
<script setup lang="ts">
defineProps<{ bindingCount: number; groupCount: number; itemCount: number }>();
const mode = defineModel<'merge' | 'replace'>('mode', { required: true });
defineEmits<{ export: []; import: [event: Event] }>();
const fileField = ref<HTMLInputElement | null>(null);
</script>
<style scoped>
.pc-entry-transfer-card {
  display: grid;
  gap: 14px;
}
.pc-entry-transfer-card > div:first-child {
  display: grid;
  gap: 4px;
}
.pc-entry-transfer-card small {
  color: var(--pc-muted);
}
</style>
