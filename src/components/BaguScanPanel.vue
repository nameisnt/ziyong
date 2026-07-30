<template>
  <section class="pc-bagu-scan" :aria-label="t`八股检测`">
    <div class="pc-bagu-scan-head">
      <div class="pc-bagu-scan-actions">
        <button class="pc-soft-btn" type="button" @click="runScan">
          {{ hasScanned ? t`重新检测` : t`检测正文` }}
        </button>
        <button v-if="writebackEnabled && lastAppliedContent !== null" class="pc-soft-btn" type="button" :disabled="writing" @click="undoLastApply">
          {{ t`撤销应用` }}
        </button>
        <button v-if="writebackEnabled && draftDirty" class="pc-soft-btn" type="button" :disabled="writing" @click="resetDraft">
          {{ t`撤销草稿` }}
        </button>
        <button v-if="writebackEnabled" class="pc-soft-btn" type="button" :disabled="writing" @click="showDraftEditor = !showDraftEditor">
          {{ showDraftEditor ? t`收起正文` : t`查看正文` }}
        </button>
        <button v-if="hits.length" class="pc-soft-btn accent" type="button" :disabled="writing" @click="applyAll">
          {{ t`全部应用` }}
        </button>
        <button v-if="visibleHits.length && visibleHits.length < hits.length" class="pc-soft-btn accent-soft" type="button" :disabled="writing" @click="applyVisible">
          {{ `应用可见 ${visibleHits.length}` }}
        </button>
        <button v-if="selectedHits.length" class="pc-soft-btn" type="button" :disabled="writing" @click="applySelected">
          {{ `应用选中 ${selectedHits.length}` }}
        </button>
      </div>
    </div>

    <div v-if="writebackEnabled && showDraftEditor" class="pc-bagu-draft-editor">
      <div class="pc-bagu-draft-head">
        <strong>{{ t`当前正文` }}</strong>
        <span>{{ draftDirty ? t`已修改，点击应用编辑后写回` : t`当前与原内容一致` }}</span>
      </div>
      <textarea v-model="draftContent" :disabled="writing" :placeholder="t`正文内容`"></textarea>
      <div class="pc-bagu-draft-actions">
        <button class="pc-mini-btn" type="button" :disabled="writing" @click="runScan">{{ t`重新检测正文` }}</button>
        <button class="pc-mini-btn" type="button" :disabled="writing || !draftDirty" @click="resetDraft">{{ t`恢复当前正文` }}</button>
        <button class="pc-primary-btn compact" type="button" :disabled="writing || !draftDirty" @click="applyEditedDraft">
          {{ writing ? t`写回中` : t`应用编辑` }}
        </button>
      </div>
    </div>

    <div v-if="hasScanned" class="pc-bagu-result-tools">
      <label class="pc-bagu-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="hitQuery" type="search" :placeholder="t`搜索命中、规则或替换内容`" />
      </label>
      <div class="pc-bagu-filter-row">
        <button
          v-for="option in hitFilterOptions"
          :key="option.value"
          :class="['pc-filter-btn', { active: hitFilter === option.value }]"
          type="button"
          @click="hitFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="hasScanned && !hits.length" class="pc-bagu-empty">
      {{ emptyMessage }}
    </div>

    <div v-else-if="hits.length" class="pc-bagu-hit-list">
      <div class="pc-bagu-select-row">
        <span>{{ `可见 ${visibleHits.length} / ${hits.length}` }}</span>
        <button class="pc-mini-btn" type="button" :disabled="!visibleHits.length" @click="toggleVisible(true)">{{ t`选可见` }}</button>
        <button class="pc-mini-btn" type="button" :disabled="!visibleHits.length" @click="toggleVisible(false)">{{ t`取消可见` }}</button>
        <button class="pc-mini-btn" type="button" @click="toggleAll(true)">{{ t`全选` }}</button>
        <button class="pc-mini-btn" type="button" @click="toggleAll(false)">{{ t`全不选` }}</button>
      </div>

      <div v-if="!visibleHits.length" class="pc-bagu-empty compact">
        {{ t`当前筛选没有匹配命中。` }}
      </div>

      <article v-for="hit in visibleHits" :key="hit.id" class="pc-bagu-hit-card">
        <div class="pc-bagu-hit-head">
          <label class="pc-check">
            <input v-model="hit.selected" type="checkbox" />
            <span></span>
          </label>
          <span class="pc-type-pill" :data-type="hit.type">{{ hit.type === 'replacement' ? t`词汇替换` : t`句式模板` }}</span>
          <strong>{{ hit.ruleTitle }}</strong>
          <small>{{ hit.ruleLabel }}</small>
        </div>
        <p class="pc-bagu-context">
          <span>{{ hit.preContext }}</span>
          <mark>{{ hit.match }}</mark>
          <span>{{ hit.postContext }}</span>
        </p>
        <label class="pc-bagu-edit">
          <span>{{ t`替换为整句` }}</span>
          <textarea v-model="hit.replacement" rows="2" @input="hit.selected = true"></textarea>
        </label>
        <button class="pc-mini-btn hit-apply" type="button" :disabled="writing" @click="applyOne(hit)">
          {{ t`应用这条` }}
        </button>
        <button class="pc-mini-btn hit-disable" type="button" :disabled="writing" @click="disableHitRule(hit)">
          {{ t`停用此规则` }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBaguStore, type BaguRule } from '@/store/bagu';
