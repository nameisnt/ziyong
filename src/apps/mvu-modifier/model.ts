export type MvuPath = Array<number | string>;

export type MvuTreeMutation = {
  path: MvuPath;
  value: unknown;
};

export type MvuTreeAddition = {
  key?: string;
  parentPath: MvuPath;
  value: unknown;
};

export function mvuPathKey(path: MvuPath) {
  return JSON.stringify(path);
}

export function formatMvuPath(path: MvuPath) {
  return path
    .map((part, index) => {
      if (typeof part === 'number') return `[${part}]`;
      if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(part)) return index === 0 ? part : `.${part}`;
      return `[${JSON.stringify(part)}]`;
    })
    .join('');
}

export function getMvuPathValue(source: unknown, path: MvuPath) {
  return path.reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<number | string, unknown>)[part];
  }, source);
}

export function setMvuPathValue(source: Record<string, unknown>, path: MvuPath, value: unknown) {
  if (!path.length) return;
  const parent = getMvuPathValue(source, path.slice(0, -1));
  if (!parent || typeof parent !== 'object') return;
  (parent as Record<number | string, unknown>)[path[path.length - 1]] = value;
}

export function deleteMvuPathValue(source: Record<string, unknown>, path: MvuPath) {
  if (!path.length) return;
  const parent = getMvuPathValue(source, path.slice(0, -1));
  const key = path[path.length - 1];
  if (Array.isArray(parent) && typeof key === 'number') {
    parent.splice(key, 1);
    return;
  }
  if (parent && typeof parent === 'object') {
    delete (parent as Record<number | string, unknown>)[key];
  }
}

export function previewMvuValue(value: unknown, limit = 120) {
  let text: string;
  if (typeof value === 'string') text = value || '""';
  else if (value === undefined) text = 'undefined';
  else if (value === null) text = 'null';
  else text = JSON.stringify(value) ?? String(value);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function mvuValueType(value: unknown) {
  if (Array.isArray(value)) return '数组';
  if (value && typeof value === 'object') return '对象';
  if (typeof value === 'number') return '数值';
  if (typeof value === 'boolean') return '布尔';
  if (typeof value === 'string') return '字符';
  if (value === null) return '空值';
  return '其他';
}
