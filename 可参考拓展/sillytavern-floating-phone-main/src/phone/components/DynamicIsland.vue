<template>
  <div class="island" :class="{ expanded, music: musicActive, playing }" @click="expanded = !expanded">
    <div v-if="musicActive" class="compact-music">
      <span class="mini-art" :style="coverStyle(currentSong?.cover)"></span>
      <span class="wave" :class="{ paused: !playing }"><i></i><i></i><i></i></span>
    </div>
    <div class="island-content">
      <div class="island-left">
        <span v-if="musicActive" class="album-dot" :style="coverStyle(currentSong?.cover)"></span>
        <span v-else class="island-dot"></span>
        <span>{{ musicActive ? islandTitle : label }}</span>
      </div>
      <div class="island-right">{{ musicActive ? islandStatus : status }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMusicPlayer } from '../composables/useMusicPlayer.js';

defineProps({
  label: { type: String, default: 'AI Assistant' },
  status: { type: String, default: 'ONLINE' },
});

const expanded = ref(false);
const { currentSong, playing, islandTitle, islandStatus } = useMusicPlayer();
const musicActive = computed(() => Boolean(currentSong.value));

function coverStyle(url) {
  return url ? { backgroundImage: `url('${url}')` } : null;
}
</script>

<style scoped>
.island {
  position:absolute;
  top:11px; left:50%;
  transform:translateX(-50%);
  width:120px; height:35px;
  background:#000;
  border-radius:20px;
  z-index:40;
  cursor:pointer;
  transition:width .46s cubic-bezier(.34,1.56,.64,1), height .46s cubic-bezier(.34,1.56,.64,1), border-radius .46s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
}
.island.music:not(.expanded) { width:132px; box-shadow:0 8px 24px rgba(0,0,0,.24); }
.island.expanded {
  width:330px; height:46px;
  border-radius:24px;
  padding:0 18px;
  justify-content:space-between;
}
.compact-music { position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 24px 0 18px; transition:opacity .18s ease, transform .18s ease; }
.island.expanded .compact-music { opacity:0; transform:scale(.9); pointer-events:none; }
.mini-art, .album-dot { background-size:cover; background-position:center; background-color:#ff3b30; }
.mini-art { width:22px; height:22px; border-radius:50%; box-shadow:0 0 0 1px rgba(255,255,255,.18); animation:record-spin 9s linear infinite; transform-origin:center; }
.album-dot { border-radius:50% !important; animation:record-spin 9s linear infinite; transform-origin:center; }
.island.music:not(.playing) .mini-art, .island.music:not(.playing) .album-dot { animation-play-state:paused; }
.wave { display:flex; align-items:flex-end; gap:2px; width:20px; height:14px; }
.wave i { width:3px; border-radius:2px; background:#ff3b30; animation:wave 1s ease-in-out infinite; }
.wave i:nth-child(1) { height:7px; animation-delay:0s; }
.wave i:nth-child(2) { height:13px; animation-delay:.16s; }
.wave i:nth-child(3) { height:9px; animation-delay:.32s; }
.wave.paused i { animation:none; height:4px; background:#777; }
.island-content {
  display:flex; align-items:center; gap:10px;
  opacity:0; transform:scale(.8);
  transition:opacity .3s .15s, transform .3s .15s;
  width:100%; justify-content:space-between;
  font-size:13px; color:#fff;
  min-width:0;
}
.island.expanded .island-content { opacity:1; transform:scale(1); }
.island-left { display:flex; align-items:center; gap:8px; min-width:0; }
.island-left span:last-child { max-width:205px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.island-dot { width:8px; height:8px; border-radius:50%; background:#ff3b30; box-shadow:0 0 8px #ff3b30; }
.album-dot { flex:0 0 auto; width:24px; height:24px; border-radius:8px; }
.island-right { color:#ff3b30; font-weight:600; font-size:12px; white-space:nowrap; }
@keyframes wave { 0%, 100% { transform:scaleY(.45); } 50% { transform:scaleY(1); } }
@keyframes record-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
</style>
