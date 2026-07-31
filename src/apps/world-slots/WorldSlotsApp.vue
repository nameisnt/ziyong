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
        <label class="pc-field-label">{{ t`世界书名称` }}</label>
        <div class="pc-book-row">
          <input
            class="pc-field"
            :value="data.bookName"
            type="text"
            :placeholder="t`例如：当前聊天资料槽`"
            @change="worldSlots.setBookName(($event.target as HTMLInputElement).value)"
          />
          <button class="pc-primary-btn compact" type="button" :disabled="syncing || !slots.length" @click="syncSlots">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>{{ syncing ? t`同步中` : t`同步` }}</span>
          </button>
        </div>
        <p>{{ t`只会创建或更新带插件标记的槽位条目，不会覆盖世界书里的其他条目。` }}</p>
      </section>

      <section class="pc-world-toolbar">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" :placeholder="t`搜索槽位、关键词或内容`" />
        </label>
        <select v-model="typeFilter" class="pc-field pc-select">
          <option value="">{{ t`全部类型` }}</option>
          <option v-for="option in worldSlotTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </section>

      <div v-if="filteredSlots.length" class="pc-slot-list">
        <article v-for="slot in filteredSlots" :key="slot.id" class="pc-slot-row" @click="openEditor(slot.id)">
          <div>
            <span>{{ getWorldSlotTypeLabel(slot.type) }} · {{ slot.enabled ? t`启用` : t`停用` }}</span>
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
        <select v-model="draft.type" class="pc-field pc-select">
          <option v-for="option in worldSlotTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
        <input v-model="draft.keysText" class="pc-field" type="text" :placeholder="t`关键词，用逗号分隔，可留空`" />
        <label class="pc-check-row">
          <span>{{ t`启用条目` }}</span>
          <input v-model="draft.enabled" type="checkbox" />
        </label>
        <textarea
          v-model="draft.content"
          class="pc-area pc-world-area pc-saved-content-area"
          :placeholder="t`写入世界书的内容`"
        ></textarea>
        <ReferencePicker
          v-model="insertedReferences"
          insert-mode
          :excluded-root-ids="['app:world-slots']"
          @insert="insertReference"
        />
        <div class="pc-form-actions">
          <button v-if="editingSlot" class="pc-soft-btn danger" type="button" @click="deleteCurrent">
            {{ t`删除` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveDraft">{{ t`保存` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import { usePhoneStore } from '@/store/phone';
import { getProfileKindLabel, type ProfileEntry, useProfilesStore } from '@/apps/profiles/store';
import type { GenerationReferenceItem } from '@/util/references';
import {
  getWorldSlotTypeLabel,
  type WorldSlot,
  type WorldSlotType,
  useWorldSlotsStore,
  worldSlotTypeOptions,
} from './store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const worldSlots = useWorldSlotsStore();
const profiles = useProfilesStore();
const { data, slots } = storeToRefs(worldSlots);
const { entries: profileEntries } = storeToRefs(profiles);
const route = computed(() => phone.currentRoute);
const query = ref('');
const typeFilter = ref<'' | WorldSlotType>('');
const syncing = ref(false);
const insertedReferences = ref<GenerationReferenceItem[]>([]);
const draft = reactive({
  content: '',
  enabled: true,
  keysText: '',
  title: '',
  type: 'note' as WorldSlotType,
});

const editingSlot = computed(() => (route.value.params?.slotId ? worldSlots.getSlot(route.value.params.slotId) : null));
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const filteredSlots = computed(() =>
  slots.value.filter(slot => {
    if (typeFilter.value && slot.type !== typeFilter.value) return false;
    const search = normalizedQuery.value;
    if (!search) return true;
    return [slot.title, slot.content, getWorldSlotTypeLabel(slot.type), ...slot.keys]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }),
);

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
  const legacyProfiles = (slot?.profileEntryIds ?? [])
    .map(entryId => profiles.getEntry(entryId))
    .filter((entry): entry is ProfileEntry => Boolean(entry))
    .map(buildProfileText);
  draft.content = [slot?.content.trim() || '', ...legacyProfiles].filter(Boolean).join('\n\n');
  draft.enabled = slot?.enabled ?? true;
  insertedReferences.value = [];
}

function openEditor(slotId?: string) {
  phone.pushPage('editor', slotId ? '编辑槽位' : '新增槽位', slotId ? { slotId } : {});
}

function saveDraft() {
  if (!draft.title.trim()) {
    toastr.warning('请先填写槽位名称');
    return;
  }
  const input = {
    content: draft.content,
    enabled: draft.enabled,
    keys: splitKeys(draft.keysText),
    profileEntryIds: [],
    title: draft.title,
    type: draft.type,
  };
  const slot = editingSlot.value ? worldSlots.updateSlot(editingSlot.value.id, input) : worldSlots.createSlot(input);
  if (!slot) return;
  phone.goBack();
  toastr.success('已保存槽位');
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

function insertReference(reference: GenerationReferenceItem) {
  const content = reference.content.trim();
  if (!content) return;
  draft.content = [draft.content.trimEnd(), content].filter(Boolean).join('\n\n');
  toastr.success(`已插入“${reference.title}”`);
}

async function deleteCurrent() {
  if (!editingSlot.value) return;
  const shouldDelete = await phone.confirmNotice(
    `要删除槽位“${editingSlot.value.title}”吗？已同步的世界书条目不会自动删除。`,
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
    toastr.success(`已同步到世界书“${result.bookName}”：${result.updated} 更新，${result.created} 新建`);
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

.pc-book-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
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

.pc-check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  padding: 12px 14px;
  font-weight: 800;
}

.pc-check-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--pc-theme-accent);
}

.pc-world-area {
  min-height: 260px;
}
</style>
