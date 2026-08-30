import { Game2048SettingsSchema } from './store';

const GuessSchema = z.object({
  bulls: z.number().int().min(0).max(6),
  comment: z.string().default(''),
  cows: z.number().int().min(0).max(6),
  value: z.string().regex(/^\d{3,6}$/),
});
export const GuessNumberSchema = z.object({
  answer: z.string().regex(/^[1-9]\d{2,5}$/),
  bestByDigits: z
    .object({
      3: z.number().int().nonnegative().default(0),
      4: z.number().int().nonnegative().default(0),
      5: z.number().int().nonnegative().default(0),
      6: z.number().int().nonnegative().default(0),
    })
    .default({ 3: 0, 4: 0, 5: 0, 6: 0 }),
  digitCount: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(4),
  guesses: z.array(GuessSchema).max(100),
  status: z.enum(['playing', 'won']).default('playing'),
});

const GomokuBoardSchema = z.array(z.union([z.literal(0), z.literal(1), z.literal(2)])).max(225);
const GomokuSnapshotSchema = z.object({
  blackWins: z.number().int().nonnegative().default(0),
  board: GomokuBoardSchema,
  lastMove: z.number().int().min(0).max(224).nullable().default(null),
  status: z.enum(['blackWin', 'draw', 'playing', 'whiteWin']).default('playing'),
  whiteWins: z.number().int().nonnegative().default(0),
});
export const GomokuSchema = GomokuSnapshotSchema.extend({
  boardSize: z.enum(['large', 'medium', 'small']).default('medium'),
  previous: GomokuSnapshotSchema.nullable().default(null),
});

const MinesweeperCellSchema = z.object({
  flag: z.boolean().default(false),
  id: z.number().int().min(0).max(99),
  mine: z.boolean().default(false),
  near: z.number().int().min(0).max(8).default(0),
  open: z.boolean().default(false),
});
export const MinesweeperSchema = z.object({
  boardSize: z.enum(['large', 'medium', 'small']).default('medium'),
  cells: z.array(MinesweeperCellSchema).max(100),
  difficulty: z.enum(['easy', 'hard', 'normal']).default('normal'),
  status: z.enum(['lost', 'playing', 'ready', 'won']).default('ready'),
  wins: z.number().int().nonnegative().default(0),
});

const ReversiBoardSchema = z.array(z.union([z.literal(0), z.literal(1), z.literal(2)])).length(64);
const ReversiSnapshotSchema = z.object({
  board: ReversiBoardSchema,
  draws: z.number().int().nonnegative().default(0),
  losses: z.number().int().nonnegative().default(0),
  moves: z.number().int().nonnegative(),
  status: z.enum(['done', 'playing']),
  turn: z.union([z.literal(1), z.literal(2)]),
  wins: z.number().int().nonnegative().default(0),
});
export const ReversiSchema = ReversiSnapshotSchema.extend({
  previous: ReversiSnapshotSchema.nullable().default(null),
});

const SlidingPuzzleBestSchema = z.object({
  large: z.number().int().nonnegative().default(0),
  medium: z.number().int().nonnegative().default(0),
  small: z.number().int().nonnegative().default(0),
});
export const SlidingPuzzleSchema = z.object({
  best: SlidingPuzzleBestSchema.default({ large: 0, medium: 0, small: 0 }),
  board: z.array(z.number().int().min(0).max(24)).max(25),
  initial: z.array(z.number().int().min(0).max(24)).max(25),
  moves: z.number().int().nonnegative().default(0),
  size: z.enum(['large', 'medium', 'small']).default('small'),
  status: z.enum(['done', 'playing']).default('playing'),
});

const SnakePointSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(11),
});
export const SnakeSchema = z.object({
  best: z.number().int().nonnegative().default(0),
  direction: z.enum(['down', 'left', 'right', 'up']).default('right'),
  food: SnakePointSchema,
  score: z.number().int().nonnegative().default(0),
  snake: z.array(SnakePointSchema).min(1),
  speed: z.enum(['fast', 'normal', 'slow']).default('normal'),
  status: z.enum(['idle', 'lost', 'paused', 'running']).default('idle'),
});

const SolitaireCardSchema = z.object({
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Ace', 'King', 'Queen', 'Jack']),
  suit: z.enum(['Spades', 'Hearts', 'Clubs', 'Diamonds']),
  upturned: z.boolean(),
});
const SolitairePileSchema = z.object({ cards: z.array(SolitaireCardSchema).max(52) });
const SerializedSolitaireSchema = z.object({
  foundation: z.object({
    clubs: SolitairePileSchema,
    diamonds: SolitairePileSchema,
    hearts: SolitairePileSchema,
    spades: SolitairePileSchema,
  }),
  history: z.array(z.json()).default([]),
  stock: SolitairePileSchema,
  tableau: z.object({ piles: z.array(SolitairePileSchema).length(7) }),
  waste: SolitairePileSchema,
});
export const SolitaireSchema = z.object({
  completed: z.boolean().default(false),
  game: SerializedSolitaireSchema,
  moves: z.number().int().nonnegative().default(0),
  previous: SerializedSolitaireSchema.nullable().default(null),
  wins: z.number().int().nonnegative().default(0),
});

const SudokuBoardSchema = z.array(z.number().int().min(0).max(9)).length(81);
export const SudokuSchema = z.object({
  board: SudokuBoardSchema,
  hints: z.number().int().nonnegative().default(0),
  mistakes: z.number().int().nonnegative().default(0),
  puzzle: SudokuBoardSchema,
  puzzleNumber: z.number().int().positive().default(1),
  solution: SudokuBoardSchema,
  status: z.enum(['done', 'playing']).default('playing'),
});

export const MiniGamesBackupSchema = z.object({
  game2048: Game2048SettingsSchema,
  gomoku: GomokuSchema,
  guessNumber: GuessNumberSchema,
  minesweeper: MinesweeperSchema,
  reversi: ReversiSchema,
  slidingPuzzle: SlidingPuzzleSchema,
  snake: SnakeSchema,
  solitaire: SolitaireSchema,
  sudoku: SudokuSchema,
});
