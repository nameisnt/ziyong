export function isGenerationRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(?:http\s*)?429|rate[\s_-]*limit|too many requests|请求过于频繁/i.test(message);
}

export async function runGenerationTaskWithRateLimitRetries<TResult>(options: {
  task: () => Promise<TResult>;
  waitForRateLimit: () => Promise<void>;
  waitForRetry: (delayMs: number) => Promise<void>;
}) {
  await options.waitForRateLimit();
  const maxRateLimitRetries = 2;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await options.task();
    } catch (error) {
      if (!isGenerationRateLimitError(error) || attempt >= maxRateLimitRetries) throw error;
      await options.waitForRetry(2_000 * 2 ** attempt);
      await options.waitForRateLimit();
    }
  }
}
