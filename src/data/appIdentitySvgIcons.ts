export type AppIdentitySvgIconDefinition = {
  accent?: readonly string[];
  primary: readonly string[];
  secondary?: readonly string[];
};

export type AppSvgPaper = 'a4' | 'cardstock' | 'parchment' | 'xuan';

export type AppSvgStrokeProfile = {
  accentWidth: number;
  detailWidth: number;
  echo: { dx: number; dy: number; opacity: number; width: number } | null;
  linecap: 'round' | 'square';
  primaryWidth: number;
  texture: 'clean' | 'crayon' | 'engraved' | 'ink';
};

export const APP_SVG_STROKE_PROFILES = {
  a4: {
    accentWidth: 1.9,
    detailWidth: 1.35,
    echo: null,
    linecap: 'round',
    primaryWidth: 1.7,
    texture: 'clean',
  },
  xuan: {
    accentWidth: 2.45,
    detailWidth: 1.25,
    echo: { dx: 0.35, dy: 0.2, opacity: 0.2, width: 2.7 },
    linecap: 'round',
    primaryWidth: 2.05,
    texture: 'ink',
  },
  parchment: {
    accentWidth: 1.85,
    detailWidth: 1.15,
    echo: { dx: 0.4, dy: 0.35, opacity: 0.18, width: 1.25 },
    linecap: 'square',
    primaryWidth: 1.55,
    texture: 'engraved',
  },
  cardstock: {
    accentWidth: 2.75,
    detailWidth: 1.7,
    echo: { dx: -0.45, dy: 0.35, opacity: 0.3, width: 3 },
    linecap: 'round',
    primaryWidth: 2.3,
    texture: 'crayon',
  },
} as const satisfies Record<AppSvgPaper, AppSvgStrokeProfile>;

