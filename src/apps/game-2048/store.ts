import { validateInplace } from '@/util/zod';
// SillyTavern exposes this browser runtime module through the extension bundler.
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { miniGameFields } from './fields';

export const game2048Field = miniGameFields.game2048;

const BoardSchema = z.array(z.array(z.number().int().nonnegative()).length(4)).length(4);

const SnapshotSchema = z.object({
  board: BoardSchema,
  moves: z.number().int().nonnegative().default(0),
  score: z.number().int().nonnegative().default(0),
  status: z.enum(['lost', 'playing', 'won']).default('playing'),
});

export const Game2048SettingsSchema = SnapshotSchema.extend({
  bestScore: z.number().int().nonnegative().default(0),
  keepPlaying: z.boolean().default(false),
  previous: SnapshotSchema.nullable().default(null),
});

export type Game2048Status = z.infer<typeof Game2048SettingsSchema>['status'];
export type Game2048Direction = 'down' | 'left' | 'right' | 'up';

type Board = z.infer<typeof BoardSchema>;
type Snapshot = z.infer<typeof SnapshotSchema>;
type Game2048Settings = z.infer<typeof Game2048SettingsSchema>;

function emptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row]) as Board;
}

function createSnapshot(settings: Game2048Settings): Snapshot {
  return {
    board: cloneBoard(settings.board),
    moves: settings.moves,
    score: settings.score,
    status: settings.status,
  };
}

function boardsEqual(left: Board, right: Board) {
  return left.every((row, rowIndex) => row.every((value, columnIndex) => value === right[rowIndex]?.[columnIndex]));
}

function randomEmptyCell(board: Board) {
  const cells: Array<{ x: number; y: number }> = [];
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) cells.push({ x, y });
    });
  });
  return cells[Math.floor(Math.random() * cells.length)] ?? null;
}

function addRandomTile(board: Board) {
  const cell = randomEmptyCell(board);
  if (!cell) return board;
  const next = cloneBoard(board);
  next[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLine(line: number[]) {
  const compacted = line.filter(Boolean);
  const merged: number[] = [];
  let gained = 0;
  for (let index = 0; index < compacted.length; index += 1) {
    const value = compacted[index];
    if (value && value === compacted[index + 1]) {
      const nextValue = value * 2;
      merged.push(nextValue);
      gained += nextValue;
      index += 1;
    } else {
      merged.push(value ?? 0);
    }
  }
  while (merged.length < 4) merged.push(0);
  return { gained, line: merged.slice(0, 4) };
}

function moveBoard(board: Board, direction: Game2048Direction) {
  const next = emptyBoard();
  let gained = 0;

  for (let index = 0; index < 4; index += 1) {
    const source =
      direction === 'left' || direction === 'right'
        ? [board[index][0], board[index][1], board[index][2], board[index][3]]
        : [board[0][index], board[1][index], board[2][index], board[3][index]];
    const movingLine = direction === 'right' || direction === 'down' ? [...source].reverse() : source;
    const result = slideLine(movingLine);
    const output = direction === 'right' || direction === 'down' ? [...result.line].reverse() : result.line;
    gained += result.gained;

    for (let offset = 0; offset < 4; offset += 1) {
      if (direction === 'left' || direction === 'right') {
        next[index][offset] = output[offset] ?? 0;
      } else {
        next[offset][index] = output[offset] ?? 0;
      }
    }
  }

  return { board: next, gained, moved: !boardsEqual(board, next) };
}

function canMove(board: Board) {
  if (randomEmptyCell(board)) return true;
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const value = board[y][x];
      if (value === board[y]?.[x + 1] || value === board[y + 1]?.[x]) return true;
    }
  }
  return false;
}

function hasWinningTile(board: Board) {
  return board.some(row => row.some(value => value >= 2048));
}

function createNewSettings(bestScore = 0): Game2048Settings {
  const board = addRandomTile(addRandomTile(emptyBoard()));
  return {
    bestScore,
    board,
    keepPlaying: false,
    moves: 0,
    previous: null,
    score: 0,
    status: 'playing',
  };
}

function readSettings(raw: unknown): Game2048Settings {
  const source = raw && typeof raw === 'object' ? raw : {};
  const result = Game2048SettingsSchema.safeParse(source);
  if (!result.success) {
    const bestScore =
      typeof (source as Record<string, unknown>).bestScore === 'number'
        ? Math.max(0, Math.floor((source as Record<string, number>).bestScore))
        : 0;
    return createNewSettings(bestScore);
  }
  const parsed = result.data;
  const hasTile = parsed.board.some(row => row.some(Boolean));
  return hasTile ? parsed : createNewSettings(parsed.bestScore);
}

export const useGame2048Store = defineStore('game2048', () => {
  const settings = ref<Game2048Settings>(readSettings(_.get(extension_settings, game2048Field, {})));

  const board = computed(() => settings.value.board);
  const bestScore = computed(() => settings.value.bestScore);
  const moves = computed(() => settings.value.moves);
  const score = computed(() => settings.value.score);
  const status = computed(() => settings.value.status);
  const canUndo = computed(() => Boolean(settings.value.previous));
  const isPausedOnWin = computed(() => settings.value.status === 'won' && !settings.value.keepPlaying);

  function save() {
    _.set(extension_settings, game2048Field, validateInplace(Game2048SettingsSchema, settings.value));
    void saveSettingsDebounced();
  }

  function startNewGame() {
    settings.value = createNewSettings(settings.value.bestScore);
    save();
  }

  function continueAfterWin() {
    settings.value.keepPlaying = true;
    settings.value.status = canMove(settings.value.board) ? 'playing' : 'lost';
    save();
  }

  function move(direction: Game2048Direction) {
    if (settings.value.status === 'lost' || isPausedOnWin.value) return false;
    const result = moveBoard(settings.value.board, direction);
    if (!result.moved) return false;

    const previous = createSnapshot(settings.value);
    const nextScore = settings.value.score + result.gained;
    const nextBoard = addRandomTile(result.board);
    const nextStatus: Game2048Status =
      !settings.value.keepPlaying && hasWinningTile(nextBoard) ? 'won' : canMove(nextBoard) ? 'playing' : 'lost';

    settings.value = {
      ...settings.value,
      bestScore: Math.max(settings.value.bestScore, nextScore),
      board: nextBoard,
      moves: settings.value.moves + 1,
      previous,
      score: nextScore,
      status: nextStatus,
    };
    save();
    return true;
  }

  function undo() {
    const previous = settings.value.previous;
    if (!previous) return;
    settings.value = {
      ...settings.value,
      board: cloneBoard(previous.board),
      keepPlaying: previous.status === 'won' ? false : settings.value.keepPlaying,
      moves: previous.moves,
      previous: null,
      score: previous.score,
      status: previous.status,
    };
    save();
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, game2048Field, {}));
  }

  return {
    bestScore,
    board,
    canUndo,
    continueAfterWin,
    isPausedOnWin,
    move,
    moves,
    rehydrateFromSettings,
    score,
    startNewGame,
    status,
    undo,
  };
});
