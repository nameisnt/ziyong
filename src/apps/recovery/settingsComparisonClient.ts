import type { SettingsDuplicateGroup, SettingsSnapshotSummary } from './model';

export function createSettingsComparisonClient(signal?: AbortSignal) {
  const worker = new Worker(new URL('./settingsComparison.worker.ts', import.meta.url), { type: 'module' });
  let rejectPending: ((reason: unknown) => void) | undefined;
  let workerError: Error | undefined;
  const stop = () => {
    worker.terminate();
    rejectPending?.(new DOMException('已取消扫描', 'AbortError'));
    signal?.removeEventListener('abort', stop);
  };
  signal?.addEventListener('abort', stop, { once: true });
  function request<T>(message: object, transfer: Transferable[] = []): Promise<T> {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      if (workerError) {
        reject(workerError);
        return;
      }
      rejectPending = reject;
      worker.onmessage = event => {
        rejectPending = undefined;
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result as T);
      };
      worker.onerror = event => {
        rejectPending = undefined;
        workerError = new Error(event.message || '快照比较线程无法启动');
        workerError.name = 'SettingsComparisonWorkerError';
        reject(workerError);
      };
      worker.postMessage(message, transfer);
    });
  }
  return {
    add: (bytes: ArrayBuffer, summary: SettingsSnapshotSummary) =>
      // Snapshot summaries may be Vue proxies; transfer only their scalar fields.
      request<void>({ mode: 'add', bytes, summary: { name: summary.name, date: summary.date, size: summary.size } }, [
        bytes,
      ]),
    hash: (bytes: ArrayBuffer) => request<string>({ mode: 'hash', bytes }, [bytes]),
    finish: (threshold: number) => request<SettingsDuplicateGroup[]>({ mode: 'finish', threshold }),
    dispose: stop,
  };
}
