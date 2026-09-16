import { cloneMvuStatData, type MvuStatData } from './api';
import { formatMvuPath, getMvuPathValue, type MvuPath } from './model';

export type MvuFieldPatch = { path: MvuPath; before: unknown; after: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function diffMvuFields(before: MvuStatData, after: MvuStatData): MvuFieldPatch[] {
  const patches: MvuFieldPatch[] = [];
  function visit(left: unknown, right: unknown, path: MvuPath) {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    if (isObject(left) && isObject(right)) {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
        visit(left[key], right[key], [...path, key]);
    } else {
      // Arrays are one editable field: a splice must not shift unrelated indexed patches.
      patches.push({ path, before: left, after: right });
    }
  }
  visit(before, after, []);
  return patches;
}

export function applyMvuFields(current: MvuStatData, patches: MvuFieldPatch[], checkExpected: boolean) {
  const next = cloneMvuStatData(current);
  for (const patch of patches) {
    const parent = getMvuPathValue(next, patch.path.slice(0, -1));
    if (!isObject(parent)) throw new Error(`变量路径已变化：${formatMvuPath(patch.path)}，请重新读取`);
    const actual = getMvuPathValue(next, patch.path);
    if ((checkExpected || Array.isArray(patch.before)) && JSON.stringify(actual) !== JSON.stringify(patch.before)) {
      throw new Error(`变量已被修改：${formatMvuPath(patch.path)}，请重新读取后操作`);
    }
    const key = patch.path[patch.path.length - 1];
    if (patch.after === undefined) delete parent[key];
    else parent[key] = cloneMvuStatData({ value: patch.after }).value;
  }
  return next;
}
