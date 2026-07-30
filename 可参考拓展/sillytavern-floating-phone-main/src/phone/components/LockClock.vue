<template>
  <div class="lock-clock">
    <div class="lock-time">{{ time }}</div>
    <div class="lock-date">{{ date }}</div>
  </div>
</template>

<script setup>
defineProps({
  time: { type: String, default: '9:41' },
  date: { type: String, default: '' },
});
</script>

<style scoped>
.lock-clock {
  position:absolute; top:72px; left:0; right:0;
  text-align:center; z-index:5;
}
.lock-time { font-size:84px; font-weight:300; letter-spacing:-3px; line-height:1; color:#fff; text-shadow:0 2px 20px rgba(0,0,0,.4); }
.lock-date { margin-top:8px; font-size:14px; color:rgba(255,255,255,.85); letter-spacing:.5px; }
</style>