import { usePhoneStore } from '@/store/phone';
import { applyBaguHits, type BaguHit, scanTextWithBaguRules } from '@/util/bagu';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  applyHandler?: (content: string) => boolean | Promise<boolean>;
  autoScan?: boolean;
  content: string;
  ruleTypes?: BaguRule['type'][];
}>();

const emit = defineEmits<{
  (event: 'apply', content: string): void;
}>();

const bagu = useBaguStore();
const phone = usePhoneStore();
const { enabledRules } = storeToRefs(bagu);

type HitFilter = 'all' | 'replacement' | 'selected' | 'template';

const hasScanned = ref(false);
const draftContent = ref(props.content);
const hits = ref<BaguHit[]>([]);
const hitQuery = ref('');
const hitFilter = ref<HitFilter>('all');
const showDraftEditor = ref(false);
const lastAppliedContent = ref<string | null>(null);
const writing = ref(false);
const hitFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '词汇', value: 'replacement' },
  { label: '句式', value: 'template' },
  { label: '已选', value: 'selected' },
] satisfies Array<{ label: string; value: HitFilter }>;
const writebackEnabled = computed(() => Boolean(props.applyHandler));
const draftDirty = computed(() => draftContent.value !== props.content);
const effectiveRuleTypes = computed(() => props.ruleTypes?.length ? props.ruleTypes : ['replacement', 'template'] satisfies BaguRule['type'][]);
const scanRules = computed(() => {
  return enabledRules.value.filter(rule => effectiveRuleTypes.value.includes(rule.type));
});
const selectedHits = computed(() => hits.value.filter(hit => hit.selected));
const normalizedHitQuery = computed(() => hitQuery.value.trim().toLowerCase());
const visibleHits = computed(() => hits.value.filter(hit => {
  if (hitFilter.value === 'selected' && !hit.selected) return false;
  if ((hitFilter.value === 'replacement' || hitFilter.value === 'template') && hit.type !== hitFilter.value) return false;
  const query = normalizedHitQuery.value;
  if (!query) return true;
  return [
    hit.match,
    hit.originalText,
    hit.replacement,
    hit.ruleLabel,
    hit.ruleTitle,
    hit.preContext,
    hit.postContext,
  ].join(' ').toLowerCase().includes(query);
}));
const emptyMessage = computed(() => scanRules.value.length ? '当前没有命中已启用的八股规则。' : '当前选择的检测类型没有启用规则。');

watch(
  () => props.content,
  content => {
    draftContent.value = content;
  },
);

