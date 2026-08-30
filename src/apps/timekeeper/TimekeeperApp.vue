<template>
  <section class="pc-timekeeper-app">
    <section class="pc-timekeeper-page">
      <ConfigurationRecoveryNotice
        v-if="configError"
        :error="configError"
        filename="sillytavern-phone-timekeeper-corrupted-data.json"
        :raw-data="rawConfig"
        @reset="resetCorruptedSettings"
        @retry="timekeeper.rehydrateFromSettings"
      />

      <article class="pc-page-section pc-time-hero">
        <div>
          <span class="pc-kicker">{{ t`当前世界时间` }}</span>
          <h2>{{ timekeeper.formatDate(settings.current) }}</h2>
          <p>{{ t`推进后` }}：{{ timekeeper.formatDate(nextDate) }}</p>
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          :aria-label="t`写入输入框`"
          :title="t`写入输入框`"
          @click="writeToInput"
        >
          <i class="fa-solid fa-keyboard"></i>
        </button>
      </article>

      <details class="pc-page-section pc-calendar-card">
        <summary class="pc-section-head">
          <strong>{{ t`历法` }}</strong>
          <span class="pc-head-actions">
            <InfoHint :text="calendarHelpText" />
            <i class="fa-solid fa-chevron-down"></i>
          </span>
        </summary>
        <div class="pc-asset-field pc-calendar-select">
          <SearchableCombobox
            input-label="选择历法"
            :model-value="settings.calendar.id"
            :options="calendarOptions"
            placeholder="选择历法"
            @update:model-value="onCalendarSelect"
          />
          <div class="pc-asset-actions">
            <button
              v-if="settings.calendar.kind !== 'gregorian'"
              class="pc-icon-btn"
              type="button"
              :aria-label="t`保存为全局历法`"
              :title="t`保存为全局历法`"
              @click="saveCalendarTemplate"
            >
              <i class="fa-solid fa-floppy-disk"></i>
            </button>
            <button
              v-if="isCurrentGlobalTemplate"
              class="pc-icon-btn danger"
              type="button"
              :aria-label="t`删除全局历法模板`"
              :title="t`删除全局历法模板`"
              @click="deleteCurrentCalendarTemplate"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div v-if="settings.calendar.kind === 'gregorian'" class="pc-calendar-summary">
          <strong>{{ t`公历自动计算` }}</strong>
          <span>{{ t`包含大小月与闰年，日期可以选择或直接填写。` }}</span>
        </div>

        <template v-else>
          <input
            v-model="settings.calendar.eraName"
            class="pc-field"
            type="text"
            :placeholder="t`例如 星历`"
            @change="timekeeper.normalizeCurrentDates()"
          />
          <div class="pc-grid two">
            <label class="pc-number-field">
              <span>{{ t`每年月份` }}</span>
              <input
                v-model.number="settings.calendar.monthsPerYear"
                class="pc-field"
                type="number"
                min="1"
                max="24"
                @change="timekeeper.normalizeCurrentDates()"
              />
            </label>
            <label class="pc-number-field">
              <span>{{ t`每月天数` }}</span>
              <input
                v-model="settings.calendar.monthDaysText"
                class="pc-field"
                type="text"
                :placeholder="t`30 或 31,28,31...`"
                @change="timekeeper.normalizeCurrentDates()"
              />
            </label>
          </div>
        </template>
      </details>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`当前日期` }}</strong>
        </div>
        <input
          v-if="settings.calendar.kind === 'gregorian'"
          class="pc-field pc-date-field"
          type="date"
          :value="formatDateInput(settings.current)"
          @change="setCurrentDate"
        />
        <div v-else class="pc-grid three">
          <label class="pc-number-field">
            <span>{{ t`年` }}</span>
            <input
              v-model.number="settings.current.year"
              class="pc-field"
              type="number"
              min="1"
              @change="timekeeper.normalizeCurrentDates()"
            />
          </label>
          <label class="pc-number-field">
            <span>{{ t`月` }}</span>
            <input
              v-model.number="settings.current.month"
              class="pc-field"
              type="number"
              min="1"
              :max="settings.calendar.monthsPerYear"
              @change="timekeeper.normalizeCurrentDates()"
            />
          </label>
          <label class="pc-number-field">
            <span>{{ t`日` }}</span>
            <input
              v-model.number="settings.current.day"
              class="pc-field"
              type="number"
              min="1"
              :max="timekeeper.getDaysInMonth(settings.current.month)"
              @change="timekeeper.normalizeCurrentDates()"
            />
          </label>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`人物` }}</strong>
          <span class="pc-head-actions">
            <InfoHint :text="peopleHelpText" />
            <button
              class="pc-icon-btn"
              type="button"
              :class="{ active: peopleBulkMode }"
              :disabled="!settings.people.length"
              :aria-label="t`批量删除人物`"
              :title="t`批量删除人物`"
              @click="peopleBulkMode ? cancelPeopleBulk() : startPeopleBulk()"
            >
              <i class="fa-solid fa-list-check"></i>
            </button>
            <button
              class="pc-icon-btn primary"
              type="button"
              :aria-label="t`新增人物`"
              :title="t`新增人物`"
              @click="createPerson"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
          </span>
        </div>

        <BulkSelectionBar
          v-if="peopleBulkMode"
          :all-selected="allPeopleSelected"
          :selected-count="selectedPeopleIds.length"
          :total-count="settings.people.length"
          @cancel="cancelPeopleBulk"
          @remove="deleteSelectedPeople"
          @toggle-all="toggleAllPeople"
        />

        <EmptyState v-if="!settings.people.length" compact :title="t`还没有人物`" />

        <div v-else class="pc-people-list">
          <article v-for="person in settings.people" :key="person.id" class="pc-person-card">
            <label class="pc-check-row">
              <input v-model="person.selected" type="checkbox" />
              <input v-model="person.name" class="pc-field name" type="text" :placeholder="t`人物名称`" />
            </label>
            <input
              v-if="settings.calendar.kind === 'gregorian'"
              class="pc-field pc-date-field"
              type="date"
              :value="formatDateInput(person.birth)"
              @change="setPersonBirthDate(person.id, $event)"
            />
            <div v-else class="pc-grid three">
              <label class="pc-number-field">
                <span>{{ t`生年` }}</span>
                <input
                  v-model.number="person.birth.year"
                  class="pc-field"
                  type="number"
                  min="1"
                  @change="syncPersonBirth(person.id)"
                />
              </label>
              <label class="pc-number-field">
                <span>{{ t`生月` }}</span>
                <input
                  v-model.number="person.birth.month"
                  class="pc-field"
                  type="number"
                  min="1"
                  :max="settings.calendar.monthsPerYear"
                  @change="syncPersonBirth(person.id)"
                />
              </label>
              <label class="pc-number-field">
                <span>{{ t`生日` }}</span>
                <input
                  v-model.number="person.birth.day"
                  class="pc-field"
                  type="number"
                  min="1"
                  :max="timekeeper.getDaysInMonth(person.birth.month, person.birth.year)"
                  @change="syncPersonBirth(person.id)"
                />
              </label>
            </div>
            <div class="pc-person-foot">
              <span>{{ t`当前` }} {{ timekeeper.formatAge(timekeeper.getAgeAt(person, settings.current)) }}</span>
              <span>{{ t`推进后` }} {{ timekeeper.formatAge(timekeeper.getAgeAt(person, nextDate)) }}</span>
              <BulkSelectionCheckbox
                v-if="peopleBulkMode"
                :model-value="selectedPeopleIdSet.has(person.id)"
                :label="`选择 ${person.name}`"
                @update:model-value="setPersonSelected(person.id, $event)"
              />
              <button
                v-else
                class="pc-icon-btn danger"
                type="button"
                :aria-label="t`删除`"
                :title="t`删除`"
                @click="deletePerson(person.id)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </article>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`时间流逝` }}</strong>
          <span class="pc-head-actions">
            <span>{{ timekeeper.formatDuration(settings.delta) }}</span>
            <InfoHint :text="advanceHelpText" />
          </span>
        </div>
        <div class="pc-grid three">
          <label class="pc-number-field">
            <span>{{ t`年` }}</span>
            <input v-model.number="settings.delta.years" class="pc-field" type="number" min="0" />
          </label>
          <label class="pc-number-field">
            <span>{{ t`月` }}</span>
            <input v-model.number="settings.delta.months" class="pc-field" type="number" min="0" />
          </label>
          <label class="pc-number-field">
            <span>{{ t`日` }}</span>
            <input v-model.number="settings.delta.days" class="pc-field" type="number" min="0" />
          </label>
        </div>
        <button class="pc-primary-btn pc-advance-btn" type="button" @click="confirmAdvance">
          <i class="fa-solid fa-calendar-check"></i>
          <span>{{ t`确认推进` }}</span>
        </button>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>
            {{ t`写入预览` }}
            <InfoHint :text="previewHelpText" />
          </strong>
        </div>
        <pre class="pc-preview">{{ promptText }}</pre>
        <div class="pc-form-actions pc-time-actions">
          <button class="pc-soft-btn" type="button" @click="copyPrompt">
            <i class="fa-solid fa-copy"></i>
            <span>{{ t`复制` }}</span>
          </button>
          <button class="pc-primary-btn" type="button" @click="writeToInput">
            <i class="fa-solid fa-keyboard"></i>
            <span>{{ t`写入输入框` }}</span>
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import ConfigurationRecoveryNotice from '@/components/ConfigurationRecoveryNotice.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { appendToTavernInput } from '@/util/tavernInput';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { GREGORIAN_CALENDAR, useTimekeeperStore, type TimekeeperDate } from './store';
import { storeToRefs } from 'pinia';

