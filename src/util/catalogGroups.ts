export function buildCatalogGroups<T>(
  names: string[],
  items: T[],
  groupOf: (item: T) => string,
  labelOf: (item: T) => string,
  query: string,
) {
  const keyword = query.trim().toLocaleLowerCase();
  const groups = new Map<string, T[]>(names.map(name => [name, []]));
  for (const item of items) {
    const name = groupOf(item) || '未分组';
    if (!groups.has(name)) groups.set(name, []);
    if (!keyword || name.toLocaleLowerCase().includes(keyword) || labelOf(item).toLocaleLowerCase().includes(keyword))
      groups.get(name)!.push(item);
  }
  return [...groups]
    .filter(([name, entries]) => !keyword || entries.length || name.toLocaleLowerCase().includes(keyword))
    .map(([name, entries]) => ({ name, items: entries }));
}