export const APP_IDENTITY_SVG_ICONS = {
  archive: {
    primary: ['M3 7h7l2 2h9v10H3z'],
    secondary: ['M7 11h9v5h-5l-3 2v-2H7z'],
  },
  favorites: {
    primary: ['M7 3h10v18l-5-3-5 3z'],
    accent: ['M12 7l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z'],
  },
  prompts: {
    primary: ['M6 4h11l2 2v14H6z', 'M17 4v4h2'],
    secondary: ['M9 10h6', 'M9 14h5', 'M9 18h3'],
    accent: ['M4 3l.7 1.6L6.5 5l-1.8.4L4 7l-.7-1.6L1.5 5l1.8-.4z'],
  },
  tutorial: {
    primary: ['M3 5c3-1 6-.5 9 1.5V20c-3-2-6-2.5-9-1.5z', 'M21 5c-3-1-6-.5-9 1.5V20c3-2 6-2.5 9-1.5z'],
    accent: ['M15 10a2 2 0 1 1 2.5 2c-.9.4-1.2.9-1.2 1.6', 'M16.3 16.5h.01'],
  },
  settings: {
    primary: ['M4 6h5', 'M13 6h7', 'M4 12h10', 'M18 12h2', 'M4 18h2', 'M10 18h10'],
    accent: ['M11 4v4', 'M16 10v4', 'M8 16v4'],
  },
  reader: {
    primary: ['M3 5.5c3-1.1 6-.6 9 1.3v12.5c-3-1.9-6-2.4-9-1.3z', 'M21 5.5c-3-1.1-6-.6-9 1.3v12.5c3-1.9 6-2.4 9-1.3z'],
    accent: ['M6 11h4v3H6z', 'M14 11h4v3h-4z', 'M10 12.5h4'],
  },
  diary: {
    primary: ['M5 3h13v18H5z', 'M8 3v18'],
    secondary: ['M11 7h4', 'M11 10h4'],
    accent: ['M12 14h4v4h-4z', 'M13 14v-1a1 1 0 0 1 2 0v1'],
  },
  extras: {
    primary: ['M5 6h12v14H5z', 'M8 3h11v14'],
    secondary: ['M8 10h5', 'M8 14h4'],
    accent: ['M4 19c4-1 8-5 12-13', 'M5 16l3 2', 'M8 12l3 2'],
  },
  theater: {
    primary: ['M3 6c3-2 6-2 9 0v9c-3 4-6 4-9 0z', 'M12 6c3-2 6-2 9 0v9c-3 4-6 4-9 0'],
    secondary: ['M5 10h2', 'M14 10h2'],
    accent: ['M5 14c1.5-1 3-1 4.5 0', 'M15 14c1 1 2 1 3 0'],
  },
  forum: {
    primary: ['M3 4h13v9H9l-4 3v-3H3z', 'M10 16h5l4 3v-3h2V9h-3'],
    secondary: ['M6 8h7', 'M13 12h5'],
  },
  letters: {
    primary: ['M3 7h18v13H3z', 'M3 8l9 7 9-7'],
    secondary: ['M7 3h10v7l-5 4-5-4z', 'M9 6h6'],
  },
  summary: {
    primary: ['M4 4h9v4H4z', 'M4 10h13v4H4z', 'M4 16h16v4H4z'],
    accent: ['M15 5h5', 'M18 3l2 2-2 2', 'M18 11h2', 'M18 17h2'],
  },
  'card-writer': {
    primary: ['M3 5h18v14H3z', 'M6 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0', 'M5 16c.8-2.5 5.2-2.5 6 0'],
    secondary: ['M14 8h4', 'M14 12h3'],
    accent: ['M14 18l4-4 2 2-4 4-3 1z'],
  },
  digest: {
    primary: ['M5 18l8-13 5 3-8 13H5z'],
    secondary: ['M4 21h12'],
    accent: ['M8 17l4 3', 'M15 6l3 2'],
  },
  bagu: {
    primary: ['M3 4h18l-7 8v6l-4 2v-8z'],
    secondary: ['M6 7h2', 'M11 7h2'],
    accent: ['M16 15l5 5', 'M21 15l-5 5'],
  },
  'content-converter': {
    primary: ['M3 4h8v12H3z', 'M13 8h8v12h-8z'],
    secondary: ['M5 8h4', 'M15 12h4'],
    accent: ['M9 18h8', 'M15 16l2 2-2 2', 'M15 6H7', 'M9 4 7 6l2 2'],
  },
  stats: {
    primary: ['M4 20V12h3v8', 'M10 20V5h3v15', 'M16 20v-6h3v6', 'M3 20h18'],
    accent: ['M15 4h6v5h-3l-2 2V9h-1z'],
  },
  'preset-manager': {
    primary: ['M8 5h12', 'M8 12h12', 'M8 19h12'],
    accent: ['M3 5l1.5 1.5L7 4', 'M3 12l1.5 1.5L7 11', 'M3 19l1.5 1.5L7 18'],
  },
  'preset-link': {
    primary: ['M3 5h7v6H6l-3 2z', 'M14 13h7v6h-7z'],
    secondary: ['M15.5 15.5h4', 'M15.5 17.5h3'],
    accent: ['M8 14l8-4', 'M8 11l-1 3 3 1', 'M14 9l3 1-1 3'],
  },
  'worldbook-link': {
    primary: ['M3 5.5c3-1.2 6-.7 9 1.3v12.5c-3-2-6-2.5-9-1.3z', 'M21 5.5c-3-1.2-6-.7-9 1.3v12.5c3-2 6-2.5 9-1.3z'],
    accent: ['M6 10h4l-1.5-1.5', 'M10 10l-1.5 1.5', 'M18 14h-4l1.5-1.5', 'M14 14l1.5 1.5'],
  },
  'world-slots': {
    primary: ['M4 4h16v16H4z', 'M8 4v16', 'M16 4v16'],
    secondary: ['M9.5 7h5v10h-5z'],
    accent: ['M6 2v5l-1-1-1 1V2', 'M14 2v5l-1-1-1 1V2', 'M22 2v5l-1-1-1 1V2'],
  },
  'status-display': {
    primary: ['M3 4h18v16H3z', 'M3 8h18'],
    secondary: ['M6 6h.01', 'M9 6h.01'],
    accent: ['M6 15h3l2-4 3 7 2-4h2'],
  },
  'status-display-settings': {
    primary: ['M3 4h18v16H3z', 'M3 8h18', 'M6 13h8'],
    secondary: ['M6 6h.01', 'M9 6h.01'],
    accent: ['M17 13a3 3 0 1 0 0 6 3 3 0 1 0 0-6', 'M17 11.5v1.5', 'M17 19v1.5', 'M14.5 14.5l-1-1', 'M19.5 17.5l1 1'],
  },
  'mvu-modifier': {
    primary: ['M5 5v14', 'M5 8h6v4h5', 'M5 16h7'],
    secondary: ['M3 3h4v4H3z', 'M14 10h4v4h-4z', 'M10 14h4v4h-4z'],
    accent: ['M15 21l4-4 2 2-4 4-3 1z'],
  },
  'extension-transfer': {
    primary: ['M7 3v5', 'M13 3v5', 'M5 8h10v3a5 5 0 0 1-5 5v3'],
    secondary: ['M16 12h5v8h-8v-5'],
    accent: ['M17 11v5', 'M15 14l2 2 2-2'],
  },
  'script-manager': {
    primary: ['M5 3h11l3 3v15H5z', 'M16 3v5h3'],
    secondary: ['M9 11l-2 2 2 2', 'M15 11l2 2-2 2'],
    accent: ['M14 9l-3 8'],
  },
  'chat-insert': {
    primary: ['M3 4h15v6H8l-3 2v-2H3z', 'M6 15h15v6H9l-3 2z'],
    accent: ['M16 10v6', 'M13 13h6'],
  },
  recovery: {
    primary: ['M5 8h14v9H9l-4 3z'],
    secondary: ['M8 12h6'],
    accent: ['M18 8a6 6 0 1 0 1 8', 'M18 4v4h-4'],
  },
  profiles: {
    primary: ['M4 4h15v16H4z', 'M19 7h2', 'M19 11h2', 'M19 15h2'],
    secondary: ['M7 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0', 'M6 16c.7-2.5 5.3-2.5 6 0', 'M14 8h2', 'M14 12h2'],
  },
  relationship: {
    primary: [
      'M5 7a2 2 0 1 0 0-4 2 2 0 1 0 0 4',
      'M19 12a2 2 0 1 0 0-4 2 2 0 1 0 0 4',
      'M7 21a2 2 0 1 0 0-4 2 2 0 1 0 0 4',
    ],
    secondary: ['M7 6c5 0 7 1 10 4', 'M18 14c-2 4-5 6-9 6'],
    accent: ['M14 8l3 2-3 1', 'M12 20l-3 .5 1.5-2.5'],
  },
  timekeeper: {
    primary: ['M9 5h11v15H9z', 'M9 9h11', 'M12 3v4', 'M17 3v4'],
    secondary: ['M13 13h3', 'M13 16h4'],
    accent: ['M7 18a4 4 0 1 0 0-8 4 4 0 1 0 0 8', 'M7 12v2l1.5 1'],
  },
  workbench: {
    primary: ['M5 4h5v4H5z', 'M14 10h5v4h-5z', 'M5 16h5v4H5z'],
    secondary: ['M10 6h3v6h1', 'M14 12h-2v6h-2'],
    accent: ['M16 17l5 3-5 3z'],
  },
  'app-builder': {
    primary: ['M3 4h13v16H3z', 'M3 8h13'],
    secondary: ['M6 11h3v3H6z', 'M10 15h3v3h-3z'],
    accent: ['M19 12v8', 'M15 16h8'],
  },
  theme: {
    primary: ['M11 3a9 9 0 0 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h1a9 9 0 0 0 1-17'],
    secondary: ['M6 9h.01', 'M9 6h.01', 'M14 7h.01', 'M16 11h.01'],
    accent: ['M15 14h6v6h-6z', 'M18 14v3h3'],
  },
  'file-repository': {
    primary: ['M4 5h16v14H4z', 'M4 9h16'],
    secondary: ['M7 13h5', 'M7 16h4'],
    accent: ['M17 12a4 4 0 1 0 3.5 2', 'M20 11v3h-3'],
  },
  'entry-library': {
    primary: ['M3 8h18v12H3z', 'M5 4h14v4'],
    secondary: ['M7 11h6', 'M7 15h5'],
    accent: ['M16 10h3v7l-1.5-1-1.5 1z', 'M13 18l3-3'],
  },
  'regex-display': {
    primary: ['M8 5H4v14h4', 'M16 5h4v14h-4'],
    secondary: ['M10 9h4', 'M10 15h4'],
    accent: ['M9 12h6', 'M13 10l2 2-2 2'],
  },
  'regex-wizard': {
    primary: ['M5 19L17 7'],
    secondary: ['M4 7H2v10h2', 'M20 7h2v10h-2'],
    accent: ['M15 4l1-2 1 2 2 1-2 1-1 2-1-2-2-1z', 'M18 15l.8 1.8L21 17l-2.2.2L18 19l-.8-1.8L15 17l2.2-.2z'],
  },
  'macro-builder': {
    primary: ['M3 5h9v9H3z'],
    secondary: ['M6 8h.01', 'M9 11h.01', 'M6 11h.01'],
    accent: [
      'M12 9h3c3 0 3-3 6-3',
      'M12 11h4c3 0 2 5 5 5',
      'M12 13h3c3 0 3 5 6 5',
      'M19 4l2 2-2 2',
      'M19 14l2 2-2 2',
      'M19 16l2 2-2 2',
    ],
  },
  'game-2048': {
    primary: ['M3 4h6v6H3z', 'M3 14h6v6H3z', 'M15 9h6v6h-6z'],
    accent: ['M9 7h4', 'M11 5l2 2-2 2', 'M9 17h4', 'M11 15l2 2-2 2'],
  },
  'game-snake': {
    primary: ['M4 5c5 0 3 6 8 6s3 7 8 7'],
    secondary: ['M6 5h.01', 'M10 11h.01', 'M15 13h.01'],
    accent: ['M20 18h.01', 'M21 5h.01'],
  },
  'game-minesweeper': {
    primary: ['M3 3h18v18H3z', 'M3 9h18', 'M9 3v18'],
    secondary: ['M14 14a3 3 0 1 0 6 0 3 3 0 1 0-6 0', 'M17 11V9h2'],
    accent: ['M12 14h2', 'M20 14h2', 'M17 17v2'],
  },
  'game-sudoku': {
    primary: ['M3 3h18v18H3z', 'M9 3v18', 'M15 3v18', 'M3 9h18', 'M3 15h18'],
    secondary: ['M5 6h.01', 'M12 6h.01', 'M18 12h.01', 'M6 18h.01', 'M12 12h.01'],
  },
  'game-nonogram': {
    primary: ['M8 8h13v13H8z', 'M12.3 8v13', 'M16.7 8v13', 'M8 12.3h13', 'M8 16.7h13'],
    secondary: ['M3 11h2', 'M3 15h3', 'M3 19h2', 'M11 3v2', 'M15 3v3', 'M19 3v2'],
    accent: ['M8 8h4.3v4.3H8z', 'M16.7 12.3H21v4.4h-4.3z', 'M12.3 16.7h4.4V21h-4.4z'],
  },
  'game-sliding-puzzle': {
    primary: ['M3 3h18v18H3z', 'M3 9h18', 'M3 15h12', 'M9 3v18', 'M15 3v12'],
    accent: ['M16 18h5', 'M19 16l2 2-2 2'],
  },
  'game-guess-number': {
    primary: ['M3 6h4v5H3z', 'M8 6h4v5H8z', 'M13 6h4v5h-4z', 'M18 6h3v5h-3z'],
    secondary: ['M5 15h10'],
    accent: ['M15 18a3 3 0 1 0 6 0 3 3 0 1 0-6 0', 'M20 20l2 2', 'M17 17h.01'],
  },
  'game-gomoku': {
    primary: ['M3 3h18v18H3z', 'M7.5 3v18', 'M12 3v18', 'M16.5 3v18', 'M3 7.5h18', 'M3 12h18', 'M3 16.5h18'],
    accent: [
      'M5.3 5.3a2.2 2.2 0 1 0 0 .1',
      'M9.8 9.8a2.2 2.2 0 1 0 0 .1',
      'M14.3 14.3a2.2 2.2 0 1 0 0 .1',
      'M18.8 18.8a2.2 2.2 0 1 0 0 .1',
      'M5.3 18.8a2.2 2.2 0 1 0 0 .1',
    ],
  },
  'game-reversi': {
    primary: ['M5 12a7 7 0 1 0 14 0 7 7 0 1 0-14 0', 'M12 5a7 7 0 0 0 0 14'],
    secondary: ['M7 7c3 2 3 8 0 10'],
    accent: ['M18 5a8 8 0 0 1 2 5', 'M18 8l2 2 2-2'],
  },
  'game-solitaire': {
    primary: ['M4 7l11-3 4 15-11 3z', 'M3 5h11v15H3z'],
    secondary: ['M8.5 9l2 3-2 3-2-3z'],
    accent: ['M14 8l2 2-2 2-2-2z'],
  },
} as const satisfies Record<string, AppIdentitySvgIconDefinition>;

export type AppIdentitySvgIconId = keyof typeof APP_IDENTITY_SVG_ICONS;

export const APP_IDENTITY_SVG_ICON_IDS = Object.keys(APP_IDENTITY_SVG_ICONS) as AppIdentitySvgIconId[];

export function getAppIdentitySvgIcon(appId: string): AppIdentitySvgIconDefinition | null {
  return APP_IDENTITY_SVG_ICONS[appId as AppIdentitySvgIconId] ?? null;
}
