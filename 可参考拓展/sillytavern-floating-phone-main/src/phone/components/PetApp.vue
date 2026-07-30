<template>
  <section class="pet-app">
    <header class="pet-top">
      <button class="ghost-btn" type="button" @click="$emit('close')">返回</button>
      <h1>桌宠</h1>
      <span class="pet-status" :class="{ on: pet.state.value.enabled }">{{ pet.state.value.enabled ? '已开启' : '未开启' }}</span>
    </header>

    <main v-if="!pet.ready.value" class="pet-content">
      <section class="pet-card"><p>正在读取桌宠本地数据...</p></section>
    </main>
    <main v-else class="pet-content">
      <section class="pet-card enable-card">
        <div>
          <span>桌宠开关</span>
          <strong>{{ pet.state.value.enabled ? '显示在屏幕上' : '暂不显示' }}</strong>
          <p>开启后桌宠会浮在整个屏幕上，不受手机容器限制。</p>
        </div>
        <label class="switch">
          <input type="checkbox" :checked="pet.state.value.enabled" @change="saveSetting(() => pet.setEnabled($event.target.checked))" />
          <i></i>
        </label>
      </section>

      <section class="pet-card control-card">
        <div class="control-row">
          <div>
            <span>桌宠尺寸</span>
            <strong>{{ pet.state.value.size }}px</strong>
          </div>
          <input class="size-range" type="range" min="72" max="240" step="4" :value="pet.state.value.size" @change="saveSetting(() => pet.setSize($event.target.value))" />
        </div>
        <div class="control-row walk-row">
          <div>
            <span>自主行走</span>
            <strong>{{ pet.state.value.autoWalk ? '已开启' : '默认不行走' }}</strong>
            <p>开启后桌宠会在屏幕上自主移动，并优先显示走路差分。</p>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="pet.state.value.autoWalk" @change="saveSetting(() => pet.setAutoWalk($event.target.checked))" />
            <i></i>
          </label>
        </div>
      </section>

      <section class="pet-card">
        <header class="card-head">
          <div>
            <span>桌宠角色</span>
            <strong>来自信息 App</strong>
          </div>
        </header>
        <div v-if="roles.length" class="role-list">
          <button
            v-for="role in roles"
            :key="role.id"
            type="button"
            class="role-item"
            :class="{ active: role.id === pet.state.value.roleId }"
            @click="saveSetting(() => pet.setRole(role.id))"
          >
            <div class="role-avatar" :style="imageStyle(role.avatar)"><span v-if="!role.avatar">{{ role.avatarText || role.name.slice(0, 1) }}</span></div>
            <div>
              <strong>{{ role.name }}</strong>
              <span>{{ sourceLabel(role.source) }}</span>
            </div>
            <em>{{ role.id === pet.state.value.roleId ? '已选择' : '选择' }}</em>
          </button>
        </div>
        <p v-else class="empty-text">还没有可用角色。请先在信息 App 中添加角色。</p>
      </section>

      <section class="pet-card">
        <header class="card-head">
          <div>
            <span>桌宠形象</span>
            <strong>PNG / GIF</strong>
          </div>
          <label class="upload-main">
            上传主图
            <input type="file" accept="image/png,image/gif,.png,.gif" @change="uploadMainImage" />
          </label>
        </header>

        <div v-if="notice" class="notice" :class="noticeType">{{ notice }}</div>

        <div class="preview-row">
          <div class="pet-preview">
            <img v-if="pet.currentImage.value" :src="pet.currentImage.value" alt="桌宠预览" />
            <span v-else>暂无图片</span>
          </div>
          <div class="preview-copy">
            <strong>{{ imageSummary }}</strong>
            <p>GIF 会直接播放；PNG 可单张展示，也可上传不同动作和表情差分。</p>
          </div>
        </div>

        <div v-if="pet.state.value.imageType === 'png'" class="mode-box">
          <label :class="{ active: pet.state.value.imageMode === 'single' }">
            <input type="radio" name="pet-image-mode" value="single" :checked="pet.state.value.imageMode === 'single'" @change="saveSetting(() => pet.patch({ imageMode: 'single' }))" />
            仅单张 PNG
          </label>
          <label :class="{ active: pet.state.value.imageMode === 'diff' }">
            <input type="radio" name="pet-image-mode" value="diff" :checked="pet.state.value.imageMode === 'diff'" @change="saveSetting(() => pet.patch({ imageMode: 'diff' }))" />
            使用差分图
          </label>
        </div>
      </section>

      <section v-if="pet.state.value.imageType === 'png'" class="pet-card">
        <header class="card-head">
          <div>
            <span>PNG 差分</span>
            <strong>可选上传</strong>
          </div>
        </header>
        <div class="diff-grid">
          <label v-for="slot in diffSlots" :key="slot.key" class="diff-slot" :class="{ filled: pet.state.value.assets[slot.key] }">
            <input type="file" accept="image/png,.png" @change="uploadDiffImage(slot.key, $event)" />
            <img v-if="pet.state.value.assets[slot.key]" :src="pet.state.value.assets[slot.key]" :alt="slot.label" />
            <span v-else>{{ slot.label }}</span>
            <em>{{ slot.label }}</em>
          </label>
        </div>
      </section>

      <section class="pet-card preset-card">
        <header class="card-head">
          <div>
            <span>立绘预设</span>
            <strong>保存 / 一键载入</strong>
          </div>
          <button class="save-preset-btn" type="button" :disabled="!pet.hasImage.value" @click="savePreset">保存当前</button>
        </header>
        <div v-if="pet.presets.value.length" class="preset-list">
          <article v-for="preset in pet.presets.value" :key="preset.id" class="preset-item">
            <div class="preset-preview">
              <img v-if="presetPreview(preset)" :src="presetPreview(preset)" :alt="preset.name" />
            </div>
            <div>
              <strong>{{ preset.name }}</strong>
              <span>{{ preset.imageType.toUpperCase() }} · {{ preset.imageMode === 'diff' ? '差分' : '单图' }}</span>
            </div>
            <button type="button" @click="loadPreset(preset.id)">载入</button>
            <button class="danger" type="button" @click="deletePreset(preset.id)">删除</button>
          </article>
        </div>
        <p v-else class="empty-text">暂无立绘预设。上传立绘后点击“保存当前”，下次进入可直接载入。</p>
      </section>

      <section class="pet-card note-card">
        <strong>独立聊天</strong>
        <p>桌宠会读取所选角色人设和角色 App 中已应用的世界书，但聊天记录只保存在桌宠内部，不会写入信息 App 或记忆 App。</p>
        <button type="button" :disabled="!pet.state.value.messages.length" @click="clearMessages">清空桌宠聊天</button>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMessageStore } from '../composables/useMessageStore.js';
