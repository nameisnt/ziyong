<template>
  <div class="weather-widget">
    <div class="weather-top">
      <div>
        <div class="weather-city">{{ city }}</div>
        <div class="weather-cond">{{ condition }}</div>
      </div>
      <div class="weather-temp">{{ temp }}</div>
    </div>
    <div class="weather-bottom">
      <span class="weather-accent">WEATHER</span>
      <span>H:{{ high }}°  L:{{ low }}°</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useWeather } from '../composables/useWeather.js';

const { city, condition, temp, high, low, load } = useWeather();
onMounted(load);
</script>

<style scoped>
.weather-widget {
  position:absolute; top:430px; left:24px; right:24px; height:150px;
  background:rgba(255,255,255,.08);
  backdrop-filter:blur(20px) saturate(180%);
  -webkit-backdrop-filter:blur(20px) saturate(180%);
  border:.5px solid rgba(255,255,255,.12);
  border-radius:22px; padding:18px 20px; z-index:5;
  box-shadow:0 6px 24px rgba(0,0,0,.2);
  color:#fff; display:flex; flex-direction:column; justify-content:space-between;
}
.weather-top { display:flex; justify-content:space-between; align-items:flex-start; }
.weather-city { font-size:13px; letter-spacing:.5px; color:rgba(255,255,255,.85); }
.weather-cond { font-size:12px; color:rgba(255,255,255,.7); margin-top:2px; }
.weather-temp { font-size:46px; font-weight:300; line-height:1; letter-spacing:-1px; }
.weather-temp::after { content:"°"; }
.weather-bottom { display:flex; justify-content:space-between; align-items:flex-end; font-size:12px; color:rgba(255,255,255,.7); }
.weather-accent { color:#ff3b30; font-size:11px; letter-spacing:1px; }
</style>
