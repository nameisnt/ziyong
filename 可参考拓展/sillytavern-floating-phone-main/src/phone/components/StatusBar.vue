<template>
  <div class="status-bar" :class="theme">
    <div class="status-time">{{ time }}</div>
    <div class="status-icons">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="white">
        <rect x="0" y="7" width="3" height="4" rx=".5"/>
        <rect x="4.5" y="5" width="3" height="6" rx=".5"/>
        <rect x="9" y="2.5" width="3" height="8.5" rx=".5"/>
        <rect x="13.5" y="0" width="3" height="11" rx=".5"/>
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
        <path d="M8 2.5C5 2.5 2.3 3.6.3 5.4c-.2.2-.2.5 0 .7L1.6 7.4c.2.2.5.2.7 0C3.8 6 5.8 5.2 8 5.2s4.2.8 5.7 2.2c.2.2.5.2.7 0l1.3-1.3c.2-.2.2-.5 0-.7C13.7 3.6 11 2.5 8 2.5z" opacity=".5"/>
        <path d="M8 6c-1.6 0-3 .6-4.1 1.5-.2.2-.2.5 0 .7l1.3 1.3c.2.2.5.2.7 0 .6-.5 1.3-.8 2.1-.8s1.5.3 2.1.8c.2.2.5.2.7 0l1.3-1.3c.2-.2.2-.5 0-.7C11 6.6 9.6 6 8 6z"/>
        <circle cx="8" cy="10.3" r="1.3"/>
      </svg>
      <svg width="27" height="12" viewBox="0 0 27 12" fill="none">
        <rect x=".5" y=".5" width="22" height="11" rx="3" stroke="white" stroke-opacity=".5"/>
        <rect x="2" y="2" width="19" height="8" rx="1.5" fill="white"/>
        <rect x="23.5" y="3.5" width="2" height="5" rx="1" fill="white" fill-opacity=".5"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  time: { type: String, default: '9:41' },
  theme: { type: String, default: 'light' },
});
</script>

<style scoped>
.status-bar {
  position:absolute; top:0; left:0; right:0;
  height:54px;
  display:flex; justify-content:space-between; align-items:center;
  padding:18px 28px 0;
  font-size:15px; font-weight:600;
  z-index:60;
  pointer-events:none;
}
.status-time { letter-spacing:.5px; }
.status-icons { display:flex; align-items:center; gap:5px; }
.status-icons svg { display:block; }
.status-bar.dark { color:#111; }
.status-bar.dark .status-icons svg { fill:#111; }
.status-bar.dark .status-icons svg rect[stroke] { stroke:#111; }
.status-bar.dark .status-icons svg rect[fill="white"], .status-bar.dark .status-icons svg path, .status-bar.dark .status-icons svg circle { fill:#111; }
</style>
