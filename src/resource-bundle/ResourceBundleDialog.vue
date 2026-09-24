<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-bundle-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>{{ title }}</strong>
          <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <template v-if="!source">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="fileInput?.click()">
            <i class="fa-solid fa-file-import"></i>选择组合包
          </button>
          <input ref="fileInput" hidden type="file" accept=".zip,application/zip" @change="readFile" />
          <label v-if="bundle?.manifest.kind === 'preset'" class="pc-field-group">
            <span class="pc-field-label">导入位置</span>
            <select v-model="context.presetTarget" class="pc-select" :disabled="busy || started" @change="replan">
              <option value="plugin">插件预设</option>
              <option value="tavern">酒馆预设</option>
            </select>
          </label>
          <label v-if="bundle?.manifest.kind === 'character'" class="pc-field-group">
            <span class="pc-field-label">聊天目标角色卡</span>
            <select
              :value="existingAvatar"
              class="pc-select"
              :disabled="
                busy ||
                importRows.some(
                  row => row.status === 'success' && (row.item.kind === 'character' || row.item.kind === 'chat'),
                )
              "
              @change="selectCharacter(($event.target as HTMLSelectElement).value)"
            >
              <option value="">使用本次导入的角色卡</option>
              <option v-for="character in characterTargets" :key="character.avatar" :value="character.avatar">
                {{ character.name }} · {{ character.avatar }}
              </option>
            </select>
          </label>
        </template>
        <label v-if="visibleRows.length" class="pc-search-field"
          ><i class="fa-solid fa-magnifying-glass"></i><input v-model="query" type="search" placeholder="搜索附件名称"
        /></label>
        <p v-if="error" class="pc-bundle-error" role="alert">{{ error }}</p>
        <p v-if="busy" role="status">{{ progress || '正在读取…' }}</p>
        <p v-if="summary" role="status">{{ summary }}</p>
        <div class="pc-bundle-scroll">
          <EmptyState v-if="!busy && !visibleRows.length && !error" title="尚无组合包内容" />
          <template v-for="group in groups" :key="group.kind">
            <details v-if="group.rows.length" open>
              <summary>{{ labels[group.kind] }} · {{ group.rows.length }}</summary>
              <div v-if="group.kind !== mainKind" class="pc-compact-toolbar">
                <button
                  class="pc-soft-btn"
                  type="button"
                  :disabled="busy || started"
                  @click="selectGroup(group.kind, true)"
                >
                  全选
                </button>
                <button
                  class="pc-soft-btn"
                  type="button"
                  :disabled="busy || started"
                  @click="selectGroup(group.kind, false)"
                >
                  取消全选
                </button>
              </div>
              <div v-for="row in group.rows" :key="row.item.id" class="pc-bundle-row">
                <div class="pc-bundle-choice">
                  <BulkSelectionCheckbox
                    :model-value="row.selected"
                    :disabled="busy || started || isRequired(row.item.kind)"
                    :label="row.item.name"
                    @update:model-value="row.selected = $event"
                  />
                  <span>{{ row.item.name }}</span>
                </div>
                <template v-if="'status' in row">
                  <template v-if="row.conflict && !row.item.parentId">
                    <span class="pc-bundle-muted">同名资源已存在</span>
                  </template>
                  <select
                    v-if="row.conflict"
                    v-model="row.mode"
                    class="pc-select"
                    :disabled="busy || started"
                    :aria-label="`${row.item.name} 冲突处理`"
                  >
                    <option value="skip">跳过</option>
                    <option value="copy">
                      {{ row.item.kind === 'character' ? '作为新角色卡导入' : '另存为（自动编号）' }}
                    </option>
                    <option v-if="row.replaceable" value="replace">替换</option>
                  </select>
                  <p v-if="row.message" :class="{ 'pc-bundle-error': row.status === 'failed' }">{{ row.message }}</p>
                </template>
              </div>
            </details>
          </template>
        </div>
        <footer class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="close">关闭</button>
          <button
            v-if="source"
            class="pc-primary-btn"
            type="button"
            :disabled="busy || !exportPlan"
            @click="exportFile"
          >
            <i class="fa-solid fa-file-export"></i>导出组合包
          </button>
          <button v-else class="pc-primary-btn" type="button" :disabled="busy || !canImport" @click="applyImport">
            <i class="fa-solid fa-file-import"></i>{{ started ? '重试失败项' : '导入所选' }}
          </button>
        </footer>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { usePhoneStore } from '@/store/phone';
import {
  getCharacterTargets,
  importResource,
  planExport,
  planImport,
  refreshChatConflicts,
  type ImportContext,
} from './host';
import { runBundleImport } from './importQueue';
import { readBundle, writeBundle } from './zip';
import type { BundleKind, BundleSource, ExportRow, ImportRow, ResourceBundle, ResourceKind } from './model';

const props = defineProps<{ source?: BundleSource; kind: BundleKind }>();
const emit = defineEmits<{ close: []; imported: [] }>();
const phone = usePhoneStore();
const dialogRef = ref<HTMLElement | null>(null),
  fileInput = ref<HTMLInputElement | null>(null);
const busy = ref(false),
  error = ref(''),
  progress = ref(''),
  query = ref(''),
  summary = ref(''),
  started = ref(false);
