<template>
  <section class="pc-game2048-app">
    <section class="pc-game2048-page">
      <template v-if="activeGame === '2048'">
        <section class="pc-game2048-score-grid">
          <article class="pc-game2048-score-card">
            <span>{{ t`分数` }}</span>
            <strong>{{ score }}</strong>
          </article>
          <article class="pc-game2048-score-card">
            <span>{{ t`最高` }}</span>
            <strong>{{ bestScore }}</strong>
          </article>
          <article class="pc-game2048-score-card">
            <span>{{ t`步数` }}</span>
            <strong>{{ moves }}</strong>
          </article>
          <article class="pc-game2048-score-card">
            <span>{{ t`最大` }}</span>
            <strong>{{ maxTile }}</strong>
          </article>
        </section>

        <section
          class="pc-game2048-board"
          tabindex="0"
          :aria-label="t`2048 棋盘`"
          @pointercancel="resetPointer"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
        >
          <div v-for="cell in cells" :key="cell.key" class="pc-game2048-cell">
            <span
              v-if="cell.value"
              class="pc-game2048-tile"
              :data-large="cell.value >= 1024"
              :style="tileStyle(cell.value)"
            >
              {{ cell.value }}
            </span>
          </div>
        </section>

        <article v-if="status !== 'playing'" class="pc-section-card pc-game2048-status">
          <strong>{{ statusTitle }}</strong>
          <div class="pc-form-actions pc-game2048-status-actions">
            <button v-if="isPausedOnWin" class="pc-soft-btn" type="button" @click="game.continueAfterWin()">
              <i class="fa-solid fa-play"></i>
              <span>{{ t`继续挑战` }}</span>
            </button>
            <button class="pc-primary-btn" type="button" @click="game.startNewGame()">
              <i class="fa-solid fa-rotate-right"></i>
              <span>{{ t`再来一局` }}</span>
            </button>
          </div>
        </article>

        <div class="pc-form-actions pc-game2048-actions">
          <button class="pc-soft-btn" type="button" :disabled="!canUndo" @click="game.undo()">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`撤回` }}</span>
          </button>
          <InfoHint :label="t`2048 说明`" :text="t`在棋盘上滑动，或使用电脑方向键移动数字；相同数字相撞后会合并。`" />
        </div>
      </template>

      <SnakeGame v-else-if="activeGame === 'snake'" />
      <MinesweeperGame v-else-if="activeGame === 'minesweeper'" />
      <SudokuGame v-else-if="activeGame === 'sudoku'" />
      <NonogramGame v-else-if="activeGame === 'nonogram'" />
      <SlidingPuzzleGame v-else-if="activeGame === 'sliding-puzzle'" />
      <GuessNumberGame v-else-if="activeGame === 'guess-number'" />
      <GomokuGame v-else-if="activeGame === 'gomoku'" />
      <ReversiGame v-else-if="activeGame === 'reversi'" />
      <SolitaireGame v-else-if="activeGame === 'solitaire'" />
    </section>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import GomokuGame from './GomokuGame.vue';
import GuessNumberGame from './GuessNumberGame.vue';
import MinesweeperGame from './MinesweeperGame.vue';
import NonogramGame from './NonogramGame.vue';
import ReversiGame from './ReversiGame.vue';
import SnakeGame from './SnakeGame.vue';
import SlidingPuzzleGame from './SlidingPuzzleGame.vue';
import SolitaireGame from './SolitaireGame.vue';
import SudokuGame from './SudokuGame.vue';
import { useGame2048Store, type Game2048Direction } from './store';
import { getMiniGameIdByAppId } from '@/data/miniGameApps';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const { currentRoute } = storeToRefs(phone);
const activeGame = computed(() => getMiniGameIdByAppId(currentRoute.value.appId));
const game = useGame2048Store();
const { bestScore, board, canUndo, isPausedOnWin, moves, score, status } = storeToRefs(game);
const pointerStart = ref<{ x: number; y: number } | null>(null);

