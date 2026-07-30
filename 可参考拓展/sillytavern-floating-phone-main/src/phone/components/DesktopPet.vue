<template>
  <div v-if="visible" ref="petRoot" class="desktop-pet" :style="petStyle">
    <Transition name="bubble-pop">
      <div v-if="pet.state.value.bubble" class="pet-bubble">{{ pet.state.value.bubble }}</div>
    </Transition>

    <div
      ref="spriteWrap"
      class="pet-sprite-wrap"
      :class="{ buzz: buzzing, dragging }"
      @pointerdown="startDrag"
      @click="handleSpriteClick"
    >
      <img class="pet-sprite" :style="spriteStyle" :src="pet.currentImage.value" alt="桌宠" draggable="false" />
    </div>

    <form class="pet-composer" @submit.prevent="sendMessage">
      <div
        ref="composerInput"
        class="pet-input"
        contenteditable="true"
        role="textbox"
        aria-multiline="false"
        :data-placeholder="replying ? '请稍候...' : ''"
        :contenteditable="replying ? 'false' : 'true'"
        @input="onComposerInput"
        @keydown.enter.prevent="sendMessage"
        @paste.prevent="onComposerPaste"
      ></div>
      <button v-if="replying" class="cancel" type="button" @click="cancelReply">取消</button>
      <button v-else type="submit" :disabled="!draft.trim()">发送</button>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMessageStore } from '../composables/useMessageStore.js';
import { usePetAi } from '../composables/usePetAi.js';
import { usePetStore } from '../composables/usePetStore.js';

const pet = usePetStore();
const messageStore = useMessageStore();
const ai = usePetAi();

const petRoot = ref(null);
const spriteWrap = ref(null);
const composerInput = ref(null);
const draft = ref('');
const replying = ref(false);
const buzzing = ref(false);
const dragging = ref(false);
const clickSuppressed = ref(false);
const walkTimer = ref(null);
const walkDirection = ref({ x: 1, y: 0 });
const idleTimer = ref(null);
let replyAbortController = null;

const visible = computed(() => pet.ready.value && pet.state.value.enabled && pet.hasImage.value);
const selectedRole = computed(() => messageStore.roles.value.find(role => role.id === pet.state.value.roleId) || null);
const petStyle = computed(() => ({
  left: `${pet.state.value.position.x}px`,
  top: `${pet.state.value.position.y}px`,
}));
const spriteStyle = computed(() => ({
  width: `${pet.state.value.size}px`,
  height: `${pet.state.value.size}px`,
  objectFit: 'contain',
}));

onMounted(() => {
  startAutoWalk();
  window.addEventListener('resize', keepInBounds);
});

onBeforeUnmount(() => {
  cancelReply();
  stopAutoWalk();
  window.removeEventListener('resize', keepInBounds);
});

function startAutoWalk() {
  stopAutoWalk();
  walkTimer.value = setInterval(() => {
    if (!visible.value || dragging.value || replying.value || !pet.state.value.autoWalk) return;
    movePet();
  }, 900);
}

function stopAutoWalk() {
  if (walkTimer.value) clearInterval(walkTimer.value);
  walkTimer.value = null;
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = null;
}

function movePet() {
  const root = petRoot.value;
  if (!root) return;
  const size = pet.state.value.size || 128;
  const step = 14;
  const horizontal = Math.random() > 0.25;
  const deltaX = horizontal ? step * (Math.random() > 0.5 ? 1 : -1) : (Math.random() - 0.5) * 10;
  const deltaY = horizontal ? (Math.random() - 0.5) * 8 : step * (Math.random() > 0.5 ? 1 : -1);
  const next = clampPosition({ x: pet.state.value.position.x + deltaX, y: pet.state.value.position.y + deltaY }, root, size);
  pet.setPosition(next);
  pet.setMood('walk');
  setBubbleByMood('walk');
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = setTimeout(() => {
    if (pet.state.value.autoWalk) pet.setMood('idle');
  }, 320);
}

