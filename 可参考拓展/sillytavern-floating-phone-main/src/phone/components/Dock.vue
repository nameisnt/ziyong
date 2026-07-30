<template>
  <div class="dock">
    <div v-for="app in apps" :key="app.id" class="app-icon" @click="$emit('app-click', app)">
      <div class="app-icon-img" :style="app.url ? { backgroundImage: `url('${app.url}')` } : {}"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({ apps: { type: Array, default: () => [] } });
defineEmits(['app-click']);
</script>

<style scoped>
.dock {
  position:absolute; bottom:22px; left:13px; right:13px; height:84px;
  background:rgba(255,255,255,.1);
  backdrop-filter:blur(25px) saturate(180%);
  -webkit-backdrop-filter:blur(25px) saturate(180%);
  border:.5px solid rgba(255,255,255,.15);
  border-radius:30px;
  display:flex; justify-content:space-around; align-items:center;
  padding:0 14px; z-index:6;
  box-shadow:0 8px 32px rgba(0,0,0,.3);
}
.app-icon { cursor:pointer; }
.app-icon-img {
  width:56px; height:56px; border-radius:14px;
  background-color:rgba(38,38,42,0.78);
  background-size:cover; background-position:center;
  border:.5px solid rgba(255,255,255,.1);
  box-shadow:0 6px 16px rgba(0,0,0,.4), inset 0 .5px 0 rgba(255,255,255,.08);
  transition:transform .2s;
}
.app-icon:active .app-icon-img { transform:scale(.92); }
</style>
