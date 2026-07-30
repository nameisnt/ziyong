export interface WallpaperPresetDefinition {
  id: string;
  name: string;
  background: string;
}

export const WALLPAPER_PRESETS: WallpaperPresetDefinition[] = [
  {
    id: 'aurora',
    name: '极光',
    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.55), rgba(14, 165, 233, 0.48) 42%, rgba(168, 85, 247, 0.44))',
  },
  {
    id: 'sunset',
    name: '落日',
    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.55), rgba(244, 63, 94, 0.5) 46%, rgba(99, 102, 241, 0.38))',
  },
  {
    id: 'studio',
    name: '影棚',
    background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.38), rgba(30, 41, 59, 0.46) 55%, rgba(15, 23, 42, 0.68))',
  },
];

export function getWallpaperPreset(presetId: string) {
  return WALLPAPER_PRESETS.find(item => item.id === presetId) ?? null;
}
