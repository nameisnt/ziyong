import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

export type MvuScope = 'message' | 'chat' | 'character' | 'global';
export type MvuData = Record<string, unknown>;
export type MvuOptions = {
  type: MvuScope;
  message_id?: number | 'latest';
};

type MvuRuntime = {
  getMvuData: (options: MvuOptions) => MvuData;
  replaceMvuData: (data: MvuData, options: MvuOptions) => Promise<void>;
};

function isMvuRuntime(value: unknown): value is MvuRuntime {
  if (!value || typeof value !== 'object') return false;
  const runtime = value as Partial<MvuRuntime>;
  return typeof runtime.getMvuData === 'function' && typeof runtime.replaceMvuData === 'function';
}

async function resolveMvuRuntime() {
  const current = getOptionalGlobalValue<unknown>('Mvu');
  if (isMvuRuntime(current)) return current;

  const waitForGlobal = getOptionalGlobalFunction<(name: string) => Promise<unknown>>('waitGlobalInitialized');
  if (waitForGlobal) {
    const initialized = await Promise.race([
      waitForGlobal('Mvu'),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2500)),
    ]);
    if (isMvuRuntime(initialized)) return initialized;
  }

  const retried = getOptionalGlobalValue<unknown>('Mvu');
  if (isMvuRuntime(retried)) return retried;
  throw new Error('未检测到 MVU 变量框架，请先安装并启用 MVU 脚本');
}

export function cloneMvuData(data: MvuData): MvuData {
  if (typeof structuredClone === 'function') return structuredClone(data);
  return JSON.parse(JSON.stringify(data)) as MvuData;
}

export async function readMvuData(options: MvuOptions) {
  const runtime = await resolveMvuRuntime();
  return cloneMvuData(runtime.getMvuData(options));
}

export async function replaceMvuData(data: MvuData, options: MvuOptions) {
  const runtime = await resolveMvuRuntime();
  await runtime.replaceMvuData(cloneMvuData(data), options);
}
