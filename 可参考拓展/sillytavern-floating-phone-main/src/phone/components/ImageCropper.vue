<template>
  <div class="cropper-overlay" :class="outputShape" v-if="modelValue">
    <div class="cropper-title">{{ title }}</div>
    <div class="cropper-frame" ref="frameRef"
         @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <img ref="imgRef" :src="src" @load="onImgLoad" />
      <div class="cropper-mask"></div>
    </div>
    <div class="cropper-zoom">
      <span style="color:#fff;font-size:11px">缩放</span>
      <input type="range" min="100" max="300" v-model.number="zoom" @input="layout(false)" />
      <span>{{ zoom }}%</span>
    </div>
    <div class="cropper-btns">
      <button class="ap-btn" @click="$emit('update:modelValue', false)">取消</button>
      <button class="ap-btn accent" @click="confirm">{{ confirmText }}</button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, reactive, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  src: String,
  title: { type: String, default: '拖动定位 / 缩放裁剪' },
  confirmText: { type: String, default: '应用为壁纸' },
  outputShape: { type: String, default: 'frame' },
});
const emit = defineEmits(['update:modelValue', 'confirm']);

const frameRef = ref(null);
const imgRef = ref(null);
const zoom = ref(100);
const state = reactive({ baseScale: 1, x: 0, y: 0, frameW: 0, frameH: 0, natW: 0, natH: 0 });
let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

function onImgLoad() {
  if (!imgRef.value || !frameRef.value) return;
  state.natW = imgRef.value.naturalWidth;
  state.natH = imgRef.value.naturalHeight;
  const fr = frameRef.value.getBoundingClientRect();
  state.frameW = fr.width; state.frameH = fr.height;
  state.baseScale = Math.max(fr.width / state.natW, fr.height / state.natH);
  zoom.value = 100;
  layout(true);
}

function layout(center) {
  const s = state.baseScale * (zoom.value / 100);
  const w = state.natW * s, h = state.natH * s;
  if (center) { state.x = (state.frameW - w) / 2; state.y = (state.frameH - h) / 2; }
  state.x = Math.min(0, Math.max(state.frameW - w, state.x));
  state.y = Math.min(0, Math.max(state.frameH - h, state.y));
  if (imgRef.value) {
    imgRef.value.style.width = w + 'px';
    imgRef.value.style.height = h + 'px';
    imgRef.value.style.transform = `translate(${state.x}px,${state.y}px)`;
  }
}

function onDown(e) {
  dragging = true; sx = e.clientX; sy = e.clientY; ox = state.x; oy = state.y;
  frameRef.value.setPointerCapture(e.pointerId);
}
function onMove(e) {
  if (!dragging) return;
  state.x = ox + (e.clientX - sx);
  state.y = oy + (e.clientY - sy);
  layout(false);
}
function onUp() { dragging = false; }

function confirm() {
  const outW = props.outputShape === 'square' ? 512 : 760;
  const outH = props.outputShape === 'square' ? 512 : Math.round(outW * (state.frameH / state.frameW));
  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d');
  const s = state.baseScale * (zoom.value / 100);
  const displayW = state.natW * s;
  const displayH = state.natH * s;
  const ratioX = state.natW / displayW;
  const ratioY = state.natH / displayH;
  const sourceW = state.frameW * ratioX;
  const sourceH = state.frameH * ratioY;
  let sourceX = -state.x * ratioX;
  let sourceY = -state.y * ratioY;
  if (props.outputShape === 'square') {
    const side = Math.min(sourceW, sourceH);
    sourceX += (sourceW - side) / 2;
    sourceY += (sourceH - side) / 2;
    sourceX = Math.max(0, Math.min(state.natW - side, sourceX));
    sourceY = Math.max(0, Math.min(state.natH - side, sourceY));
    ctx.drawImage(imgRef.value, sourceX, sourceY, side, side, 0, 0, outW, outH);
  } else {
    sourceX = Math.max(0, Math.min(state.natW - sourceW, sourceX));
    sourceY = Math.max(0, Math.min(state.natH - sourceH, sourceY));
    ctx.drawImage(imgRef.value, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);
  }
  emit('confirm', canvas.toDataURL('image/jpeg', 0.9));
  emit('update:modelValue', false);
}

watch(() => props.modelValue, async value => {
  if (!value) return;
  zoom.value = 100;
  await nextTick();
  if (imgRef.value?.complete) onImgLoad();
});
watch(() => props.src, () => { if (props.modelValue) zoom.value = 100; });
</script>

<style scoped>
.cropper-overlay {
  position:absolute; inset:0; background:rgba(0,0,0,.95);
  border-radius:40px; z-index:200;
  display:flex; flex-direction:column;
  padding:60px 20px 20px;
}
.cropper-title { color:#fff; font-size:15px; text-align:center; margin-bottom:14px; }
.cropper-frame {
  flex:1; position:relative; overflow:hidden;
  border-radius:14px; background:#000;
  margin-bottom:14px; touch-action:none;
}
.cropper-overlay.square .cropper-frame {
  flex:0 0 auto;
  width:100%; aspect-ratio:1;
}
.cropper-frame img {
  position:absolute; top:0; left:0;
  user-select:none; pointer-events:none; max-width:none;
}
.cropper-mask {
  position:absolute; inset:0;
  box-shadow:0 0 0 9999px rgba(0,0,0,.4) inset;
  border:1px solid rgba(255,255,255,.6);
  pointer-events:none;
}
.cropper-zoom { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.cropper-zoom input { flex:1; accent-color:#ff3b30; }
.cropper-zoom span { color:#fff; font-size:11px; min-width:40px; text-align:right; }
.cropper-btns { display:flex; gap:8px; }
.ap-btn {
  flex:1; padding:9px 10px;
  background:rgba(255,255,255,.1);
  border:.5px solid rgba(255,255,255,.15);
  border-radius:10px; color:#fff; font-size:12px; cursor:pointer;
  font-family:inherit; transition:.2s;
}
.ap-btn.accent { background:#ff3b30; border-color:#ff3b30; }
</style>
