export type AppIdentitySvgArtwork = {
  accent?: readonly string[];
  fills?: readonly string[];
  primary: readonly string[];
  secondary?: readonly string[];
};

export type AppSvgPaper =
  'a4' | 'graphite' | 'parchment' | 'velvet' | 'xuan' | 'cypress' | 'sky' | 'ocean' | 'cardstock';

export type AppIdentitySvgIconDefinition = AppIdentitySvgArtwork & {
  paperVariants?: Partial<Record<AppSvgPaper, AppIdentitySvgArtwork>>;
};

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
  graphite: {
    accentWidth: 1.9,
    detailWidth: 1.35,
    echo: { dx: 0.25, dy: 0.2, opacity: 0.18, width: 2.1 },
    linecap: 'round',
    primaryWidth: 1.8,
    texture: 'clean',
  },
  velvet: {
    accentWidth: 1.85,
    detailWidth: 1.15,
    echo: { dx: 0.4, dy: 0.35, opacity: 0.18, width: 1.25 },
    linecap: 'square',
    primaryWidth: 1.55,
    texture: 'engraved',
  },
  cypress: {
    accentWidth: 2.45,
    detailWidth: 1.25,
    echo: { dx: 0.35, dy: 0.2, opacity: 0.2, width: 2.7 },
    linecap: 'round',
    primaryWidth: 2.05,
    texture: 'ink',
  },
  sky: {
    accentWidth: 2.55,
    detailWidth: 1.55,
    echo: { dx: -0.35, dy: 0.3, opacity: 0.22, width: 2.7 },
    linecap: 'round',
    primaryWidth: 2.15,
    texture: 'crayon',
  },
  ocean: {
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
    paperVariants: {
      a4: {
        primary: [
          'M3 5.5c3-1.1 6-.6 9 1.3v12.5c-3-1.9-6-2.4-9-1.3z',
          'M21 5.5c-3-1.1-6-.6-9 1.3v12.5c3-1.9 6-2.4 9-1.3z',
        ],
        secondary: ['M6 9h4', 'M14 9h4'],
        accent: ['M5.5 12h4v3h-4z', 'M14.5 12h4v3h-4z', 'M9.5 13.5h5'],
      },
      xuan: {
        fills: [
          'M3.2 5.8c2.7-1.6 5.7-1.1 8.4 1.1l-.5 2.2C8.4 7.6 6 7.4 3.4 8.4z',
          'M20.8 5.3c-2.5-1-5.5-.3-8.1 1.8l.4 2.1c2.5-1.5 4.8-1.8 7.5-1.1z',
        ],
        primary: [
          'M3.2 5.8c3-1.7 5.9-.9 8.4 1.1l-.4 12c-2.6-1.8-5.3-2.6-8.6-.9',
          'M20.8 5.3c-2.8-1.2-5.5-.1-8.1 1.8l.3 12.2c2.5-2.1 5-2.7 8.3-1.4',
        ],
        secondary: ['M5 10c1.7-.7 3.3-.5 5 .3', 'M14 10c1.7-.8 3.3-.9 5-.2'],
        accent: [
          'M5.3 12.3c1.4-.6 3.4-.4 4.6.5l-.3 2.7c-1.4-.7-2.9-.8-4.4-.2z',
          'M14.4 12.4c1.2-.8 3.1-.9 4.5-.3l-.1 2.8c-1.5-.4-2.9-.2-4.3.5z',
        ],
      },
      parchment: {
        primary: ['M4 4h7l1 2 1-2h7v15H4z', 'M12 6v14', 'M4 19c3-1 5-.7 8 1', 'M20 19c-3-1-5-.7-8 1'],
        secondary: ['M6 8h4', 'M14 8h4', 'M6 17h4', 'M14 17h4'],
        accent: ['M5.5 11h4v3h-4z', 'M14.5 11h4v3h-4z', 'M9.5 12.5h5', 'M6 5l1 2', 'M18 5l-1 2'],
      },
      cardstock: {
        fills: ['M3 5h8v13H3z', 'M13 5h8v13h-8z', 'M5 10h5v5H5z', 'M14 10h5v5h-5z'],
        primary: ['M3 5l8 2v11l-8-1z', 'M21 5l-8 2v11l8-1z'],
        secondary: ['M6 7h3', 'M15 7h3'],
        accent: ['M10 12h4', 'M7.5 12.5h.01', 'M16.5 12.5h.01'],
      },
    },
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
    paperVariants: {
      a4: {
        primary: ['M3 6c3-2 6-2 9 0v9c-3 4-6 4-9 0z', 'M12 6c3-2 6-2 9 0v9c-3 4-6 4-9 0'],
        secondary: ['M5 10h2', 'M14 10h2'],
        accent: ['M5 14c1.5-1 3-1 4.5 0', 'M15 14c1 1 2 1 3 0'],
      },
      xuan: {
        fills: [
          'M4 4c3-2 6-.8 8 1.7l-1.3 3C8 6.7 6 6.5 3.3 8z',
          'M20 4.5c-2.9-1.7-5.8-.5-7.8 1.8l1.2 3c2.2-2.2 4.4-2.5 7.2-1.1z',
          'M10.5 16.8c.8 1.5 2.1 2.6 3.5 3.2l-2.5.8z',
        ],
        primary: [
          'M3.5 5.5c2.8-2.4 5.7-1.6 8.3.8l-1 9.3c-2.5 3.7-5.4 3.5-7.8-.5',
          'M20.5 5.6c-2.8-2.2-5.6-1.2-8.2.8l1 9.2c2.4 3.5 5.2 3.3 7.7-.7',
        ],
        secondary: ['M5 10c.8-.5 1.6-.5 2.4 0', 'M15 10c.8-.6 1.6-.6 2.5-.1'],
        accent: ['M5 14c1.7-1.5 3.5-1.4 5.1-.1', 'M14 13.5c1.4 1.5 3 1.6 4.6.2', 'M2.5 20c5-1.2 13-1 19 .1'],
      },
      parchment: {
        primary: [
          'M3 4h18v16H3z',
          'M5 6h14v10H5z',
          'M7 7c2-1 4-.7 5 .6v5.8c-1.4 2.3-3.5 2.2-5-.2z',
          'M12 7.6c1.6-1.3 3.7-1.6 5-.6v6.2c-1.5 2.4-3.6 2.5-5 .2z',
        ],
        secondary: ['M3 4l2 2', 'M21 4l-2 2', 'M3 20l2-2', 'M21 20l-2-2'],
        accent: ['M8 10h1.5', 'M14.5 10H16', 'M8 13c1-.7 2-.7 3 0', 'M14 13c1 .8 2 .8 3 0'],
      },
      cardstock: {
        fills: ['M2 4h20v4H2z', 'M3 8h4v12H3z', 'M17 8h4v12h-4z', 'M7 17h10v3H7z'],
        primary: ['M7 7c2-2 4-2 5 0v7c-2 3-4 3-5 0z', 'M12 7c2-2 4-2 5 0v7c-2 3-4 3-5 0z'],
        secondary: ['M8.5 10h1', 'M14.5 10h1'],
        accent: ['M8 13c1-.7 2-.7 3 0', 'M14 13c1 .8 2 .8 3 0'],
      },
    },
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
    paperVariants: {
      a4: {
        primary: ['M8 5h12', 'M8 12h12', 'M8 19h12'],
        secondary: ['M9 7h7', 'M9 14h9'],
        accent: ['M3 5l1.5 1.5L7 4', 'M3 12l1.5 1.5L7 11', 'M3 19l1.5 1.5L7 18'],
      },
      xuan: {
        fills: [
          'M3.5 2.8c1.8-.6 3.6.4 3.8 2s-1.1 3-2.7 3.1-3-1.1-2.8-2.8.3-2.7.6-2.3z',
          'M18.5 17c1.3-.3 2.6.3 2.7 1.6s-.8 2.3-2 2.3-2.5-.8-2.3-2.1.6-1.5 1.6-1.8z',
        ],
        primary: ['M9 5c3.5-.9 7-.7 11 .1', 'M8.5 12c4-1 8-.8 12 .2', 'M8 19c4-1.1 8-.9 12.5.1'],
        secondary: ['M10 7c2-.4 4-.4 6 .1', 'M10 14c2.5-.5 5-.4 7 .1'],
        accent: ['M2.8 5.2l1.4 1.6 3.2-3.1', 'M2.5 12.3l1.7 1.5 3.1-3.3', 'M2.6 19.1l1.5 1.4 3.3-3'],
      },
      parchment: {
        primary: ['M4 3h16v18H4z', 'M8 7h9', 'M8 12h9', 'M8 17h9'],
        secondary: ['M6 5v14', 'M18 5v14', 'M4 5h16', 'M4 19h16'],
        accent: ['M5.5 7l1 1 1.5-2', 'M5.5 12l1 1 1.5-2', 'M5.5 17l1 1 1.5-2'],
      },
      cardstock: {
        fills: ['M3 3h5v5H3z', 'M3 10h5v5H3z', 'M3 17h5v5H3z', 'M11 4h10v3H11z', 'M11 11h8v3h-8z', 'M11 18h10v3H11z'],
        primary: ['M4 5l1 1 2-2', 'M4 12l1 1 2-2', 'M4 19l1 1 2-2'],
        accent: ['M10 8h4', 'M10 15h6'],
      },
    },
  },
  'preset-link': {
    primary: ['M3 5h7v6H6l-3 2z', 'M14 13h7v6h-7z'],
    secondary: ['M15.5 15.5h4', 'M15.5 17.5h3'],
    accent: ['M8 14l8-4', 'M8 11l-1 3 3 1', 'M14 9l3 1-1 3'],
    paperVariants: {
      a4: {
        primary: ['M3 4h8v7H7l-4 3z', 'M13 13h8v7h-8z'],
        secondary: ['M5 7h4', 'M15 16h4'],
        accent: ['M8 15l8-6', 'M8 11l-1 4 4 .5', 'M13 8.5l4 .5-.8 4'],
      },
      xuan: {
        fills: [
          'M2.8 4.2c2.8-.8 5.8-.7 8.5.2l-.7 3c-2.4-.6-4.9-.7-7.4 0z',
          'M13 15c2.5-.9 5.4-1 8.2-.1l-.3 3c-2.4-.7-5-.6-7.5.1z',
        ],
        primary: ['M3 4c3-.8 5.8-.5 8.3.5l-.5 7-4-.2-3.8 3z', 'M13.2 13c2.5-.7 5.2-.6 7.8.2l.2 7-8.2-.2z'],
        secondary: ['M5 7c1.5-.3 3-.2 4.5.2', 'M15 16.5c1.4-.3 2.8-.2 4.2.1'],
        accent: ['M7 16c2.5-5 6.5-7 11-8', 'M7 12l-.2 4 4-.2', 'M15 6.8l3 1.2-.7 3.2'],
      },
      parchment: {
        primary: ['M3 4h8v7H7l-4 3z', 'M13 13h8v7h-8z', 'M5 6h4', 'M15 16h4'],
        secondary: ['M3 4l2 2', 'M11 4 9 6', 'M13 13l2 2', 'M21 13l-2 2'],
        accent: ['M8 16c0-3 2-5 5-5h3', 'M13 8h3v3', 'M7 14l1 2 2-1'],
      },
      cardstock: {
        fills: ['M2 3h10v9H7l-5 4z', 'M12 12h10v9H12z', 'M8 13h3v3H8z', 'M13 8h3v3h-3z'],
        primary: ['M5 7h4', 'M15 16h4'],
        accent: ['M9.5 14.5l5-5', 'M8 12l1.5 2.5L12 14', 'M12 10l2.5-.5L15 12'],
      },
    },
  },
  'worldbook-link': {
    primary: ['M3 5.5c3-1.2 6-.7 9 1.3v12.5c-3-2-6-2.5-9-1.3z', 'M21 5.5c-3-1.2-6-.7-9 1.3v12.5c3-2 6-2.5 9-1.3z'],
    accent: ['M6 10h4l-1.5-1.5', 'M10 10l-1.5 1.5', 'M18 14h-4l1.5-1.5', 'M14 14l1.5 1.5'],
    paperVariants: {
      a4: {
        primary: ['M3 5.5c3-1.2 6-.7 9 1.3v12.5c-3-2-6-2.5-9-1.3z', 'M21 5.5c-3-1.2-6-.7-9 1.3v12.5c3-2 6-2.5 9-1.3z'],
        secondary: ['M6 8h4', 'M14 16h4'],
        accent: ['M6 11h4l-1.5-1.5', 'M10 11l-1.5 1.5', 'M18 13h-4l1.5-1.5', 'M14 13l1.5 1.5'],
      },
      xuan: {
        fills: [
          'M2.8 5.8c3-1.8 6.1-1 8.9 1.2l-.5 2.5c-2.8-1.7-5.4-2.2-8.3-.8z',
          'M21.2 5.2c-3-1.4-6-.4-8.7 1.8l.5 2.4c2.6-1.7 5.2-2.2 8.2-1.2z',
        ],
        primary: [
          'M2.8 5.8c3.2-1.9 6.2-.9 8.9 1.2l-.4 12c-2.7-1.9-5.5-2.7-8.8-.9',
          'M21.2 5.2c-3.1-1.5-6-.3-8.7 1.8l.4 12.2c2.6-2.1 5.4-2.8 8.8-1.4',
        ],
        secondary: ['M5 9.5c1.7-.6 3.4-.4 5 .4', 'M14 14.5c1.6-.8 3.3-.9 5-.3'],
        accent: ['M5 13c3-2 5-2 7-.2s4 1.8 7-.5', 'M6 11l-1 2 2 .7', 'M18 14.5l1-2-2-.7'],
      },
      parchment: {
        primary: ['M3 4h8l1 2 1-2h8v15h-7l-2 2-2-2H3z', 'M12 6v15'],
        secondary: ['M5 7h5', 'M14 7h5', 'M5 17h5', 'M14 17h5'],
        accent: ['M6 11h4', 'M8 9l2 2-2 2', 'M18 13h-4', 'M16 11l-2 2 2 2'],
      },
      cardstock: {
        fills: ['M2 4h9v15l-9-2z', 'M13 4h9v13l-9 2z', 'M6 10h5v3H6z', 'M13 12h5v3h-5z'],
        primary: ['M2 4l9 3v12l-9-2z', 'M22 4l-9 3v12l9-2z'],
        secondary: ['M5 7h4', 'M15 7h4'],
        accent: ['M7 11h4l-2-2', 'M17 14h-4l2 2'],
      },
    },
  },
  'world-slots': {
    primary: ['M4 4h16v16H4z', 'M8 4v16', 'M16 4v16'],
    secondary: ['M9.5 7h5v10h-5z'],
    accent: ['M6 2v5l-1-1-1 1V2', 'M14 2v5l-1-1-1 1V2', 'M22 2v5l-1-1-1 1V2'],
    paperVariants: {
      a4: {
        primary: ['M4 4h16v16H4z', 'M8 4v16', 'M16 4v16'],
        secondary: ['M9.5 7h5v10h-5z'],
        accent: ['M6 2v5l-1-1-1 1V2', 'M14 2v5l-1-1-1 1V2', 'M22 2v5l-1-1-1 1V2'],
      },
      xuan: {
        fills: [
          'M4 3c1.2-.5 2.4-.4 3.5.2l-.4 17c-1.1.6-2.2.5-3.3 0z',
          'M9.2 4c1.2-.7 2.5-.6 3.7 0l-.2 16c-1.2.7-2.4.6-3.6 0z',
          'M14.8 3.4c1.4-.6 2.7-.5 4 .2l.3 16.5c-1.3.6-2.7.5-4-.1z',
        ],
        primary: [
          'M4 3c1.2-.5 2.4-.4 3.5.2l-.4 17c-1.1.6-2.2.5-3.3 0z',
          'M9.2 4c1.2-.7 2.5-.6 3.7 0l-.2 16c-1.2.7-2.4.6-3.6 0z',
          'M14.8 3.4c1.4-.6 2.7-.5 4 .2l.3 16.5c-1.3.6-2.7.5-4-.1z',
        ],
        secondary: ['M5.5 8v7', 'M10.8 7v8', 'M16.8 7v8'],
        accent: ['M3 21c5-1.4 11-1 18 0', 'M6 2l1 2', 'M17 2l-1 2'],
      },
      parchment: {
        primary: ['M3 4h18v16H3z', 'M7 4v16', 'M17 4v16', 'M9 7h6v10H9z'],
        secondary: ['M4.5 6h1', 'M4.5 9h1', 'M18.5 6h1', 'M18.5 9h1', 'M11 9h2', 'M11 12h2', 'M11 15h2'],
        accent: ['M5 2v5', 'M12 2v5', 'M19 2v5', 'M4 20l2-2', 'M20 20l-2-2'],
      },
      cardstock: {
        fills: ['M2 3h6v18H2z', 'M9 5h6v16H9z', 'M16 3h6v18h-6z', 'M10.5 8h3v8h-3z'],
        primary: ['M2 3h6v18H2z', 'M9 5h6v16H9z', 'M16 3h6v18h-6z'],
        secondary: ['M4 8h2', 'M11 10h2', 'M18 8h2'],
        accent: ['M3 2v4', 'M11 3v4', 'M19 2v4'],
      },
    },
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
    paperVariants: {
      a4: {
        primary: ['M5 3h11l3 3v15H5z', 'M16 3v5h3'],
        secondary: ['M9 11l-2 2 2 2', 'M15 11l2 2-2 2'],
        accent: ['M14 9l-3 8'],
      },
      xuan: {
        fills: [
          'M5 3c3-1 7-.8 11 .2l2.7 3-.6 2.5c-4-1.1-8-1.3-12-.2z',
          'M10.7 9.2c.8-.4 1.6-.2 1.8.5l-1.8 8c-.3.9-1.2 1.2-1.8.6z',
        ],
        primary: ['M5 3c3.5-1.1 7-.7 11 .2l2.7 3-.5 14.5c-4.2-1.1-8.4-1-12.5.2z', 'M16 3.2l-.2 4 2.9-.8'],
        secondary: ['M8 11c-1.5 1-1.5 2 0 3', 'M15 10.5c1.8 1 1.8 2.3.1 3.4'],
        accent: ['M12.5 9l-2 9', 'M4 21c4-1 9-1 15 .1'],
      },
      parchment: {
        primary: ['M4 3h13l3 3v15H4z', 'M17 3v4h3', 'M6 6h8'],
        secondary: ['M8 11l-2 2 2 2', 'M15 11l2 2-2 2', 'M6 18h11'],
        accent: ['M14 9l-3 8', 'M4 3l2 2', 'M20 21l-2-2'],
      },
      cardstock: {
        fills: ['M3 3h14v4h4v14H3z', 'M6 9h4v3H6z', 'M14 13h4v3h-4z'],
        primary: ['M3 3h14l4 4v14H3z', 'M17 3v4h4'],
        secondary: ['M9 10l-2 2 2 2', 'M15 10l2 2-2 2'],
        accent: ['M14 8l-4 9'],
      },
    },
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
    paperVariants: {
      a4: {
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
      xuan: {
        fills: [
          'M3.2 4.5c2.7-.8 5.7-.6 8.5.4l-.6 8.8c-2.6.8-5.3.7-8-.2z',
          'M5.5 7.5c.8-.5 1.6-.2 1.7.6s-.5 1.5-1.3 1.5-1.4-.6-1.3-1.4.3-.5.9-.7z',
          'M8.5 10c.8-.4 1.6-.1 1.7.7s-.5 1.5-1.3 1.5-1.4-.6-1.3-1.4.3-.6.9-.8z',
        ],
        primary: ['M3.2 4.5c2.8-.9 5.8-.5 8.5.4l-.6 8.8c-2.6.8-5.3.7-8-.2z'],
        secondary: ['M5 17c4-1.5 7-1.2 10 .4', 'M6 20c3-1.2 6-.9 9 .4'],
        accent: ['M12 8c4 1 5-3 9-2', 'M12 11c4-.5 5 4 9 5', 'M12 13c3 1 5 5 9 6', 'M19 4l2 2-2 2'],
      },
      parchment: {
        primary: ['M3 4h9v9H3z', 'M7.5 4v9', 'M3 8.5h9', 'M16 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6'],
        secondary: ['M5 6h.01', 'M10 11h.01', 'M5 11h.01', 'M16 7v2', 'M16 8h2'],
        accent: ['M12 9h2', 'M16 11v4', 'M16 15h-5', 'M16 15h5', 'M11 13l-2 2 2 2', 'M21 13l2 2-2 2'],
      },
      cardstock: {
        fills: ['M2 3h11v11H2z', 'M5 6h3v3H5z', 'M9 10h3v3H9z', 'M15 4h7v5h-7z', 'M15 11h7v5h-7z', 'M15 18h7v4h-7z'],
        primary: ['M2 3h11v11H2z'],
        secondary: ['M4 11h2', 'M10 5h2'],
        accent: ['M13 7h2', 'M13 13h2', 'M13 20h2', 'M20 2l2 2-2 2', 'M20 9l2 2-2 2', 'M20 16l2 2-2 2'],
      },
    },
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
