<template>
  <section class="pc-minigame-panel">
    <section class="pc-minigame-stats">
      <article>
        <span>{{ t`棋盘` }}</span
        ><strong>{{ size }}×{{ size }}</strong>
      </article>
      <article>
        <span>{{ t`完成` }}</span
        ><strong>{{ correctCount }}/{{ targetCount }}</strong>
      </article>
      <article>
        <span>{{ t`步数` }}</span
        ><strong>{{ state.moves }}</strong>
      </article>
    </section>

    <div class="pc-minigame-segment pc-minigame-segment-three" role="group" aria-label="数织棋盘大小">
      <button
        v-for="option in sizeOptions"
        :key="option.id"
        class="pc-segment-btn"
        :class="{ active: state.size === option.id }"
        type="button"
        @click="setSize(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="pc-minigame-segment" role="group" aria-label="数织填写模式">
      <button class="pc-segment-btn" :class="{ active: mode === 'fill' }" type="button" @click="mode = 'fill'">
        <i class="fa-solid fa-square"></i><span>{{ t`填格` }}</span>
      </button>
      <button class="pc-segment-btn" :class="{ active: mode === 'mark' }" type="button" @click="mode = 'mark'">
        <i class="fa-solid fa-xmark"></i><span>{{ t`标记` }}</span>
      </button>
    </div>

    <div class="pc-nonogram-wrap" :data-size="state.size" :style="boardStyle">
      <div class="pc-nonogram-corner"></div>
      <div class="pc-nonogram-column-clues">
        <span v-for="(clue, index) in columnClues" :key="index">{{ clue.join('\n') }}</span>
      </div>
      <div class="pc-nonogram-row-clues">
        <span v-for="(clue, index) in rowClues" :key="index">{{ clue.join(' ') }}</span>
      </div>
      <section class="pc-nonogram-board" aria-label="数织棋盘">
        <button
          v-for="(cell, index) in state.marks"
          :key="index"
          class="pc-nonogram-cell"
          :data-column="index % size"
          :data-mark="cell"
          :data-row="Math.floor(index / size)"
          type="button"
          @click="toggleCell(index, mode)"
          @contextmenu.prevent="toggleCell(index, mode === 'fill' ? 'mark' : 'fill')"
        >
          <i v-if="cell === 2" class="fa-solid fa-xmark"></i>
        </button>
      </section>
    </div>

    <article v-if="state.status === 'done'" class="pc-section-card pc-minigame-message">
      <strong>{{ t`图案完成` }}</strong>
    </article>

    <div class="pc-form-actions pc-minigame-actions">
      <button class="pc-soft-btn" type="button" @click="resetPuzzle">
        <i class="fa-solid fa-rotate-left"></i><span>{{ t`重置` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="newPuzzle">
        <i class="fa-solid fa-wand-magic-sparkles"></i><span>{{ t`新题` }}</span>
      </button>
      <InfoHint
        :label="t`数织说明`"
        :text="
          t`根据行列旁的连续数字填黑格。数字表示连续黑格长度，不同数字组之间至少隔一个空格；长按格子可快速使用另一种标记。`
        "
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { miniGameFields } from './fields';
import { readMiniGameSettings, writeMiniGameSettings } from './miniGameStorage';

type BoardSize = 'large' | 'medium' | 'small';
type MarkMode = 'fill' | 'mark';

const sizeOptions: Array<{ dimension: number; id: BoardSize; label: string }> = [
  { dimension: 5, id: 'small', label: '小 5×5' },
  { dimension: 10, id: 'medium', label: '中 10×10' },
  { dimension: 15, id: 'large', label: '大 15×15' },
];
const NonogramSchema = z.object({
  marks: z.array(z.number().int().min(0).max(2)).max(225),
  moves: z.number().int().nonnegative().default(0),
  size: z.enum(['large', 'medium', 'small']).default('small'),
  solution: z.array(z.boolean()).max(225),
  status: z.enum(['done', 'playing']).default('playing'),
});
type NonogramState = z.infer<typeof NonogramSchema>;

function dimensionFor(boardSize: BoardSize) {
  return sizeOptions.find(option => option.id === boardSize)?.dimension ?? 5;
}

function generateSolution(size: number) {
  const cells = Array.from({ length: size * size }, () => false);
  let filledCount = 0;
  const setCell = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = y * size + x;
    if (!cells[index]) {
      cells[index] = true;
      filledCount += 1;
    }
  };
  const setSymmetricCell = (x: number, y: number) => {
    setCell(x, y);
    setCell(size - 1 - x, y);
  };
  const halfWidth = Math.ceil(size / 2);
  const centerX = halfWidth - 1;
  const targetCount = Math.round(size * size * (0.38 + Math.random() * 0.1));

  for (let row = 0; row < size; row += 1) setSymmetricCell(centerX, row);

  let x = centerX;
  let y = Math.floor(size / 2);
  let attempts = 0;
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (filledCount < targetCount && attempts < size * size * 30) {
    setSymmetricCell(x, y);
    if (filledCount < targetCount && Math.random() < 0.12) {
      setSymmetricCell(x, y + (Math.random() < 0.5 ? -1 : 1));
    }
    const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
    x = Math.max(0, Math.min(halfWidth - 1, x + dx));
    y = Math.max(0, Math.min(size - 1, y + dy));
    attempts += 1;
  }

  for (let row = 0; row < size; row += 1) {
    if (!cells.slice(row * size, row * size + size).some(Boolean)) setSymmetricCell(centerX, row);
  }
  return cells;
}

function createState(boardSize: BoardSize = 'small'): NonogramState {
  const size = dimensionFor(boardSize);
  return {
    marks: Array.from({ length: size * size }, () => 0),
    moves: 0,
    size: boardSize,
    solution: generateSolution(size),
    status: 'playing',
  };
}

function normalizeState(value: NonogramState) {
  const expected = dimensionFor(value.size) ** 2;
  return value.marks.length === expected && value.solution.length === expected ? value : createState(value.size);
}

const state = ref<NonogramState>(
  normalizeState(readMiniGameSettings(miniGameFields.nonogram, NonogramSchema, () => createState())),
);
const mode = ref<MarkMode>('fill');
const size = computed(() => dimensionFor(state.value.size));
const targetCount = computed(() => state.value.solution.filter(Boolean).length);
const correctCount = computed(
  () => state.value.marks.filter((mark, index) => mark === 1 && state.value.solution[index]).length,
);
const clueLayout = computed(() => ({
  fontSize: state.value.size === 'large' ? '8px' : state.value.size === 'medium' ? '9px' : '11px',
  gutter: state.value.size === 'large' ? '82px' : state.value.size === 'medium' ? '68px' : '52px',
}));
const boardStyle = computed(() => ({
  '--nonogram-clue-font-size': clueLayout.value.fontSize,
  '--nonogram-clue-size': clueLayout.value.gutter,
  '--nonogram-size': size.value,
}));

function cluesFor(line: boolean[]) {
  const clues: number[] = [];
  let run = 0;
  line.forEach((filled, index) => {
    if (filled) run += 1;
    if ((!filled || index === line.length - 1) && run) {
      clues.push(run);
      run = 0;
    }
  });
  return clues.length ? clues : [0];
}

const rowClues = computed(() =>
  Array.from({ length: size.value }, (_, row) =>
    cluesFor(state.value.solution.slice(row * size.value, row * size.value + size.value)),
  ),
);
const columnClues = computed(() =>
  Array.from({ length: size.value }, (_, column) =>
    cluesFor(Array.from({ length: size.value }, (_, row) => Boolean(state.value.solution[row * size.value + column]))),
  ),
);

function save() {
  writeMiniGameSettings(miniGameFields.nonogram, NonogramSchema, state.value);
}

function checkDone() {
  state.value.status = state.value.solution.every((filled, index) =>
    filled ? state.value.marks[index] === 1 : state.value.marks[index] !== 1,
  )
    ? 'done'
    : 'playing';
}

function toggleCell(index: number, nextMode: MarkMode) {
  if (state.value.status === 'done') return;
  const nextMark = nextMode === 'fill' ? 1 : 2;
  state.value.marks[index] = state.value.marks[index] === nextMark ? 0 : nextMark;
  state.value.moves += 1;
  checkDone();
  save();
}

function resetPuzzle() {
  state.value.marks = Array.from({ length: size.value * size.value }, () => 0);
  state.value.moves = 0;
  state.value.status = 'playing';
  save();
}

function newPuzzle() {
  state.value = createState(state.value.size);
  save();
}

function setSize(boardSize: BoardSize) {
  state.value = createState(boardSize);
  save();
}
</script>

<style scoped>
.pc-nonogram-wrap {
  display: grid;
  grid-template-columns: var(--nonogram-clue-size) minmax(0, 1fr);
  grid-template-rows: var(--nonogram-clue-size) auto;
  box-sizing: border-box;
  width: 100%;
  max-width: 440px;
  min-width: 0;
  align-self: center;
  container-type: inline-size;
  overflow: hidden;
}

.pc-nonogram-corner {
  border-right: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
}

.pc-nonogram-column-clues,
.pc-nonogram-row-clues {
  display: grid;
  min-width: 0;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: var(--nonogram-clue-font-size);
  font-weight: 800;
  line-height: 1.05;
}

.pc-nonogram-column-clues {
  grid-template-columns: repeat(var(--nonogram-size), minmax(0, 1fr));
}

.pc-nonogram-column-clues span {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: center;
  border-bottom: 1px solid var(--pc-border);
  white-space: pre-line;
  text-align: center;
  padding-bottom: 3px;
}

.pc-nonogram-row-clues {
  grid-template-rows: repeat(var(--nonogram-size), minmax(0, 1fr));
}

.pc-nonogram-row-clues span {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  border-right: 1px solid var(--pc-border);
  padding-right: 4px;
  white-space: nowrap;
}

.pc-nonogram-board {
  display: grid;
  grid-template-columns: repeat(var(--nonogram-size), minmax(0, 1fr));
  grid-template-rows: repeat(var(--nonogram-size), minmax(0, 1fr));
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--pc-text) 72%, var(--pc-border) 28%);
  background: color-mix(in srgb, var(--pc-text) 22%, var(--pc-border) 78%);
  gap: 1px;
  overflow: hidden;
}

.pc-nonogram-cell {
  display: grid;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border: 0;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  cursor: pointer;
  padding: 0;
}

.pc-nonogram-wrap:not([data-size='small']) .pc-nonogram-cell[data-column='4'],
.pc-nonogram-wrap[data-size='large'] .pc-nonogram-cell[data-column='9'] {
  border-right: 1px solid color-mix(in srgb, var(--pc-text) 68%, var(--pc-border) 32%);
}

.pc-nonogram-wrap:not([data-size='small']) .pc-nonogram-cell[data-row='4'],
.pc-nonogram-wrap[data-size='large'] .pc-nonogram-cell[data-row='9'] {
  border-bottom: 1px solid color-mix(in srgb, var(--pc-text) 68%, var(--pc-border) 32%);
}

.pc-nonogram-cell[data-mark='1'] {
  background: var(--pc-text);
}

.pc-nonogram-cell i {
  font-size: clamp(7px, 2.5cqw, 13px);
}
</style>