watch(
  () => [props.autoScan, draftContent.value, scanRules.value] as const,
  () => {
    if (!props.autoScan && !hasScanned.value) return;
    hasScanned.value = true;
    hits.value = scanTextWithBaguRules(draftContent.value, scanRules.value);
  },
  { deep: true, immediate: true },
);

function runScan() {
  hasScanned.value = true;
  hits.value = scanTextWithBaguRules(draftContent.value, scanRules.value);
}

function toggleAll(selected: boolean) {
  hits.value.forEach(hit => {
    hit.selected = selected;
  });
}

function toggleVisible(selected: boolean) {
  visibleHits.value.forEach(hit => {
    hit.selected = selected;
  });
}

async function commitContent(nextContent: string, successMessage: string, recordUndo = true) {
  if (writing.value) return false;
  const previousContent = props.content;
  writing.value = true;
  try {
    if (props.applyHandler) {
      const applied = await props.applyHandler(nextContent);
      if (!applied) {
        phone.noticeError('正文写回失败，请返回后重试');
        return false;
      }
    } else {
      emit('apply', nextContent);
    }

    draftContent.value = nextContent;
    hits.value = scanTextWithBaguRules(nextContent, scanRules.value);
    lastAppliedContent.value = recordUndo ? previousContent : null;
    phone.noticeSuccess(successMessage);
    return true;
  } catch (error) {
    phone.noticeError(error instanceof Error ? error.message : '正文写回失败，请返回后重试');
    return false;
  } finally {
    writing.value = false;
  }
}

async function applyHits(targetHits: BaguHit[]) {
  const result = applyBaguHits(draftContent.value, targetHits);
  if (!result.appliedCount) {
    phone.noticeWarning('没有可应用的改正，正文可能已经变化');
    return;
  }

  await commitContent(
    result.text,
    writebackEnabled.value
      ? `已应用并写回 ${result.appliedCount} 处改正`
      : `已应用 ${result.appliedCount} 处改正`,
  );
}

function applyAll() {
  applyHits(hits.value);
}

function applyVisible() {
  applyHits(visibleHits.value);
}

function applySelected() {
  applyHits(selectedHits.value);
}

function applyOne(hit: BaguHit) {
  applyHits([hit]);
}

async function applyEditedDraft() {
  if (!draftDirty.value) {
    phone.noticeInfo('当前正文没有改动');
    return;
  }
  await commitContent(draftContent.value, '已应用并写回正文编辑');
}

async function undoLastApply() {
  const previousContent = lastAppliedContent.value;
  if (previousContent === null) return;
  await commitContent(previousContent, '已撤销上次应用并写回原正文', false);
}

function resetDraft() {
  draftContent.value = props.content;
  hits.value = scanTextWithBaguRules(draftContent.value, scanRules.value);
  phone.noticeSuccess('已撤销检测草稿');
}

function disableHitRule(hit: BaguHit) {
  const rule = bagu.getRule(hit.ruleId);
  if (!rule) {
    phone.noticeWarning('这条规则已经不存在');
    return;
  }
  bagu.updateRule(rule.id, {
    enabled: false,
    flags: rule.flags,
    note: rule.note,
    pattern: rule.pattern,
    replacements: rule.replacements,
    sources: rule.sources,
    suggestion: rule.suggestion,
    targets: rule.targets,
    template: rule.template,
    title: rule.title,
    type: rule.type,
  });
  phone.noticeSuccess(`已停用规则：${rule.title}`);
}

const stopNavigationGuard = phone.registerNavigationGuard(async () => {
  if (writing.value) return false;
  if (!writebackEnabled.value || !draftDirty.value) return true;
  const shouldWriteBack = await phone.confirmNotice('当前正文有尚未应用的编辑。可以先写回，也可以放弃编辑后退出。', {
    cancelLabel: '确认退出',
    confirmLabel: '写回',
    kind: 'warning',
    title: '正文尚未写回',
  });
  if (!shouldWriteBack) return { allow: true, skipPreviewConfirm: true };
  return {
    allow: await commitContent(draftContent.value, '已写回正文编辑'),
    skipPreviewConfirm: true,
  };
});

