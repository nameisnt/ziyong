<template>
  <section class="schedule-app">
    <header class="schedule-top">
      <button class="soft-btn" type="button" @click="$emit('close')">返回</button>
      <h1>日程</h1>
      <button class="soft-btn primary" type="button" @click="openCreate">添加</button>
    </header>

    <main class="schedule-body">
      <section class="overview-card">
        <div>
          <span>{{ selectedDateLabel }}</span>
          <strong>{{ visibleSchedules.length }} 项安排</strong>
        </div>
        <div class="overview-stats">
          <span>{{ doneCount }} 已完成</span>
          <span>{{ urgentCount }} 紧急</span>
        </div>
      </section>

      <nav class="date-tabs">
        <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.name }}</button>
      </nav>

      <section v-if="companySchedules.length" class="link-card">
        <div class="section-title">
          <strong>陪伴联动</strong>
          <span>{{ companySchedules.length }} 条</span>
        </div>
        <article v-for="(item, index) in companySchedules" :key="item.id" class="schedule-item linked" :style="staggerStyle(index)">
          <div class="time-pill">{{ item.time || '全天' }}</div>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </div>
        </article>
      </section>

      <section class="list-card">
        <div class="section-title">
          <strong>{{ activeTab === 'all' ? '全部日程' : selectedDateLabel }}</strong>
          <span>{{ manualSchedules.length }} 条手动日程</span>
        </div>
        <TransitionGroup v-if="manualSchedules.length" name="schedule-list" tag="div" class="schedule-list">
          <article v-for="(item, index) in manualSchedules" :key="item.id" class="schedule-item" :class="[item.priority, { done: item.done }]" :style="staggerStyle(index)">
            <button class="done-dot" type="button" @click="toggleDone(item.id)">{{ item.done ? '✓' : '' }}</button>
            <div class="schedule-main" @click="editItem(item)">
              <div class="schedule-line">
                <strong>{{ item.title }}</strong>
                <span>{{ item.time || '全天' }}</span>
              </div>
              <p>{{ item.detail || typeLabel(item.type) }}</p>
              <div class="tag-row">
                <em>{{ typeLabel(item.type) }}</em>
                <em>{{ priorityLabel(item.priority) }}</em>
              </div>
            </div>
            <button class="delete-btn" type="button" @click="deleteSchedule(item.id)">删除</button>
          </article>
        </TransitionGroup>
        <div v-else class="empty-state">这一天还没有手动日程，点右上角添加一条。</div>
      </section>
    </main>

    <Transition name="modal-fade">
    <div v-if="editorOpen" class="modal-mask">
      <form class="editor-card" @submit.prevent="saveEditor">
        <header>
          <h2>{{ editingId ? '编辑日程' : '添加日程' }}</h2>
          <button type="button" @click="editorOpen = false">×</button>
        </header>
        <label>标题<input v-model="form.title" required placeholder="例如：下午交稿" /></label>
        <label>详情<textarea v-model="form.detail" placeholder="补充说明，可以不填"></textarea></label>
        <div class="two-cols">
          <label>日期<input v-model="form.date" type="date" required /></label>
          <label>时间<input v-model="form.time" type="time" /></label>
        </div>
        <div class="two-cols">
          <label>类型
            <select v-model="form.type">
              <option value="task">任务</option>
              <option value="ddl">DDL</option>
              <option value="anniversary">纪念日</option>
              <option value="reminder">提醒</option>
              <option value="custom">其他</option>
            </select>
          </label>
          <label>优先级
            <select v-model="form.priority">
              <option value="normal">普通</option>
              <option value="important">重要</option>
              <option value="urgent">紧急</option>
            </select>
          </label>
        </div>
        <div class="editor-actions">
          <button type="button" @click="editorOpen = false">取消</button>
          <button class="primary" type="submit">保存</button>
        </div>
      </form>
    </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useCompanyStore } from '../composables/useCompanyStore.js';
import { useScheduleStore } from '../composables/useScheduleStore.js';

defineEmits(['close']);

const schedule = useScheduleStore();
const company = useCompanyStore();
const { addSchedule, updateSchedule, deleteSchedule, toggleDone, schedulesByDate, schedulesBetween, todayKey, addDays } = schedule;

const today = todayKey();
const activeTab = ref('today');
const editorOpen = ref(false);
const editingId = ref('');
const form = reactive({ title: '', detail: '', date: today, time: '', type: 'task', priority: 'normal' });

