<template>
  <article class="pc-section-card">
    <div class="pc-section-head">
      <strong>配置读取失败</strong>
    </div>
    <p>{{ error }}</p>
    <p>原始数据仍保留在本地；在确认重置前，不会用默认值覆盖它。</p>
    <div class="pc-form-actions">
      <button class="pc-soft-btn" type="button" @click="$emit('retry')">重新读取</button>
      <button class="pc-soft-btn" type="button" @click="downloadRaw">导出原始数据</button>
      <button class="pc-primary-btn danger" type="button" @click="$emit('reset')">确认重置</button>
    </div>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: string;
  filename: string;
  rawData: unknown;
}>();

defineEmits<{
  reset: [];
  retry: [];
}>();

function downloadRaw() {
  const blob = new Blob([JSON.stringify(props.rawData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = props.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
</script>
