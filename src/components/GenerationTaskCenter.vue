<template>
  <section class="pc-section-card pc-generation-task-center">
    <header class="pc-task-center-head">
      <span class="pc-task-center-title">
        <i class="fa-solid fa-list-check"></i>
        <strong>{{ t`生成任务` }}</strong>
        <small>{{ statusSummary }}</small>
      </span>
      <button
        class="pc-soft-btn compact"
        type="button"
        :disabled="!clearableTaskCount"
        aria-label="清理已完成通知"
        @click="clearSavedTasks"
      >
        {{ clearableTaskCount ? `清理 ${clearableTaskCount}` : '清理' }}
      </button>
    </header>

    <div class="pc-task-list">
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
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`打开任务`"
            :aria-label="t`打开任务`"
            @click="openTask(task)"
          >
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button
            v-if="task.rawOutput"
            class="pc-icon-btn"
            type="button"
            :class="{ active: expandedRawTaskId === task.id }"
            :title="t`查看原始输出`"
            :aria-label="t`查看原始输出`"
            @click="toggleRawOutput(task.id)"
          >
            <i class="fa-solid fa-file-lines"></i>
          </button>
          <button
            v-if="task.kind !== 'single' && task.status === 'running'"
            class="pc-icon-btn"
            type="button"
            :title="t`完成当前项后暂停`"
            :aria-label="t`完成当前项后暂停`"
            @click="generationTasks.requestPause(task.id)"
          >
            <i class="fa-solid fa-pause"></i>
          </button>
          <button
            v-if="task.status === 'running' || task.status === 'pause-requested'"
            class="pc-icon-btn danger"
            type="button"
            :title="task.kind === 'single' ? t`立即停止并保留原始输出` : t`立即停止并保留进度`"
            :aria-label="task.kind === 'single' ? t`立即停止并保留原始输出` : t`立即停止并保留进度`"
            @click="generationTasks.stopNow(task.id)"
          >
            <i class="fa-solid fa-stop"></i>
          </button>
          <button
            v-if="task.kind !== 'single' && (task.status === 'paused' || task.status === 'interrupted')"
            class="pc-icon-btn"
            type="button"
            :title="t`继续任务`"
            :aria-label="t`继续任务`"
            @click="resume(task.id)"
          >
            <i class="fa-solid fa-play"></i>
          </button>
          <button
            v-if="
              task.status === 'paused' ||
              task.status === 'interrupted' ||
              task.status === 'failed' ||
              task.status === 'completed' ||
              task.status === 'cancelled'
            "
            class="pc-icon-btn"
            type="button"
            :title="task.status === 'paused' || task.status === 'interrupted' ? t`放弃任务` : t`移除记录`"
            :aria-label="task.status === 'paused' || task.status === 'interrupted' ? t`放弃任务` : t`移除记录`"
            @click="discard(task.id)"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div v-if="expandedRawTaskId === task.id && task.rawOutput" class="pc-task-raw-output">
          <textarea :value="task.rawOutput" class="pc-area compact pc-raw-area pc-task-raw-area" readonly></textarea>
          <button class="pc-soft-btn" type="button" @click="copyRawOutput(task)">
            <i class="fa-solid fa-copy"></i>
            <span>{{ t`复制原始输出` }}</span>
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
const expandedRawTaskId = ref('');

const visibleTasks = computed(() => generationTasks.currentScopeTasks);
const clearableTaskCount = computed(() => generationTasks.getClearableTasks().length);
const statusSummary = computed(() => {
  const running = visibleTasks.value.filter(
    task => task.status === 'running' || task.status === 'pause-requested',
  ).length;
  const paused = visibleTasks.value.filter(
    task => task.kind !== 'single' && (task.status === 'paused' || task.status === 'interrupted'),
  ).length;
  const needsAttention = visibleTasks.value.filter(
    task => task.kind === 'single' && ['interrupted', 'failed', 'cancelled'].includes(task.status),
  ).length;
  if (running) return `${running} 个运行中`;
  if (paused) return `${paused} 个可继续`;
  if (needsAttention) return `${needsAttention} 个需处理`;
  return `${visibleTasks.value.length} 条记录`;
});

function doneCount(task: GenerationTask) {
  if (task.kind === 'single' && task.status === 'completed') return 1;
  return Math.min(task.total, task.previewCount + task.savedCount + task.draftCount);
}

function progressPercent(task: GenerationTask) {
  if (!task.total) return task.status === 'completed' ? 100 : 0;
  return Math.min(100, Math.round((doneCount(task) / task.total) * 100));
}

function progressLabel(task: GenerationTask) {
  if (task.kind === 'single') {
    if (task.status === 'completed') return task.currentLabel || '生成完成';
    if (task.rawOutput && ['cancelled', 'failed', 'interrupted'].includes(task.status)) return '原始输出已保留';
    return task.status === 'running' ? '正在生成' : '等待开始';
  }
  const draft = task.draftCount ? ` · 草稿 ${task.draftCount}` : '';
  const preview = task.previewCount ? ` · 待确认 ${task.previewCount}` : '';
  return `${doneCount(task)}/${task.total} · 保存 ${task.savedCount}${preview}${draft}`;
}

function statusLabel(status: GenerationTaskStatus) {
  return {
    cancelled: '已取消',
    completed: '已完成',
    failed: '失败',
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

function toggleRawOutput(taskId: string) {
  expandedRawTaskId.value = expandedRawTaskId.value === taskId ? '' : taskId;
}

async function copyRawOutput(task: GenerationTask) {
  try {
    await navigator.clipboard.writeText(task.rawOutput);
    toastr.success('已复制原始输出');
  } catch {
    toastr.error('复制失败，请手动选择文本');
  }
}

function resume(taskId: string) {
  void resumeGenerationTask(taskId);
}

function discard(taskId: string) {
  void discardGenerationTask(taskId);
}

function clearSavedTasks() {
  const clearedTaskIds = generationTasks.clearCompletedNotifications();
  if (!clearedTaskIds.length) return;
  phone.noticeSuccess(`已清理 ${clearedTaskIds.length} 条已完成通知`);
}
</script>

<style scoped>
.pc-generation-task-center {
  margin-bottom: 12px;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pc-bg) 90%, var(--pc-surface-strong) 10%);
}

.pc-task-center-head {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.pc-task-center-title {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--pc-text);
}

.pc-task-center-head > .pc-soft-btn {
  flex: 0 0 auto;
}

.pc-task-center-title,
.pc-task-line,
.pc-task-actions {
  display: flex;
  align-items: center;
}

.pc-task-raw-output {
  grid-column: 1 / -1;
  display: grid;
  justify-items: end;
  gap: 8px;
  min-width: 0;
}

.pc-task-raw-area {
  font-family: var(--pc-mono-font, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12px;
}

.pc-task-center-title {
  min-width: 0;
  gap: 8px;
}

.pc-task-center-title small {
  color: var(--pc-muted);
}

.pc-task-list {
  display: flex;
  gap: 8px;
  min-height: 72px;
  padding: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  border-top: 1px solid var(--pc-border);
  scroll-snap-type: x proximity;
}

.pc-task-row {
  flex: 0 0 min(240px, calc(100% - 20px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: 6px;
  background: var(--pc-surface);
  scroll-snap-align: start;
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
