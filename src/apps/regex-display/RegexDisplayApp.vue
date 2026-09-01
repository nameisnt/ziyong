<template>
  <section class="pc-regex-display-app">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-regex-toolbar">
      <span class="pc-directory-count">{{ rules.length }} {{ t`条规则` }}</span>
      <InfoHint :text="t`提取规则创建内容，替换规则按列表顺序处理显示结果。`" />
      <ActionMenu icon-only :label="t`新增`" icon="fa-solid fa-plus">
        <button type="button" @click="addNewRule('')">
          <i class="fa-solid fa-file-circle-plus"></i><span>{{ t`新增规则` }}</span>
        </button>
        <button type="button" @click="addNewGroup">
          <i class="fa-solid fa-folder-plus"></i><span>{{ t`新增分组` }}</span>
        </button>
      </ActionMenu>
    </header>

    <section
      v-for="section in ruleSections"
      :key="section.id || 'ungrouped'"
      class="pc-regex-group"
      :data-regex-group-id="section.id"
      @dragover.prevent
      @drop="dropRuleIntoGroup(section.id)"
    >
      <header class="pc-regex-group-head">
        <strong>{{ section.name }}</strong>
        <span>{{ section.rules.length }}</span>
        <div class="pc-regex-group-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`在此分组新增规则`"
            :aria-label="t`在此分组新增规则`"
            @click="addNewRule(section.id)"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
          <button
            v-if="section.id"
            class="pc-icon-btn"
            type="button"
            :title="t`重命名分组`"
            :aria-label="t`重命名分组`"
            @click="renameRuleGroup(section.id, section.name)"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            v-if="section.id"
            class="pc-icon-btn danger"
            type="button"
            :title="t`删除分组`"
            :aria-label="t`删除分组`"
            @click="removeRuleGroup(section.id, section.name)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </header>

      <div v-if="section.rules.length" class="pc-directory-list pc-regex-rule-list">
        <article
          v-for="rule in section.rules"
          :key="rule.id"
          class="pc-list-row pc-regex-rule-row"
          :class="{ dragging: draggingRuleId === rule.id }"
          :data-regex-rule-id="rule.id"
          @dragover.prevent
          @drop.stop="dropRuleBefore(rule.id)"
        >
          <span
            class="pc-regex-drag-handle"
            draggable="true"
            :title="t`拖拽排序`"
            :aria-label="t`拖拽排序`"
            @dragend="resetRuleDrag"
            @dragstart="startDesktopRuleDrag($event, rule.id)"
            @pointerdown="startPointerRuleDrag($event, rule.id)"
            @pointermove="movePointerRuleDrag"
            @pointerup="finishPointerRuleDrag"
            @pointercancel="resetRuleDrag"
          >
            <i class="fa-solid fa-grip-vertical"></i>
          </span>
          <button class="pc-regex-rule-open" type="button" @click="openRuleEditor(rule.id)">
            <strong>{{ rule.name || t`未命名规则` }}</strong>
          </button>
          <label class="pc-toggle" :title="rule.enabled ? t`停用规则` : t`启用规则`" @click.stop>
            <input
              type="checkbox"
              :aria-label="rule.enabled ? t`停用规则` : t`启用规则`"
              :checked="rule.enabled"
              @change="toggleRuleEnabled(rule.id, $event)"
            />
            <span aria-hidden="true"></span>
          </label>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`复制规则`"
            :aria-label="t`复制规则`"
            @click="duplicateRule(rule.id)"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :title="t`删除规则`"
            :aria-label="t`删除规则`"
            @click="deleteRule(rule.id)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </article>
      </div>
    </section>

    <EmptyState v-if="!rules.length" :title="t`还没有正则规则`" />

    <section v-if="activeRule" class="pc-modal-backdrop pc-regex-editor-backdrop" @click.self="closeRuleEditor">
      <article class="pc-section-card pc-modal-dialog pc-regex-editor-dialog" role="dialog" aria-modal="true">
        <header class="pc-section-head pc-regex-editor-head">
          <strong>{{ activeRule.name || t`未命名规则` }}</strong>
          <button class="pc-icon-btn" type="button" :title="t`关闭`" :aria-label="t`关闭`" @click="closeRuleEditor">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div class="pc-regex-editor-scroll">
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`规则名称` }}</label>
            <input v-model="activeRule.name" class="pc-field" type="text" :placeholder="t`规则名称`" />
          </div>

          <div class="pc-regex-editor-basic-grid">
            <label class="pc-field-group">
              <span class="pc-field-label">{{ t`所属分组` }}</span>
              <SearchableCombobox
                :model-value="activeRule.groupId"
                :options="groupOptions"
                :placeholder="t`选择分组`"
                @update:model-value="regexDisplay.moveRuleToGroup(activeRule.id, $event)"
              />
            </label>
            <label class="pc-switch-row pc-regex-enable-row">
              <span>{{ activeRule.enabled ? t`已启用` : t`已停用` }}</span>
              <input v-model="activeRule.enabled" type="checkbox" />
            </label>
          </div>

          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`处理方式` }}</label>
            <div class="pc-regex-operation-segment">
              <button
                v-for="operation in operationOptions"
                :key="operation.value"
                :class="['pc-segment-btn', { active: activeRule.operation === operation.value }]"
                type="button"
                @click="activeRule.operation = operation.value"
              >
                {{ operation.label }}
              </button>
            </div>
          </div>

          <div class="pc-inline-grid two-cols">
            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`输出显示` }}</label>
              <SearchableCombobox v-model="activeRule.renderMode" :options="renderModeOptions" />
            </div>
            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`Flags` }}</label>
              <input v-model="activeRule.flags" class="pc-field" type="text" placeholder="g" />
            </div>
          </div>

          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`匹配正则` }}</label>
            <textarea v-model="activeRule.pattern" class="pc-area compact mono" placeholder="JS 正则表达式"></textarea>
          </div>

          <div class="pc-select-field">
            <label class="pc-field-label">{{ activeRule.operation === 'extract' ? t`提取模板` : t`替换模板` }}</label>
            <textarea
              v-model="activeRule.replacement"
              class="pc-area mono"
              placeholder="可使用 $1 或命名捕获组"
            ></textarea>
          </div>

          <section class="pc-regex-preview-section">
            <header>
              <strong>{{ t`预览` }}</strong>
              <span>{{ previewSummary }}</span>
            </header>
            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`原文` }}</label>
              <textarea
                v-model="settings.previewInput"
                class="pc-area preview-source"
                placeholder="输入测试文本"
              ></textarea>
            </div>
            <div v-if="previewResult.errors.length" class="pc-error-list">
              <span v-for="error in previewResult.errors" :key="error">{{ error }}</span>
            </div>
            <div class="pc-preview-box">
              <FrontendFrame
                v-if="previewResult.renderMode === 'html'"
                :active="true"
                :content="previewResult.content"
                security-mode="safe"
                :theme="settingsStore.settings.theme"
                title="正则显示预览"
              />
              <pre v-else>{{ previewResult.content || '暂无预览内容' }}</pre>
            </div>
          </section>
        </div>

        <div class="pc-form-actions">
          <button class="pc-primary-btn" type="button" @click="closeRuleEditor">{{ t`完成` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import EmptyState from '@/components/EmptyState.vue';
import FrontendFrame from '@/components/FrontendFrame.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { applyRegexDisplayRules, extractWithRegexRules } from '@/util/regexDisplay';
import { storeToRefs } from 'pinia';
import { defaultReaderBodyRegexDisplayRuleId, useRegexDisplayStore } from './store';

const regexDisplay = useRegexDisplayStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { groups, rules, settings } = storeToRefs(regexDisplay);
const activeRuleId = ref('');
const draggingRuleId = ref('');
const pointerDrag = reactive({ pointerId: -1, startX: 0, startY: 0, active: false });

const activeRule = computed(() => rules.value.find(rule => rule.id === activeRuleId.value) ?? null);
const ruleSections = computed(() => [
  { id: '', name: '未分组', rules: rules.value.filter(rule => !rule.groupId) },
  ...groups.value.map(group => ({
    id: group.id,
    name: group.name,
    rules: rules.value.filter(rule => rule.groupId === group.id),
  })),
]);
const groupOptions = computed(() => [
  { label: '未分组', value: '' },
  ...groups.value.map(group => ({ label: group.name, value: group.id })),
]);
const operationOptions = [
  { label: '提取', value: 'extract' as const },
  { label: '替换', value: 'replace' as const },
];
const renderModeOptions = [
  { label: '纯文字', value: 'text' as const },
  { label: 'HTML 网页', value: 'html' as const },
];
const previewResult = computed(() => {
  if (!activeRule.value) return { applied: [], content: '', errors: [], renderMode: 'text' as const };
  return activeRule.value.operation === 'extract'
    ? extractWithRegexRules(settings.value.previewInput, [activeRule.value])
    : applyRegexDisplayRules(settings.value.previewInput, [activeRule.value]);
});
const previewSummary = computed(() =>
  previewResult.value.errors.length
    ? `${previewResult.value.errors.length} 个错误`
    : previewResult.value.applied.length
      ? '已命中'
      : '未命中',
);

function openRuleEditor(ruleId: string) {
  activeRuleId.value = ruleId;
}

function closeRuleEditor() {
  activeRuleId.value = '';
}

function toggleRuleEnabled(ruleId: string, event: Event) {
  regexDisplay.setRuleEnabled(ruleId, (event.target as HTMLInputElement).checked);
}

function addNewRule(groupId: string) {
  const rule = regexDisplay.addRule({ groupId });
  openRuleEditor(rule.id);
}

async function addNewGroup() {
  const name = await phone.promptNotice('输入分组名称', { confirmLabel: '创建', title: '新增正则分组' });
  if (!name?.trim()) return;
  regexDisplay.addGroup(name);
}

function duplicateRule(ruleId: string) {
  const duplicate = regexDisplay.duplicateRule(ruleId);
  openRuleEditor(duplicate.id);
}

async function deleteRule(ruleId: string) {
  const rule = rules.value.find(item => item.id === ruleId);
  if (!rule) return;
  if (rule.id === defaultReaderBodyRegexDisplayRuleId) {
    toastr.warning('默认正文规则不能删除');
    return;
  }
  const confirmed = await phone.confirmNotice(`要删除规则“${rule.name || '未命名规则'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  regexDisplay.deleteRule(rule.id);
  if (activeRuleId.value === rule.id) closeRuleEditor();
}

async function renameRuleGroup(groupId: string, currentName: string) {
  const name = await phone.promptNotice('输入新的分组名称', {
    confirmLabel: '保存',
    initialValue: currentName,
    title: '重命名正则分组',
  });
  if (name?.trim()) regexDisplay.renameGroup(groupId, name);
}

async function removeRuleGroup(groupId: string, name: string) {
  const confirmed = await phone.confirmNotice(`删除分组“${name}”后，其中的规则会移到未分组。`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (confirmed) regexDisplay.deleteGroup(groupId);
}

function startDesktopRuleDrag(event: DragEvent, ruleId: string) {
  draggingRuleId.value = ruleId;
  event.dataTransfer?.setData('text/plain', ruleId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function dropRuleBefore(targetRuleId: string) {
  if (draggingRuleId.value) regexDisplay.moveRuleBefore(draggingRuleId.value, targetRuleId);
  resetRuleDrag();
}

function dropRuleIntoGroup(groupId: string) {
  if (draggingRuleId.value) regexDisplay.moveRuleToGroup(draggingRuleId.value, groupId);
  resetRuleDrag();
}

function startPointerRuleDrag(event: PointerEvent, ruleId: string) {
  if (event.pointerType === 'mouse') return;
  draggingRuleId.value = ruleId;
  pointerDrag.pointerId = event.pointerId;
  pointerDrag.startX = event.clientX;
  pointerDrag.startY = event.clientY;
  pointerDrag.active = false;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function movePointerRuleDrag(event: PointerEvent) {
  if (event.pointerId !== pointerDrag.pointerId || !draggingRuleId.value) return;
  if (!pointerDrag.active && Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) > 6) {
    pointerDrag.active = true;
  }
  if (pointerDrag.active) event.preventDefault();
}

function finishPointerRuleDrag(event: PointerEvent) {
  if (event.pointerId !== pointerDrag.pointerId || !draggingRuleId.value) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const targetRuleId = target?.closest<HTMLElement>('[data-regex-rule-id]')?.dataset.regexRuleId;
  const targetGroupId = target?.closest<HTMLElement>('[data-regex-group-id]')?.dataset.regexGroupId;
  if (pointerDrag.active && targetRuleId) regexDisplay.moveRuleBefore(draggingRuleId.value, targetRuleId);
  else if (pointerDrag.active && targetGroupId !== undefined)
    regexDisplay.moveRuleToGroup(draggingRuleId.value, targetGroupId);
  resetRuleDrag();
}

function resetRuleDrag() {
  draggingRuleId.value = '';
  pointerDrag.pointerId = -1;
  pointerDrag.active = false;
}

function closeEditorFromBack(event: Event) {
  if (!activeRule.value) return;
  event.preventDefault();
  closeRuleEditor();
}

function closeEditorFromEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeRule.value) closeRuleEditor();
}

onMounted(() => {
  window.addEventListener('phone-before-back', closeEditorFromBack);
  window.addEventListener('keydown', closeEditorFromEscape);
});
onBeforeUnmount(() => {
  window.removeEventListener('phone-before-back', closeEditorFromBack);
  window.removeEventListener('keydown', closeEditorFromEscape);
});
</script>

<style scoped>
.pc-regex-display-app,
.pc-regex-group,
.pc-regex-editor-scroll,
.pc-regex-preview-section {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.pc-regex-toolbar {
  padding-bottom: 10px;
}
.pc-regex-group {
  gap: 8px;
}
.pc-regex-group + .pc-regex-group {
  padding-top: 4px;
  border-top: 1px solid var(--pc-border);
}
.pc-regex-group-head,
.pc-regex-group-actions,
.pc-regex-preview-section > header {
  display: flex;
  align-items: center;
}
.pc-regex-group-head {
  min-height: 36px;
  gap: 8px;
}
.pc-regex-group-head > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-regex-group-head > span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-regex-group-actions {
  margin-left: auto;
  gap: 4px;
}
.pc-regex-rule-row {
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
}
.pc-regex-rule-row.dragging {
  opacity: 0.55;
}
.pc-regex-drag-handle {
  display: grid;
  width: 28px;
  height: 34px;
  place-items: center;
  color: var(--pc-muted);
  touch-action: none;
  cursor: grab;
}
.pc-regex-rule-open {
  min-width: 0;
  border: 0;
  padding: 8px 2px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}
.pc-regex-rule-open strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-regex-editor-backdrop {
  --pc-modal-z: 46;
}
.pc-regex-editor-dialog {
  width: min(100%, 480px);
  height: calc(100% - 20px);
  min-height: 0;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.pc-regex-editor-head {
  flex-wrap: nowrap;
}
.pc-regex-editor-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-regex-editor-scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
}
.pc-regex-editor-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
}
.pc-regex-enable-row {
  min-height: var(--pc-control-height);
}
.pc-regex-operation-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pc-regex-preview-section {
  padding-top: 12px;
  border-top: 1px solid var(--pc-border);
}
.pc-regex-preview-section > header {
  justify-content: space-between;
  gap: 8px;
}
.pc-regex-preview-section > header span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-preview-box {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}
.pc-preview-box pre {
  min-height: 80px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 390px) {
  .pc-regex-editor-basic-grid,
  .pc-inline-grid.two-cols {
    grid-template-columns: 1fr;
  }
}
</style>
