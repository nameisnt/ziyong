export type PresetMigrationStage =
  | 'conflict'
  | 'source-protected'
  | 'target-create'
  | 'target-verify'
  | 'target-rollback'
  | 'source-delete';

export class PresetMigrationError extends Error {
  readonly sourceRemoved: boolean;
  readonly stage: PresetMigrationStage;
  readonly targetCreated: boolean;
  readonly targetRemoved: boolean;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      sourceRemoved?: boolean;
      stage: PresetMigrationStage;
      targetCreated?: boolean;
      targetRemoved?: boolean;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'PresetMigrationError';
    this.sourceRemoved = options.sourceRemoved ?? false;
    this.stage = options.stage;
    this.targetCreated = options.targetCreated ?? false;
    this.targetRemoved = options.targetRemoved ?? false;
  }
}

export interface PresetMigrationSteps<TPayload> {
  createTarget: (payload: TPayload, targetName: string) => void | Promise<void>;
  readTarget: (targetName: string) => TPayload | Promise<TPayload>;
  deleteSource: () => void | Promise<void>;
  deleteTarget: (targetName: string) => void | Promise<void>;
  readSource: () => TPayload | Promise<TPayload>;
  sourceDeletable: boolean;
  sourceName: string;
  targetExists: (targetName: string) => boolean | Promise<boolean>;
  targetName: string;
}

function isPayloadSubset(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, index) => isPayloadSubset(item, actual[index]));
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
    return Object.entries(expected as Record<string, unknown>).every(([key, value]) =>
      isPayloadSubset(value, (actual as Record<string, unknown>)[key]),
    );
  }
  return Object.is(expected, actual);
}

export function verifyPresetPayload(expected: unknown, actual: unknown) {
  return isPayloadSubset(expected, actual);
}

export async function movePresetTransactional<TPayload>(steps: PresetMigrationSteps<TPayload>) {
  const sourceName = steps.sourceName.trim();
  const targetName = steps.targetName.trim();
  if (!sourceName || !targetName) {
    throw new PresetMigrationError('来源名称和目标名称不能为空', { stage: 'conflict' });
  }
  if (!steps.sourceDeletable) {
    throw new PresetMigrationError('这个来源预设受保护，不能移动', { stage: 'source-protected' });
  }
  if (await steps.targetExists(targetName)) {
    throw new PresetMigrationError(`目标中已经存在预设“${targetName}”`, { stage: 'conflict' });
  }

  const sourcePayload = await steps.readSource();
  try {
    await steps.createTarget(sourcePayload, targetName);
  } catch (error) {
    throw new PresetMigrationError('目标预设创建失败，来源保持不变', {
      cause: error,
      stage: 'target-create',
    });
  }

  let targetPayload: TPayload;
  try {
    targetPayload = await steps.readTarget(targetName);
  } catch (error) {
    try {
      await steps.deleteTarget(targetName);
    } catch (rollbackError) {
      throw new PresetMigrationError('目标已创建但无法回读，回滚也失败；来源仍保留', {
        cause: new AggregateError([error, rollbackError]),
        stage: 'target-rollback',
        targetCreated: true,
      });
    }
    throw new PresetMigrationError('目标已创建但无法回读，已删除无效目标；来源保持不变', {
      cause: error,
      stage: 'target-verify',
      targetCreated: true,
      targetRemoved: true,
    });
  }

  if (!verifyPresetPayload(sourcePayload, targetPayload)) {
    try {
      await steps.deleteTarget(targetName);
    } catch (rollbackError) {
      throw new PresetMigrationError('目标内容校验失败，回滚也失败；来源仍保留', {
        cause: rollbackError,
        stage: 'target-rollback',
        targetCreated: true,
      });
    }
    throw new PresetMigrationError('目标内容校验失败，已删除无效目标；来源保持不变', {
      stage: 'target-verify',
      targetCreated: true,
      targetRemoved: true,
    });
  }

  try {
    await steps.deleteSource();
  } catch (error) {
    throw new PresetMigrationError('目标预设已创建并校验，但来源删除失败；两边都还在', {
      cause: error,
      stage: 'source-delete',
      targetCreated: true,
    });
  }

  return {
    sourceName,
    sourceRemoved: true,
    targetCreated: true,
    targetName,
    targetRemoved: false,
  } as const;
}
