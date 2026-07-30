import { computed, reactive } from 'vue';

const SCHEDULE_KEY = 'phone_schedule_items_v1';

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

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const state = reactive({ items: loadItems() });

function save() {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(state.items)); }
  catch (error) { console.warn('[ScheduleStore] save failed:', error); }
}

function normalizePayload(payload = {}) {
  return {
    title: String(payload.title || '').trim(),
    detail: String(payload.detail || '').trim(),
    date: payload.date || todayKey(),
    time: payload.time || '',
    type: payload.type || 'task',
    priority: payload.priority || 'normal',
    done: Boolean(payload.done),
    source: payload.source || 'manual',
  };
}

export function useScheduleStore() {
  const sortedSchedules = computed(() => [...state.items].sort((a, b) => {
    const dateSort = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateSort) return dateSort;
    return String(a.time || '99:99').localeCompare(String(b.time || '99:99'));
  }));
  const todaySchedules = computed(() => schedulesByDate(todayKey()));
  const upcomingSchedules = computed(() => schedulesBetween(todayKey(), addDays(todayKey(), 7)));

  function addSchedule(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized.title) return null;
    const now = Date.now();
    const item = { id: uid('schedule'), ...normalized, createdAt: now, updatedAt: now };
    state.items.unshift(item);
    save();
    return item;
  }

  function updateSchedule(id, patch) {
    const item = state.items.find(entry => entry.id === id);
    if (!item || item.source !== 'manual') return null;
    Object.assign(item, normalizePayload({ ...item, ...patch }), { updatedAt: Date.now() });
    save();
    return item;
  }

  function deleteSchedule(id) {
    state.items = state.items.filter(item => item.id !== id);
    save();
  }

  function toggleDone(id) {
    const item = state.items.find(entry => entry.id === id);
    if (!item || item.source !== 'manual') return null;
    item.done = !item.done;
    item.updatedAt = Date.now();
    save();
    return item;
  }

  function schedulesByDate(date) {
    return sortedSchedules.value.filter(item => item.date === date);
  }

  function schedulesBetween(start, end) {
    return sortedSchedules.value.filter(item => item.date >= start && item.date <= end);
  }

  function schedulesForPrompt() {
    const today = todayKey();
    return {
      today: schedulesByDate(today).slice(0, 12),
      upcoming: schedulesBetween(addDays(today, 1), addDays(today, 7)).slice(0, 16),
    };
  }

  return {
    state,
    sortedSchedules,
    todaySchedules,
    upcomingSchedules,
    todayKey,
    addDays,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleDone,
    schedulesByDate,
    schedulesBetween,
    schedulesForPrompt,
  };
}