function setBubbleByMood(mood) {
  if (mood === 'walk') return;
  const bubble = ({
    happy: '♪',
    angry: '哼',
    shy: '... ',
    sad: '嗯...',
    thinking: '…',
    idle: '',
  })[mood] || '';
  if (bubble) pet.setBubble(bubble);
}

async function sendMessage() {
  const text = draft.value.trim();
  if (!text || replying.value) return;
  draft.value = '';
  syncComposerInput('');
  await pet.addMessage({ senderType: 'user', text });
  await pet.setBubble('……');
  replyAbortController = new AbortController();
  replying.value = true;
  try {
    const replies = await ai.requestReply({ role: selectedRole.value, history: pet.state.value.messages, latestText: text, signal: replyAbortController.signal });
    for (const reply of replies) {
      await pet.addMessage({ senderType: 'pet', text: reply.text, mood: reply.mood });
      await pet.setMood(reply.mood);
      setBubbleByMood(reply.mood);
      await pet.setBubble(reply.text);
      await wait(getReplyDisplayDelay(reply.text));
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      await pet.setMood('idle');
      await pet.setBubble('已取消');
    } else {
      await pet.setMood('sad');
      await pet.setBubble(error.message || '桌宠暂时说不出话');
    }
  } finally {
    replyAbortController = null;
    replying.value = false;
  }
}

function cancelReply() {
  replyAbortController?.abort();
}

function onComposerInput() {
  draft.value = composerInput.value?.innerText?.replace(/\n+/g, ' ') || '';
}

function onComposerPaste(event) {
  const text = event.clipboardData?.getData('text/plain') || '';
  insertComposerText(text);
}

function insertComposerText(text) {
  const el = composerInput.value;
  if (!el) return;
  const safeText = String(text || '').replace(/\n+/g, ' ');
  document.execCommand('insertText', false, safeText);
  draft.value = el.innerText?.replace(/\n+/g, ' ') || '';
}

function startDrag(event) {
  if (event.button !== 0 || !petRoot.value) return;
  const root = petRoot.value;
  const startPointer = { x: event.clientX, y: event.clientY };
  const startPosition = { ...pet.state.value.position };
  let moved = false;

  spriteWrap.value?.setPointerCapture?.(event.pointerId);

  const handleMove = moveEvent => {
    const deltaX = moveEvent.clientX - startPointer.x;
    const deltaY = moveEvent.clientY - startPointer.y;
    if (!moved && Math.hypot(deltaX, deltaY) > 4) {
      moved = true;
      dragging.value = true;
      clickSuppressed.value = true;
    }
    if (!moved) return;
    moveEvent.preventDefault();
    pet.setPosition(clampPosition({ x: startPosition.x + deltaX, y: startPosition.y + deltaY }, root, pet.state.value.size));
    pet.setMood(Math.abs(deltaX) > Math.abs(deltaY) ? 'walk' : pet.state.value.mood);
  };

  const stopDrag = () => {
    spriteWrap.value?.removeEventListener('pointermove', handleMove);
    spriteWrap.value?.removeEventListener('pointerup', stopDrag);
    spriteWrap.value?.removeEventListener('pointercancel', stopDrag);
    dragging.value = false;
    nextTick(() => { setTimeout(() => { clickSuppressed.value = false; }, 0); });
  };

  spriteWrap.value?.addEventListener('pointermove', handleMove);
  spriteWrap.value?.addEventListener('pointerup', stopDrag, { once: true });
  spriteWrap.value?.addEventListener('pointercancel', stopDrag, { once: true });
}

function handleSpriteClick() {
  if (clickSuppressed.value) return;
  buzzing.value = false;
  requestAnimationFrame(() => { buzzing.value = true; });
  setTimeout(() => { buzzing.value = false; }, 760);
}

function keepInBounds() {
  const root = petRoot.value;
  if (!root) return;
  pet.setPosition(clampPosition(pet.state.value.position, root, pet.state.value.size));
}

