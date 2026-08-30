<template>
  <section class="pc-bagu-scan" :aria-label="t`八股检测`">
    <div class="pc-bagu-scan-head">
      <div class="pc-bagu-scan-actions">
        <button class="pc-soft-btn" type="button" @click="runScan">
          {{ hasScanned ? t`重新检测` : t`检测正文` }}
        </button>
        <button
          v-if="writebackEnabled && lastAppliedContent !== null"
          class="pc-soft-btn"
          type="button"
          :disabled="writing"
          @click="undoLastApply"
        >
          {{ t`撤销应用` }}
        </button>
        <button
          v-if="selectedGroups.length"
          class="pc-primary-btn compact"
          type="button"
          :disabled="writing"
          @click="applySelected"
        >
          {{ `应用选中 ${selectedGroups.length} 句` }}
        </button>
      </div>
    </div>

    <div v-if="hasScanned" class="pc-bagu-result-tools">
      <label class="pc-search-field pc-bagu-search">
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

    <div v-else-if="groups.length" class="pc-bagu-hit-list">
      <div class="pc-bagu-select-row">
        <span>{{ `可见 ${visibleGroups.length}/${groups.length} 句，共 ${visibleHitCount} 处` }}</span>
        <button class="pc-mini-btn" type="button" :disabled="!visibleGroups.length" @click="toggleVisible(true)">
          {{ t`选可见` }}
        </button>
        <button class="pc-mini-btn" type="button" :disabled="!visibleGroups.length" @click="toggleVisible(false)">
          {{ t`取消可见` }}
        </button>
      </div>

      <div v-if="!visibleGroups.length" class="pc-bagu-empty compact">
        {{ t`当前筛选没有匹配命中。` }}
      </div>

      <article v-for="group in visibleGroups" :key="group.id" class="pc-bagu-hit-card">
        <div class="pc-bagu-hit-head">
          <label class="pc-check">
            <input v-model="group.selected" type="checkbox" />
            <span></span>
          </label>
          <button class="pc-soft-btn compact pc-bagu-hit-detail-trigger" type="button" @click="openHitDetails(group)">
            <strong>{{ `本句命中 ${group.hits.length} 处` }}</strong>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <small>{{ groupTypeLabel(group) }}</small>
        </div>
        <p class="pc-bagu-context">
          <template v-for="(segment, index) in sentenceSegments(group)" :key="`${group.id}-${index}`">
            <mark v-if="segment.highlighted">{{ segment.text }}</mark>
            <span v-else>{{ segment.text }}</span>
          </template>
        </p>
        <label class="pc-bagu-edit">
          <span>{{ t`修改后` }}</span>
          <textarea v-model="group.replacement" rows="3" @input="group.selected = true"></textarea>
        </label>
        <button class="pc-mini-btn hit-apply" type="button" :disabled="writing" @click="applyOne(group)">
          {{ t`应用本句` }}
        </button>
      </article>
    </div>

    <BaguHitDetailsModal
      :hits="activeDetailsGroup?.hits || []"
      :open="Boolean(activeDetailsGroup)"
      :sentence="activeDetailsGroup?.originalText || ''"
      :sentence-start="activeDetailsGroup?.start || 0"
      :type-label="activeDetailsGroup ? groupTypeLabel(activeDetailsGroup) : ''"
      :writing="writing"
      @close="activeDetailsGroup = null"
      @disable-rule="disableHitRule"
    />
  </section>
</template>

<script setup lang="ts">
import BaguHitDetailsModal from '@/components/BaguHitDetailsModal.vue';
import { useBaguStore, type BaguRule } from '@/store/bagu';
import { usePhoneStore } from '@/store/phone';
import {
  applyBaguSentenceEdits,
  buildBaguSentenceReplacement,
  type BaguHit,
  type BaguSentenceGroup,
  type BaguWritebackResult,
  groupBaguHitsBySentence,
  scanTextWithBaguRules,
} from '@/util/bagu';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  applyHandler?: (content: string) => BaguWritebackResult | Promise<BaguWritebackResult>;
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
type BaguSentenceDraft = BaguSentenceGroup & {
  replacement: string;
  selected: boolean;
};

const hasScanned = ref(false);
const draftContent = ref(props.content);
const groups = ref<BaguSentenceDraft[]>([]);
const hitQuery = ref('');
const hitFilter = ref<HitFilter>('all');
const activeDetailsGroup = ref<BaguSentenceDraft | null>(null);
const lastAppliedContent = ref<string | null>(null);
const writing = ref(false);
const hitFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '词汇', value: 'replacement' },
  { label: '句式', value: 'template' },
  { label: '已选', value: 'selected' },
] satisfies Array<{ label: string; value: HitFilter }>;
const writebackEnabled = computed(() => Boolean(props.applyHandler));
const effectiveRuleTypes = computed(() =>
  props.ruleTypes?.length ? props.ruleTypes : (['replacement', 'template'] satisfies BaguRule['type'][]),
);
const scanRules = computed(() => {
  return enabledRules.value.filter(rule => effectiveRuleTypes.value.includes(rule.type));
});
const hits = computed(() => groups.value.flatMap(group => group.hits));
const selectedGroups = computed(() => groups.value.filter(group => group.selected));
const normalizedHitQuery = computed(() => hitQuery.value.trim().toLowerCase());
const visibleGroups = computed(() =>
  groups.value.filter(group => {
    if (hitFilter.value === 'selected' && !group.selected) return false;
    if (
      (hitFilter.value === 'replacement' || hitFilter.value === 'template') &&
      !group.hits.some(hit => hit.type === hitFilter.value)
    )
      return false;
    const query = normalizedHitQuery.value;
    if (!query) return true;
    return [
      group.originalText,
      group.replacement,
      ...group.hits.flatMap(hit => [hit.match, hit.originalText, hit.replacement, hit.ruleLabel, hit.ruleTitle]),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }),
);
const visibleHitCount = computed(() => visibleGroups.value.reduce((total, group) => total + group.hits.length, 0));
const emptyMessage = computed(() =>
  scanRules.value.length ? '当前没有命中已启用的八股规则。' : '当前选择的检测类型没有启用规则。',
);

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
    scanDraft();
  },
  { deep: true, immediate: true },
);

