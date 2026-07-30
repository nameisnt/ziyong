<template>
  <div class="app-grid">
    <div v-for="app in apps" :key="app.id" class="app-icon" @click="$emit('app-click', app)">
      <div class="app-icon-img" :style="app.url ? { backgroundImage: `url('${app.url}')` } : {}"></div>
      <div class="app-name">{{ app.name }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({ apps: { type: Array, default: () => [] } });
defineEmits(['app-click']);
</script>

<style scoped>
.app-grid {
  position:absolute; top:210px; left:0; right:0;
  padding:0 24px;
  display:grid; grid-template-columns:repeat(4,1fr);
  gap:18px 22px; z-index:5;
}
.app-icon { display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
.app-icon-img {
  width:60px; height:60px; border-radius:14px;
  background-color:rgba(38,38,42,0.78);
  background-size:cover; background-position:center;
  border:.5px solid rgba(255,255,255,.1);
  box-shadow:0 6px 16px rgba(0,0,0,.4), inset 0 .5px 0 rgba(255,255,255,.08);
  transition:transform .2s;
}
.app-icon:active .app-icon-img { transform:scale(.92); }
.app-name { font-size:11px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.5); letter-spacing:.3px; }
</style>
