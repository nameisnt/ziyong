import { ref } from 'vue';

const CUR_KEY = 'api_current';
const PRESET_KEY = 'api_presets';

function normalizeBase(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

export async function fetchModelList(endpoint, key) {
  const base = normalizeBase(endpoint);
  if (!base) throw new Error('请填写端点');
  const r = await fetch(base + '/models', {
    headers: key ? { Authorization: 'Bearer ' + key } : {}
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  return (j.data || j.models || j || []).map(m => m.id || m.name || m).filter(Boolean);
}

export async function chatCompletion({ endpoint, key, model, messages, extra = {}, signal } = {}) {
  const base = normalizeBase(endpoint);
  const r = await fetch(base + '/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: 'Bearer ' + key } : {})
    },
    body: JSON.stringify({ model, messages, ...extra })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json();
}

const endpoint = ref('');
const apiKey = ref('');
const model = ref('');
const models = ref([]);
const presets = ref(loadPresets());

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]'); }
  catch { return []; }
}

function notifySettingsChanged() {
  window.dispatchEvent(new CustomEvent('phone-api-settings-changed'));
}

function saveCurrent() {
  localStorage.setItem(CUR_KEY, JSON.stringify({
    endpoint: endpoint.value.trim(),
    key: apiKey.value,
    model: model.value,
    models: models.value,
  }));
  endpoint.value = endpoint.value.trim();
  notifySettingsChanged();
}

function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(CUR_KEY) || 'null');
    if (j) {
      endpoint.value = j.endpoint || '';
      apiKey.value = j.key || '';
      model.value = j.model || '';
      models.value = j.models || [];
    }
  } catch {}
}

async function pullModels() {
  const list = await fetchModelList(endpoint.value, apiKey.value);
  models.value = list;
  if (list.length && !list.includes(model.value)) model.value = list[0];
  saveCurrent();
  return list;
}

function savePreset(name) {
  let arr = loadPresets();
  arr.unshift({
    name,
    endpoint: endpoint.value.trim(),
    key: apiKey.value,
    model: model.value,
    models: models.value,
  });
  if (arr.length > 5) arr = arr.slice(0, 5);
  localStorage.setItem(PRESET_KEY, JSON.stringify(arr));
  presets.value = arr;
}

function loadPreset(i) {
  const p = presets.value[i];
  if (!p) return;
  endpoint.value = p.endpoint || '';
  apiKey.value = p.key || '';
  models.value = p.models || [];
  model.value = p.model || '';
  saveCurrent();
}

function deletePreset(i) {
  const arr = loadPresets();
  arr.splice(i, 1);
  localStorage.setItem(PRESET_KEY, JSON.stringify(arr));
  presets.value = arr;
}

restore();

export function useApiSettings() {
  return {
    endpoint, apiKey, model, models, presets,
    saveCurrent, restore, pullModels,
    savePreset, loadPreset, deletePreset,
  };
}
