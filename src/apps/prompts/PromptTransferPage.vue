<template>
  <section class="pc-prompts-page">
    <div class="pc-prompts-editor">
      <div class="pc-transfer-list">
        <label v-for="item in transferItems" :key="item.key" class="pc-transfer-item">
          <input v-model="selection[item.key]" type="checkbox" />
          <strong>{{ item.label }}</strong>
        </label>
      </div>

      <div class="pc-form-actions pc-transfer-actions">
        <button class="pc-soft-btn" type="button" @click="phone.goBack()">返回</button>
        <button class="pc-soft-btn" type="button" @click="openImport">导入所选</button>
        <button class="pc-primary-btn" type="button" @click="exportSelected">导出所选</button>
      </div>
      <input
        ref="inputEl"
        class="pc-hidden-input"
        type="file"
        accept="application/json,.json"
        @change="importSelected"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePhoneStore } from '@/store/phone';
import { usePromptStore, type PromptTransferSelection } from '@/store/prompts';

const phone = usePhoneStore();
const prompts = usePromptStore();
const inputEl = ref<HTMLInputElement | null>(null);
const selection = reactive<PromptTransferSelection>({
  appPrompts: true,
  outputRules: true,
  quickPhraseGroups: true,
  quickTemplateGroups: true,
  taskTemplates: true,
  typePrompts: true,
});
const transferItems: Array<{ key: keyof PromptTransferSelection; label: string }> = [
  { key: 'appPrompts', label: 'App 提示词' },
  { key: 'taskTemplates', label: '任务模板' },
  { key: 'outputRules', label: '输出与解析' },
  { key: 'typePrompts', label: '类型提示词' },
  { key: 'quickPhraseGroups', label: '快速短语' },
  { key: 'quickTemplateGroups', label: '模板快捷' },
];

function getSelection(): PromptTransferSelection {
  return { ...selection };
}

function requireSelection() {
  const selected = getSelection();
  if (Object.values(selected).some(Boolean)) return selected;
  throw new Error('请至少勾选一类提示词');
}

function exportSelected() {
  try {
    const transfer = prompts.buildTransfer(requireSelection());
    const blob = new Blob([JSON.stringify(transfer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sillytavern-phone-prompts-${Date.now()}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    toastr.success('已导出所选提示词配置');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '导出提示词失败');
  }
}

function openImport() {
  try {
    requireSelection();
    inputEl.value?.click();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '请选择要导入的区段');
  }
}

async function importSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    const selected = requireSelection();
    const transfer = prompts.parseTransfer(await file.text());
    const confirmed = await phone.confirmNotice('要用这份文件覆盖当前勾选的提示词区段吗？未勾选的内容会保持不变。', {
      confirmLabel: '导入',
      kind: 'warning',
    });
    if (!confirmed) return;
    prompts.applyTransfer(transfer, selected);
    toastr.success('已导入所选提示词配置');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '导入提示词失败');
  }
}
</script>

<style scoped>
.pc-prompts-page,
.pc-prompts-editor {
  display: grid;
  gap: 14px;
}

.pc-transfer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-transfer-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
}

.pc-transfer-item input {
  margin-top: 3px;
}

.pc-transfer-item strong {
  display: block;
  font-size: 14px;
}

.pc-transfer-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 18px;
}

.pc-transfer-actions .pc-soft-btn,
.pc-transfer-actions .pc-primary-btn {
  width: 100%;
  min-width: 0;
  padding: 0 8px;
}
</style>
