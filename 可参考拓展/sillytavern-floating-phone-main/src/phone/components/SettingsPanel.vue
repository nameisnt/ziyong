<template>
  <div class="appearance-panel" :class="{ show }">
    <button class="ap-close" @click="close">×</button>
    <div class="ap-title">设置</div>

    <div class="ap-section">
      <div class="ap-label">主屏幕壁纸</div>
      <div class="ap-btn-row">
        <button class="ap-btn" @click="triggerUpload">本地上传</button>
        <button class="ap-btn accent" @click="resetWallpaper">恢复默认</button>
      </div>
      <input type="file" ref="fileInput" style="display:none"
             accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/*"
             @change="onFile" />
      <div class="ap-label" style="margin-top:14px">历史壁纸（最多 5 张）</div>
      <div class="wall-history" v-if="history.length">
        <div v-for="(u, i) in history" :key="i" class="wall-thumb"
             :style="{ backgroundImage: `url('${u}')` }"
             @click="setWallpaper(u)">
          <button class="del" @click.stop="removeHistory(i)">×</button>
        </div>
      </div>
      <div v-else class="wall-empty">尚无历史壁纸</div>
    </div>

    <div class="ap-section">
      <div class="ap-label">手机壳颜色</div>
      <div class="ap-shells">
        <div v-for="p in shellPresets" :key="p.color" class="shell-opt"
             :class="{ active: shellColor === p.color }"
             @click="applyShell(p.color)">
          <div class="shell-dot" :style="{ background: p.color }"></div>
          <div class="shell-name">{{ p.name }}</div>
        </div>
        <div class="shell-opt custom" :class="{ active: !isPresetColor }">
          <div class="shell-dot" style="background:conic-gradient(from 0deg,#ff3b30,#ffcc00,#34c759,#007aff,#af52de,#ff3b30); overflow:hidden">
            <input type="color" v-model="customColor" @input="applyShell(customColor)" />
          </div>
          <div class="shell-name">自定义</div>
        </div>
      </div>
    </div>

    <div class="ap-title" style="margin-top:8px;font-size:18px">API 接入</div>

    <div class="ap-section">
      <div class="ap-label">自定义端点（基础 URL）</div>
      <input class="ap-input" v-model="endpoint" @blur="saveCurrent"
             placeholder="https://api.openai.com" />
      <div class="ap-hint">不行？在 URL 末尾添加 /v1 试试！/chat/completions 的后缀会被自动补全。</div>

      <div class="ap-label" style="margin-top:10px">自定义 API 密钥</div>
      <input class="ap-input" type="password" v-model="apiKey" @blur="saveCurrent"
             placeholder="sk-..." />

      <div class="ap-btn-row">
        <button class="ap-btn" @click="onPullModels" :disabled="pulling">
          {{ pulling ? '拉取中…' : '拉取模型' }}
        </button>
      </div>

      <div class="ap-label" style="margin-top:10px">选择模型</div>
      <select class="ap-select" v-model="model" @change="saveCurrent">
        <option v-if="!models.length" value="">（尚未拉取）</option>
        <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
      </select>

      <div class="ap-btn-row" style="margin-top:4px">
        <button class="ap-btn accent" @click="onSaveCurrent">{{ savedTip || '保存当前端点' }}</button>
        <button class="ap-btn" @click="onSavePreset">保存为预设</button>
      </div>
    </div>

    <div class="ap-section">
      <div class="ap-label">API 预设（最多 5 套）</div>
      <div class="preset-list" v-if="presets.length">
        <div v-for="(p, i) in presets" :key="i" class="preset-item">
          <span class="name" :title="p.endpoint">{{ p.name }}</span>
          <button class="load" @click="loadPreset(i)">载入</button>
          <button @click="deletePreset(i)">删除</button>
        </div>
      </div>
      <div v-else class="wall-empty">尚无预设</div>
    </div>

    <div class="ap-title" style="margin-top:8px;font-size:18px">真实搜索 API</div>

    <div class="ap-section">
      <div class="ap-label">Google Custom Search</div>
      <input class="ap-input" type="password" v-model="searchGoogleKey" @blur="saveSearchSettings" placeholder="Google API Key" />
      <input class="ap-input" v-model="searchGoogleCx" @blur="saveSearchSettings" placeholder="Google CX / 搜索引擎 ID" />

      <div class="ap-label" style="margin-top:10px">Bing Web Search</div>
      <input class="ap-input" type="password" v-model="searchBingKey" @blur="saveSearchSettings" placeholder="Bing Search API Key" />

      <div class="ap-label" style="margin-top:10px">百度搜索 API</div>
      <input class="ap-input" v-model="searchBaiduEndpoint" @blur="saveSearchSettings" placeholder="你的百度搜索 API 端点，支持 {q} 占位" />
      <input class="ap-input" type="password" v-model="searchBaiduKey" @blur="saveSearchSettings" placeholder="百度 API Key / 代理密钥（可选）" />
      <div class="ap-hint">百度需要你自己的搜索 API 或代理端点，返回 items/results/data 数组即可。</div>

      <div class="ap-btn-row" style="margin-top:8px">
        <button class="ap-btn accent" @click="onSaveSearchSettings">{{ searchSavedTip || '保存真实搜索 API' }}</button>
      </div>
    </div>

    <div class="ap-title" style="margin-top:8px;font-size:18px">数据管理</div>

    <div class="ap-section">
      <div class="ap-label">主屏幕图标替换</div>
      <div class="ap-hint">只能替换主屏幕这些图标：设置、角色、偷窥、网抑云、信息、拼夕夕、日程、查岗、浏览器、小剧场、陪伴、记忆、斗地主、日记、桌宠。支持 PNG / JPG。</div>
      <div class="icon-replace-list">
        <div v-for="app in iconApps" :key="app.id" class="icon-replace-item">
          <div class="icon-preview" :style="{ backgroundImage: `url('${iconFor(app.id, app.url)}')` }"></div>
          <div class="icon-meta">
            <strong>{{ app.name }}</strong>
            <span>{{ iconFor(app.id, app.url) === app.url ? '默认图标' : '已自定义' }}</span>
          </div>
          <label class="icon-upload-btn">
            替换
            <input type="file" accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg" @change="onIconFile(app.id, $event)" />
          </label>
          <button class="icon-reset-btn" type="button" :disabled="iconFor(app.id, app.url) === app.url" @click="resetIcon(app.id)">重置</button>
        </div>
      </div>
    </div>

    <div class="ap-section">
      <div class="ap-label">小手机全部数据</div>
      <div class="ap-hint">包含壁纸、手机壳、API 设置、角色、消息、余额、礼物、购物、陪伴、记忆等所有本地数据。</div>
      <div class="ap-btn-row data-actions" style="margin-top:10px">
        <button class="ap-btn" @click="onExportData">导出数据</button>
        <button class="ap-btn" @click="triggerDataImport">导入数据</button>
        <button class="ap-btn danger" @click="onClearData">清空初始化</button>
      </div>
      <input ref="dataFileInput" type="file" style="display:none" accept="application/json,.json" @change="onDataFile" />
      <div v-if="dataTip" class="ap-hint data-tip">{{ dataTip }}</div>
    </div>

    <ImageCropper v-model="cropping" :src="cropSrc" @confirm="onCropConfirm" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ImageCropper from './ImageCropper.vue';
import { useWallpaper } from '../composables/useWallpaper.js';
import { useShellColor } from '../composables/useShellColor.js';
import { useApiSettings } from '../composables/useApiSettings.js';
import { clearPhoneData, exportPhoneDataFile, importPhoneDataText } from '../composables/usePhoneDataManager.js';
import { useSearchApiSettings } from '../composables/useSearchApiSettings.js';
import { CUSTOMIZABLE_APPS, useAppIcons } from '../composables/useAppIcons.js';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['update:show']);
function close() { emit('update:show', false); }

const { history, setWallpaper, resetWallpaper, addHistory, removeHistory } = useWallpaper();
const { current: shellColor, apply: applyShellRaw, PRESETS: shellPresets } = useShellColor();
const appIcons = useAppIcons();

const customColor = ref(shellColor.value);
const isPresetColor = computed(() => shellPresets.some(p => p.color === shellColor.value));
function applyShell(c) { applyShellRaw(c); customColor.value = c; }

const fileInput = ref(null);
const cropping = ref(false);
const cropSrc = ref('');
function triggerUpload() { fileInput.value && (fileInput.value.value = '', fileInput.value.click()); }
function onFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { cropSrc.value = ev.target.result; cropping.value = true; };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function onCropConfirm(dataUrl) {
  setWallpaper(dataUrl);
  addHistory(dataUrl);
}

const {
  endpoint, apiKey, model, models, presets,
  saveCurrent, pullModels, savePreset, loadPreset, deletePreset,
} = useApiSettings();

const pulling = ref(false);
const savedTip = ref('');
async function onPullModels() {
  pulling.value = true;
  try { await pullModels(); }
  catch (e) { alert('拉取失败：' + e.message + '\n提示：端点末尾试试加 /v1'); }
  finally { pulling.value = false; }
}
function onSaveCurrent() {
  saveCurrent();
  savedTip.value = '已保存';
  setTimeout(() => savedTip.value = '', 1200);
}
function onSavePreset() {
  if (!endpoint.value.trim()) { alert('请先填写端点'); return; }
  const name = prompt('预设名称：', '预设' + (presets.value.length + 1));
  if (name) savePreset(name);
}

const searchSettings = useSearchApiSettings();
const searchGoogleKey = searchSettings.googleKey;
const searchGoogleCx = searchSettings.googleCx;
const searchBingKey = searchSettings.bingKey;
const searchBaiduEndpoint = searchSettings.baiduEndpoint;
const searchBaiduKey = searchSettings.baiduKey;
const searchSavedTip = ref('');

function saveSearchSettings() { searchSettings.save(); }
function onSaveSearchSettings() {
  searchSettings.save();
  searchSavedTip.value = '已保存';
  setTimeout(() => searchSavedTip.value = '', 1200);
}

const dataFileInput = ref(null);
const dataTip = ref('');

const iconApps = CUSTOMIZABLE_APPS;

function onExportData() {
  try {
    exportPhoneDataFile();
    dataTip.value = '已导出当前小手机全部数据。';
  } catch (error) {
    dataTip.value = error.message || '导出失败';
  }
}

function triggerDataImport() {
  if (!confirm('导入会覆盖当前小手机全部数据，是否继续？')) return;
  if (dataFileInput.value) {
    dataFileInput.value.value = '';
    dataFileInput.value.click();
  }
}

function onDataFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      importPhoneDataText(String(ev.target.result || ''));
      dataTip.value = '导入完成，页面即将刷新。';
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      dataTip.value = error.message || '导入失败';
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function onClearData() {
  if (!confirm('这会清空小手机全部本地数据并恢复初始化，是否继续？')) return;
  if (!confirm('再次确认：清空后如果没有导出备份，将无法恢复。')) return;
  clearPhoneData();
  dataTip.value = '已清空，页面即将刷新。';
  setTimeout(() => window.location.reload(), 500);
}

function iconFor(id, fallback) {
  return appIcons.iconFor(id, fallback);
}

async function resetIcon(id) {
  try {
    await appIcons.resetIcon(id);
    dataTip.value = '已重置图标。';
  } catch (error) {
    dataTip.value = `重置失败：${error.message || '本地存储不可用'}`;
  }
}

async function onIconFile(appId, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const name = file.name.toLowerCase();
  const isJpg = file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  const isPng = file.type === 'image/png' || name.endsWith('.png');
  if (!isJpg && !isPng) {
    dataTip.value = '图标仅支持 PNG 或 JPG。';
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  try {
    await appIcons.setIcon(appId, dataUrl);
    dataTip.value = `已替换 ${iconApps.find(app => app.id === appId)?.name || '图标'}。`;
  } catch (error) {
    dataTip.value = `图标保存失败：${error.message || '本地存储不可用'}`;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.appearance-panel {
  position:absolute; inset:0;
  background:#161618;
  border-radius:40px;
  z-index:100;
  padding:60px 22px 30px;
  color:#fff;
  opacity:0; pointer-events:none;
  transform:scale(1.05);
  transition:opacity .35s, transform .35s;
  overflow-y:auto;
}
.appearance-panel.show { opacity:1; pointer-events:auto; transform:scale(1); }
.appearance-panel::-webkit-scrollbar { width:0; }
.ap-close {
  position:absolute; top:16px; right:18px;
  width:32px; height:32px; border-radius:50%;
  background:rgba(255,255,255,.12);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; font-size:18px; color:#fff; border:none;
  font-family:inherit;
}
.ap-title { font-size:22px; font-weight:600; margin-bottom:20px; letter-spacing:.5px; }
.ap-section {
  background:rgba(255,255,255,.05);
  border:.5px solid rgba(255,255,255,.08);
  border-radius:16px; padding:14px; margin-bottom:14px;
}
.ap-label { font-size:13px; color:rgba(255,255,255,.7); margin-bottom:10px; letter-spacing:.5px; }
.ap-hint { font-size:10px; color:rgba(255,255,255,.45); margin-top:6px; line-height:1.5; }
.ap-btn-row { display:flex; gap:8px; flex-wrap:wrap; }
.ap-btn {
  flex:1; min-width:0; padding:9px 10px;
  background:rgba(255,255,255,.1);
  border:.5px solid rgba(255,255,255,.15);
  border-radius:10px; color:#fff; font-size:12px; cursor:pointer;
  font-family:inherit; transition:.2s;
}
.ap-btn:hover { background:rgba(255,255,255,.18); }
.ap-btn.accent { background:#ff3b30; border-color:#ff3b30; }
.ap-btn.accent:hover { background:#e0322a; }
.ap-btn.danger { background:#7f1d1d; border-color:#b91c1c; color:#fff; }
.ap-btn.danger:hover { background:#991b1b; }
.data-actions .ap-btn { min-width:88px; }
.data-tip { color:rgba(255,255,255,.72); }
.ap-shells { display:flex; gap:10px; justify-content:space-around; flex-wrap:wrap; }
.shell-opt { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; }
.shell-dot {
  width:36px; height:36px; border-radius:50%;
  border:2px solid rgba(255,255,255,.2);
  transition:.2s; position:relative;
}
.shell-opt.active .shell-dot { border-color:#ff3b30; box-shadow:0 0 0 2px rgba(255,59,48,.3); }
.shell-name { font-size:10px; color:rgba(255,255,255,.8); }
.shell-opt.custom input[type=color] {
  position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; border:none; padding:0;
}
.wall-history { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
.wall-thumb {
  width:48px; height:96px; border-radius:8px;
  background-size:cover; background-position:center;
  border:1px solid rgba(255,255,255,.15);
  cursor:pointer; position:relative;
  transition:.15s;
}
.wall-thumb:hover { transform:scale(1.05); border-color:#ff3b30; }
.wall-thumb .del {
  position:absolute; top:-4px; right:-4px;
  width:16px; height:16px; border-radius:50%;
  background:#ff3b30; color:#fff; font-size:10px;
  display:none; align-items:center; justify-content:center;
  border:none; font-family:inherit; cursor:pointer;
}
.wall-thumb:hover .del { display:flex; }
.wall-empty { font-size:11px; color:rgba(255,255,255,.4); padding:8px 0; }
.ap-input, .ap-select {
  width:100%; padding:9px 12px;
  background:rgba(0,0,0,.35);
  border:.5px solid rgba(255,255,255,.12);
  border-radius:10px; color:#fff; font-size:12px;
  font-family:inherit; outline:none;
  margin-bottom:8px;
}
.ap-input:focus, .ap-select:focus { border-color:#ff3b30; }
.ap-select option { background:#222; color:#fff; }
.preset-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
.preset-item {
  display:flex; align-items:center; justify-content:space-between;
  background:rgba(0,0,0,.3); padding:8px 12px;
  border-radius:8px; font-size:11px;
  border:.5px solid rgba(255,255,255,.08);
}
.preset-item .name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px; }
.preset-item button {
  background:none; border:none; color:#ff3b30; cursor:pointer;
  font-size:11px; font-family:inherit; padding:2px 6px;
}
.preset-item button.load { color:#4da3ff; }
.icon-replace-list { display:flex; flex-direction:column; gap:8px; }
.icon-replace-item { display:grid; grid-template-columns:34px minmax(0,1fr) auto auto; align-items:center; gap:8px; padding:8px 10px; border-radius:12px; background:rgba(0,0,0,.24); border:.5px solid rgba(255,255,255,.08); }
.icon-preview { width:34px; height:34px; border-radius:9px; background-size:cover; background-position:center; background-color:rgba(255,255,255,.1); }
.icon-meta { min-width:0; }
.icon-meta strong { display:block; font-size:12px; color:#fff; }
.icon-meta span { display:block; font-size:10px; color:rgba(255,255,255,.55); }
.icon-upload-btn, .icon-reset-btn { padding:6px 9px; border-radius:999px; background:rgba(255,255,255,.1); border:.5px solid rgba(255,255,255,.14); color:#fff; font-size:11px; cursor:pointer; }
.icon-upload-btn input { display:none; }
.icon-reset-btn:disabled { opacity:.45; cursor:not-allowed; }
</style>