const timekeeper = useTimekeeperStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { configError, nextDate, rawConfig, settings } = storeToRefs(timekeeper);
const {
  active: peopleBulkMode,
  allSelected: allPeopleSelected,
  cancel: cancelPeopleBulk,
  selectedIds: selectedPeopleIds,
  selectedIdSet: selectedPeopleIdSet,
  setSelected: setPersonSelected,
  start: startPeopleBulk,
  toggleAll: toggleAllPeople,
} = useBulkSelection(() => settings.value.people.map(person => person.id));
const promptText = computed(() => timekeeper.buildPromptText());
const calendarHelpText =
  '公历会自动计算大小月和闰年；手动历法可以填写统一天数或用逗号分开每个月。保存后的历法模板可在所有聊天中选择。';
const peopleHelpText = '维护需要参与年龄计算的人物与出生日期。';
const advanceHelpText = '这里只设置流逝时长；点击确认推进才会把当前世界时间改成推进后的日期。';
const previewHelpText = '写入输入框只会把这段文本追加到酒馆输入框，不会自动发送，也不会改变当前世界时间。';
const calendarOptions = computed(() => {
  const options = [
    { label: '公历', value: GREGORIAN_CALENDAR.id },
    { label: '手动历法', value: 'manual' },
    ...settingsStore.settings.timekeeperCalendarTemplates.map(template => ({
      label: template.name,
      value: template.id,
    })),
  ];
  if (!options.some(option => option.value === settings.value.calendar.id)) {
    options.push({
      label: `${settings.value.calendar.name}（当前快照）`,
      value: settings.value.calendar.id,
    });
  }
  return options;
});
const isCurrentGlobalTemplate = computed(() =>
  settingsStore.settings.timekeeperCalendarTemplates.some(template => template.id === settings.value.calendar.id),
);