const cells = computed(() =>
  board.value.flatMap((row, y) => row.map((value, x) => ({ key: `${x}:${y}`, value, x, y }))),
);
const maxTile = computed(() => Math.max(...board.value.flatMap(row => row), 0));

const statusTitle = computed(() => (status.value === 'won' ? t`合成 2048 了` : t`没有可移动格子`));

function tileStyle(value: number) {
  const rank = Math.max(1, Math.log2(value));
  const hue = Math.round((rank * 34 + 18) % 360);
  const saturation = Math.min(86, 48 + rank * 4);
  const lightness = Math.max(42, 82 - rank * 4);
  return {
    '--tile-bg': `hsl(${hue} ${saturation}% ${lightness}%)`,
    '--tile-text': lightness < 58 ? 'var(--pc-primary-text)' : 'var(--pc-text)',
  };
}

function moveFromDelta(deltaX: number, deltaY: number): Game2048Direction | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < 24) return null;
  if (absX > absY) return deltaX > 0 ? 'right' : 'left';
  return deltaY > 0 ? 'down' : 'up';
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
  const direction = moveFromDelta(event.clientX - start.x, event.clientY - start.y);
  if (direction) game.move(direction);
}

function onKeydown(event: KeyboardEvent) {
  if (activeGame.value !== '2048') return;
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  const keyMap: Record<string, Game2048Direction | undefined> = {
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
  };
  const direction = keyMap[event.key];
  if (!direction) return;
  event.preventDefault();
  game.move(direction);
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.pc-game2048-app,
.pc-game2048-page {
  min-height: 100%;
}

.pc-game2048-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-game2048-score-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.pc-game2048-score-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
  padding: 10px 12px;
}

.pc-game2048-score-card span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-game2048-score-card strong {
  overflow: hidden;
  font-size: 17px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-game2048-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: min(100%, 420px);
  aspect-ratio: 1;
  align-self: center;
  border: 1px solid var(--pc-border);
  border-radius: calc(var(--pc-card-radius) + 2px);
  outline: none;
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, var(--pc-surface-strong) 90%);
  padding: 8px;
  touch-action: none;
  user-select: none;
}

.pc-game2048-cell {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border-radius: calc(var(--pc-control-radius) - 2px);
  background: color-mix(in srgb, var(--pc-surface) 62%, transparent 38%);
  overflow: hidden;
}

.pc-game2048-tile {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: inherit;
  background: var(--tile-bg);
  color: var(--tile-text);
  font-size: clamp(20px, 9cqw, 34px);
  font-weight: 800;
  line-height: 1;
}

.pc-game2048-tile[data-large='true'] {
  font-size: clamp(16px, 7cqw, 27px);
}

.pc-game2048-status {
  display: grid;
  gap: 8px;
}

.pc-game2048-actions,
.pc-game2048-status-actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.pc-game2048-status-actions > .pc-primary-btn,
.pc-game2048-status-actions > .pc-soft-btn {
  flex: 1 1 0;
  min-inline-size: 0;
  white-space: nowrap;
}
</style>

<style>
.pc-minigame-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.pc-minigame-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-minigame-stats article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
  padding: 10px 12px;
}

.pc-minigame-stats span {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-minigame-stats strong {
  overflow: hidden;
  font-size: 17px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-minigame-message {
  display: grid;
  gap: 8px;
}

.pc-minigame-actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.pc-minigame-actions > .pc-primary-btn,
.pc-minigame-actions > .pc-soft-btn {
  flex: 1 1 0;
  min-inline-size: 0;
  white-space: nowrap;
}

.pc-minigame-stats-four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
}

.pc-minigame-stats-four article {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding-inline: 8px;
}

.pc-minigame-stats-four article + article {
  border-left: 1px solid var(--pc-border);
}

.pc-minigame-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-minigame-segment-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pc-minigame-segment .pc-segment-btn {
  justify-content: center;
}

.pc-minigame-segment .pc-segment-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  color: var(--pc-theme-accent);
}
</style>
