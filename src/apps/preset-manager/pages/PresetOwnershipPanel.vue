<template>
  <section class="pc-section-card pc-preset-owner">
    <header class="pc-preset-owner-head">
      <div>
        <strong>聊天绑定与阅读规则</strong>
        <span>{{ phone.isViewingCurrentChat ? '当前聊天' : '历史聊天' }} · {{ phone.viewingScopeMeta.chatTitle }}</span>
      </div>
      <InfoHint text="聊天绑定决定以后打开该聊天时自动使用哪个酒馆预设；标题和正文规则按预设共享，不属于单个聊天。" />
    </header>

    <div class="pc-preset-owner-status">
      <span>此聊天绑定</span>
      <strong>{{ binding?.presetName || '未绑定' }}</strong>
      <small v-if="isThisPresetBound">{{ binding?.reloadRegex ? '自动应用并重新加载正则' : '自动应用预设' }}</small>
      <small v-else-if="binding">保存后会替换现有绑定</small>
      <small v-else>尚未绑定酒馆预设</small>
    </div>

    <div class="pc-preset-owner-option">
      <div>
        <strong>重新加载聊天应用正则</strong>
        <small>{{ enabledRegexCount ? `${enabledRegexCount} 条启用正则` : '此预设没有启用正则' }}</small>
      </div>
      <label class="pc-toggle" title="切换预设后重新加载一次聊天">
        <input v-model="draftReloadRegex" type="checkbox" aria-label="重新加载聊天应用正则" />
        <span aria-hidden="true"></span>
      </label>
    </div>

    <div class="pc-form-actions pc-preset-owner-actions">
      <button
        v-if="isThisPresetBound"
        class="pc-soft-btn"
        type="button"
        :disabled="busy"
        @click="removeBinding"
      >
        {{ busyAction === 'remove' ? '解除中' : '解除绑定' }}
      </button>
      <button class="pc-soft-btn" type="button" :disabled="busy" @click="saveBinding">
        {{ busyAction === 'save' ? '保存中' : isThisPresetBound ? '更新绑定' : '绑定此预设' }}
      </button>
      <button
        class="pc-primary-btn"
        type="button"
        :disabled="busy || !phone.isViewingCurrentChat"
        @click="applyPreset"
      >
        {{ busyAction === 'apply' ? '应用中' : '立即应用' }}
      </button>
    </div>

    <div v-if="readerMigrationConflict" class="pc-preset-owner-conflict">
      <span>旧数据中有 {{ readerMigrationConflict.candidates.length }} 套不同阅读规则，请选择一套后保存。</span>
      <div>
        <button
          v-for="(candidate, index) in readerMigrationConflict.candidates"
          :key="`${candidate.readerTitleRuleId}-${candidate.readerContentRuleId}`"
          class="pc-soft-btn compact"
          type="button"
          :disabled="busy"
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
          :disabled="busy"
          :options="readerTitleRuleOptions"
          placeholder="跟随全局阅读规则"
        />
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">阅读正文规则</span>
        <SearchableCombobox
          v-model="draftReaderContentRuleId"
          :disabled="busy"
          :options="readerContentRuleOptions"
          placeholder="跟随全局阅读规则"
        />
      </label>
    </div>

    <div class="pc-form-actions pc-preset-owner-rule-action">
      <button class="pc-primary-btn" type="button" :disabled="busy" @click="saveReaderProfile">
        {{ busyAction === 'reader' ? '保存中' : '保存阅读规则' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defaultReaderBodyRegexDisplayRuleId, useRegexDisplayStore } from '@/apps/regex-display/store';
import { getEnabledPresetRegexCount } from '@/apps/preset-link/api';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import InfoHint from '@/components/InfoHint.vue';
import { usePhoneStore } from '@/store/phone';
import { getRegexRulesByOperation } from '@/util/regexDisplay';

const props = defineProps<{ presetName: string }>();
const phone = usePhoneStore();
const presetLinks = usePresetLinkStore();
const regexDisplay = useRegexDisplayStore();
const draftReloadRegex = ref(false);
const draftReaderContentRuleId = ref('');
const draftReaderTitleRuleId = ref('');
const busyAction = ref<'apply' | 'reader' | 'remove' | 'save' | ''>('');
const busy = computed(() => Boolean(busyAction.value) || presetLinks.applying);
const scopeKey = computed(() => phone.viewingScopeKey);
const binding = computed(() => presetLinks.getBinding(scopeKey.value));
const isThisPresetBound = computed(() => binding.value?.presetName === props.presetName);
const readerMigrationConflict = computed(() => presetLinks.getReaderMigrationConflict(props.presetName));
const enabledRegexCount = computed(() => getEnabledPresetRegexCount(props.presetName));
const extractionRules = computed(() => getRegexRulesByOperation(regexDisplay.rules, 'extract'));
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
  const stored = presetLinks.getBinding(scopeKey.value);
  draftReloadRegex.value = stored?.presetName === props.presetName ? stored.reloadRegex : false;
  const profile = presetLinks.getReaderProfile(props.presetName);
  draftReaderContentRuleId.value = profile?.readerContentRuleId || '';
  draftReaderTitleRuleId.value = profile?.readerTitleRuleId || '';
}

