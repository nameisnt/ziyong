<template>
  <section class="company-app">
    <header class="company-top">
      <button class="soft-btn" type="button" @click="$emit('close')">返回</button>
      <div>
        <h1>陪伴</h1>
      </div>
      <button class="soft-btn" type="button" @click="goToday">今天</button>
    </header>

    <main class="company-body">
      <section class="together-card glow-card">
        <span>{{ roleName }} 与你</span>
        <strong>已经在一起 {{ togetherDays }} 天</strong>
        <div class="inline-form">
          <input v-model.number="togetherDraft" type="number" min="0" placeholder="自定义天数" />
          <button type="button" @click="saveTogether">保存</button>
        </div>
        <p>保存后会以今天为基准，现实时间过一天自动加一天。</p>
      </section>

      <section class="calendar-card panel-card">
        <header class="calendar-head">
          <button type="button" @click="changeMonth(-1)">‹</button>
          <strong>{{ monthTitle }}</strong>
          <button type="button" @click="changeMonth(1)">›</button>
        </header>
        <div class="week-row">
          <span v-for="day in weekDays" :key="day">{{ day }}</span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="day-cell"
            :class="{ muted: !day.currentMonth, selected: selectedDate === day.key, today: today === day.key }"
            @click="selectedDate = day.key"
          >
            <b>{{ day.date.getDate() }}</b>
            <span v-for="flag in dateFlags(day.key).slice(0, 2)" :key="flag">{{ flag }}</span>
          </button>
        </div>
      </section>

      <section class="panel-card selected-card">
        <div class="section-title">
          <strong>{{ selectedDate }}</strong>
          <span>{{ selectedFlags.length ? selectedFlags.join(' · ') : '暂无标记' }}</span>
        </div>
        <div class="note-list" v-if="selectedNotes.length">
          <article v-for="note in selectedNotes" :key="note.id">
            <p>{{ note.text }}</p>
            <button type="button" @click="deleteNote(note.id)">删除</button>
          </article>
        </div>
        <div class="inline-form">
          <input v-model="noteDraft" placeholder="给这一天写点记录" @keyup.enter="addSelectedNote" />
          <button type="button" @click="addSelectedNote">添加</button>
        </div>
      </section>

      <section class="panel-card form-card">
        <div class="section-title"><strong>生日</strong><span>每年自动标记</span></div>
        <label>我的生日<input :value="state.birthday" type="date" @input="updateBirthday($event.target.value)" /></label>
      </section>

      <section class="panel-card form-card period-card">
        <div class="section-title"><strong>经期追踪</strong><span>{{ periodStatus }}</span></div>
        <label>最近开始日期<input v-model="periodForm.lastStartDate" type="date" @change="savePeriod" /></label>
        <div class="two-cols">
          <label>平均周期<input v-model.number="periodForm.cycleDays" type="number" min="1" @change="savePeriod" /></label>
          <label>经期天数<input v-model.number="periodForm.periodDays" type="number" min="1" @change="savePeriod" /></label>
        </div>
        <div class="two-cols">
          <label>提前提醒<input v-model.number="periodForm.reminderAdvanceDays" type="number" min="0" @change="savePeriod" /></label>
          <label class="switch-line"><span>开启提醒</span><input v-model="periodForm.reminderEnabled" type="checkbox" @change="savePeriod" /></label>
        </div>
        <div class="period-stats">
          <span>预计：{{ nextPeriodStart || '未设置' }}</span>
          <span>提醒：{{ reminderDate || '未设置' }}</span>
        </div>
      </section>

      <section class="panel-card ai-card">
        <div class="section-title"><strong>月经提醒</strong><span></span></div>
        <p>{{ reminderLocalText }}</p>
        <button type="button" :disabled="reminderLoading" @click="generateReminder">{{ reminderLoading ? '生成中...' : 'AI 生成提醒文案' }}</button>
        <div v-if="notice" class="notice">{{ notice }}</div>
        <blockquote v-if="state.period.aiReminderText">{{ state.period.aiReminderText }}</blockquote>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { chatCompletion, useApiSettings } from '../composables/useApiSettings.js';
import { useCompanyStore } from '../composables/useCompanyStore.js';
import { useTavern } from '../composables/useTavern.js';

