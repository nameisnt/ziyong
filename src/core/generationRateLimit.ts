let queueTail = Promise.resolve();
let nextRequestAt = 0;

function normalizeRpm(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(120, Math.max(0, Math.round(parsed)));
}

function getAbortReason(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : new DOMException('生成已停止', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw getAbortReason(signal);
}

function wait(delayMs: number, signal?: AbortSignal) {
  throwIfAborted(signal);
  if (delayMs <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(getAbortReason(signal as AbortSignal));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function waitForGenerationRateLimit(rpmLimit: number, signal?: AbortSignal) {
  const rpm = normalizeRpm(rpmLimit);
  throwIfAborted(signal);
  if (!rpm) return;

  const scheduled = queueTail.then(async () => {
    throwIfAborted(signal);
    await wait(Math.max(0, nextRequestAt - Date.now()), signal);
    throwIfAborted(signal);
    nextRequestAt = Date.now() + Math.ceil(60_000 / rpm);
  });
  queueTail = scheduled.catch(() => undefined);
  await scheduled;
}

export function waitForGenerationRetry(delayMs: number, signal?: AbortSignal) {
  return wait(Math.max(0, delayMs), signal);
}