function readerRuleName(ruleId: string, fallback: string) {
  if (!ruleId) return fallback;
  if (ruleId === '__default_title__') return '无标题正则';
  return extractionRules.value.find(rule => rule.id === ruleId)?.name || ruleId;
}

function adoptReaderCandidate(candidate: { readerContentRuleId: string; readerTitleRuleId: string }) {
  draftReaderContentRuleId.value = candidate.readerContentRuleId;
  draftReaderTitleRuleId.value = candidate.readerTitleRuleId;
}

function saveBinding() {
  busyAction.value = 'save';
  try {
    presetLinks.saveBinding(scopeKey.value, {
      presetName: props.presetName,
      reloadRegex: draftReloadRegex.value,
    });
    toastr.success(phone.isViewingCurrentChat ? '已保存当前聊天绑定' : '已保存历史聊天绑定');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyAction.value = '';
  }
}

function saveReaderProfile() {
  busyAction.value = 'reader';
  try {
    presetLinks.saveReaderProfile(props.presetName, {
      readerContentRuleId: draftReaderContentRuleId.value,
      readerTitleRuleId: draftReaderTitleRuleId.value,
    });
    toastr.success(`已保存预设“${props.presetName}”的阅读规则`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyAction.value = '';
  }
}

async function applyPreset() {
  if (!phone.isViewingCurrentChat) return;
  busyAction.value = 'apply';
  try {
    const result = await presetLinks.applySelection(
      scopeKey.value,
      { presetName: props.presetName, reloadRegex: draftReloadRegex.value },
      true,
    );
    if (result.reloaded) toastr.success('已应用预设并重新加载聊天');
    else if (result.changed) toastr.success('已应用预设');
    else toastr.info('当前已经是这个预设');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyAction.value = '';
  }
}

async function removeBinding() {
  const target = phone.isViewingCurrentChat ? '当前聊天' : `历史聊天“${phone.viewingScopeMeta.chatTitle}”`;
  const confirmed = await phone.confirmNotice(`解除${target}与预设“${props.presetName}”的绑定？`, {
    confirmLabel: '解除',
    kind: 'warning',
    title: '解除预设绑定',
  });
  if (!confirmed) return;
  busyAction.value = 'remove';
  try {
    presetLinks.removeBinding(scopeKey.value);
    draftReloadRegex.value = false;
    toastr.success(`已解除${target}的预设绑定`);
  } finally {
    busyAction.value = '';
  }
}

watch([() => props.presetName, () => phone.viewingScopeKey, () => presetLinks.revision], refresh, { immediate: true });
</script>

<style scoped>
.pc-preset-owner {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.pc-preset-owner-head,
.pc-preset-owner-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-preset-owner-head > div,
.pc-preset-owner-option > div,
.pc-preset-owner-status {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-preset-owner-head span,
.pc-preset-owner-option small,
.pc-preset-owner-status span,
.pc-preset-owner-status small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
}
.pc-preset-owner-status strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-owner-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.pc-preset-owner-actions,
.pc-preset-owner-rule-action {
  padding-top: 0;
}
.pc-preset-owner-actions > button {
  min-width: 0;
  flex: 1;
}
.pc-preset-owner-rule-action {
  justify-content: flex-end;
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
