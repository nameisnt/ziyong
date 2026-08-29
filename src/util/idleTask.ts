export interface IdleTaskHandle {
  id: number;
  kind: 'idle' | 'timeout';
}

export function scheduleIdleTask(callback: () => void, timeout: number): IdleTaskHandle {
  if (typeof window.requestIdleCallback === 'function') {
    return {
      id: window.requestIdleCallback(() => callback(), { timeout }),
      kind: 'idle',
    };
  }

  return {
    id: window.setTimeout(callback, 0),
    kind: 'timeout',
  };
}

export function cancelIdleTask(handle: IdleTaskHandle | null) {
  if (!handle) return;
  if (handle.kind === 'idle') window.cancelIdleCallback(handle.id);
  else window.clearTimeout(handle.id);
}
