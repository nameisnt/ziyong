<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-bundle-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="组合导入"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>组合导入</strong>
          <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <button class="pc-soft-btn" type="button" :disabled="busy" @click="fileInput?.click()">
          <i class="fa-solid fa-file-import"></i>选择组合包 / 主题 JSON
        </button>
        <input
          ref="fileInput"
          hidden
          type="file"
          accept=".zip,.json,application/zip,application/json"
          @change="readFile"
        />
        <label v-if="hasPresets" class="pc-field-group">
          <span class="pc-field-label">预设导入位置</span>
          <select v-model="context.presetTarget" class="pc-select" :disabled="busy || started" @change="replan">
            <option value="plugin">插件预设</option>
            <option value="tavern">酒馆预设</option>
          </select>
        </label>
        <label v-if="importRows.length" class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i><input v-model="query" type="search" placeholder="搜索资源名称" />
        </label>
        <p v-if="error" class="pc-bundle-error" role="alert">{{ error }}</p>
        <p v-if="busy" role="status">{{ progress || '正在读取…' }}</p>
        <p v-if="summary" role="status">{{ summary }}</p>
        <div class="pc-bundle-scroll">
          <EmptyState v-if="!busy && !importRows.length && !error" title="尚无组合包内容" />
          <template v-for="group in groups" :key="group.kind">
            <details v-if="group.rows.length" open>
              <summary>{{ labels[group.kind] }} · {{ group.rows.length }}</summary>
              <div class="pc-compact-toolbar">
                <button
                  class="pc-soft-btn"
                  type="button"
                  :disabled="busy || started"
                  @click="selectGroup(group.rows, true)"
                >
                  全选
                </button>
                <button
                  class="pc-soft-btn"
                  type="button"
                  :disabled="busy || started"
                  @click="selectGroup(group.rows, false)"
                >
                  取消全选
                </button>
              </div>
              <div v-for="row in group.rows" :key="row.item.id" class="pc-bundle-row">
                <div class="pc-bundle-choice">
                  <BulkSelectionCheckbox
                    :model-value="row.selected"
                    :disabled="
                      busy ||
                      started ||
                      (row.item.kind === 'character' && Boolean(targets[row.item.id]?.characterAvatar))
                    "
                    :label="row.item.name"
                    @update:model-value="setSelected(row, $event)"
                  />
                  <span>{{ row.item.name }}</span>
                </div>
                <small v-if="row.item.parentId">{{ parentName(row) }}</small>
                <small v-if="row.item.kind === 'preset'">{{
                  row.item.presetSource === 'tavern' ? '酒馆预设' : '插件预设'
                }}</small>
                <small v-if="row.item.kind === 'preset' && attachmentCount(row)"
                  >附带 {{ attachmentCount(row) }} 项正则 / 脚本</small
                >
                <label v-if="row.item.kind === 'character'" class="pc-field-group">
                  <span class="pc-field-label">聊天目标角色卡</span>
                  <select
                    :value="targets[row.item.id]?.characterAvatar || ''"
                    class="pc-select"
                    :disabled="busy || targetLocked(row)"
                    @change="selectCharacter(row, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">使用本次导入的角色卡</option>
                    <option v-for="character in characterTargets" :key="character.avatar" :value="character.avatar">
                      {{ character.name }} · {{ character.avatar }}
                    </option>
                  </select>
                </label>
                <select
                  v-if="row.conflict"
                  v-model="row.mode"
                  class="pc-select"
                  :disabled="busy || started"
                  :aria-label="`${row.item.name} 同名冲突处理`"
                >
                  <option value="skip">同名跳过</option>
                  <option value="copy">
                    {{ row.item.kind === 'character' ? '作为新角色卡导入' : '另存为（自动编号）' }}
                  </option>
                  <option v-if="row.replaceable" value="replace">替换</option>
                </select>
                <p v-if="row.message" :class="{ 'pc-bundle-error': row.status === 'failed' }">{{ row.message }}</p>
              </div>
            </details>
          </template>
        </div>
        <footer class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="close">关闭</button>
          <button class="pc-primary-btn" type="button" :disabled="busy || !canImport" @click="applyImport">
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
import { getCharacterTargets, importResource, planImport, refreshChatConflicts, type ImportContext } from './host';
import { runBundleImport } from './importQueue';
import { readBundle } from './zip';
import { decodeJson, readTheme, type ImportRow, type ResourceBundle, type ResourceKind } from './model';

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
const stopGuard = phone.registerNavigationGuard(() => !busy.value);
onBeforeUnmount(stopGuard);
const bundle = shallowRef<ResourceBundle | null>(null);
const importRows = ref<ImportRow[]>([]);
const context = reactive<ImportContext>({ presetTarget: 'plugin', characterAvatar: '', characterName: '' });
const targets = reactive<Record<string, ImportContext>>({});
const characterTargets = ref<ReturnType<typeof getCharacterTargets>>([]);
const labels: Record<ResourceKind, string> = {
  preset: '预设',
  character: '角色卡',
  worldbook: '世界书',
  regex: '正则',
  script: '助手脚本',
  chat: '聊天记录',
  theme: 'UI 主题',
};
const hasPresets = computed(() => importRows.value.some(row => row.item.kind === 'preset'));
const parent = (row: ImportRow) => importRows.value.find(item => item.item.id === row.item.parentId);
const parentName = (row: ImportRow) => parent(row)?.item.name || '';
const attachmentCount = (row: ImportRow) => importRows.value.filter(item => item.item.parentId === row.item.id).length;
const groups = computed(() =>
  (Object.keys(labels) as ResourceKind[]).map(kind => ({
    kind,
    rows: importRows.value.filter(
      row =>
        row.item.kind === kind &&
        parent(row)?.item.kind !== 'preset' &&
        `${row.item.name} ${parentName(row)}`.toLowerCase().includes(query.value.trim().toLowerCase()),
    ),
  })),
);
const canImport = computed(() =>
  importRows.value.some(row => row.selected && (row.status === 'pending' || row.status === 'failed')),
);
function close() {
  if (!busy.value) emit('close');
}
function setSelected(row: ImportRow, selected: boolean) {
  if (row.item.kind === 'character' && targets[row.item.id]?.characterAvatar) return;
  row.selected = selected;
  if (row.item.kind === 'preset')
    importRows.value
      .filter(item => item.item.parentId === row.item.id)
      .forEach(item => {
        item.selected = selected;
      });
  if (row.item.kind === 'character' && !selected && !targets[row.item.id]?.characterAvatar)
    importRows.value
      .filter(item => item.item.parentId === row.item.id)
      .forEach(item => {
        item.selected = false;
      });
  const owner = parent(row);
  if (row.item.kind === 'chat' && selected && owner && !targets[owner.item.id]?.characterAvatar) owner.selected = true;
}
function selectGroup(rows: ImportRow[], selected: boolean) {
  rows.forEach(row => setSelected(row, selected));
}
function targetLocked(row: ImportRow) {
  return importRows.value.some(
    item => item.status === 'success' && (item === row || item.item.parentId === row.item.id),
  );
}
async function selectCharacter(row: ImportRow, avatar: string) {
  const target = targets[row.item.id]!;
  target.characterAvatar = avatar;
  target.characterName = characterTargets.value.find(character => character.avatar === avatar)?.name || '';
  row.selected = !avatar;
  busy.value = true;
  error.value = '';
  try {
    await refreshChatConflicts(
      importRows.value.filter(item => item.item.parentId === row.item.id),
      target,
    );
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
async function replan() {
  if (!bundle.value) return;
  busy.value = true;
  error.value = '';
  try {
    importRows.value = await planImport(bundle.value, context);
    characterTargets.value = getCharacterTargets();
    for (const key of Object.keys(targets)) delete targets[key];
    for (const row of importRows.value.filter(row => row.item.kind === 'character'))
      targets[row.item.id] = { ...context, characterAvatar: '', characterName: '' };
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
  query.value = '';
  started.value = false;
  bundle.value = null;
  importRows.value = [];
  try {
    bundle.value = await readBundle(file);
    context.presetTarget = bundle.value.manifest.items.find(item => item.kind === 'preset')?.presetSource || 'plugin';
    await replan();
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
async function applyImport() {
  if (!bundle.value || busy.value) return;
  const selected = importRows.value.filter(row => row.selected);
  const unresolved = selected.find(
    row =>
      row.item.kind === 'character' &&
      row.conflict &&
      row.mode === 'skip' &&
      !targets[row.item.id]?.characterAvatar &&
      selected.some(child => child.item.parentId === row.item.id),
  );
  if (unresolved) {
    error.value = `${unresolved.name}：跳过同名角色卡时，请先选择聊天目标角色卡，或改为作为新角色卡导入。`;
    return;
  }
  const replacements = selected.filter(row => row.conflict && row.mode === 'replace');
  const externalThemes = selected.filter(
    row =>
      row.item.kind === 'theme' &&
      String(readTheme(decodeJson(bundle.value!.files[row.item.path]!)).custom_css || '').includes('@import'),
  );
  if (
    !started.value &&
    !(await phone.confirmNotice(
      `导入 ${selected.length} 项${replacements.length ? `，将替换：${replacements.map(row => row.name).join('、')}` : ''}？新增全局正则和助手脚本默认停用。${externalThemes.length ? `以下主题含外部 CSS @import，启用时可能访问外部资源：${externalThemes.map(row => row.name).join('、')}。` : ''}`,
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
      id => Boolean(targets[id]?.characterAvatar),
      row =>
        importResource(
          bundle.value!,
          row,
          importRows.value,
          row.item.kind === 'character'
            ? targets[row.item.id]!
            : row.item.kind === 'chat'
              ? targets[row.item.parentId!]!
              : context,
        ),
      name => {
        progress.value = `导入：${name}`;
      },
    );
    characterTargets.value = getCharacterTargets();
    summary.value = `成功 ${selected.filter(row => row.status === 'success').length}，跳过 ${selected.filter(row => row.status === 'skipped').length}，失败 ${selected.filter(row => row.status === 'failed').length}`;
    emit('imported');
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
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
.pc-bundle-row small {
  color: var(--pc-muted);
}
.pc-bundle-dialog p {
  margin: 0;
}
</style>
