export const ThemeMode = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof ThemeMode>;

export const HomeFolderSchema = z.object({
  appIds: z.array(z.string()).default([]),
  id: z.string(),
  iconAssetId: z.string().default(''),
  name: z.string().default('文件夹'),
});
export type HomeFolder = z.infer<typeof HomeFolderSchema>;

export const HomeScreenLayoutSchema = z.object({
  appOrder: z.array(z.string()).default([]),
  dockOrder: z.array(z.string()).default([]),
  folders: z.array(HomeFolderSchema).default([]),
  version: z.number().int().nonnegative().default(1),
});
export type HomeScreenLayout = z.infer<typeof HomeScreenLayoutSchema>;

export const ReaderAppearanceSchema = z.object({
  backgroundColor: z.string().default(''),
  backgroundImage: z.string().default(''),
  blankLineBetweenLines: z.boolean().default(true),
  firstLineIndent: z.boolean().default(false),
  fontFamily: z.string().default(''),
  fontSize: z.number().min(14).max(24).default(16),
  lineHeight: z.number().min(1.4).max(2.2).default(1.6),
});
export type ReaderAppearance = z.infer<typeof ReaderAppearanceSchema>;

export const DirectorySortSettingsSchema = z.object({
  digestDesc: z.boolean().default(true),
  diaryDesc: z.boolean().default(true),
  extrasDesc: z.boolean().default(true),
  forumMode: z.enum(['latestReply', 'latestPublish', 'heat', 'favorite']).default('latestReply'),
  lettersDesc: z.boolean().default(true),
  summaryDesc: z.boolean().default(true),
  theaterDesc: z.boolean().default(true),
});
export type DirectorySortSettings = z.infer<typeof DirectorySortSettingsSchema>;

export const InterfaceSizeSettingsSchema = z.object({
  dockColumns: z.number().int().min(3).max(5).default(4),
  homeColumns: z.number().int().min(3).max(5).default(4),
  homeRows: z.number().int().min(2).max(5).default(3),
  phoneHeight: z.number().min(560).max(980).default(700),
  phoneWidth: z.number().min(320).max(720).default(360),
  readerScale: z.number().min(80).max(120).default(100),
});
export type InterfaceSizeSettings = z.infer<typeof InterfaceSizeSettingsSchema>;

export const HomeIconAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
});
export type HomeIconAsset = z.infer<typeof HomeIconAssetSchema>;

export const VisualThemeSettingsSchema = z.object({
  accentColor: z.string().default('#007aff'),
  appAccentOverrides: z.record(z.string(), z.string()).default({}),
  appIconBackgroundColor: z.string().default(''),
  appIconAssetIds: z.record(z.string(), z.string()).default({}),
  appIconOverrides: z.record(z.string(), z.string()).default({}),
  appIconColor: z.string().default(''),
  backgroundColor: z.string().default(''),
  borderColor: z.string().default(''),
  cardRadius: z.number().min(8).max(32).default(20),
  controlRadius: z.number().min(8).max(28).default(16),
  dangerColor: z.string().default('#ff5a5f'),
  dockActiveColor: z.string().default(''),
  dockColor: z.string().default(''),
  hintColor: z.string().default('#2d9cdb'),
  iconRadius: z.number().min(8).max(24).default(14),
  mutedTextColor: z.string().default(''),
  primaryTextColor: z.string().default('#ffffff'),
  readerTextColor: z.string().default(''),
  softButtonColor: z.string().default(''),
  surfaceColor: z.string().default(''),
  surfaceStrongColor: z.string().default(''),
  textColor: z.string().default(''),
});
export type VisualThemeSettings = z.infer<typeof VisualThemeSettingsSchema>;

export const GenerationSourceModeSchema = z.enum(['none', 'latest', 'fromStart', 'all', 'single', 'recent', 'range']);
export type GenerationSourceMode = z.infer<typeof GenerationSourceModeSchema>;

export const GenerationResultModeSchema = z.enum(['preview', 'save']);
export type GenerationResultMode = z.infer<typeof GenerationResultModeSchema>;

export const GenerationDefaultsSchema = z.object({
  fromStartEnd: z.number().int().nonnegative().default(20),
  outputCleaningEnabled: z.boolean().default(false),
  outputCleaningEndTags: z.string().default('</think>'),
  rpmLimit: z.number().int().min(0).max(120).default(10),
  sourceMode: GenerationSourceModeSchema.default('latest'),
  tavernPresetName: z.string().default(''),
  resultMode: GenerationResultModeSchema.default('preview'),
  stream: z.boolean().default(true),
});
export type GenerationDefaults = z.infer<typeof GenerationDefaultsSchema>;

export const ExternalApiPresetIdSchema = z.enum(['openai', 'deepseek', 'custom']);
export type ExternalApiPresetId = z.infer<typeof ExternalApiPresetIdSchema>;

