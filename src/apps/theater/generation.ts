import type { TheaterGenerateConfig } from '@/core/theaterGeneration';

export interface TheaterGenerateConfigInput {
  appPrompt: string;
  entryId: string;
  mode: 'create' | 'rewrite';
  outputFormat: string;
  typeId: string;
  typeName: string;
  typePrompt: string;
  userRequirement: string;
}

export interface TheaterVersionSplitPrompt {
  confirmLabel: string;
  kind: 'warning';
  message: string;
}

export function buildTheaterGenerateConfig(input: TheaterGenerateConfigInput): TheaterGenerateConfig {
  return {
    appPrompt: input.appPrompt,
    entryId: input.entryId,
    existingContent: '',
    mode: input.mode,
    outputFormat: input.outputFormat,
    renderMode: 'markdown',
    typeId: input.typeId,
    typeName: input.typeName,
    typePrompt: input.typePrompt,
    userRequirement: input.userRequirement,
  };
}

export function buildTheaterVersionSplitPrompt(
  versions: readonly { id: string }[],
  versionId: string,
): TheaterVersionSplitPrompt | null {
  if (!versionId || versions.length <= 1) return null;
  const versionIndex = versions.findIndex(version => version.id === versionId);
  if (versionIndex < 0) return null;
  return {
    confirmLabel: '拆分版本',
    kind: 'warning',
    message: `将当前版本 ${versionIndex + 1}/${versions.length} 拆分为独立小剧场，并从原记录中移除吗？`,
  };
}
