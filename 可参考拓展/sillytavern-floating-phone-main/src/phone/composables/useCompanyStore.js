import { computed, reactive } from 'vue';

const COMPANY_KEY = 'phone_company_data';

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value, days) {
  const date = parseDate(value);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

function daysBetween(from, to = todayKey()) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return 0;
  return Math.floor((end - start) / 86400000);
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaults() {
  return {
    birthday: '',
    period: {
      lastStartDate: '',
      cycleDays: 28,
      periodDays: 5,
      reminderEnabled: true,
      reminderAdvanceDays: 2,
      aiReminderText: '',
      aiReminderUpdatedAt: 0,
    },
    together: {
      startDate: '',
      customBaseDays: 0,
      customBaseDate: todayKey(),
    },
    notes: [],
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPANY_KEY) || 'null');
    return {
      ...defaults(),
      ...(saved || {}),
      period: { ...defaults().period, ...(saved?.period || {}) },
      together: { ...defaults().together, ...(saved?.together || {}) },
      notes: Array.isArray(saved?.notes) ? saved.notes : [],
    };
  } catch {
    return defaults();
  }
}

const state = reactive(loadData());

function save() {
  try { localStorage.setItem(COMPANY_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('[CompanyStore] save failed:', error); }
}

export function useCompanyStore() {
  const nextPeriodStart = computed(() => addDays(state.period.lastStartDate, Number(state.period.cycleDays) || 28));
  const reminderDate = computed(() => nextPeriodStart.value ? addDays(nextPeriodStart.value, -(Number(state.period.reminderAdvanceDays) || 0)) : '');
  const periodEndDate = computed(() => nextPeriodStart.value ? addDays(nextPeriodStart.value, Math.max(1, Number(state.period.periodDays) || 5) - 1) : '');
  const daysUntilPeriod = computed(() => nextPeriodStart.value ? daysBetween(todayKey(), nextPeriodStart.value) : null);
  const isInPeriod = computed(() => {
    if (!state.period.lastStartDate) return false;
    const elapsed = daysBetween(state.period.lastStartDate, todayKey());
    const cycle = Math.max(1, Number(state.period.cycleDays) || 28);
    const dayInCycle = ((elapsed % cycle) + cycle) % cycle;
    return dayInCycle < Math.max(1, Number(state.period.periodDays) || 5);
  });
  const togetherDays = computed(() => Math.max(0, Number(state.together.customBaseDays) || 0) + daysBetween(state.together.customBaseDate || todayKey(), todayKey()));

  function updateBirthday(value) {
    state.birthday = value || '';
    save();
  }

  function updatePeriod(patch) {
    Object.assign(state.period, patch);
    state.period.cycleDays = Math.max(1, Number(state.period.cycleDays) || 28);
    state.period.periodDays = Math.max(1, Number(state.period.periodDays) || 5);
    state.period.reminderAdvanceDays = Math.max(0, Number(state.period.reminderAdvanceDays) || 0);
    save();
  }

  function updateAiReminder(text) {
    state.period.aiReminderText = text || '';
    state.period.aiReminderUpdatedAt = Date.now();
    save();
  }

  function setTogetherDays(days) {
    state.together.customBaseDays = Math.max(0, Number(days) || 0);
    state.together.customBaseDate = todayKey();
    save();
  }

  function notesForDate(date) {
    return state.notes.filter(note => note.date === date).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function addNote(date, text) {
    const content = String(text || '').trim();
    if (!date || !content) return null;
    const note = { id: uid('company_note'), date, text: content, createdAt: Date.now() };
    state.notes.unshift(note);
    save();
    return note;
  }

  function deleteNote(noteId) {
    state.notes = state.notes.filter(note => note.id !== noteId);
    save();
  }

  function dateFlags(date) {
    const flags = [];
    const day = parseDate(date);
    if (!day) return flags;
    if (state.birthday) {
      const birthday = parseDate(state.birthday);
      if (birthday && birthday.getMonth() === day.getMonth() && birthday.getDate() === day.getDate()) flags.push('生日');
    }
    if (nextPeriodStart.value && date === nextPeriodStart.value) flags.push('预计');
    if (state.period.reminderEnabled && reminderDate.value && date === reminderDate.value) flags.push('提醒');
    if (nextPeriodStart.value && periodEndDate.value && date >= nextPeriodStart.value && date <= periodEndDate.value) flags.push('经期');
    if (state.notes.some(note => note.date === date)) flags.push('记录');
    return flags;
  }

  return {
    state,
    todayKey,
    addDays,
    daysBetween,
    nextPeriodStart,
    reminderDate,
    periodEndDate,
    daysUntilPeriod,
    isInPeriod,
    togetherDays,
    updateBirthday,
    updatePeriod,
    updateAiReminder,
    setTogetherDays,
    notesForDate,
    addNote,
    deleteNote,
    dateFlags,
  };
}