export const ExternalApiProfileSchema = z.object({
  id: z.string(),
  name: z.string().default('外部 API'),
  presetId: ExternalApiPresetIdSchema.default('custom'),
  apiUrl: z.string().default(''),
  apiKey: z.string().default(''),
  model: z.string().default(''),
});
export type ExternalApiProfile = z.infer<typeof ExternalApiProfileSchema>;

export const TextProviderSettingsSchema = z.object({
  mode: z.enum(['tavern', 'external']).default('tavern'),
  activeExternalProfileId: z.string().default(''),
  externalProfiles: z.array(ExternalApiProfileSchema).default([]),
  contextWindow: z.number().int().positive().nullable().default(null),
  maxOutputTokens: z.number().int().positive().nullable().default(null),
});
export type TextProviderSettings = z.infer<typeof TextProviderSettingsSchema>;

export const TimekeeperCalendarTemplateSchema = z.object({
  id: z.string(),
  name: z.string().default('自定义历法'),
  kind: z.enum(['fixed', 'gregorian']).default('fixed'),
  eraName: z.string().default('世界历'),
  monthsPerYear: z.number().int().min(1).max(24).default(12),
  monthDaysText: z.string().default('30'),
});
export type TimekeeperCalendarTemplate = z.infer<typeof TimekeeperCalendarTemplateSchema>;

export const CustomWallpaperSettingsSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
});
export type CustomWallpaperSettings = z.infer<typeof CustomWallpaperSettingsSchema>;

export const WallpaperSettingsSchema = z.object({
  mode: z.enum(['none', 'preset', 'custom']).default('none'),
  presetId: z.string().default('aurora'),
  customPath: z.string().default(''),
  customName: z.string().default(''),
  customWallpapers: z.array(CustomWallpaperSettingsSchema).default([]),
  selectedCustomId: z.string().default(''),
});
export type WallpaperSettings = z.infer<typeof WallpaperSettingsSchema>;

export const ThemeAppearanceProfileSchema = z.object({
  fontFamily: z.string().default(''),
  readerFontFamily: z.string().default(''),
  visualTheme: VisualThemeSettingsSchema,
  wallpaperMode: z.enum(['none', 'preset', 'custom']).default('none'),
  wallpaperPresetId: z.string().default('aurora'),
  wallpaperCustomId: z.string().default(''),
});
export type ThemeAppearanceProfile = z.infer<typeof ThemeAppearanceProfileSchema>;

export const ThemeProfilesSchema = z.object({
  light: ThemeAppearanceProfileSchema,
  dark: ThemeAppearanceProfileSchema,
});
export type ThemeProfiles = z.infer<typeof ThemeProfilesSchema>;

export const CustomFontItemSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
});
export type CustomFontItem = z.infer<typeof CustomFontItemSchema>;

export const CustomFontSettingsSchema = z.object({
  path: z.string().default(''),
  name: z.string().default(''),
  fonts: z.array(CustomFontItemSchema).default([]),
  selectedFontId: z.string().default(''),
});
export type CustomFontSettings = z.infer<typeof CustomFontSettingsSchema>;

const DEFAULT_CUSTOM_FONT_SETTINGS: CustomFontSettings = {
  path: '',
  name: '',
  fonts: [],
  selectedFontId: '',
};

const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  mode: 'none',
  presetId: 'aurora',
  customPath: '',
  customName: '',
  customWallpapers: [],
  selectedCustomId: '',
};

const DEFAULT_GENERATION_SETTINGS: GenerationDefaults = {
  fromStartEnd: 20,
  outputCleaningEnabled: false,
  outputCleaningEndTags: '</think>',
  rpmLimit: 10,
  sourceMode: 'latest',
  tavernPresetName: '',
  resultMode: 'preview',
  stream: true,
};

const DEFAULT_READER_SETTINGS: ReaderAppearance = {
  backgroundColor: '',
  backgroundImage: '',
  blankLineBetweenLines: true,
  firstLineIndent: false,
  fontFamily: '',
  fontSize: 16,
  lineHeight: 1.6,
};

const DEFAULT_DIRECTORY_SORT_SETTINGS: DirectorySortSettings = {
  digestDesc: true,
  diaryDesc: true,
  extrasDesc: true,
  forumMode: 'latestReply',
  lettersDesc: true,
  summaryDesc: true,
  theaterDesc: true,
};

const DEFAULT_INTERFACE_SIZE_SETTINGS: InterfaceSizeSettings = {
  dockColumns: 4,
  homeColumns: 4,
  homeRows: 3,
  phoneHeight: 700,
  phoneWidth: 360,
  readerScale: 100,
};

const DEFAULT_VISUAL_THEME_SETTINGS: VisualThemeSettings = {
  accentColor: '#007aff',
  appAccentOverrides: {},
  appIconBackgroundColor: '',
  appIconAssetIds: {},
  appIconOverrides: {},
  appIconColor: '',
  backgroundColor: '',
  borderColor: '',
  cardRadius: 20,
  controlRadius: 16,
  dangerColor: '#ff5a5f',
  dockActiveColor: '',
  dockColor: '',
  hintColor: '#2d9cdb',
  iconRadius: 14,
  mutedTextColor: '',
  primaryTextColor: '#ffffff',
  readerTextColor: '',
  softButtonColor: '',
  surfaceColor: '',
  surfaceStrongColor: '',
  textColor: '',
};