function clampPosition(next, element, size = pet.state.value.size) {
  const margin = 8;
  const width = Math.max(size + 28, element.offsetWidth || 150);
  const height = Math.max(size + 96, element.offsetHeight || 210);
  return {
    x: Math.min(Math.max(margin, next.x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, next.y), Math.max(margin, window.innerHeight - height - margin)),
  };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getReplyDisplayDelay(text) {
  const length = String(text || '').trim().length;
  return Math.max(1800, Math.min(5200, 1200 + length * 120));
}

function syncComposerInput(text) {
  const el = composerInput.value;
  if (!el) return;
  el.innerText = text;
}
</script>

<style scoped>
.desktop-pet { position:fixed; z-index:10002; display:flex; flex-direction:column; align-items:center; width:max-content; pointer-events:auto; user-select:none; }
.pet-bubble { position:relative; max-width:190px; margin-bottom:8px; padding:9px 12px; border-radius:16px; background:#fff; color:#111; font-size:12px; line-height:1.45; box-shadow:0 8px 26px rgba(0,0,0,.18); word-break:break-word; }
.pet-bubble::after { content:""; position:absolute; left:50%; bottom:-6px; width:12px; height:12px; background:#fff; transform:translateX(-50%) rotate(45deg); }
.pet-sprite-wrap { display:grid; place-items:end center; width:max-content; height:max-content; cursor:grab; touch-action:none; transform-origin:center bottom; }
.pet-sprite-wrap.dragging { cursor:grabbing; }
.pet-sprite { object-fit:contain; pointer-events:none; filter:drop-shadow(0 8px 10px rgba(0,0,0,.22)); }
.pet-composer { display:grid; grid-template-columns:minmax(0,1fr) 44px; gap:5px; width:154px; margin-top:5px; padding:5px; border:0; border-radius:999px; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.16); backdrop-filter:blur(10px); overflow:hidden; }
.pet-input { min-width:0; width:100%; box-sizing:border-box; padding:6px 8px; border:0!important; outline:none!important; background:transparent!important; box-shadow:none!important; color:#111; font:inherit; font-size:12px; line-height:1.2; white-space:pre-wrap; word-break:break-word; overflow:hidden; }
.pet-input:focus, .pet-input:focus-visible, .pet-input:active { border:0!important; outline:none!important; background:transparent!important; box-shadow:none!important; }
.pet-input:empty::before { content:attr(data-placeholder); color:#999; pointer-events:none; }
.pet-composer button { border:0; border-radius:999px; background:#111; color:#fff; font-size:12px; }
.pet-composer button.cancel { background:#d71920; }
.pet-composer button:disabled { opacity:.45; }
.pet-sprite-wrap.buzz { animation:pet-buzz-out .75s linear both; }
.pet-sprite-wrap.buzz .pet-sprite { animation:pet-sprite-bounce .75s linear both; }
.bubble-pop-enter-active, .bubble-pop-leave-active { transition:opacity .18s ease, transform .18s ease; }
.bubble-pop-enter-from, .bubble-pop-leave-to { opacity:0; transform:translateY(6px) scale(.96); }
@keyframes pet-buzz-out {
  10% { transform:translateX(3px) rotate(2deg); }
  20% { transform:translateX(-3px) rotate(-2deg); }
  30% { transform:translateX(3px) rotate(2deg); }
  40% { transform:translateX(-3px) rotate(-2deg); }
  50% { transform:translateX(2px) rotate(1deg); }
  60% { transform:translateX(-2px) rotate(-1deg); }
  70% { transform:translateX(1px) rotate(.5deg); }
  80% { transform:translateX(-1px) rotate(-.5deg); }
  100% { transform:translateX(0) rotate(0); }
}
@keyframes pet-sprite-bounce {
  0% { transform:translateY(0); }
  30% { transform:translateY(-2px); }
  60% { transform:translateY(0); }
  100% { transform:translateY(0); }
}
</style>
