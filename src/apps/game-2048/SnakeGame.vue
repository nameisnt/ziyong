<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`分数` }}</span>
        <strong>{{ state.score }}</strong>
      </article>
      <article>
        <span>{{ t`最高` }}</span>
        <strong>{{ state.best }}</strong>
      </article>
      <article>
        <span>{{ t`长度` }}</span>
        <strong>{{ state.snake.length }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="贪吃蛇速度">
      <button
        v-for="option in speedOptions"
        :key="option.id"
        class="pc-segment-btn"
        :class="{ active: state.speed === option.id }"
        type="button"
        @click="setSpeed(option.id)"
      >
        <span>{{ option.label }}</span>
      </button>
    </div>

    <section
      class="pc-snake-board"
      tabindex="0"
      @pointercancel="resetPointer"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
    >
      <span v-for="cell in cells" :key="cell.key" class="pc-snake-cell" :data-kind="cell.kind"></span>
    </section>

    <article v-if="state.status === 'lost' || state.status === 'paused'" class="pc-section-card pc-minigame-message">
      <strong>{{ statusTitle }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-primary-btn" type="button" @click="toggleRun">
        <i :class="['fa-solid', state.status === 'running' ? 'fa-pause' : 'fa-play']"></i>
        <span>{{ state.status === 'running' ? t`暂停` : t`开始` }}</span>
      </button>
      <button class="pc-soft-btn" type="button" @click="newGame">
        <i class="fa-solid fa-rotate-right"></i>
        <span>{{ t`重开` }}</span>
      </button>
      <InfoHint
        :label="t`贪吃蛇说明`"
        :text="t`在棋盘上滑动，或使用电脑方向键改变方向。吃到红点会增加长度，撞墙或撞到自己则结束。`"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';
import { SnakeSchema } from './backupSchemas';

type Direction = 'down' | 'left' | 'right' | 'up';
type SnakeSpeed = 'fast' | 'normal' | 'slow';
type SnakeStatus = 'idle' | 'lost' | 'paused' | 'running';
type Point = { x: number; y: number };

const size = 12;

type SnakeState = z.infer<typeof SnakeSchema>;

function initialState(best = 0): SnakeState {
  return {
    best,
    direction: 'right',
    food: { x: 8, y: 6 },
    score: 0,
    snake: [
      { x: 4, y: 6 },
      { x: 3, y: 6 },
      { x: 2, y: 6 },
    ],
    speed: 'normal',
    status: 'idle',
  };
}

const speedOptions: Array<{ id: SnakeSpeed; label: string; ms: number }> = [
  { id: 'slow', label: '慢', ms: 230 },
  { id: 'normal', label: '中', ms: 180 },
  { id: 'fast', label: '快', ms: 130 },
];

const state = ref<SnakeState>(readMiniGameSettings(miniGameFields.snake, SnakeSchema, () => initialState()));
const queuedDirection = ref<Direction>(state.value.direction);
const pointerStart = ref<Point | null>(null);
let timer: ReturnType<typeof window.setInterval> | null = null;

const speedMs = computed(() => speedOptions.find(option => option.id === state.value.speed)?.ms ?? 180);

const cells = computed(() => {
  const snakeKeys = new Set(state.value.snake.map(point => `${point.x}:${point.y}`));
  const head = state.value.snake[0];
  return Array.from({ length: size * size }, (_, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    const key = `${x}:${y}`;
    const kind =
      head?.x === x && head.y === y
        ? 'head'
        : state.value.food.x === x && state.value.food.y === y
          ? 'food'
          : snakeKeys.has(key)
            ? 'body'
            : 'empty';
    return { key, kind };
  });
});

const statusTitle = computed(() => {
  if (state.value.status === 'lost') return t`撞到了`;
  if (state.value.status === 'paused') return t`已暂停`;
  return t`准备开始`;
});

function save() {
  writeMiniGameSettings(miniGameFields.snake, SnakeSchema, state.value);
}

function randomFood(snake: Point[]) {
  const occupied = new Set(snake.map(point => `${point.x}:${point.y}`));
  const open = Array.from({ length: size * size }, (_, index) => ({
    x: index % size,
    y: Math.floor(index / size),
  })).filter(point => !occupied.has(`${point.x}:${point.y}`));
  return open[Math.floor(Math.random() * open.length)] ?? { x: 0, y: 0 };
}

function newGame() {
  state.value = { ...initialState(state.value.best), speed: state.value.speed };
  queuedDirection.value = state.value.direction;
  save();
}

function setSpeed(speed: SnakeSpeed) {
  state.value.speed = speed;
  restartTimer();
  save();
}

function isOpposite(next: Direction, current: Direction) {
  return (
    (next === 'up' && current === 'down') ||
    (next === 'down' && current === 'up') ||
    (next === 'left' && current === 'right') ||
    (next === 'right' && current === 'left')
  );
}

function setDirection(direction: Direction) {
  if (isOpposite(direction, state.value.direction)) return;
  queuedDirection.value = direction;
}

function nextHead(head: Point, direction: Direction) {
  if (direction === 'up') return { x: head.x, y: head.y - 1 };
  if (direction === 'down') return { x: head.x, y: head.y + 1 };
  if (direction === 'left') return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

function step() {
  if (state.value.status !== 'running') return;
  const head = state.value.snake[0];
  if (!head) return;
  const direction = queuedDirection.value;
  const next = nextHead(head, direction);
  const body = state.value.snake.slice(0, -1);
  const hitWall = next.x < 0 || next.y < 0 || next.x >= size || next.y >= size;
  const hitSelf = body.some(point => point.x === next.x && point.y === next.y);
  if (hitWall || hitSelf) {
    state.value.status = 'lost';
    save();
    return;
  }
  const ate = next.x === state.value.food.x && next.y === state.value.food.y;
  const snake = [next, ...state.value.snake];
  if (!ate) snake.pop();
  const score = state.value.score + (ate ? 10 : 0);
  state.value = {
    ...state.value,
    best: Math.max(state.value.best, score),
    direction,
    food: ate ? randomFood(snake) : state.value.food,
    score,
    snake,
  };
  save();
}

function toggleRun() {
  if (state.value.status === 'lost') newGame();
  state.value.status = state.value.status === 'running' ? 'paused' : 'running';
  save();
}

function directionFromDelta(deltaX: number, deltaY: number): Direction | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) return null;
  return Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? 'right' : 'left') : deltaY > 0 ? 'down' : 'up';
}

