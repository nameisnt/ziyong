<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section v-if="open" class="pc-modal-backdrop pc-item-transfer-backdrop" role="presentation" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-item-transfer-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="`导入${itemLabel}`"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <div>
            <span class="pc-kicker">单条内容</span>
            <h3>导入{{ itemLabel }}</h3>
          </div>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <button v-if="!payload" class="pc-soft-btn" type="button" @click="inputEl?.click()">选择单条内容文件</button>
        <input ref="inputEl" class="pc-hidden-input" type="file" accept="application/json,.json" @change="readFile" />

        <article v-if="preview" class="pc-section-card pc-item-transfer-preview">
          <span class="pc-kicker">{{ fileName }}</span>
          <strong>{{ preview.title }}</strong>
          <p v-if="preview.description">{{ preview.description }}</p>
          <p>导入到：{{ preview.targetLabel || '当前列表' }}</p>
        </article>

        <div v-if="preview?.conflict" class="pc-segment" role="group" aria-label="同 ID 内容处理">
          <button :class="['pc-segment-btn', { active: mode === 'copy' }]" type="button" @click="mode = 'copy'">
            作为副本
          </button>
          <button :class="['pc-segment-btn', { active: mode === 'replace' }]" type="button" @click="mode = 'replace'">
            覆盖原内容
          </button>
        </div>

        <p v-if="errorMessage" class="pc-status-card warning">{{ errorMessage }}</p>

        <div v-if="preview" class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="resetFile">重新选择</button>
          <button class="pc-primary-btn" type="button" :disabled="busy" @click="applyImport">
            {{ busy ? '导入中' : mode === 'replace' ? '确认覆盖' : '导入为新内容' }}
          </button>
        </div>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { getRegisteredPhoneApp } from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';
import {
  importItemTransfer,
  parseItemTransferFile,
  previewItemTransfer,
  type ItemTransferImportMode,
  type ItemTransferPayload,
} from '@/util/itemTransfer';

const props = defineProps<{
  appId: string;
  open: boolean;
  params: Record<string, string>;
}>();
const emit = defineEmits<{
  close: [];
  imported: [itemId: string];
}>();
const phone = usePhoneStore();
const dialogRef = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const payload = shallowRef<ItemTransferPayload | null>(null);
const preview = shallowRef<ReturnType<typeof previewItemTransfer> | null>(null);
const fileName = ref('');
const errorMessage = ref('');
const mode = ref<ItemTransferImportMode>('copy');
const busy = ref(false);
const itemLabel = computed(() => getRegisteredPhoneApp(props.appId)?.itemTransferProvider?.itemLabel || '内容');

usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => props.open,
  onClose: close,
});

watch(
  () => props.open,
  open => {
    if (open) resetFile();
  },
);

function close() {
  if (!busy.value) emit('close');
}
function resetFile() {
  payload.value = null;
  preview.value = null;
  fileName.value = '';
  errorMessage.value = '';
  mode.value = 'copy';
  if (inputEl.value) inputEl.value.value = '';
}
async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  resetFile();
  fileName.value = file.name;
  try {
    const parsed = await parseItemTransferFile(file);
    const nextPreview = previewItemTransfer(props.appId, parsed, props.params);
    payload.value = parsed;
    preview.value = nextPreview;
    mode.value = 'copy';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '单条内容文件读取失败';
  }
}
async function applyImport() {
  if (!payload.value || !preview.value || busy.value) return;
  if (
    mode.value === 'replace' &&
    !(await phone.confirmNotice(`要覆盖同 ID 的${itemLabel.value}“${preview.value.title}”吗？`, {
      confirmLabel: '覆盖',
      kind: 'warning',
    }))
  )
    return;
  busy.value = true;
  errorMessage.value = '';
  try {
    const result = await importItemTransfer(props.appId, payload.value, { mode: mode.value, params: props.params });
    toastr.success(result.message);
    emit('imported', result.itemId);
    emit('close');
    if (result.route) {
      if (phone.currentRoute.page === result.route.page) {
        phone.replacePage(result.route.page, result.route.title, result.route.params);
      } else {
        phone.pushPage(result.route.page, result.route.title, result.route.params);
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '单条内容导入失败';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.pc-item-transfer-backdrop {
  --pc-modal-z: 72;
}
.pc-item-transfer-dialog {
  display: grid;
  width: min(100%, 340px);
  max-height: 86%;
  overflow-y: auto;
  gap: 12px;
}
.pc-item-transfer-dialog h3,
.pc-item-transfer-dialog p {
  margin: 0;
}
.pc-item-transfer-preview {
  display: grid;
  gap: 6px;
}
.pc-item-transfer-preview p {
  color: var(--pc-muted);
  font-size: 12px;
}
</style>