import { usePetStore } from '../composables/usePetStore.js';

defineEmits(['close']);

const pet = usePetStore();
const messageStore = useMessageStore();
const roles = messageStore.roles;
const notice = ref('');
const noticeType = ref('info');

const diffSlots = [
  { key: 'idle', label: '站立' },
  { key: 'walk', label: '走路' },
  { key: 'happy', label: '开心' },
  { key: 'angry', label: '生气' },
  { key: 'shy', label: '害羞' },
  { key: 'sad', label: '难过' },
  { key: 'thinking', label: '思考' },
];

const imageSummary = computed(() => {
  if (pet.state.value.imageType === 'gif') return '当前使用 GIF 动图';
  if (pet.state.value.imageType === 'png' && pet.state.value.imageMode === 'diff') return '当前使用 PNG 差分';
  if (pet.state.value.imageType === 'png') return '当前使用单张 PNG';
  return '请上传 PNG 或 GIF';
});

async function uploadMainImage(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !validateImage(file)) return;
  const dataUrl = await fileToDataUrl(file);
  if (isGif(file)) {
    await pet.setImage({ imageType: 'gif', imageMode: 'single', assets: { gif: dataUrl } });
    setNotice('已上传 GIF 桌宠形象。');
    return;
  }
  await pet.setImage({ imageType: 'png', imageMode: 'single', assets: { single: dataUrl, idle: pet.state.value.assets.idle || dataUrl } });
  setNotice('已上传 PNG 桌宠形象，可继续添加差分图。');
}

