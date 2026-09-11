import {
  createSettingsSignature,
  createSimilarSettingsGroups,
  hashSettingsBytes,
  type SettingsSignature,
} from './settingsComparison';
import type { SettingsSnapshotSummary } from './model';

const signatures: SettingsSignature[] = [];
self.onmessage = async (
  event: MessageEvent<{
    bytes: ArrayBuffer;
    summary: SettingsSnapshotSummary;
    threshold: number;
    mode: 'add' | 'finish' | 'hash';
  }>,
) => {
  try {
    const { bytes, summary, threshold, mode } = event.data;
    let result: unknown;
    if (mode === 'add') signatures.push(await createSettingsSignature(bytes, summary));
    else if (mode === 'hash') result = await hashSettingsBytes(bytes);
    else result = createSimilarSettingsGroups(signatures, threshold);
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '快照比较失败' });
  }
};
