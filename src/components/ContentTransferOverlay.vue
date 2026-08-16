<template>
  <section
    v-if="open"
    class="pc-modal-backdrop pc-content-transfer-backdrop"
    role="presentation"
    @click.self="close"
  >
    <article
      ref="dialogRef"
      class="pc-section-card pc-modal-dialog pc-content-transfer-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="内容迁移"
      tabindex="-1"
    >
      <header class="pc-section-head">
        <div>
          <span class="pc-kicker">{{ appName }}</span>
          <h3>内容迁移</h3>
        </div>
        <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <label v-if="domains.length > 1" class="pc-field-group">
        <span class="pc-field-label">迁移内容</span>
        <select v-model="selectedDomainKey" class="pc-select">
          <option v-for="domain in domains" :key="domain.key" :value="domain.key">
            {{ domainLabel(domain.key) }} · {{ domain.scope === 'chat' ? '当前聊天' : '全局配置' }}
          </option>
        </select>
      </label>

      <article class="pc-section-card pc-content-transfer-export">
        <strong>导出{{ activeDomain?.scope === 'chat' ? '当前聊天内容' : '全局配置' }}</strong>
        <p v-if="activeDomain?.scope === 'chat'">文件只包含当前聊天中这一类 App 内容，不包含其他聊天。</p>
        <p v-else>文件只包含当前选择的数据域；导出前请自行保管其中可能存在的连接地址等配置。</p>
        <button class="pc-primary-btn" type="button" @click="exportCurrent">导出内容</button>
      </article>

      <article class="pc-section-card pc-content-transfer-import">
        <strong>导入内容文件</strong>
        <button class="pc-soft-btn" type="button" @click="inputEl?.click()">选择文件</button>
        <input ref="inputEl" class="pc-hidden-input" type="file" accept="application/json,.json" @change="readFile" />
        <div v-if="payload" class="pc-content-transfer-preview">
          <span>{{ fileName }}</span>
          <strong>{{ summary.collections }} 组 · 约 {{ summary.items }} 项</strong>
        </div>
        <div v-if="payload" class="pc-segment" aria-label="重名处理">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            :class="['pc-segment-btn', { active: mode === option.value }]"
            type="button"
            @click="mode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <p v-if="payload" class="pc-help-text">{{ modeHelp }}</p>
        <button v-if="payload" class="pc-primary-btn" type="button" :disabled="busy" @click="applyImport">
          {{ busy ? '导入中' : '确认导入' }}
        </button>
      </article>
    </article>
  </section>
</template>

<script setup lang="ts">
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { usePhoneStore } from '@/store/phone';
import {
  buildContentTransfer,
  downloadContentTransfer,
  importContentTransfer,
  parseContentTransfer,
  summarizeContentTransfer,
  type ContentTransferMode,
  type ContentTransferPayload,
} from '@/util/contentTransfer';