const tabs = [
  { key: 'today', name: '今天' },
  { key: 'tomorrow', name: '明天' },
  { key: 'week', name: '本周' },
  { key: 'all', name: '全部' },
];

const selectedDate = computed(() => {
  if (activeTab.value === 'tomorrow') return addDays(today, 1);
  return today;
});
const selectedDateLabel = computed(() => {
  if (activeTab.value === 'today') return '今天';
  if (activeTab.value === 'tomorrow') return '明天';
  if (activeTab.value === 'week') return '未来 7 天';
  return '全部';
});
const manualSchedules = computed(() => {
  if (activeTab.value === 'all') return schedule.sortedSchedules.value;
  if (activeTab.value === 'week') return schedulesBetween(today, addDays(today, 7));
  return schedulesByDate(selectedDate.value);
});
const companySchedules = computed(() => {
  if (activeTab.value === 'all') return [];
  const dates = activeTab.value === 'week'
    ? Array.from({ length: 8 }, (_, index) => addDays(today, index))
    : [selectedDate.value];
  return dates.flatMap(date => buildCompanySchedules(date));
});
const visibleSchedules = computed(() => [...manualSchedules.value, ...companySchedules.value]);
const doneCount = computed(() => manualSchedules.value.filter(item => item.done).length);
const urgentCount = computed(() => manualSchedules.value.filter(item => item.priority === 'urgent' && !item.done).length);

function buildCompanySchedules(date) {
  const list = [];
  const flags = company.dateFlags(date);
  flags.forEach(flag => {
    if (flag === '生日') list.push({ id: `company_birthday_${date}`, date, type: 'anniversary', title: '我的生日', detail: '来自陪伴 app 的生日标记', time: '' });
    if (flag === '提醒') list.push({ id: `company_period_reminder_${date}`, date, type: 'period', title: '经期提前准备', detail: '来自陪伴 app 的经期提醒', time: '' });
    if (flag === '预计') list.push({ id: `company_period_start_${date}`, date, type: 'period', title: '预计经期开始', detail: '来自陪伴 app 的经期追踪', time: '' });
  });
  company.notesForDate(date).slice(0, 4).forEach(note => {
    list.push({ id: `company_note_${note.id}`, date, type: 'note', title: '陪伴记录', detail: note.text, time: '' });
  });
  return list;
}

function openCreate() {
  editingId.value = '';
  Object.assign(form, { title: '', detail: '', date: selectedDate.value, time: '', type: 'task', priority: 'normal' });
  editorOpen.value = true;
}

function editItem(item) {
  editingId.value = item.id;
  Object.assign(form, { title: item.title, detail: item.detail || '', date: item.date || today, time: item.time || '', type: item.type || 'task', priority: item.priority || 'normal' });
  editorOpen.value = true;
}

function saveEditor() {
  const payload = { ...form };
  if (editingId.value) updateSchedule(editingId.value, payload);
  else addSchedule(payload);
  editorOpen.value = false;
}

function typeLabel(type) {
  return ({ task: '任务', ddl: 'DDL', anniversary: '纪念日', reminder: '提醒', period: '经期', note: '记录', custom: '其他' })[type] || '日程';
}

function priorityLabel(priority) {
  return ({ normal: '普通', important: '重要', urgent: '紧急' })[priority] || '普通';
}

function staggerStyle(index) {
  return { '--stagger': `${Math.min(index, 8) * 34}ms` };
}
</script>

