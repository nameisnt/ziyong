<template>
  <button
    class="pc-icon-btn"
    type="button"
    :aria-label="soundEnabled ? t`关闭游戏音效` : t`开启游戏音效`"
    :aria-pressed="soundEnabled"
    :title="soundEnabled ? t`关闭游戏音效` : t`开启游戏音效`"
    @click="toggleMiniGameSound"
  >
    <i :class="['fa-solid', soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark']"></i>
  </button>
</template>

<script setup lang="ts">
import { miniGameSoundEnabled, toggleMiniGameSound } from './miniGameAudio';

const soundEnabled = miniGameSoundEnabled;
</script>