async function uploadDiffImage(key, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !validateImage(file, true)) return;
  const dataUrl = await fileToDataUrl(file);
  await pet.setImage({ imageType: 'png', imageMode: 'diff', assets: { [key]: dataUrl } });
  setNotice(`已上传${diffSlots.find(slot => slot.key === key)?.label || ''}差分。`);
}

function validateImage(file, pngOnly = false) {
  const name = file.name.toLowerCase();
  const isJpg = file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  if (isJpg) {
    setNotice('JPG无透明底，不适合作为桌宠图片', 'error');
    return false;
  }
  if (pngOnly && !isPng(file)) {
    setNotice('差分图仅支持 PNG 格式', 'error');
    return false;
  }
  if (!isPng(file) && !isGif(file)) {
    setNotice('仅支持 PNG 或 GIF 格式', 'error');
    return false;
  }
  return true;
}

function isPng(file) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

function isGif(file) {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setNotice(text, type = 'info') {
  notice.value = text;
  noticeType.value = type;
}

async function savePreset() {
  try {
    const preset = await pet.saveCurrentPreset();
    setNotice(preset ? `已保存立绘预设：${preset.name}` : '请先上传立绘再保存', preset ? 'info' : 'error');
  } catch (error) {
    setNotice(`保存失败：${error.message || '本地存储不可用'}`, 'error');
  }
}

async function loadPreset(id) {
  try {
    const preset = await pet.loadPreset(id);
    setNotice(preset ? `已载入立绘预设：${preset.name}` : '没有找到该预设', preset ? 'info' : 'error');
  } catch (error) {
    setNotice(`载入失败：${error.message || '本地存储不可用'}`, 'error');
  }
}

async function deletePreset(id) {
  try {
    await pet.deletePreset(id);
    setNotice('已删除立绘预设。');
  } catch (error) {
    setNotice(`删除失败：${error.message || '本地存储不可用'}`, 'error');
  }
}

async function clearMessages() {
  try {
    await pet.clearMessages();
    setNotice('已清空桌宠聊天。');
  } catch (error) {
    setNotice(`清空失败：${error.message || '本地存储不可用'}`, 'error');
  }
}

async function saveSetting(action) {
  try { await action(); }
  catch (error) { setNotice(`保存失败：${error.message || '本地存储不可用'}`, 'error'); }
}

function presetPreview(preset) {
  if (preset.imageType === 'gif') return preset.assets.gif;
  return preset.assets.idle || preset.assets.single || preset.assets.walk || preset.assets.happy || '';
}

function imageStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}

function sourceLabel(source) {
  return ({ custom: '自定义', tavern: '酒馆', 'role-app': '角色 App' })[source] || source || '角色';
}
</script>

