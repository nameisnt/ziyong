function getByPath(source: unknown, path: string, fallback?: unknown) {
  if (!path) return source ?? fallback;
  const result = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
  return typeof result === 'undefined' ? fallback : result;
}

function setByPath(source: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return source;
  let current = source;
  parts.slice(0, -1).forEach(part => {
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) current[part] = {};
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
  return source;
}

Object.assign(globalThis, {
  _: {
    assign: Object.assign,
    get: getByPath,
    isEqual: (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right),
    mapValues: (source: Record<string, unknown>, iteratee: (value: unknown, key: string) => unknown) =>
      Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, iteratee(value, key)])),
    set: setByPath,
  },
  toastr: {
    error: console.error,
    info: console.info,
    success: console.info,
    warning: console.warn,
  },
});
