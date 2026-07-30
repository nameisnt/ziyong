<template>
  <div class="phone">
    <span class="btn-mute"></span>
    <span class="btn-vol-down"></span>
    <div class="screen">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.phone {
  position:relative;
  width:380px; height:780px;
  background:var(--shell-color);
  border-radius:52px;
  padding:13px;
  transition:background .4s ease;
}
.phone::before, .phone::after {
  content:""; position:absolute; background:var(--shell-color); border-radius:2px; transition:background .4s;
}
.phone::before { right:-3px; top:185px; width:3px; height:85px; }
.phone::after  { left:-3px;  top:155px; width:3px; height:52px; }
.btn-vol-down { position:absolute; left:-3px; top:220px; width:3px; height:52px; background:var(--shell-color); border-radius:2px; transition:background .4s; }
.btn-mute     { position:absolute; left:-3px; top:105px; width:3px; height:28px; background:var(--shell-color); border-radius:2px; transition:background .4s; }
.screen {
  position:relative;
  width:100%; height:100%;
  background:var(--wallpaper) center/cover no-repeat, #000;
  border-radius:40px;
  overflow:hidden;
  color:#fff;
}
.screen::before{
  content:""; position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.1) 40%, rgba(0,0,0,.35) 100%);
  pointer-events:none; z-index:1;
}
</style>