type TransferDomainOption = { key: string; scope: 'chat' | 'global' };
const props = defineProps<{ appName: string; domains: TransferDomainOption[]; open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const phone = usePhoneStore();
const dialogRef = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const payload = shallowRef<ContentTransferPayload | null>(null);
const fileName = ref('');
const mode = ref<ContentTransferMode>('copy');
const busy = ref(false);
const selectedDomainKey = ref('');
const activeDomain = computed(
  () => props.domains.find(domain => domain.key === selectedDomainKey.value) ?? props.domains[0] ?? null,
);
const modeOptions: Array<{ label: string; value: ContentTransferMode }> = [
  { label: '创建副本', value: 'copy' },
  { label: '合并', value: 'merge' },
  { label: '覆盖', value: 'replace' },
];
const summary = computed(() => summarizeContentTransfer(payload.value?.data));
const modeHelp = computed(
  () =>
    ({
      copy: '为导入内容重建标识并追加“副本”，不覆盖同 ID 内容。',
      merge: '按 ID 合并；同 ID 内容以导入文件为准，其余本地内容保留。',
      replace:
        activeDomain.value?.scope === 'chat'
          ? '只覆盖当前聊天中这一类 App 内容，不影响其他 App 或聊天。'
          : '覆盖这一类全局配置，不影响其他 App 数据。',
    })[mode.value],
);

const domainLabels: Record<string, string> = {
  'card-writer': '写卡工坊',
  'cloud-media': '云媒体配置',
  'custom-app-chat-data': '自定义 App 聊天内容',
  'custom-app-definitions': '自定义 App 定义',
  'custom-app-global-data': '自定义 App 全局内容',
  comfy: 'Comfy 工作流',
  diaries: '日记本',
  digests: '剧情摘要',
  extras: '番外书籍',
  forum: '论坛板块',
  letters: '书信集',
  media: '媒体库',
  profiles: '资料表',
  'preset-link': '预设绑定',
  'regex-display': '阅读正则',
  relationships: '关系资料',
  'scene-planner': '场景规划',
  storylines: '故事线',
  summaries: '总结集',
  theater: '小剧场集',
  timekeeper: '时间确认',
  'world-slots': '世界书槽位',
  'worldbook-link': '世界书联动',
};

function domainLabel(key: string) {
  return domainLabels[key] || key;
}

function close() {
  if (!busy.value) emit('close');
}

usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => props.open,
  onClose: close,
});

function exportCurrent() {
  if (!activeDomain.value) return;
  downloadContentTransfer(
    buildContentTransfer(activeDomain.value.key),
    `${props.appName}-${domainLabel(activeDomain.value.key)}`,
  );
  toastr.success('已开始导出当前 App 内容');
}

async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const parsed = parseContentTransfer(await file.text());
    if (!props.domains.some(domain => domain.key === parsed.domainKey)) {
      throw new Error('这份文件属于其他 App，不能导入到当前 App');
    }
    selectedDomainKey.value = parsed.domainKey;
    payload.value = parsed;
    fileName.value = file.name;
  } catch (error) {
    payload.value = null;
    toastr.error(error instanceof Error ? error.message : '读取迁移文件失败');
  }
}

async function applyImport() {
  if (!payload.value || busy.value) return;
  const confirmed = await phone.confirmNotice(
    `${modeHelp.value}\n目标：${
      activeDomain.value?.scope === 'chat'
        ? `${phone.viewingScopeMeta.ownerName} / ${phone.viewingScopeMeta.chatTitle}`
        : `${props.appName}全局配置`
    }`,
    { confirmLabel: '导入', kind: mode.value === 'replace' ? 'warning' : 'info', title: '确认内容迁移' },
  );
  if (!confirmed) return;
  busy.value = true;
  try {
    const result = await importContentTransfer(payload.value, mode.value);
    toastr.success(`导入完成：${result.collections} 组，约 ${result.items} 项`);
    payload.value = null;
    emit('close');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '导入失败，已恢复原数据');
  } finally {
    busy.value = false;
  }
}

watch(
  () => [props.open, props.domains] as const,
  ([open]) => {
    if (!open) return;
    selectedDomainKey.value = props.domains[0]?.key || '';
    payload.value = null;
    fileName.value = '';
    mode.value = 'copy';
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-content-transfer-backdrop {
  backdrop-filter: blur(5px);
}

.pc-content-transfer-dialog {
  width: min(100%, 340px);
  max-height: 86%;
  overflow: auto;
  display: grid;
  gap: 12px;
}

.pc-content-transfer-dialog h3,
.pc-content-transfer-dialog p {
  margin: 0;
}

.pc-content-transfer-dialog > .pc-section-head > div {
  min-width: 0;
}

.pc-content-transfer-dialog > .pc-section-head .pc-kicker,
.pc-content-transfer-dialog > .pc-section-head h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-content-transfer-export,
.pc-content-transfer-import,
.pc-content-transfer-preview {
  display: grid;
  gap: 10px;
}

.pc-content-transfer-dialog p,
.pc-content-transfer-preview span {
  color: var(--pc-muted);
  font-size: 12px;
}
</style>
