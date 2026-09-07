<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-regex-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="导入酒馆正则"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>导入酒馆正则</strong>
          <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="pc-regex-import-source">
          <SearchableCombobox v-model="source" :options="sourceOptions" :disabled="busy" input-label="酒馆正则来源" />
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="loadTavern">
            {{ busy ? '读取中' : '读取酒馆' }}
          </button>
        </div>
        <button class="pc-soft-btn" type="button" :disabled="busy" @click="fileInput?.click()">
          <i class="fa-solid fa-file-import"></i>选择 JSON 文件
        </button>
        <input ref="fileInput" class="pc-hidden-input" type="file" accept=".json,application/json" @change="loadFile" />
        <label class="pc-field-group">
          <span class="pc-field-label">导入到分组</span>
          <SearchableCombobox v-model="groupId" :options="groupOptions" input-label="导入到分组" />
        </label>
        <input v-model="search" class="pc-field" type="search" placeholder="搜索规则" aria-label="搜索待导入规则" />
        <div class="pc-regex-import-list">
          <p v-if="error" class="pc-status-card warning">{{ error }}</p>
          <div v-for="item in visibleItems" :key="item.index" class="pc-setting-row">
            <span class="pc-setting-label">{{ item.rule.name }}</span>
            <BulkSelectionCheckbox
              :label="`选择 ${item.rule.name}`"
              :model-value="selected.includes(item.index)"
              @update:model-value="selectItem(item.index, $event)"
            />
          </div>
          <EmptyState v-if="!visibleItems.length && !busy && !error" compact title="没有待导入的规则" />
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="!visibleItems.length || busy" @click="toggleVisible">
            {{ allVisibleSelected ? '取消可见' : '选择可见' }}
          </button>
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="!selected.length || busy || !!error"
            @click="importSelected"
          >
            导入所选 {{ selected.length }}
          </button>
        </div>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { parseTavernRegexImport } from '@/util/regexDisplay';
import { useRegexDisplayStore } from './store';

const emit = defineEmits<{ close: [] }>();
const store = useRegexDisplayStore();
const dialogRef = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const source = ref('global');
const sourceOptions = [
  { value: 'global', label: '全局正则' },
  { value: 'character', label: '当前角色卡正则' },
  { value: 'preset', label: '当前预设正则' },
];
const groupId = ref('');
const groupOptions = computed(() => [
  { value: '', label: '未分组' },
  ...store.groups.map(group => ({ value: group.id, label: group.name })),
]);
const candidates = ref<ReturnType<typeof parseTavernRegexImport>>([]);
const selected = ref<number[]>([]);
const search = ref('');
const error = ref('');
const busy = ref(false);
function selectItem(index: number, enabled: boolean) {
  selected.value = enabled ? [...new Set([...selected.value, index])] : selected.value.filter(item => item !== index);
}
const visibleItems = computed(() =>
  candidates.value
    .map((rule, index) => ({ rule, index }))
    .filter(item => item.rule.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())),
);
const allVisibleSelected = computed(
  () => visibleItems.value.length > 0 && visibleItems.value.every(item => selected.value.includes(item.index)),
);
function toggleVisible() {
  const visible = new Set(visibleItems.value.map(item => item.index));
  selected.value = allVisibleSelected.value
    ? selected.value.filter(index => !visible.has(index))
    : [...new Set([...selected.value, ...visible])];
}
function setCandidates(payload: unknown) {
  candidates.value = parseTavernRegexImport(payload);
  selected.value = [];
  search.value = '';
}
async function readSource(read: () => unknown | Promise<unknown>) {
  busy.value = true;
  error.value = '';
  candidates.value = [];
  selected.value = [];
  try {
    setCandidates(await read());
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    busy.value = false;
  }
}
function loadTavern() {
  return readSource(() => {
    const getRegexes = getOptionalGlobalFunction<(option: { type: string }) => unknown>('getTavernRegexes');
    if (!getRegexes) throw new Error('酒馆助手正则读取接口不可用，请从酒馆导出 JSON 后选择文件导入。');
    return getRegexes({ type: source.value });
  });
}
async function loadFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await readSource(async () => JSON.parse(await file.text()));
  input.value = '';
}
function importSelected() {
  if (!selected.value.length || busy.value || error.value) return;
  if (groupId.value && !store.groups.some(group => group.id === groupId.value)) {
    toastr.error('目标分组不存在，请重新选择分组。');
    return;
  }
  const ids = new Set(selected.value);
  store.addRules(
    candidates.value.filter((_rule, index) => ids.has(index)).map(rule => ({ ...rule, groupId: groupId.value })),
  );
  toastr.success(`已导入 ${ids.size} 条正则`);
  emit('close');
}
function close() {
  if (!busy.value) emit('close');
}
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: close });
</script>

<style scoped>
.pc-regex-import-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(500px, 100%);
  min-height: 0;
  max-height: 95%;
}
.pc-regex-import-list {
  min-height: 80px;
  overflow: auto;
  overflow-wrap: anywhere;
}
.pc-regex-import-source {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
</style>
