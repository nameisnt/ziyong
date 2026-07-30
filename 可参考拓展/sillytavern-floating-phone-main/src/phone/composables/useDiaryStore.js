import { computed, reactive } from 'vue';

const DIARY_KEY = 'phone_diary_data';
const PIN_KEY = 'phone_diary_pin';

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaults() {
  return { entries: [] };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(DIARY_KEY) || 'null');
    return {
      ...defaults(),
      ...(saved || {}),
      entries: Array.isArray(saved?.entries) ? saved.entries : [],
    };
  } catch {
    return defaults();
  }
}

const state = reactive(loadData());

function save() {
  try { localStorage.setItem(DIARY_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('[DiaryStore] save failed:', error); }
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean).slice(0, 8);
  return String(value || '').split(/[，,\s]+/).map(item => item.trim()).filter(Boolean).slice(0, 8);
}

function normalizeEntry(payload = {}, existing = null) {
  const now = Date.now();
  return {
    id: existing?.id || uid('diary'),
    title: String(payload.title || '').trim() || '未命名日记',
    content: String(payload.content || ''),
    happenedToday: String(payload.happenedToday || ''),
    mood: String(payload.mood || '').trim(),
    weather: String(payload.weather || '').trim(),
    tags: normalizeTags(payload.tags),
    date: payload.date || todayKey(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    isPrivate: Boolean(payload.isPrivate),
    locked: Boolean(payload.isPrivate),
    roleComments: Array.isArray(existing?.roleComments) ? existing.roleComments : Array.isArray(payload.roleComments) ? payload.roleComments : [],
    memorySaved: Boolean(existing?.memorySaved || payload.memorySaved),
  };
}

export function useDiaryStore() {
  const sortedEntries = computed(() => [...state.entries].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.updatedAt || 0) - (a.updatedAt || 0)));
  const privateCount = computed(() => state.entries.filter(item => item.isPrivate).length);

  function addEntry(payload) {
    const entry = normalizeEntry(payload);
    state.entries.unshift(entry);
    save();
    return entry;
  }

  function updateEntry(id, patch) {
    const index = state.entries.findIndex(item => item.id === id);
    if (index < 0) return null;
    const entry = normalizeEntry({ ...state.entries[index], ...patch }, state.entries[index]);
    state.entries[index] = entry;
    save();
    return entry;
  }

  function deleteEntry(id) {
    state.entries = state.entries.filter(item => item.id !== id);
    save();
  }

  function addRoleComment(entryId, payload) {
    const entry = state.entries.find(item => item.id === entryId);
    if (!entry) return null;
    const comment = {
      id: uid('comment'),
      roleId: payload.roleId || '',
      roleName: payload.roleName || '角色',
      roleAvatar: payload.roleAvatar || '',
      content: String(payload.content || '').trim(),
      createdAt: Date.now(),
    };
    entry.roleComments.unshift(comment);
    entry.updatedAt = Date.now();
    save();
    return comment;
  }

  function markMemorySaved(entryId) {
    const entry = state.entries.find(item => item.id === entryId);
    if (!entry) return;
    entry.memorySaved = true;
    entry.updatedAt = Date.now();
    save();
  }

  function hasPin() {
    return Boolean(localStorage.getItem(PIN_KEY));
  }

  function setPin(pin) {
    const normalized = String(pin || '').trim();
    if (!/^\d{4}$/.test(normalized)) throw new Error('请输入 4 位数字密码');
    localStorage.setItem(PIN_KEY, normalized);
  }

  function verifyPin(pin) {
    return String(pin || '').trim() === String(localStorage.getItem(PIN_KEY) || '');
  }

  return {
    state,
    sortedEntries,
    privateCount,
    todayKey,
    addEntry,
    updateEntry,
    deleteEntry,
    addRoleComment,
    markMemorySaved,
    hasPin,
    setPin,
    verifyPin,
    save,
  };
}