defineEmits(['close']);

const store = useCompanyStore();
const api = useApiSettings();
const tavern = useTavern();
const { state, todayKey, dateFlags, nextPeriodStart, reminderDate, daysUntilPeriod, isInPeriod, togetherDays, updateBirthday, updatePeriod, updateAiReminder, setTogetherDays, notesForDate, addNote, deleteNote } = store;

const today = todayKey();
const viewDate = ref(new Date());
const selectedDate = ref(today);
const noteDraft = ref('');
const roleName = ref('TA');
const togetherDraft = ref(togetherDays.value);
const reminderLoading = ref(false);
const notice = ref('');
const periodForm = reactive({ ...state.period });
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const monthTitle = computed(() => `${viewDate.value.getFullYear()} 年 ${viewDate.value.getMonth() + 1} 月`);
const selectedFlags = computed(() => dateFlags(selectedDate.value));
const selectedNotes = computed(() => notesForDate(selectedDate.value));
const periodStatus = computed(() => {
  if (!state.period.lastStartDate) return '尚未设置';
  if (isInPeriod.value) return '当前可能处于经期';
  if (daysUntilPeriod.value === null) return '尚未设置';
  if (daysUntilPeriod.value < 0) return '预计日期已过，请更新记录';
  if (daysUntilPeriod.value === 0) return '预计今天开始';
  return `距离预计开始 ${daysUntilPeriod.value} 天`;
});
const reminderLocalText = computed(() => {
  if (!nextPeriodStart.value) return '填写最近一次开始日期后，会在这里显示提醒。';
  const days = daysUntilPeriod.value;
  if (days === 0) return `预计月经今天开始，日期：${nextPeriodStart.value}`;
  if (days > 0) return `距离预计月经还有 ${days} 天，预计开始日期：${nextPeriodStart.value}`;
  return `预计开始日期 ${nextPeriodStart.value} 已过，可以更新最近一次开始日期。`;
});
const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, key: todayKey(date), currentMonth: date.getMonth() === month };
  });
});

onMounted(async () => {
  api.restore();
  try {
    const data = await tavern.getRoleAppData();
    roleName.value = data?.character?.name && data.character.name !== '暂无数据' ? data.character.name : 'TA';
  } catch (error) {
    console.warn('[CompanyApp] role load failed:', error);
  }
});

function changeMonth(offset) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + offset, 1);
}

function goToday() {
  viewDate.value = new Date();
  selectedDate.value = todayKey();
}

function addSelectedNote() {
  if (!noteDraft.value.trim()) return;
  addNote(selectedDate.value, noteDraft.value);
  noteDraft.value = '';
}

function savePeriod() {
  updatePeriod({ ...periodForm });
}

function saveTogether() {
  setTogetherDays(togetherDraft.value);
  togetherDraft.value = togetherDays.value;
}

async function generateReminder() {
  notice.value = '';
  api.restore();
  if (!api.endpoint.value.trim() || !api.model.value.trim()) {
    notice.value = '请先在设置 App 配置 API 端点和模型。';
    return;
  }
  reminderLoading.value = true;
  try {
    const response = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [
        { role: 'system', content: '你是一个温柔的陪伴型提醒文案助手。请根据用户的经期信息，生成一段简短、自然、像亲近的人发来的提醒。不要做医疗诊断，不要制造焦虑，不要超过80字。禁止输出 emoji。' },
        { role: 'user', content: `用户预计月经开始日：${nextPeriodStart.value || '未设置'}\n距离预计开始还有：${daysUntilPeriod.value ?? '未知'}天\n平均周期：${state.period.cycleDays}天\n经期天数：${state.period.periodDays}天\n请生成一段提醒。` },
      ],
      extra: { temperature: 0.75 },
    });
    const content = response?.choices?.[0]?.message?.content || response?.content || '';
    updateAiReminder(String(content || '').trim() || '记得照顾好自己，提前准备好需要的东西，今天也慢慢来。');
  } catch (error) {
    notice.value = error.message || 'AI 提醒生成失败';
  } finally {
    reminderLoading.value = false;
  }
}
</script>

