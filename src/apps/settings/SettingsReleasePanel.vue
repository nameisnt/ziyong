<template>
  <div class="pc-release-panel">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>当前运行版本</strong><span>{{ RUNNING_VERSION }}</span>
      </div>
      <p role="status" aria-live="polite">{{ statusText }}</p>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="checking" @click="checkUpdate">
          <i :class="checking ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-rotate'"></i>
          <span>{{ checking ? '正在检查' : '检查更新' }}</span>
        </button>
        <button v-if="status === 'update-available'" class="pc-primary-btn" type="button" @click="openUpdater">
          <i class="fa-solid fa-arrow-up-right-from-square"></i><span>前往扩展迁移</span>
        </button>
      </div>
    </section>
    <section v-for="(group, index) in releaseGroups" :key="group[0].version" class="pc-page-section">
      <details class="pc-release-history" :open="index === 0">
        <summary class="pc-section-head pc-soft-btn">
          <strong
            ><i class="fa-solid fa-chevron-right" aria-hidden="true"></i
            >{{ index === 0 ? '最近更新' : '历史更新' }}</strong
          >
          <span>{{ group[0].version }}{{ group.length > 1 ? ` ~ ${group[group.length - 1].version}` : '' }}</span>
        </summary>
        <section
          v-for="release in group"
          :key="release.version"
          class="pc-release-version"
          :data-release-version="release.version"
        >
          <div class="pc-section-head">
            <strong>{{ release.version === RUNNING_VERSION ? '本版更新' : '版本更新' }}</strong
            ><span>{{ release.version }}</span>
          </div>
          <ul>
            <li v-for="note in release.notes" :key="note">{{ note }}</li>
          </ul>
        </section>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { checkExtensionUpdate, type ExtensionUpdateStatus } from '@/apps/extension-transfer/api';
import { RELEASE_HISTORY, RUNNING_VERSION } from '@/core/releaseInfo';
import { groupReleaseHistory } from '@/core/releaseGroups.mjs';
import { usePhoneStore } from '@/store/phone';

const phone = usePhoneStore();
const releaseGroups = groupReleaseHistory(RELEASE_HISTORY);
const checking = ref(false);
const status = ref<ExtensionUpdateStatus | ''>('');
const error = ref('');
const statusText = computed(() => {
  if (checking.value) return '正在检查本插件的安装仓库…';
  if (error.value) return `无法检查：${error.value}`;
  if (status.value === 'current') return '安装目录已是最新；若刚完成更新，请手动刷新酒馆页面以载入新版。';
  if (status.value === 'update-available') return '发现仓库更新。更新完成后，请手动刷新酒馆页面。';
  if (status.value === 'unavailable') return '无法检查：安装目录未返回有效的 Git 版本信息。';
  return '尚未检查更新';
});

async function checkUpdate() {
  if (checking.value) return;
  checking.value = true;
  error.value = '';
  status.value = '';
  try {
    status.value = await checkExtensionUpdate(import.meta.url);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    checking.value = false;
  }
}

function openUpdater() {
  void phone.openApp('extension-transfer');
}
</script>

<style scoped>
.pc-release-panel {
  min-width: 0;
  overflow-wrap: anywhere;
}
.pc-release-panel p {
  margin: 0;
  color: var(--pc-muted);
}
.pc-release-panel ul {
  margin: 0;
  padding-left: 22px;
}
.pc-release-panel li + li {
  margin-top: 10px;
}
.pc-release-history > summary {
  width: 100%;
  list-style: none;
}
.pc-release-history > summary::-webkit-details-marker {
  display: none;
}
.pc-release-history > summary i {
  margin-right: 8px;
}
.pc-release-history[open] > summary i {
  transform: rotate(90deg);
}
.pc-release-version {
  padding-top: 12px;
}
</style>