<style scoped>
.schedule-app { position:absolute; inset:0; z-index:20; overflow:hidden; border-radius:40px; background:#fbfaf4; color:#211d19; font-family:inherit; animation:schedule-in .32s cubic-bezier(.2,.9,.2,1) both; }
button, input, textarea, select { font-family:inherit; }
button { border:none; cursor:pointer; }
.schedule-top { display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:10px; padding:54px 16px 12px; }
.schedule-top h1 { margin:0; text-align:center; font-size:26px; }
.soft-btn { height:32px; border-radius:16px; background:#fff; color:#645748; font-size:12px; box-shadow:0 8px 18px rgba(103,80,43,.12); }
.soft-btn.primary, .editor-actions .primary { background:#2f2a25; color:#fff; }
.schedule-body { position:absolute; inset:112px 0 0; overflow-y:auto; padding:12px 14px 34px; }
.schedule-body::-webkit-scrollbar { width:0; }
.overview-card, .link-card, .list-card { border:1px solid #ece0ca; border-radius:24px; background:#fff; box-shadow:0 16px 34px rgba(94,72,38,.1); }
.overview-card { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:17px; animation:schedule-card-in .34s .04s cubic-bezier(.2,.9,.2,1) both; }
.overview-card span { color:#97866c; font-size:12px; }
.overview-card strong { display:block; margin-top:5px; font-size:25px; }
.overview-stats { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
.overview-stats span { padding:6px 9px; border-radius:999px; background:#f7f0e4; color:#76644a; font-size:11px; }
.date-tabs { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin:12px 0; padding:5px; border-radius:19px; background:#eee6d8; animation:schedule-card-in .34s .09s cubic-bezier(.2,.9,.2,1) both; }
.date-tabs button { height:32px; border-radius:15px; background:transparent; color:#806f58; font-size:12px; font-weight:800; }
.date-tabs button.active { background:#fff; color:#2f2a25; box-shadow:0 8px 18px rgba(94,72,38,.1); }
.link-card, .list-card { padding:14px; margin-top:12px; animation:schedule-card-in .36s .13s cubic-bezier(.2,.9,.2,1) both; }
.section-title { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:10px; }
.section-title strong { font-size:17px; }
.section-title span { color:#9c8b72; font-size:11px; text-align:right; }
.schedule-list { display:flex; flex-direction:column; gap:9px; }
.schedule-item { display:grid; grid-template-columns:28px minmax(0,1fr) auto; align-items:center; gap:9px; padding:10px; border:1px solid #efe4d2; border-radius:18px; background:#fffdf9; animation:schedule-item-in .32s cubic-bezier(.2,.9,.2,1) both; animation-delay:var(--stagger, 0ms); }
.schedule-item.linked { grid-template-columns:48px minmax(0,1fr); background:#fbf6ec; }
.schedule-item.important { border-color:#e8c891; }
.schedule-item.urgent { border-color:#e49a8e; background:#fff8f6; }
.schedule-item.done { opacity:.58; }
.done-dot { width:24px; height:24px; border-radius:50%; background:#f1e7d8; color:#2f2a25; font-size:13px; font-weight:900; }
.schedule-main { min-width:0; }
.schedule-line { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.schedule-line strong, .schedule-item.linked strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.schedule-line span, .time-pill { color:#8c795d; font-size:11px; }
.schedule-main p, .schedule-item.linked p { margin:5px 0 0; color:#7a6c5b; font-size:12px; line-height:1.4; word-break:break-word; }
.tag-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:7px; }
.tag-row em { padding:3px 7px; border-radius:999px; background:#f3eadb; color:#806b4e; font-size:10px; font-style:normal; }
.delete-btn { padding:7px 8px; border-radius:12px; background:#f6eee2; color:#8a6b4a; font-size:11px; }
.time-pill { display:grid; place-items:center; height:30px; border-radius:999px; background:#fff; }
.empty-state { padding:22px 12px; border-radius:18px; background:#fbf6ec; color:#9b8b75; text-align:center; font-size:12px; }
.modal-mask { position:absolute; inset:0; z-index:35; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(34,28,21,.48); }
.editor-card { width:100%; max-height:630px; overflow-y:auto; padding:16px; border-radius:24px; background:#fff; color:#211d19; box-shadow:0 18px 46px rgba(34,28,21,.24); animation:editor-pop .2s cubic-bezier(.2,.9,.2,1) both; }
.editor-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.editor-card h2 { margin:0; font-size:18px; }
.editor-card header button { width:30px; height:30px; border-radius:50%; background:#2f2a25; color:#fff; }
.editor-card label { display:flex; flex-direction:column; gap:6px; margin:10px 0; color:#6d5d49; font-size:12px; }
.editor-card input, .editor-card textarea, .editor-card select { box-sizing:border-box; width:100%; border:1px solid #e7d9c4; border-radius:14px; padding:10px; outline:0; background:#fffdf9; color:#211d19; font:inherit; }
.editor-card textarea { min-height:82px; resize:none; }
.two-cols { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.editor-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
.editor-actions button { padding:9px 13px; border-radius:14px; background:#f3eadb; color:#5f4e39; }
@keyframes schedule-in { from { opacity:0; transform:translateY(28px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes schedule-card-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@keyframes schedule-item-in { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
@keyframes editor-pop { from { opacity:0; transform:translateY(18px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
.modal-fade-enter-active, .modal-fade-leave-active { transition:opacity .18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; }
.schedule-list-enter-active, .schedule-list-leave-active { transition:opacity .22s ease, transform .24s cubic-bezier(.2,.9,.2,1); }
.schedule-list-enter-from, .schedule-list-leave-to { opacity:0; transform:translateX(14px); }
</style>