function createDefaultThemeProfile(): ThemeAppearanceProfile {
  return {
    fontFamily: '',
    readerFontFamily: '',
    visualTheme: {
      ...DEFAULT_VISUAL_THEME_SETTINGS,
      appAccentOverrides: {},
      appIconAssetIds: {},
      appIconOverrides: {},
    },
    wallpaperMode: 'none',
    wallpaperPresetId: 'aurora',
    wallpaperCustomId: '',
  };
}

const DEFAULT_TEXT_PROVIDER_SETTINGS: TextProviderSettings = {
  mode: 'tavern',
  activeExternalProfileId: '',
  externalProfiles: [],
  contextWindow: null,
  maxOutputTokens: null,
};

export type Settings = z.infer<typeof Settings>;
export const Settings = z
  .object({
    theme: ThemeMode.default('light'),
    fontFamily: z.string().default(''),
    customFont: CustomFontSettingsSchema.default(() => ({ ...DEFAULT_CUSTOM_FONT_SETTINGS, fonts: [] })),
    wallpaper: WallpaperSettingsSchema.default(() => ({ ...DEFAULT_WALLPAPER_SETTINGS, customWallpapers: [] })),
    generation: GenerationDefaultsSchema.default(() => ({ ...DEFAULT_GENERATION_SETTINGS })),
    interfaceSize: InterfaceSizeSettingsSchema.default(() => ({ ...DEFAULT_INTERFACE_SIZE_SETTINGS })),
    themeProfiles: ThemeProfilesSchema.default(() => ({
      light: createDefaultThemeProfile(),
      dark: createDefaultThemeProfile(),
    })),
    visualTheme: VisualThemeSettingsSchema.default(() => ({
      ...DEFAULT_VISUAL_THEME_SETTINGS,
      appAccentOverrides: {},
      appIconBackgroundColor: '',
      appIconAssetIds: {},
      appIconOverrides: {},
    })),
    reader: ReaderAppearanceSchema.default(() => ({ ...DEFAULT_READER_SETTINGS })),
    directorySort: DirectorySortSettingsSchema.default(() => ({ ...DEFAULT_DIRECTORY_SORT_SETTINGS })),
    textProvider: TextProviderSettingsSchema.default(() => ({ ...DEFAULT_TEXT_PROVIDER_SETTINGS })),
    timekeeperCalendarTemplates: z.array(TimekeeperCalendarTemplateSchema).default([]),
    homeIconAssets: z.array(HomeIconAssetSchema).default([]),
    externalProfilesLayout: z.enum(['horizontal', 'vertical']).default('horizontal'),
    floatBallEnabled: z.boolean().default(true),
    floatBallSize: z.number().min(28).max(80).default(44),
    floatBallColor: z.string().default('#007aff'),
    floatBallX: z.number().nullable().default(null),
    floatBallY: z.number().nullable().default(null),
    phoneWindowX: z.number().nullable().default(null),
    phoneWindowY: z.number().nullable().default(null),
    layout: HomeScreenLayoutSchema.default(() => ({
      appOrder: [],
      dockOrder: [],
      folders: [],
      version: 1,
    })),
  })
  .default(() => ({
    theme: 'light' as const,
    fontFamily: '',
    customFont: { ...DEFAULT_CUSTOM_FONT_SETTINGS, fonts: [] },
    wallpaper: { ...DEFAULT_WALLPAPER_SETTINGS, customWallpapers: [] },
    generation: { ...DEFAULT_GENERATION_SETTINGS },
    interfaceSize: { ...DEFAULT_INTERFACE_SIZE_SETTINGS },
    themeProfiles: {
      light: createDefaultThemeProfile(),
      dark: createDefaultThemeProfile(),
    },
    visualTheme: {
      ...DEFAULT_VISUAL_THEME_SETTINGS,
      appAccentOverrides: {},
      appIconBackgroundColor: '',
      appIconAssetIds: {},
      appIconOverrides: {},
    },
    reader: { ...DEFAULT_READER_SETTINGS },
    directorySort: { ...DEFAULT_DIRECTORY_SORT_SETTINGS },
    textProvider: { ...DEFAULT_TEXT_PROVIDER_SETTINGS },
    timekeeperCalendarTemplates: [],
    homeIconAssets: [],
    externalProfilesLayout: 'horizontal' as const,
    floatBallEnabled: true,
    floatBallSize: 44,
    floatBallColor: '#007aff',
    floatBallX: null,
    floatBallY: null,
    phoneWindowX: null,
    phoneWindowY: null,
    layout: { appOrder: [], dockOrder: [], folders: [], version: 1 },
  }));

export const setting_field = 'sillytavern_phone';
