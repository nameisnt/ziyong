export type PluginMacroKind = 'assign' | 'dice' | 'pick';

export const PLUGIN_MACRO_PATTERN = /\{\{\s*phone:(assign|dice|pick)\?([^{}]+)\}\}/giu;

function randomInteger(minimum: number, maximum: number) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function readInteger(params: URLSearchParams, key: string, fallback: number) {
  const value = Number(params.get(key));
  return Number.isInteger(value) ? value : fallback;
}

function readList(params: URLSearchParams, key: string) {
  return (params.get(key) ?? '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function shuffled<T>(items: T[]) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = randomInteger(0, index);
    [output[index], output[target]] = [output[target]!, output[index]!];
  }
  return output;
}

function resolveDice(params: URLSearchParams) {
  const minimum = readInteger(params, 'min', 0);
  const maximum = Math.max(minimum, readInteger(params, 'max', minimum));
  const roll = randomInteger(minimum, maximum);
  const target = readInteger(params, 'target', Number.NaN);
  if (!Number.isInteger(target)) return String(roll);
  const operation = params.get('op') ?? 'gte';
  const passed =
    operation === 'gt'
      ? roll > target
      : operation === 'lte'
        ? roll <= target
        : operation === 'lt'
          ? roll < target
          : roll >= target;
  return `${roll}（${passed ? params.get('success') || '成功' : params.get('failure') || '失败'}）`;
}

function resolvePick(params: URLSearchParams) {
  const items = readList(params, 'items');
  if (!items.length) return '';
  const minimum = Math.max(0, readInteger(params, 'min', 1));
  const maximum = Math.max(minimum, readInteger(params, 'max', minimum));
  const repeat = params.get('repeat') === '1';
  const count = repeat ? randomInteger(minimum, maximum) : Math.min(items.length, randomInteger(minimum, maximum));
  const selected = repeat
    ? Array.from({ length: count }, () => items[randomInteger(0, items.length - 1)]!)
    : shuffled(items).slice(0, count);
  return selected.join(params.get('separator') || '、');
}

function resolveAssign(params: URLSearchParams) {
  const roles = readList(params, 'roles');
  const items = readList(params, 'items');
  if (!roles.length || !items.length) return '';
  const repeat = params.get('repeat') === '1';
  const available = shuffled(items);
  return roles
    .flatMap((role, index) => {
      const item = repeat ? items[randomInteger(0, items.length - 1)] : available[index];
      return item ? [`${role}：${item}`] : [];
    })
    .join(params.get('separator') || '；');
}

export function resolvePluginMacro(kind: string, query: string) {
  const params = new URLSearchParams(query);
  if (kind === 'dice') return resolveDice(params);
  if (kind === 'pick') return resolvePick(params);
  if (kind === 'assign') return resolveAssign(params);
  return '';
}

export function replacePluginMacros(content: string) {
  return content.replace(PLUGIN_MACRO_PATTERN, (_match, kind: string, query: string) => resolvePluginMacro(kind, query));
}

export function buildPluginMacro(kind: PluginMacroKind, values: Record<string, boolean | number | string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)));
  return `{{phone:${kind}?${params.toString()}}}`;
}
