import { computed, ref } from 'vue';
import { getJson, setJson } from './usePersistentStorage.js';

const LEGACY_PET_KEY = 'phone_desktop_pet_v1';
const PET_SETTINGS_KEY = 'phone_desktop_pet_settings_v3';
const PET_ASSETS_KEY = 'phone_desktop_pet_assets_v3';
const PET_MESSAGES_KEY = 'phone_desktop_pet_messages_v3';
const PET_PRESET_KEY = 'phone_desktop_pet_presets_v3';
const LEGACY_SETTINGS_KEY = 'phone_desktop_pet_settings_v2';
const LEGACY_ASSETS_KEY = 'phone_desktop_pet_assets_v2';
const LEGACY_MESSAGES_KEY = 'phone_desktop_pet_messages_v2';
const LEGACY_PRESET_KEY = 'phone_desktop_pet_presets_v1';
const MESSAGE_LIMIT = 700;

const DEFAULT_ASSETS = {
  single: '',
  gif: '',
  idle: '',
  walk: '',
  happy: '',
  angry: '',
  shy: '',
  sad: '',
  thinking: '',
};

const DEFAULT_STATE = {
  enabled: false,
  roleId: '',
  imageMode: 'single',
  imageType: '',
  assets: { ...DEFAULT_ASSETS },
  position: { x: 120, y: 420 },
  size: 128,
  autoWalk: false,
  bubble: '',
  mood: 'idle',
  messages: [],
};

const state = ref(normalizeState({}));
const presets = ref([]);
const ready = ref(false);
const restorePromise = restore();

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function safeParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

async function restore() {
  ready.value = false;
  try {
    const legacy = safeParse(LEGACY_PET_KEY, null);
    const legacySettings = safeParse(LEGACY_SETTINGS_KEY, null);
    const legacyAssets = safeParse(LEGACY_ASSETS_KEY, null);
    const legacyMessages = safeParse(LEGACY_MESSAGES_KEY, null);
    const legacyPresets = safeParse(LEGACY_PRESET_KEY, null);

    const [settings, assets, messages, savedPresets] = await Promise.all([
      getJson(PET_SETTINGS_KEY, legacySettings || legacy || {}),
      getJson(PET_ASSETS_KEY, legacyAssets || legacy?.assets || {}),
      getJson(PET_MESSAGES_KEY, legacyMessages || legacy?.messages || []),
      getJson(PET_PRESET_KEY, legacyPresets || []),
    ]);

    state.value = normalizeState({ ...settings, assets, messages });
    presets.value = Array.isArray(savedPresets) ? savedPresets.map(normalizePreset).filter(Boolean) : [];

    Promise.all([persistSettings(), persistAssets(), persistMessages(), persistPresets()]).catch(error => {
      console.warn('[PetStore] migration persist failed:', error);
    });
  } catch (error) {
    console.warn('[PetStore] restore failed, using defaults:', error);
  } finally {
    ready.value = true;
  }
}

function normalizeState(saved) {
  const fallback = cloneDefault();
  const assets = saved?.assets && typeof saved.assets === 'object' ? saved.assets : {};
  const position = saved?.position && typeof saved.position === 'object' ? saved.position : fallback.position;
  return {
    ...fallback,
    ...(saved && typeof saved === 'object' ? saved : {}),
    enabled: Boolean(saved?.enabled),
    roleId: String(saved?.roleId || ''),
    imageMode: ['single', 'diff'].includes(saved?.imageMode) ? saved.imageMode : fallback.imageMode,
    imageType: ['png', 'gif', ''].includes(saved?.imageType) ? saved.imageType : '',
    assets: { ...fallback.assets, ...assets },
    position: {
      x: Number.isFinite(Number(position.x)) ? Number(position.x) : fallback.position.x,
      y: Number.isFinite(Number(position.y)) ? Number(position.y) : fallback.position.y,
    },
    size: Math.max(72, Math.min(240, Number(saved?.size) || fallback.size)),
    autoWalk: Boolean(saved?.autoWalk),
    bubble: String(saved?.bubble || ''),
    mood: ['idle', 'walk', 'happy', 'angry', 'shy', 'sad', 'thinking'].includes(saved?.mood) ? saved.mood : 'idle',
    messages: Array.isArray(saved?.messages) ? saved.messages.slice(-MESSAGE_LIMIT) : [],
  };
}

