import { applyGenerationMvuToPrompt, type GenerationMvuSnapshot } from './generationMvu';
import { getOptionalGlobalFunction, getSillyTavernContext, getTavernEventName } from './runtime';

export async function withGenerationMvu<TResult>(
  config: Record<string, unknown>,
  snapshot: GenerationMvuSnapshot | null,
  task: (config: Record<string, unknown>) => Promise<TResult>,
): Promise<TResult> {
  if (!snapshot) return task(config);
  const eventSource = getSillyTavernContext()?.eventSource;
  const eventName = getTavernEventName('GENERATE_AFTER_DATA');
  const stopGeneration = getOptionalGlobalFunction<(id: string) => unknown>('stopGenerationById');
  if (!eventName || !eventSource?.makeFirst || !eventSource.removeListener || !stopGeneration) {
    throw new Error('当前酒馆缺少请求级 MVU 注入接口，无法按来源楼层生成');
  }
  const marker = `[pc-mvu:${String(config.generation_id)}]`;
  let failure: unknown;
  const listener = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    try {
      applyGenerationMvuToPrompt(payload, marker, snapshot);
    } catch (error) {
      failure = error;
      stopGeneration(String(config.generation_id));
      throw error;
    }
  };
  eventSource.makeFirst(eventName, listener);
  try {
    const result = await task({ ...config, user_input: `${String(config.user_input || '')}${marker}` });
    if (failure) throw failure;
    return result;
  } catch (error) {
    throw failure || error;
  } finally {
    eventSource.removeListener(eventName, listener);
  }
}
