<template>
  <div v-if="open" class="pc-modal-backdrop pc-reasoning-mask" @click.self="emit('close')">
    <section
      ref="dialogRef"
      class="pc-modal-dialog pc-reasoning-card"
      role="dialog"
      aria-modal="true"
      aria-label="已保存的思维链"
      tabindex="-1"
    >
      <header class="pc-reasoning-head">
        <div>
          <strong>已保存的思维链</strong>
          <span>清洗时从正文前方移除的原始内容</span>
        </div>
        <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" @click="emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>
      <pre>{{ content }}</pre>
      <footer class="pc-form-actions">
        <button class="pc-soft-btn compact" type="button" @click="copyContent">
          <i class="fa-solid fa-copy"></i><span>复制</span>
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';

const props = defineProps<{
  content: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);

usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => props.open,
  onClose: () => emit('close'),
});

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.content);
    toastr.success('思维链已复制');
  } catch {
    toastr.error('复制失败，请长按正文手动复制');
  }
}
</script>

<style scoped>
.pc-reasoning-mask {
  --pc-modal-z: 65;
}

.pc-reasoning-card {
  display: flex;
  width: min(88%, 340px);
  max-width: calc(100% - 20px);
  max-height: min(78%, 580px);
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 14px;
  border-radius: min(var(--pc-card-radius), 10px);
}

.pc-reasoning-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-reasoning-head > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-reasoning-head span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-reasoning-card pre {
  flex: 1 1 auto;
  min-height: 120px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: 12px/1.55 var(--pc-font-sans);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
