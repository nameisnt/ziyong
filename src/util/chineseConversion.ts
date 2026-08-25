const converterUrl =
  'https://testingcf.jsdelivr.net/npm/chinese-simple2traditional@2.3.2/+esm';

export type ChineseConverter = {
  toSimplified: (text: string, enhance?: boolean) => string;
  toTraditional: (text: string, enhance?: boolean) => string;
};

let converterPromise: Promise<ChineseConverter> | null = null;

export function loadChineseConverter() {
  converterPromise ??= import(/* @vite-ignore */ converterUrl) as Promise<ChineseConverter>;
  return converterPromise;
}
