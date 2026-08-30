export function parseCssColorChannels(value: string) {
  const channels =
    value
      .match(/-?(?:\d+\.?\d*|\.\d+)/g)
      ?.slice(0, 3)
      .map(Number) ?? [];
  return value.startsWith('color(srgb ') ? channels.map(channel => channel * 255) : channels;
}