async function resetCorruptedSettings() {
  if (
    !(await phone.confirmNotice('要重置当前聊天的时间确认数据吗？这会替换无法读取的原始数据。', {
      confirmLabel: '重置',
      kind: 'warning',
    }))
  )
    return;
  timekeeper.resetCurrentScope();
  toastr.success('已重置当前聊天的时间确认数据');
}

function formatDateInput(date: TimekeeperDate) {
  const year = String(Math.max(1, Math.round(date.year))).padStart(4, '0');
  const month = String(Math.max(1, Math.round(date.month))).padStart(2, '0');
  const day = String(Math.max(1, Math.round(date.day))).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}

function onCalendarSelect(calendarId: string) {
  timekeeper.selectCalendar(calendarId);
}

function setCurrentDate(event: Event) {
  const date = parseDateInput((event.target as HTMLInputElement).value);
  if (!date) return;
  settings.value.current = date;
  timekeeper.normalizeCurrentDates();
}

function setPersonBirthDate(personId: string, event: Event) {
  const date = parseDateInput((event.target as HTMLInputElement).value);
  const person = settings.value.people.find(item => item.id === personId);
  if (!date || !person) return;
  person.birth = date;
  syncPersonBirth(personId);
}

async function syncPersonBirth(personId: string) {
  const person = settings.value.people.find(item => item.id === personId);
  if (!person) return;
  timekeeper.normalizeCurrentDates();
  person.selected = true;
}

