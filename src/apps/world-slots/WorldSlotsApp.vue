<template>
  <section class="pc-world-slots-app">
    <section v-if="route.page === 'root'" class="pc-world-slots-page">
      <div class="pc-world-hero">
        <div>
          <span class="pc-kicker">{{ t`世界书槽位` }}</span>
          <h2>{{ slots.length }} {{ t`个槽位` }}</h2>
        </div>
        <button class="pc-primary-btn" type="button" @click="openEditor()">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新增` }}</span>
        </button>
      </div>

      <section class="pc-world-card">
        <div class="pc-book-heading">
          <div>
            <span class="pc-field-label">{{ t`固定世界书` }}</span>
            <strong>{{ WORLD_SLOTS_BOOK_NAME }}</strong>
          </div>
          <button
            class="pc-primary-btn compact"
            type="button"
            :disabled="isSyncing || !isCurrentChatScope"
            @click="syncSlots"
          >
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>{{ isSyncing ? t`同步中` : t`立即同步` }}</span>
          </button>
        </div>
        <p v-if="!isCurrentChatScope">{{ t`正在查看历史聊天，不会覆盖酒馆当前聊天的世界书。` }}</p>
        <p v-else-if="syncError" class="pc-sync-error">{{ syncError }}</p>
        <p v-else>{{ syncHint }}</p>
      </section>

      <section class="pc-world-toolbar">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" :placeholder="t`搜索槽位、关键词或内容`" />
        </label>
        <SearchableCombobox
          v-model="typeFilter"
          :options="typeFilterComboboxOptions"
          :placeholder="t`全部类型`"
          :input-label="t`筛选槽位类型`"
        />
      </section>

      <div v-if="filteredSlots.length" class="pc-slot-list">
        <article v-for="slot in filteredSlots" :key="slot.id" class="pc-slot-row" @click="openEditor(slot.id)">
          <div>
            <span>
              {{ getWorldSlotTypeLabel(slot.type) }} · {{ getWorldSlotPositionLabel(slot.position) }} ·
              {{ slot.insertionOrder }} · {{ slot.enabled ? t`启用` : t`停用` }}
            </span>
            <h3>{{ slot.title }}</h3>
            <p>{{ slot.content || t`空槽位` }}</p>
          </div>
          <strong>{{ slot.worldEntryId === null ? t`未同步` : `#${slot.worldEntryId}` }}</strong>
        </article>
      </div>
      <EmptyState v-else :title="slots.length ? t`没有匹配的槽位` : t`还没有槽位`" />
    </section>

    <section v-else-if="route.page === 'editor'" class="pc-world-slots-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ editingSlot ? t`编辑槽位` : t`新增槽位` }}</span>
        <h2>{{ editingSlot?.title || t`世界书条目槽位` }}</h2>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`槽位名称`" />
        <div class="pc-field-group pc-world-field-group">
          <span>{{ t`槽位类型` }}</span>
          <SearchableCombobox v-model="draft.type" :options="typeComboboxOptions" :placeholder="t`选择槽位类型`" />
        </div>
        <input v-model="draft.keysText" class="pc-field" type="text" :placeholder="t`关键词，用逗号分隔，可留空`" />

        <div class="pc-world-basic-grid">
          <div class="pc-field-group pc-world-field-group">
            <span>{{ t`插入位置` }}</span>
            <SearchableCombobox
              v-model="draft.position"
              :options="positionComboboxOptions"
              :placeholder="t`选择插入位置`"
            />
          </div>
          <label class="pc-field-group pc-world-field-group">
            <span>{{ t`插入顺序` }}</span>
            <input v-model="draft.insertionOrderText" class="pc-field" type="number" inputmode="numeric" />
          </label>
        </div>

        <div v-if="draft.position === 'at_depth'" class="pc-world-basic-grid">
          <label class="pc-field-group pc-world-field-group">
            <span>{{ t`插入深度` }}</span>
            <input v-model="draft.depthText" class="pc-field" type="number" inputmode="numeric" min="0" max="10000" />
          </label>
          <div class="pc-field-group pc-world-field-group">
            <span>{{ t`消息身份` }}</span>
            <SearchableCombobox v-model="draft.role" :options="roleComboboxOptions" :placeholder="t`选择消息身份`" />
          </div>
        </div>

        <div class="pc-world-switch-row">
          <strong>{{ t`启用条目` }}</strong>
          <label class="pc-toggle" :title="draft.enabled ? t`停用条目` : t`启用条目`">
            <input v-model="draft.enabled" type="checkbox" />
            <span aria-hidden="true"></span>
          </label>
        </div>

        <details class="pc-world-advanced">
          <summary>
            <span><i class="fa-solid fa-sliders"></i>{{ t`高级设置` }}</span>
            <i class="fa-solid fa-chevron-down pc-world-advanced-chevron"></i>
          </summary>
          <div class="pc-world-advanced-body">
            <label class="pc-field-group pc-world-field-group">
              <span>{{ t`次要关键词` }}</span>
              <input v-model="draft.secondaryKeysText" class="pc-field" type="text" :placeholder="t`用逗号分隔`" />
            </label>
            <div class="pc-field-group pc-world-field-group">
              <span>{{ t`关键词逻辑` }}</span>
              <SearchableCombobox
                v-model="draft.selectiveLogic"
                :options="logicComboboxOptions"
                :placeholder="t`选择关键词逻辑`"
              />
            </div>
            <label class="pc-field-group pc-world-field-group">
              <span>{{ t`激活概率（%）` }}</span>
              <input
                v-model="draft.probabilityText"
                class="pc-field"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
              />
            </label>

            <div class="pc-world-switch-row">
              <strong>{{ t`禁止被其他条目递归激活` }}</strong>
              <label class="pc-toggle">
                <input v-model="draft.excludeRecursion" type="checkbox" />
                <span aria-hidden="true"></span>
              </label>
            </div>
            <div class="pc-world-switch-row">
              <strong>{{ t`禁止递归激活其他条目` }}</strong>
              <label class="pc-toggle">
                <input v-model="draft.preventRecursion" type="checkbox" />
                <span aria-hidden="true"></span>
              </label>
            </div>

            <div class="pc-world-timing-grid">
              <label class="pc-field-group pc-world-field-group">
                <span>{{ t`黏性` }}</span>
                <input
                  v-model="draft.stickyText"
                  class="pc-field"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="10000"
                />
              </label>
              <label class="pc-field-group pc-world-field-group">
                <span>{{ t`冷却` }}</span>
                <input
                  v-model="draft.cooldownText"
                  class="pc-field"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="10000"
                />
              </label>
              <label class="pc-field-group pc-world-field-group">
                <span>{{ t`延迟` }}</span>
                <input
                  v-model="draft.delayText"
                  class="pc-field"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="10000"
                />
              </label>
            </div>
          </div>
        </details>

        <textarea
          v-model="draft.content"
          class="pc-area pc-world-area pc-saved-content-area"
          :placeholder="t`写入世界书的内容`"
        ></textarea>
        <ReferencePicker
          v-model="selectedReferences"
          compact-selected
          :excluded-root-ids="['app:world-slots']"
          :preferred-root-ids="['app:entry-library']"
          reorderable
          :toggle-label="t`插入条目库或 App 内容`"
        >
          <template #actions>
            <div v-if="selectedReferences.length" class="pc-world-import-controls">
              <div class="pc-segment" :aria-label="t`导入方式`">
                <button
                  :class="['pc-segment-btn', { active: referenceImportMode === 'merge' }]"
                  type="button"
                  @click="referenceImportMode = 'merge'"
                >
                  {{ t`合并为一条` }}
                </button>
                <button
                  :class="['pc-segment-btn', { active: referenceImportMode === 'separate' }]"
                  type="button"
                  @click="referenceImportMode = 'separate'"
                >
                  {{ t`每项一条` }}
                </button>
              </div>
              <button class="pc-primary-btn compact" type="button" @click="applySelectedReferences">
                <i :class="referenceImportMode === 'merge' ? 'fa-solid fa-object-group' : 'fa-solid fa-list'"></i>
                <span>
                  {{ referenceImportMode === 'merge' ? t`合并所选` : t`创建 ${selectedReferences.length} 条` }}
                </span>
              </button>
            </div>
          </template>
        </ReferencePicker>
        <div class="pc-form-actions">
          <button v-if="editingSlot" class="pc-soft-btn danger" type="button" @click="deleteCurrent">
            {{ t`删除` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button v-if="!selectedReferences.length" class="pc-primary-btn" type="button" @click="saveDraft">
            {{ t`保存` }}
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { getProfileKindLabel, type ProfileEntry, useProfilesStore } from '@/apps/profiles/store';
import type { GenerationReferenceItem } from '@/util/references';
import {
  getWorldSlotTypeLabel,
  getWorldSlotPositionLabel,
  WORLD_SLOTS_BOOK_NAME,
  type WorldSlot,
  type WorldSlotLogic,
  type WorldSlotPosition,
  type WorldSlotRole,
  type WorldSlotType,
  useWorldSlotsStore,
  worldSlotLogicOptions,
  worldSlotPositionOptions,
  worldSlotRoleOptions,
  worldSlotTypeOptions,
} from './store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const worldSlots = useWorldSlotsStore();
const profiles = useProfilesStore();
const { isCurrentChatScope, slots, syncError, syncStatus } = storeToRefs(worldSlots);
const { entries: profileEntries } = storeToRefs(profiles);
const route = computed(() => phone.currentRoute);
const query = ref('');
const typeFilter = ref('');
const syncing = ref(false);
const referenceImportMode = ref<'merge' | 'separate'>('merge');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const draft = reactive({
  content: '',
  cooldownText: '',
  delayText: '',
  depthText: '4',
  enabled: true,
  excludeRecursion: false,
  insertionOrderText: '100',
  keysText: '',
  position: 'before_character_definition' as WorldSlotPosition,
  preventRecursion: false,
  probabilityText: '100',
  role: 'system' as WorldSlotRole,
  secondaryKeysText: '',
  selectiveLogic: 'and_any' as WorldSlotLogic,
  stickyText: '',
  title: '',
  type: 'note' as WorldSlotType,
});

const typeComboboxOptions = worldSlotTypeOptions.map(option => ({ label: option.label, value: option.id }));
const typeFilterComboboxOptions = [{ label: '全部类型', value: '' }, ...typeComboboxOptions];
const positionComboboxOptions = worldSlotPositionOptions.map(option => ({ label: option.label, value: option.id }));
const roleComboboxOptions = worldSlotRoleOptions.map(option => ({ label: option.label, value: option.id }));
const logicComboboxOptions = worldSlotLogicOptions.map(option => ({ label: option.label, value: option.id }));

const editingSlot = computed(() => (route.value.params?.slotId ? worldSlots.getSlot(route.value.params.slotId) : null));
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const filteredSlots = computed(() =>
  slots.value.filter(slot => {
    if (typeFilter.value && slot.type !== typeFilter.value) return false;
    const search = normalizedQuery.value;
    if (!search) return true;
    return [
      slot.title,
      slot.content,
      getWorldSlotTypeLabel(slot.type),
      getWorldSlotPositionLabel(slot.position),
      ...slot.keys,
      ...slot.secondaryKeys,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }),
);
const isSyncing = computed(() => syncing.value || syncStatus.value === 'syncing');
const syncHint = computed(() => {
  if (syncStatus.value === 'syncing') return '正在将当前聊天的槽位写入世界书…';
  if (syncStatus.value === 'synced') {
    return slots.value.length
      ? `已自动同步 ${slots.value.length} 个槽位，并全局启用该世界书。`
      : '当前聊天没有槽位，已清除上一个聊天的槽位条目。';
  }
  return '切换聊天或修改槽位后会自动同步，其他世界书条目不会被覆盖。';
});

watch(
  () => [route.value.appId, route.value.page, route.value.params?.slotId] as const,
  ([appId, page]) => {
    if (appId !== 'world-slots' || page !== 'editor') return;
    fillDraft(editingSlot.value);
  },
  { immediate: true },
);

function splitKeys(text: string) {
  return text
    .split(/[,，、\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function fillDraft(slot: WorldSlot | null) {
  draft.title = slot?.title || '';
  draft.type = slot?.type || 'note';
  draft.keysText = slot?.keys.join('、') || '';
  draft.secondaryKeysText = slot?.secondaryKeys.join('、') || '';
  draft.selectiveLogic = slot?.selectiveLogic || 'and_any';
  draft.position = slot?.position || 'before_character_definition';
  draft.insertionOrderText = String(slot?.insertionOrder ?? 100);
  draft.depthText = String(slot?.depth ?? 4);
  draft.role = slot?.role || 'system';
  draft.probabilityText = String(slot?.probability ?? 100);
  draft.excludeRecursion = slot?.excludeRecursion ?? false;
  draft.preventRecursion = slot?.preventRecursion ?? false;
  draft.stickyText = slot?.sticky ? String(slot.sticky) : '';
  draft.cooldownText = slot?.cooldown ? String(slot.cooldown) : '';
  draft.delayText = slot?.delay ? String(slot.delay) : '';
  const legacyProfiles = (slot?.profileEntryIds ?? [])
    .map(entryId => profiles.getEntry(entryId))
    .filter((entry): entry is ProfileEntry => Boolean(entry))
    .map(buildProfileText);
  draft.content = [slot?.content.trim() || '', ...legacyProfiles].filter(Boolean).join('\n\n');
  draft.enabled = slot?.enabled ?? true;
  referenceImportMode.value = 'merge';
  selectedReferences.value = [];
}

function openEditor(slotId?: string) {
  phone.pushPage('editor', slotId ? '编辑槽位' : '新增槽位', slotId ? { slotId } : {});
}

function saveDraft() {
  if (!draft.title.trim()) {
    toastr.warning('请先填写槽位名称');
    return;
  }
  const settings = readDraftSettings();
  if (!settings) return;
  const input = {
    ...settings,
    content: draft.content,
    title: draft.title,
  };
  const slot = editingSlot.value ? worldSlots.updateSlot(editingSlot.value.id, input) : worldSlots.createSlot(input);
  if (!slot) return;
  phone.goBack();
  toastr.success('已保存槽位');
}

function readDraftSettings() {
  const insertionOrder = parseRequiredInteger(draft.insertionOrderText, '插入顺序');
  const depth = parseRequiredInteger(draft.depthText, '插入深度', 0, 10000);
  const probability = parseRequiredInteger(draft.probabilityText, '激活概率', 0, 100);
  const sticky = parseOptionalDuration(draft.stickyText, '黏性');
  const cooldown = parseOptionalDuration(draft.cooldownText, '冷却');
  const delay = parseOptionalDuration(draft.delayText, '延迟');
  if (
    insertionOrder === null ||
    depth === null ||
    probability === null ||
    sticky === undefined ||
    cooldown === undefined ||
    delay === undefined
  ) {
    return null;
  }
  return {
    cooldown,
    delay,
    depth,
    enabled: draft.enabled,
    excludeRecursion: draft.excludeRecursion,
    insertionOrder,
    keys: splitKeys(draft.keysText),
    position: draft.position,
    preventRecursion: draft.preventRecursion,
    probability,
    profileEntryIds: [],
    role: draft.role,
    secondaryKeys: splitKeys(draft.secondaryKeysText),
    selectiveLogic: draft.selectiveLogic,
    sticky,
    type: draft.type,
  };
}

function parseRequiredInteger(value: string, label: string, min?: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
    const range = min !== undefined && max !== undefined ? `（${min}-${max}）` : '';
    toastr.warning(`${label}需要填写整数${range}`);
    return null;
  }
  return parsed;
}

function parseOptionalDuration(value: string, label: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
    toastr.warning(`${label}需要填写 1-10000 的整数，或留空`);
    return undefined;
  }
  return parsed;
}

function buildProfileText(entry: ProfileEntry) {
  return [
    `## ${entry.title}`,
    `类型：${getProfileKindLabel(entry.kind)}`,
    entry.summary ? `摘要：${entry.summary}` : '',
    entry.tags.length ? `标签：${entry.tags.join('、')}` : '',
    entry.content,
  ]
    .filter(Boolean)
    .join('\n');
}

function applySelectedReferences() {
  if (referenceImportMode.value === 'separate') {
    createSeparateReferenceSlots();
  } else {
    mergeSelectedReferences();
  }
}

function mergeSelectedReferences() {
  const references = selectedReferences.value.filter(reference => reference.content.trim());
  if (!references.length) return;
  draft.content = [draft.content.trimEnd(), ...references.map(reference => reference.content.trim())]
    .filter(Boolean)
    .join('\n\n');
  if (references.length === 1 && !draft.title.trim()) {
    draft.title = references[0]!.title.trim();
  }
  selectedReferences.value = [];
  referenceImportMode.value = 'merge';
  toastr.success(`已合并 ${references.length} 条内容`);
}

function createSeparateReferenceSlots() {
  const references = selectedReferences.value.filter(reference => reference.content.trim());
  if (!references.length) return;
  const settings = readDraftSettings();
  if (!settings) return;
  const createdSlots = worldSlots.createSlots(
    references.map((reference, index) => ({
      ...settings,
      content: reference.content,
      insertionOrder: settings.insertionOrder + index,
      title: reference.title.trim() || `导入条目 ${index + 1}`,
    })),
  );
  if (!createdSlots.length) return;
  selectedReferences.value = [];
  referenceImportMode.value = 'merge';
  phone.goBack();
  toastr.success(`已创建 ${createdSlots.length} 个槽位`);
}

async function deleteCurrent() {
  if (!editingSlot.value) return;
  const shouldDelete = await phone.confirmNotice(
    `要删除槽位“${editingSlot.value.title}”吗？对应的世界书条目也会自动移除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
    },
  );
  if (!shouldDelete) return;
  worldSlots.deleteSlot(editingSlot.value.id);
  phone.goBack();
  toastr.success('已删除槽位');
}

async function syncSlots() {
  syncing.value = true;
  try {
    const result = await worldSlots.syncToWorldBook();
    if (result.skipped) return;
    toastr.success(
      `已同步到世界书“${result.bookName}”：${result.updated} 更新，${result.created} 新建，${result.removed} 移除`,
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '同步失败');
  } finally {
    syncing.value = false;
  }
}
</script>

<style scoped>
.pc-world-slots-app,
.pc-world-slots-page {
  min-height: 100%;
}

.pc-world-slots-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-world-hero,
.pc-world-card,
.pc-world-toolbar,
.pc-slot-row {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-world-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.pc-world-hero h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.pc-world-card {
  display: grid;
  gap: 8px;
  padding: 14px;
}

.pc-world-card p,
.pc-slot-row p,
.pc-slot-row span {
  color: var(--pc-muted);
}

.pc-book-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-book-heading > div {
  display: grid;
  gap: 4px;
}

.pc-book-heading strong {
  font-size: 17px;
}

.pc-world-card .pc-sync-error {
  color: var(--pc-danger);
}

.pc-world-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 10px;
  padding: 12px;
}

.pc-slot-list {
  display: grid;
  gap: 10px;
}

.pc-slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
}

.pc-slot-row h3 {
  margin: 4px 0;
  font-size: 16px;
}

.pc-slot-row p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.pc-slot-row strong {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-world-field-group {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.pc-world-basic-grid,
.pc-world-timing-grid {
  display: grid;
  gap: 10px;
}

.pc-world-basic-grid {
  grid-template-columns: minmax(0, 1.5fr) minmax(96px, 0.5fr);
}

.pc-world-timing-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-world-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  padding: 12px 14px;
}

.pc-world-switch-row strong {
  min-width: 0;
  font-size: 14px;
}

.pc-world-advanced {
  border-top: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
}

.pc-world-advanced summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  padding: 13px 2px;
  font-weight: 800;
  list-style: none;
}

.pc-world-advanced summary::-webkit-details-marker {
  display: none;
}

.pc-world-advanced summary > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pc-world-advanced-chevron {
  transition: transform 0.18s ease;
}

.pc-world-advanced[open] .pc-world-advanced-chevron {
  transform: rotate(180deg);
}

.pc-world-advanced-body {
  display: grid;
  gap: 12px;
  padding: 0 0 14px;
}

.pc-world-area {
  min-height: 260px;
}

.pc-world-import-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding-top: 2px;
}

.pc-world-import-controls .pc-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-world-import-controls > .pc-primary-btn {
  width: 100%;
}

@media (max-width: 460px) {
  .pc-world-timing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