function normalizePreset(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: String(item.id || uid('pet_preset')),
    name: String(item.name || '未命名立绘'),
    imageMode: ['single', 'diff'].includes(item.imageMode) ? item.imageMode : 'single',
    imageType: ['png', 'gif', ''].includes(item.imageType) ? item.imageType : '',
    assets: { ...DEFAULT_ASSETS, ...(item.assets && typeof item.assets === 'object' ? item.assets : {}) },
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

function buildSettings(value = state.value) {
  const { assets, messages, ...settings } = value;
  return settings;
}

async function persistSettings() {
  await setJson(PET_SETTINGS_KEY, buildSettings(), { mirrorLocal: true });
}

async function persistAssets() {
  await setJson(PET_ASSETS_KEY, state.value.assets);
}

async function persistMessages() {
  await setJson(PET_MESSAGES_KEY, state.value.messages.slice(-MESSAGE_LIMIT), { mirrorLocal: true });
}

async function persistPresets() {
  await setJson(PET_PRESET_KEY, presets.value, { mirrorLocal: true });
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureReady() {
  await restorePromise;
}

export function usePetStore() {
  const currentImage = computed(() => {
    const assets = state.value.assets || {};
    if (state.value.imageType === 'gif') return assets.gif || '';
    if (state.value.imageMode === 'diff') return assets[state.value.mood] || assets.idle || assets.single || '';
    return assets.single || assets.idle || '';
  });

  const hasImage = computed(() => Boolean(currentImage.value));

  async function patch(patchValue = {}) {
    await ensureReady();
    state.value = normalizeState({ ...state.value, ...patchValue });
    await persistSettings();
  }

  async function setEnabled(enabled) { await patch({ enabled: Boolean(enabled) }); }
  async function setRole(roleId) { await patch({ roleId: roleId || '' }); }
  async function setPosition(position) { await patch({ position }); }
  async function setSize(size) { await patch({ size }); }
  async function setAutoWalk(autoWalk) { await patch({ autoWalk: Boolean(autoWalk) }); }
  async function setBubble(text) { await patch({ bubble: String(text || '') }); }
  async function setMood(mood) { await patch({ mood }); }

  async function setImage(payload = {}) {
    await ensureReady();
    const assets = { ...state.value.assets, ...(payload.assets || {}) };
    state.value = normalizeState({
      ...state.value,
      imageType: payload.imageType ?? state.value.imageType,
      imageMode: payload.imageMode ?? state.value.imageMode,
      assets,
      mood: payload.mood || state.value.mood || 'idle',
    });
    await Promise.all([persistSettings(), persistAssets()]);
  }

  async function setAsset(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_ASSETS, key)) return;
    await setImage({ assets: { [key]: value || '' } });
  }

  async function addMessage(payload) {
    await ensureReady();
    const message = {
      id: uid('pet_msg'),
      senderType: payload.senderType === 'pet' ? 'pet' : 'user',
      text: String(payload.text || ''),
      mood: payload.mood || '',
      createdAt: Date.now(),
    };
    state.value = normalizeState({ ...state.value, messages: [...state.value.messages, message].slice(-MESSAGE_LIMIT) });
    await persistMessages();
    return message;
  }

  async function clearMessages() {
    await ensureReady();
    state.value = normalizeState({ ...state.value, messages: [], bubble: '' });
    await Promise.all([persistSettings(), persistMessages()]);
  }

  async function saveCurrentPreset(name = '') {
    await ensureReady();
    const preset = normalizePreset({
      id: uid('pet_preset'),
      name: name.trim() || `立绘预设 ${presets.value.length + 1}`,
      imageMode: state.value.imageMode,
      imageType: state.value.imageType,
      assets: state.value.assets,
      createdAt: Date.now(),
    });
    if (!preset?.imageType) return null;
    presets.value = [preset, ...presets.value].slice(0, 20);
    await persistPresets();
    return preset;
  }

  async function loadPreset(presetId) {
    await ensureReady();
    const preset = presets.value.find(item => item.id === presetId);
    if (!preset) return null;
    await setImage({ imageType: preset.imageType, imageMode: preset.imageMode, assets: preset.assets, mood: 'idle' });
    return preset;
  }

  async function deletePreset(presetId) {
    await ensureReady();
    presets.value = presets.value.filter(item => item.id !== presetId);
    await persistPresets();
  }

  return {
    state,
    presets,
    ready,
    currentImage,
    hasImage,
    restore: ensureReady,
    patch,
    setEnabled,
    setRole,
    setImage,
    setAsset,
    setPosition,
    setSize,
    setAutoWalk,
    setBubble,
    setMood,
    addMessage,
    clearMessages,
    saveCurrentPreset,
    loadPreset,
    deletePreset,
  };
}
