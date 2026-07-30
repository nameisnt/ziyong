<template>
  <section v-if="visibleTasks.length" class="pc-section-card pc-generation-task-center">
    <button class="pc-task-center-head" type="button" @click="expanded = !expanded">
      <span class="pc-task-center-title">
        <i class="fa-solid fa-list-check"></i>
        <strong>{{ t`生成任务` }}</strong>
        <small>{{ statusSummary }}</small>
      </span>
      <i :class="expanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
    </button>

    <div v-if="expanded" class="pc-task-list">
      <article v-for="task in visibleTasks" :key="task.id" class="pc-task-row">
        <div class="pc-task-copy">
          <div class="pc-task-line">
            <strong>{{ task.title }}</strong>
            <span :data-status="task.status">{{ statusLabel(task.status) }}</span>
          </div>
          <small>{{ task.currentLabel || task.error || t`等待开始` }}</small>
          <div
            class="pc-task-progress"
            role="progressbar"
            :aria-valuemax="task.total || 1"
            :aria-valuenow="doneCount(task)"
          >
            <span :style="{ width: `${progressPercent(task)}%` }"></span>
          </div>
          <small>{{ progressLabel(task) }}</small>
        </div>

        <div class="pc-task-actions">
          <button class="pc-icon-btn" type="button" :title="t`打开任务`" @click="openTask(task)">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button
            v-if="task.status === 'running'"
            class="pc-icon-btn"
            type="button"
            :title="t`完成当前项后暂停`"
            @click="generationTasks.requestPause(task.id)"
          >
            <i class="fa-solid fa-pause"></i>
          </button>
          <button
            v-if="task.status === 'running' || task.status === 'pause-requested'"
            class="pc-icon-btn danger"
            type="button"
            :title="t`立即停止并保留进度`"
            @click="generationTasks.stopNow(task.id)"
          >
            <i class="fa-solid fa-stop"></i>
          </button>
          <button
            v-if="task.status === 'paused' || task.status === 'interrupted'"
            class="pc-icon-btn"
            type="button"
            :title="t`继续任务`"
            @click="resume(task.id)"
          >
            <i class="fa-solid fa-play"></i>
          </button>
          <button
            v-if="
              task.status === 'paused' ||
              task.status === 'interrupted' ||
              task.status === 'completed' ||
              task.status === 'cancelled'
            "
            class="pc-icon-btn"
            type="button"
            :title="task.status === 'paused' || task.status === 'interrupted' ? t`放弃任务` : t`移除记录`"
            @click="discard(task.id)"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { discardGenerationTask, resumeGenerationTask } from '@/core/manualBatchRunner';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import type { GenerationTask, GenerationTaskStatus } from '@/type/generationTask';

const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const expanded = ref(true);

const visibleTasks = computed(() => generationTasks.currentScopeTasks.slice(0, 5));
const statusSummary = computed(() => {
  const running = visibleTasks.value.filter(
    task => task.status === 'running' || task.status === 'pause-requested',
  ).length;
  const paused = visibleTasks.value.filter(task => task.status === 'paused' || task.status === 'interrupted').length;
  if (running) return `${running} 个运行中`;
  if (paused) return `${paused} 个可继续`;
  return `${visibleTasks.value.length} 条记录`;
});

function doneCount(task: GenerationTask) {
  return Math.min(task.total, task.savedCount + task.draftCount);
}

function progressPercent(task: GenerationTask) {
  if (!task.total) return task.status === 'completed' ? 100 : 0;
  return Math.min(100, Math.round((doneCount(task) / task.total) * 100));
}

function progressLabel(task: GenerationTask) {
  const draft = task.draftCount ? ` · 草稿 ${task.draftCount}` : '';
  return `${doneCount(task)}/${task.total} · 保存 ${task.savedCount}${draft}`;
}

function statusLabel(status: GenerationTaskStatus) {
  return {
    cancelled: '已取消',
    completed: '已完成',
    interrupted: '已中断',
    paused: '已暂停',
    'pause-requested': '等待暂停',
    queued: '排队中',
    running: '运行中',
  }[status];
}

async function openTask(task: GenerationTask) {
  if (!phone.isViewingCurrentChat) await phone.returnToCurrentScope();
  phone.pushRoute(task.appId, task.routePage, task.title, task.routeParams);
}

function resume(taskId: string) {
  void resumeGenerationTask(taskId);
}

function discard(taskId: string) {
  void discardGenerationTask(taskId);
}
</script>

<style scoped>
.pc-generation-task-center {
  margin-bottom: 12px;
  padding: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--pc-surface) 86%, transparent 14%);
}

.pc-task-center-head {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
}

.pc-task-center-title,
.pc-task-line,
.pc-task-actions {
  display: flex;
  align-items: center;
}

.pc-task-center-title {
  min-width: 0;
  gap: 8px;
}

.pc-task-center-title small {
  color: var(--pc-muted);
}

.pc-task-list {
  border-top: 1px solid var(--pc-border);
}

.pc-task-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 11px 12px;
}

.pc-task-row + .pc-task-row {
  border-top: 1px solid var(--pc-border);
}

.pc-task-copy {
  min-width: 0;
}

.pc-task-line {
  justify-content: space-between;
  gap: 8px;
}

.pc-task-line strong,
.pc-task-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-task-line strong {
  min-width: 0;
  font-size: 13px;
}

.pc-task-line span {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-task-line span[data-status='running'],
.pc-task-line span[data-status='completed'] {
  color: var(--pc-theme-accent);
}

.pc-task-copy small {
  margin-top: 4px;
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-task-progress {
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--pc-muted) 18%, transparent 82%);
}

.pc-task-progress span {
  display: block;
  height: 100%;
  background: var(--pc-theme-accent);
  transition: width 180ms ease;
}

.pc-task-actions {
  align-self: center;
  gap: 5px;
}

.pc-task-actions .pc-icon-btn {
  width: 34px;
  height: 34px;
}

@media (max-width: 420px) {
  .pc-task-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .pc-task-actions {
    justify-content: flex-end;
  }
}
</style>