<style scoped>
.pet-app { position:absolute; inset:0; z-index:20; display:flex; flex-direction:column; background:#f6f7f9; color:#111; overflow:hidden; }
.pet-top { display:grid; grid-template-columns:64px minmax(0,1fr) 68px; align-items:center; gap:8px; padding:56px 16px 12px; background:#fff; border-bottom:1px solid #e8e8e8; }
.pet-top h1 { margin:0; text-align:center; font-size:18px; }
.ghost-btn { border:0; background:transparent; color:#1677ff; font-size:14px; }
.pet-status { justify-self:end; padding:5px 9px; border-radius:999px; background:#f1f2f4; color:#777; font-size:11px; }
.pet-status.on { background:#e8f6ee; color:#148b4b; }
.pet-content { flex:1; min-height:0; padding:14px; overflow-y:auto; }
.pet-card { margin-bottom:12px; padding:14px; border:1px solid #ececef; border-radius:20px; background:#fff; box-shadow:0 8px 22px rgba(0,0,0,.06); }
.enable-card { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; }
.control-card { display:grid; gap:13px; }
.control-row { display:grid; grid-template-columns:minmax(0,1fr) 142px; align-items:center; gap:12px; }
.control-row.walk-row { grid-template-columns:minmax(0,1fr) auto; padding-top:12px; border-top:1px solid #f0f0f0; }
.size-range { width:100%; accent-color:#111; }
.pet-card span { display:block; color:#777; font-size:12px; }
.pet-card strong { display:block; margin-top:2px; font-size:15px; }
.pet-card p { margin:6px 0 0; color:#777; font-size:12px; line-height:1.5; }
.switch { position:relative; width:50px; height:30px; }
.switch input { position:absolute; opacity:0; pointer-events:none; }
.switch i { display:block; width:100%; height:100%; border-radius:999px; background:#d9dce2; transition:background .2s; }
.switch i::after { content:""; position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.16); transition:transform .2s; }
.switch input:checked + i { background:#22a66a; }
.switch input:checked + i::after { transform:translateX(20px); }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
.upload-main { flex:0 0 auto; padding:8px 11px; border-radius:999px; background:#111; color:#fff; font-size:12px; }
.upload-main input, .diff-slot input { display:none; }
.role-list { display:grid; gap:8px; }
.role-item { display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:center; gap:10px; width:100%; padding:9px; border:1px solid #ececef; border-radius:16px; background:#fafafa; color:#111; text-align:left; }
.role-item.active { border-color:#111; background:#f2f2f2; }
.role-avatar { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; background:#dfe3ea; background-size:cover; background-position:center; color:#555; font-weight:700; }
.role-item em { color:#777; font-style:normal; font-size:11px; }
.empty-text { margin:0; padding:12px; border-radius:14px; background:#f7f7f7; }
.notice { margin-bottom:12px; padding:9px 11px; border-radius:14px; background:#eef5ff; color:#1666b7; font-size:12px; }
.notice.error { background:#fff1f0; color:#c2342c; }
.preview-row { display:grid; grid-template-columns:92px minmax(0,1fr); align-items:center; gap:12px; }
.pet-preview { display:grid; place-items:center; width:92px; height:92px; border-radius:22px; background:#f2f3f5; overflow:hidden; color:#999; font-size:12px; }
.pet-preview img { max-width:86px; max-height:86px; object-fit:contain; }
.mode-box { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
.mode-box label { display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:1px solid #ececef; border-radius:14px; background:#fafafa; color:#555; font-size:12px; }
.mode-box label.active { border-color:#111; color:#111; background:#f2f2f2; }
.diff-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
.diff-slot { display:flex; flex-direction:column; align-items:center; gap:6px; padding:9px 6px; border:1px dashed #d5d7dc; border-radius:16px; background:#fafafa; color:#777; font-size:12px; }
.diff-slot.filled { border-style:solid; background:#f4f6f8; color:#111; }
.diff-slot img { width:52px; height:52px; object-fit:contain; }
.diff-slot > span { display:grid; place-items:center; width:52px; height:52px; border-radius:14px; background:#edf0f3; }
.diff-slot em { color:#777; font-style:normal; font-size:11px; }
.save-preset-btn { flex:0 0 auto; padding:8px 11px; border:0; border-radius:999px; background:#111; color:#fff; font-size:12px; }
.save-preset-btn:disabled { opacity:.45; }
.preset-list { display:grid; gap:8px; }
.preset-item { display:grid; grid-template-columns:44px minmax(0,1fr) auto auto; align-items:center; gap:8px; padding:9px; border:1px solid #ececef; border-radius:16px; background:#fafafa; }
.preset-preview { display:grid; place-items:center; width:44px; height:44px; border-radius:13px; background:#edf0f3; overflow:hidden; }
.preset-preview img { max-width:40px; max-height:40px; object-fit:contain; }
.preset-item button { border:0; border-radius:999px; padding:7px 9px; background:#111; color:#fff; font-size:11px; }
.preset-item button.danger { background:#f0f1f3; color:#b42318; }
.note-card button { margin-top:10px; padding:8px 12px; border:0; border-radius:999px; background:#f0f1f3; color:#333; }
.note-card button:disabled { opacity:.45; }
</style>