<style scoped>
.company-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#fffafc; color:#2d2528; font-family:inherit; animation:company-in .32s cubic-bezier(.2,.9,.2,1) both; }
button, input { font-family:inherit; }
button { border:none; cursor:pointer; }
button:disabled { opacity:.55; cursor:not-allowed; }
.company-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 12px; }
.company-top div { text-align:center; min-width:0; }
.company-top h1 { margin:0; font-size:26px; }
.soft-btn { height:32px; border-radius:16px; background:#fff; color:#6f5a62; font-size:12px; box-shadow:0 8px 20px rgba(219,166,184,.18); }
.company-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.company-body::-webkit-scrollbar { width:0; }
.panel-card, .glow-card { border:1px solid #f4dfe7; border-radius:24px; background:#fff; box-shadow:0 16px 36px rgba(211,168,182,.18); }
.together-card { padding:18px; background:#fff; }
.together-card span { color:#a0828d; font-size:12px; }
.together-card strong { display:block; margin:5px 0 12px; font-size:24px; line-height:1.25; }
.together-card p { margin:9px 0 0; color:#a68d96; font-size:11px; line-height:1.45; }
.inline-form { display:flex; gap:8px; }
.inline-form input { flex:1; min-width:0; height:36px; border:1px solid #f0d7e0; outline:none; border-radius:14px; padding:0 12px; background:#fffafd; color:#2d2528; }
.inline-form button, .ai-card button { padding:0 13px; border-radius:14px; background:#f084a9; color:#fff; font-weight:800; }
.calendar-card, .selected-card, .form-card, .ai-card { margin-top:12px; padding:14px; }
.calendar-head { display:grid; grid-template-columns:34px 1fr 34px; align-items:center; margin-bottom:10px; }
.calendar-head strong { text-align:center; font-size:17px; }
.calendar-head button { width:34px; height:34px; border-radius:17px; background:#fff4f8; color:#c46786; font-size:22px; }
.week-row, .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
.week-row span { text-align:center; color:#b899a4; font-size:11px; }
.calendar-grid { margin-top:6px; }
.day-cell { min-height:48px; padding:5px 3px; border-radius:14px; background:#fff7fa; color:#403238; text-align:left; display:flex; flex-direction:column; gap:2px; }
.day-cell b { font-size:12px; padding-left:3px; }
.day-cell span { align-self:flex-start; max-width:100%; padding:1px 4px; border-radius:999px; background:#ffe2ec; color:#c46786; font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.day-cell.muted { opacity:.35; }
.day-cell.today { outline:1px solid #f2a8bf; }
.day-cell.selected { background:#ffeaf1; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:11px; }
.section-title strong { font-size:17px; }
.section-title span { color:#a68d96; font-size:11px; text-align:right; }
.note-list { display:flex; flex-direction:column; gap:7px; margin-bottom:10px; }
.note-list article { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:9px 10px; border-radius:15px; background:#fff7fa; }
.note-list p { margin:0; color:#5e4c53; font-size:12px; line-height:1.45; }
.note-list button { padding:6px 9px; border-radius:12px; background:#ffe8f0; color:#bd5f80; font-size:11px; }
.form-card label { display:flex; flex-direction:column; gap:6px; margin-top:8px; color:#8b737c; font-size:12px; }
.form-card input { width:100%; height:36px; border:1px solid #f0d7e0; outline:none; border-radius:13px; padding:0 10px; background:#fffafd; color:#2d2528; }
.two-cols { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.switch-line { justify-content:end; }
.switch-line input { height:20px; width:auto; align-self:flex-start; }
.period-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
.period-stats span { padding:9px; border-radius:14px; background:#fff0f5; color:#bd5f80; font-size:11px; }
.ai-card p { margin:0 0 10px; color:#766169; font-size:12px; line-height:1.55; }
.ai-card button { height:34px; }
.notice { margin-top:10px; padding:9px; border-radius:14px; background:#fff7d9; color:#8c6a00; font-size:12px; }
blockquote { margin:12px 0 0; padding:12px; border-left:3px solid #f084a9; border-radius:12px; background:#fff7fa; color:#4f4047; font-size:13px; line-height:1.55; }
@keyframes company-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
</style>
