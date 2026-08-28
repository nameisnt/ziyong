<template>
  <details class="pc-section-card pc-preset-owner">
    <summary class="pc-preset-owner-head">
      <div>
        <strong>
          阅读规则
          <InfoHint text="使用此预设阅读聊天时，标题提取、正文提取和正文清理会采用这里的设置。" />
        </strong>
      </div>
      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
    </summary>

    <div class="pc-preset-owner-body">
      <div v-if="readerMigrationConflict" class="pc-preset-owner-conflict">
        <span>旧数据中有 {{ readerMigrationConflict.candidates.length }} 套不同阅读规则，请选择一套后保存。</span>
        <div>
          <button
            v-for="(candidate, index) in readerMigrationConflict.candidates"
            :key="`${candidate.readerTitleRuleId}-${candidate.readerContentRuleId}`"
            class="pc-soft-btn compact"
            type="button"
            @click="adoptReaderCandidate(candidate)"
          >
            候选 {{ index + 1 }} · {{ readerRuleName(candidate.readerTitleRuleId, '全局标题') }} /
            {{ readerRuleName(candidate.readerContentRuleId, '全局正文') }}
          </button>
        </div>
      </div>

      <div class="pc-preset-owner-rules">
        <label class="pc-field-group">
          <span class="pc-field-label">阅读标题规则</span>
          <SearchableCombobox
            v-model="draftReaderTitleRuleId"
            :options="readerTitleRuleOptions"
            placeholder="跟随全局阅读规则"
          />
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">阅读正文规则</span>
          <SearchableCombobox
            v-model="draftReaderContentRuleId"
            :options="readerContentRuleOptions"
            placeholder="跟随全局阅读规则"
          />
        </label>
      </div>

      <details class="pc-preset-cleanup" open>
        <summary>
          <span>正文清理</span>
          <small>{{
            draftReaderCleanupRuleIds.length ? `已选 ${draftReaderCleanupRuleIds.length} 条` : '未选择'
          }}</small>
        </summary>
        <div v-if="readerCleanupRules.length" class="pc-preset-cleanup-list">
          <label v-for="rule in readerCleanupRules" :key="rule.id" class="pc-preset-cleanup-item">
            <input
              type="checkbox"
              :checked="draftReaderCleanupRuleIds.includes(rule.id)"
              @change="toggleCleanupRule(rule.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ rule.name || '未命名规则' }}</span>
          </label>
        </div>
        <p v-else>正则显示中标记为“正文清理”的规则会显示在这里。</p>
      </details>

      <div class="pc-form-actions pc-preset-owner-rule-action">
        <button class="pc-primary-btn" type="button" @click="saveReaderProfile">保存阅读规则</button>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { defaultReaderBodyRegexDisplayRuleId, useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePresetLinkStore, type PresetReaderProfile } from '@/apps/preset-link/store';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getRegexRulesByOperation } from '@/util/regexDisplay';

const props = defineProps<{ presetName: string }>();
const presetLinks = usePresetLinkStore();
const regexDisplay = useRegexDisplayStore();
const draftReaderCleanupRuleIds = ref<string[]>([]);
const draftReaderContentRuleId = ref('');
const draftReaderTitleRuleId = ref('');
const readerMigrationConflict = computed(() => presetLinks.getReaderMigrationConflict(props.presetName));
const extractionRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'extract'));
const readerCleanupRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'replace'));
const readerTitleRuleOptions = computed(() => [
  { label: '跟随全局阅读规则', value: '' },
  { label: '无正则', value: '__default_title__' },
  ...extractionRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id })),
]);
const readerContentRuleOptions = computed(() => {
  const options = extractionRules.value.map(rule => ({ label: rule.name || '未命名规则', value: rule.id }));
  return [
    { label: '跟随全局阅读规则', value: '' },
    ...(options.some(option => option.value === defaultReaderBodyRegexDisplayRuleId)
      ? []
      : [{ label: '默认楼层正文提取', value: defaultReaderBodyRegexDisplayRuleId }]),
    ...options,
  ];
});

function refresh() {
  const profile = presetLinks.getReaderProfile(props.presetName);
  draftReaderCleanupRuleIds.value = [...(profile?.readerCleanupRuleIds ?? [])];
  draftReaderContentRuleId.value = profile?.readerContentRuleId || '';
  draftReaderTitleRuleId.value = profile?.readerTitleRuleId || '';
}

function readerRuleName(ruleId: string, fallback: string) {
  if (!ruleId) return fallback;
  if (ruleId === '__default_title__') return '无标题正则';
  return extractionRules.value.find(rule => rule.id === ruleId)?.name || ruleId;
}

function adoptReaderCandidate(candidate: PresetReaderProfile) {
  draftReaderCleanupRuleIds.value = [...candidate.readerCleanupRuleIds];
  draftReaderContentRuleId.value = candidate.readerContentRuleId;
  draftReaderTitleRuleId.value = candidate.readerTitleRuleId;
}

function toggleCleanupRule(ruleId: string, enabled: boolean) {
  draftReaderCleanupRuleIds.value = enabled
    ? [...new Set([...draftReaderCleanupRuleIds.value, ruleId])]
    : draftReaderCleanupRuleIds.value.filter(id => id !== ruleId);
}

function saveReaderProfile() {
  presetLinks.saveReaderProfile(props.presetName, {
    readerCleanupRuleIds: draftReaderCleanupRuleIds.value,
    readerContentRuleId: draftReaderContentRuleId.value,
    readerTitleRuleId: draftReaderTitleRuleId.value,
  });
  toastr.success(`已保存预设“${props.presetName}”的阅读规则`);
}

watch([() => props.presetName, () => presetLinks.revision], refresh, { immediate: true });
</script>

<style scoped>
.pc-preset-owner {
  padding: 12px;
}
.pc-preset-owner > summary {
  list-style: none;
}
.pc-preset-owner > summary::-webkit-details-marker {
  display: none;
}
.pc-preset-owner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}
.pc-preset-owner-head > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-preset-cleanup small,
.pc-preset-cleanup p {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-preset-owner-head > i {
  color: var(--pc-muted);
  font-size: 12px;
  transition: transform 0.16s ease;
}
.pc-preset-owner[open] > .pc-preset-owner-head > i {
  transform: rotate(90deg);
}
.pc-preset-owner-body {
  display: grid;
  gap: 10px;
  padding-top: 10px;
}
.pc-preset-owner-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.pc-preset-cleanup {
  border-top: 1px solid var(--pc-border);
  padding-top: 10px;
}
.pc-preset-cleanup summary,
.pc-preset-cleanup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-preset-cleanup summary {
  cursor: pointer;
  color: var(--pc-text);
  font-weight: 700;
}
.pc-preset-cleanup-list {
  display: grid;
  gap: 8px;
  padding-top: 10px;
}
.pc-preset-cleanup-item {
  justify-content: flex-start;
  font-size: 13px;
}
.pc-preset-cleanup p {
  margin: 10px 0 0;
}
.pc-preset-owner-rule-action {
  justify-content: flex-end;
  padding-top: 0;
}
.pc-preset-owner-conflict {
  display: grid;
  gap: 7px;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--pc-danger) 34%, var(--pc-border) 66%);
  border-radius: var(--pc-control-radius);
  color: var(--pc-text);
  font-size: 12px;
}
.pc-preset-owner-conflict > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (max-width: 370px) {
  .pc-preset-owner-rules {
    grid-template-columns: 1fr;
  }
}
</style>