onScopeDispose(stopNavigationGuard);
</script>

<style scoped>
.pc-bagu-scan,
.pc-bagu-hit-card,
.pc-bagu-empty {
  border: 1px solid var(--pc-border);
  background: var(--pc-surface);
  border-radius: 20px;
}

.pc-bagu-scan {
  min-width: 0;
  max-width: 100%;
  margin-top: 14px;
  overflow: hidden;
  padding: 14px;
}

.pc-bagu-scan-head {
  min-width: 0;
}

.pc-bagu-empty {
  margin: 8px 0 0;
  color: var(--pc-muted);
}

.pc-bagu-scan-actions,
.pc-bagu-select-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pc-bagu-scan-actions {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.pc-bagu-scan-actions::-webkit-scrollbar {
  display: none;
}

.pc-bagu-scan-actions > .pc-soft-btn {
  flex: 1 0 68px;
  min-inline-size: 0;
  padding-inline: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-bagu-draft-editor {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--pc-surface-strong) 82%, transparent 18%);
  padding: 12px;
}

.pc-bagu-draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-bagu-draft-head strong {
  color: var(--pc-text);
  font-size: 14px;
}

.pc-bagu-draft-head span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.pc-bagu-draft-editor textarea {
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-surface);
  color: var(--pc-text);
  padding: 10px 12px;
  line-height: 1.65;
  resize: vertical;
}

.pc-bagu-draft-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-bagu-draft-actions :is(.pc-mini-btn, .pc-primary-btn) {
  min-inline-size: 0;
  padding-inline: 8px;
  white-space: nowrap;
}

.pc-mini-btn {
  border: 0;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-soft-btn.accent {
  background: var(--pc-theme-accent);
  color: var(--pc-primary-text);
}

.pc-soft-btn.accent-soft {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-soft-button-bg) 82%);
  color: var(--pc-text);
}

.pc-mini-btn {
  border-radius: 10px;
  padding: 7px 10px;
  font-size: 12px;
}

.pc-mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pc-bagu-result-tools {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.pc-bagu-search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-surface-strong);
  padding: 0 10px;
}

.pc-bagu-search i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-bagu-search input {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  outline: none;
}

.pc-bagu-search input::placeholder {
  color: var(--pc-muted);
}

.pc-bagu-filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.pc-filter-btn {
  min-width: 0;
  min-height: 34px;
  border: 1px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  cursor: pointer;
  font-weight: 800;
}

.pc-filter-btn.active {
  background: color-mix(in srgb, #ef476f 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-text);
}

.pc-bagu-hit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-bagu-select-row span {
  align-self: center;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-bagu-hit-card,
.pc-bagu-empty {
  padding: 12px 14px;
}

.pc-bagu-empty.compact {
  margin: 0;
}

.pc-bagu-hit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pc-bagu-hit-head small {
  color: var(--pc-muted);
}

.pc-check {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}

.pc-check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #ef476f;
}

.pc-type-pill {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  background: var(--pc-surface-strong);
}

.pc-type-pill[data-type='replacement'] {
  color: #ef476f;
}

.pc-type-pill[data-type='template'] {
  color: #2d9cdb;
}

.pc-bagu-context {
  margin: 10px 0 0;
  line-height: 1.6;
  word-break: break-word;
}

.pc-bagu-context mark {
  padding: 0 3px;
  border-radius: 6px;
  background: color-mix(in srgb, #ef476f 24%, var(--pc-surface-strong) 76%);
  color: var(--pc-text);
}

.pc-bagu-edit {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.pc-bagu-edit span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-bagu-edit textarea {
  width: 100%;
  min-height: 58px;
  border: 1px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 10px 12px;
  resize: vertical;
}

.hit-apply {
  margin-top: 10px;
}

.hit-disable {
  margin-top: 10px;
  margin-left: 6px;
  color: #c44c3e;
}

</style>

