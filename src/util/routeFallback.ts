import { nextTick, watch } from 'vue';

export interface InvalidRouteFallbackOptions<TSnapshot> {
  fallback: (snapshot: TSnapshot) => Promise<void> | void;
  isInvalid: (snapshot: TSnapshot) => boolean;
  source: () => TSnapshot;
}

export function useInvalidRouteFallback<TSnapshot>(options: InvalidRouteFallbackOptions<TSnapshot>) {
  watch(
    options.source,
    async snapshot => {
      if (!options.isInvalid(snapshot)) return;

      await nextTick();
      const latest = options.source();
      if (!options.isInvalid(latest)) return;

      await options.fallback(latest);
    },
    { immediate: true },
  );
}