const stopNavigationGuard = phone.registerNavigationGuard(() => !busy.value);
onBeforeUnmount(stopNavigationGuard);
const exportPlan = ref<Awaited<ReturnType<typeof planExport>> | null>(null);
const bundle = shallowRef<ResourceBundle | null>(null);
const importRows = ref<ImportRow[]>([]);
const context = reactive<ImportContext>({ presetTarget: 'plugin', characterAvatar: '', characterName: '' });
const existingAvatar = ref(''),
  characterTargets = ref<ReturnType<typeof getCharacterTargets>>([]);
const labels: Record<ResourceKind, string> = {
  preset: '预设',
  character: '角色卡',
  worldbook: '世界书',
  regex: '正则',
  script: '助手脚本 / 分组',
  chat: '聊天记录',
};
const title = computed(() => `${props.source ? '组合导出' : '组合导入'} · ${props.source?.name || labels[props.kind]}`);
const mainKind = computed(() => props.source?.kind || bundle.value?.manifest.kind || props.kind);
const visibleRows = computed<Array<ExportRow | ImportRow>>(() => exportPlan.value?.rows || importRows.value);
const groups = computed(() =>
  (Object.keys(labels) as ResourceKind[]).map(kind => ({
    kind,
    rows: visibleRows.value.filter(
      row =>
        row.item.kind === kind &&
        (!row.item.parentId || row.item.name.toLowerCase().includes(query.value.toLowerCase())),
    ),
  })),
);
const canImport = computed(() =>
  Boolean(
    bundle.value && importRows.value.some(row => row.selected && (row.status === 'pending' || row.status === 'failed')),
  ),
);
function close() {
  if (!busy.value) emit('close');
}
function isRequired(kind: ResourceKind) {
  return kind === mainKind.value;
}
function selectGroup(kind: ResourceKind, selected: boolean) {
  groups.value
    .find(group => group.kind === kind)
    ?.rows.forEach(row => {
      row.selected = selected;
    });
}
async function selectCharacter(avatar: string) {
  existingAvatar.value = avatar;
  context.characterAvatar = avatar;
  context.characterName = characterTargets.value.find(character => character.avatar === avatar)?.name || '';
  const root = importRows.value.find(row => !row.item.parentId);
  if (root) root.selected = !avatar;
  busy.value = true;
  error.value = '';
  try {
    await refreshChatConflicts(importRows.value, context);
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
async function replan() {
  if (!bundle.value) return;
  error.value = '';
  busy.value = true;
  try {
    importRows.value = await planImport(bundle.value, context);
    characterTargets.value = getCharacterTargets();
  } catch (caught) {
    error.value = String(caught);
    importRows.value = [];
  } finally {
    busy.value = false;
  }
}
async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  busy.value = true;
  error.value = '';
  summary.value = '';
  started.value = false;
  query.value = '';
  bundle.value = null;
  importRows.value = [];
  existingAvatar.value = '';
  context.characterAvatar = '';
  context.characterName = '';
  try {
    const parsed = await readBundle(file);
    if (parsed.manifest.kind !== props.kind) throw new Error(`请在${labels[parsed.manifest.kind]}页面导入此组合包`);
    bundle.value = parsed;
    context.presetTarget = parsed.manifest.items.find(item => !item.parentId)?.presetSource || 'plugin';
    await replan();
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
async function exportFile() {
  if (!exportPlan.value || busy.value) return;
  busy.value = true;
  error.value = '';
  summary.value = '';
  try {
    await writeBundle(exportPlan.value.manifest, exportPlan.value.rows, name => {
      progress.value = `读取：${name}`;
    });
    summary.value = '组合包已导出';
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
async function applyImport() {
  if (!bundle.value || busy.value) return;
  const replacements = importRows.value.filter(row => row.selected && row.conflict && row.mode === 'replace');
  if (
    !started.value &&
    !(await phone.confirmNotice(
      `导入 ${importRows.value.filter(row => row.selected).length} 项${replacements.length ? `，将替换：${replacements.map(row => row.name).join('、')}` : ''}？新增全局正则和助手脚本默认停用。`,
      { title: '确认组合导入', confirmLabel: '导入', kind: 'warning' },
    ))
  )
    return;
  busy.value = true;
  started.value = true;
  error.value = '';
  try {
    await runBundleImport(
      bundle.value,
      importRows.value,
      () => Boolean(context.characterAvatar),
      row => importResource(bundle.value!, row, importRows.value, context),
      name => {
        progress.value = `导入：${name}`;
      },
    );
    const selected = importRows.value.filter(row => row.selected);
    summary.value = `成功 ${selected.filter(row => row.status === 'success').length}，跳过 ${selected.filter(row => row.status === 'skipped').length}，失败 ${selected.filter(row => row.status === 'failed').length}`;
    emit('imported');
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
onMounted(async () => {
  if (!props.source) return;
  busy.value = true;
  try {
    exportPlan.value = await planExport(props.source);
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
});
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: close });
</script>

<style scoped>
.pc-bundle-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(520px, 100%);
  max-height: 94%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.pc-bundle-dialog > header,
.pc-bundle-dialog > footer {
  flex-shrink: 0;
}
.pc-bundle-scroll {
  min-height: 80px;
  overflow: auto;
  overscroll-behavior: contain;
}
.pc-bundle-scroll summary {
  padding: 10px 0;
  cursor: pointer;
  font-weight: 600;
}
.pc-bundle-row {
  padding: 10px 0;
  display: grid;
  gap: 6px;
  border-bottom: 1px solid var(--pc-border);
}
.pc-bundle-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pc-bundle-choice > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.pc-bundle-error {
  color: var(--pc-danger);
}
.pc-bundle-muted {
  color: var(--pc-muted);
}
.pc-bundle-dialog p {
  margin: 0;
}
</style>