async function createPerson() {
  try {
    const person = await timekeeper.createPerson();
    toastr.success(`已新增人物“${person.name}”`);
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '新增人物失败');
  }
}

async function deletePerson(personId: string) {
  const person = settings.value.people.find(item => item.id === personId);
  if (!person) return;
  const confirmed = await phone.confirmNotice(`删除“${person.name}”吗？`, {
    confirmLabel: '删除人物',
    kind: 'warning',
    title: '删除人物',
  });
  if (!confirmed) return;
  try {
    await timekeeper.deletePerson(personId);
    toastr.success(`已删除“${person.name}”`);
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '删除人物失败');
  }
}

async function deleteSelectedPeople() {
  const selected = settings.value.people.filter(person => selectedPeopleIdSet.value.has(person.id));
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(`删除所选 ${selected.length} 个人物吗？`, {
    confirmLabel: '删除所选',
    kind: 'warning',
    title: '批量删除人物',
  });
  if (!confirmed) return;
  try {
    for (const person of selected) await timekeeper.deletePerson(person.id);
    cancelPeopleBulk();
    toastr.success(`已删除 ${selected.length} 个人物`);
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '批量删除人物失败');
  }
}

async function saveCalendarTemplate() {
  const name = await phone.promptNotice('为当前历法填写一个名称。保存后，所有聊天都能从下拉框选择它。', {
    confirmLabel: '保存',
    initialValue: settings.value.calendar.name === '手动历法' ? '' : settings.value.calendar.name,
    placeholder: '例如 星历',
    title: '保存历法模板',
  });
  if (name === null) return;
  try {
    const template = timekeeper.saveCurrentCalendarAsTemplate(name);
    toastr.success(`已保存历法“${template.name}”`);
  } catch (error) {
    toastr.warning(error instanceof Error ? error.message : '保存历法失败');
  }
}

async function deleteCurrentCalendarTemplate() {
  const template = settingsStore.settings.timekeeperCalendarTemplates.find(
    item => item.id === settings.value.calendar.id,
  );
  if (!template) return;
  const confirmed = await phone.confirmNotice(
    `删除全局历法模板“${template.name}”吗？当前聊天会继续保留它的历法快照。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
      title: '删除历法模板？',
    },
  );
  if (!confirmed) return;
  timekeeper.deleteCalendarTemplate(template.id);
  toastr.success('已删除历法模板');
}

function writeToInput() {
  const result = appendToTavernInput(promptText.value, { separator: 'newline' });
  if (!result.ok) {
    toastr.warning('没有找到酒馆输入框');
    return;
  }
  toastr.success('已写入酒馆输入框');
}

function confirmAdvance() {
  timekeeper.applyNextDate();
  toastr.success('已更新当前世界时间');
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(promptText.value);
    toastr.success('已复制时间确认文本');
  } catch {
    toastr.warning('复制失败，请手动复制');
  }
}
</script>

<style scoped>
.pc-timekeeper-app,
.pc-timekeeper-page {
  min-height: 100%;
}

.pc-timekeeper-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-calendar-card summary {
  cursor: pointer;
  list-style: none;
}

.pc-calendar-card summary::-webkit-details-marker {
  display: none;
}

.pc-calendar-card summary i {
  color: var(--pc-muted);
  transition: transform 0.16s ease;
}

.pc-calendar-card[open] summary i {
  transform: rotate(180deg);
}

.pc-calendar-select,
.pc-calendar-card > .pc-field,
.pc-date-field,
.pc-calendar-summary {
  margin-top: 12px;
}

.pc-calendar-select {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.pc-calendar-select .pc-asset-actions {
  display: flex;
  gap: 6px;
}

.pc-calendar-summary {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-calendar-summary span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-time-hero,
.pc-head-actions,
.pc-person-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-head-actions {
  justify-content: flex-end;
}

.pc-time-hero h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-time-hero p,
.pc-head-actions > span,
.pc-person-foot span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-grid {
  margin-top: 12px;
}

.pc-field.name {
  margin: 0;
}

.pc-people-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.pc-person-card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  padding: 12px;
}

.pc-check-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.pc-person-foot {
  align-items: center;
}

.pc-advance-btn {
  width: 100%;
  margin-top: 14px;
}

.pc-preview {
  margin: 12px 0 0;
  white-space: pre-wrap;
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px;
  font-family: inherit;
  line-height: 1.5;
}

.pc-time-actions {
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