function scanDraft() {
  const nextHits = scanTextWithBaguRules(draftContent.value, scanRules.value);
  groups.value = groupBaguHitsBySentence(draftContent.value, nextHits).map(group => ({
    ...group,
    replacement: buildBaguSentenceReplacement(group),
    selected: false,
  }));
}

function runScan() {
  hasScanned.value = true;
  scanDraft();
}

function toggleVisible(selected: boolean) {
  visibleGroups.value.forEach(group => {
    group.selected = selected;
  });
}

function groupTypeLabel(group: BaguSentenceDraft) {
  const hasReplacement = group.hits.some(hit => hit.type === 'replacement');
  const hasTemplate = group.hits.some(hit => hit.type === 'template');
  if (hasReplacement && hasTemplate) return '词汇与句式';
  return hasTemplate ? '句式' : '词汇';
}

function openHitDetails(group: BaguSentenceDraft) {
  activeDetailsGroup.value = group;
}

function sentenceSegments(group: BaguSentenceDraft) {
  const segments: Array<{ highlighted: boolean; text: string }> = [];
  let cursor = group.start;
  [...group.hits]
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .forEach(hit => {
      if (hit.start < cursor) return;
      if (hit.start > cursor) {
        segments.push({ highlighted: false, text: draftContent.value.slice(cursor, hit.start) });
      }
      segments.push({ highlighted: true, text: draftContent.value.slice(hit.start, hit.end) });
      cursor = hit.end;
    });
  if (cursor < group.end) {
    segments.push({ highlighted: false, text: draftContent.value.slice(cursor, group.end) });
  }
  return segments;
}

async function commitContent(nextContent: string, successMessage: string, recordUndo = true) {
  if (writing.value) return false;
  const previousContent = props.content;
  writing.value = true;
  try {
    if (props.applyHandler) {
      const appliedContent = await props.applyHandler(nextContent);
      if (appliedContent === false || appliedContent.trim() !== nextContent.trim()) {
        phone.noticeError('正文写回未生效，修改内容已保留');
        return false;
      }
    } else {
      emit('apply', nextContent);
    }

    draftContent.value = nextContent;
    scanDraft();
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

async function applyGroups(targetGroups: BaguSentenceDraft[]) {
  const result = applyBaguSentenceEdits(
    draftContent.value,
    targetGroups.map(group => ({
      end: group.end,
      originalText: group.originalText,
      replacement: group.replacement,
      start: group.start,
    })),
  );
  if (!result.appliedCount) {
    phone.noticeWarning('没有可应用的改正，正文可能已经变化');
    return;
  }

  await commitContent(
    result.text,
    writebackEnabled.value ? `已应用并写回 ${result.appliedCount} 句改正` : `已应用 ${result.appliedCount} 句改正`,
  );
}

function applySelected() {
  applyGroups(selectedGroups.value);
}

function applyOne(group: BaguSentenceDraft) {
  applyGroups([group]);
}

async function undoLastApply() {
  const previousContent = lastAppliedContent.value;
  if (previousContent === null) return;
  await commitContent(previousContent, '已撤销上次应用并写回原正文', false);
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
  activeDetailsGroup.value = null;
  phone.noticeSuccess(`已停用规则：${rule.title}`);
}

const stopNavigationGuard = phone.registerNavigationGuard(async () => !writing.value);

onScopeDispose(stopNavigationGuard);
</script>

<style scoped>
.pc-bagu-hit-card,
.pc-bagu-empty {
  border: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border-radius: min(var(--pc-card-radius), 8px);
}

.pc-bagu-scan {
  min-width: 0;
  max-width: 100%;
  margin-top: 10px;
}

.pc-bagu-scan-head {
  min-width: 0;
}

.pc-bagu-empty {
  margin: 8px 0 0;
  color: var(--pc-muted);
}

.pc-bagu-scan-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
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

.pc-bagu-scan-actions > :is(.pc-soft-btn, .pc-primary-btn) {
  flex: 1 0 68px;
  min-inline-size: 0;
  padding-inline: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-mini-btn {
  border: 0;
  background: var(--pc-soft-button-bg);
  color: var(--pc-text);
  cursor: pointer;
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
  margin: 0;
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
  background: var(--pc-soft-button-bg);
  color: var(--pc-muted);
  cursor: pointer;
  font-weight: 800;
}

.pc-filter-btn.active {
  background: color-mix(in srgb, #ef476f 14%, var(--pc-soft-button-bg) 86%);
  color: var(--pc-text);
}

.pc-bagu-hit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-bagu-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pc-bagu-select-row span {
  min-width: 0;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
  text-align: left;
  white-space: nowrap;
}

.pc-bagu-select-row .pc-mini-btn {
  padding-inline: 8px;
  white-space: nowrap;
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
  min-width: 0;
}

.pc-bagu-hit-head small {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 11px;
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

.pc-bagu-hit-detail-trigger {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding-inline: 10px;
}

.pc-bagu-hit-detail-trigger strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-bagu-hit-detail-trigger i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 10px;
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
  background: var(--pc-form-control-bg);
  color: var(--pc-text);
  padding: 10px 12px;
  resize: vertical;
}

.hit-apply {
  margin-top: 10px;
}
</style>