function resetPointer() {
  pointerStart.value = null;
}

function onPointerDown(event: PointerEvent) {
  pointerStart.value = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event: PointerEvent) {
  const start = pointerStart.value;
  pointerStart.value = null;
  if (!start) return;
  const direction = directionFromDelta(event.clientX - start.x, event.clientY - start.y);
  if (direction) setDirection(direction);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  const map: Record<string, Direction | undefined> = {
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
  };
  const direction = map[event.key];
  if (!direction) return;
  event.preventDefault();
  setDirection(direction);
}

function restartTimer() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(step, speedMs.value);
}

function startRuntime() {
  restartTimer();
  window.addEventListener('keydown', onKeydown);
}

function stopRuntime() {
  if (timer) window.clearInterval(timer);
  timer = null;
  window.removeEventListener('keydown', onKeydown);
}

onActivated(startRuntime);
onDeactivated(stopRuntime);
onUnmounted(stopRuntime);
</script>

<style scoped>
.pc-snake-board {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 3px;
  width: min(100%, 420px);
  aspect-ratio: 1;
  align-self: center;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-text) 6%, var(--pc-surface-strong) 94%);
  padding: 8px;
  touch-action: none;
}

.pc-snake-cell {
  border-radius: 4px;
  background: color-mix(in srgb, var(--pc-surface) 82%, transparent 18%);
}

.pc-snake-cell[data-kind='body'],
.pc-snake-cell[data-kind='head'] {
  background: var(--pc-theme-accent);
}

.pc-snake-cell[data-kind='head'] {
  box-shadow: inset 0 0 0 2px var(--pc-primary-text);
}

.pc-snake-cell[data-kind='food'] {
  background: var(--pc-danger);
  border-radius: 999px;
}
</style>
