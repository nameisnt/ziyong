export function pickVisibleTheaterType<T>(items: readonly T[], random: () => number = Math.random): T | null {
  if (!items.length) return null;
  return items[Math.floor(random() * items.length)] ?? null;
}
