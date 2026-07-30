import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { FailedGenerationDraftSchema } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const storylinesField = 'sillytavern_phone_storylines';

export const StorylineKindSchema = z.enum(['main', 'branch', 'character', 'relationship', 'mystery']);
export type StorylineKind = z.infer<typeof StorylineKindSchema>;

export const StorylineStatusSchema = z.enum(['planned', 'active', 'paused', 'resolved', 'archived']);
export type StorylineStatus = z.infer<typeof StorylineStatusSchema>;

export const StorylineBeatStatusSchema = z.enum(['planned', 'current', 'done', 'skipped']);
export type StorylineBeatStatus = z.infer<typeof StorylineBeatStatusSchema>;

export const ForeshadowStatusSchema = z.enum(['seeded', 'developing', 'ready', 'resolved', 'dropped']);
export type ForeshadowStatus = z.infer<typeof ForeshadowStatusSchema>;

export const StorylineSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: StorylineKindSchema.default('branch'),
  status: StorylineStatusSchema.default('planned'),
  summary: z.string().default(''),
  goal: z.string().default(''),
  stakes: z.string().default(''),
  relatedProfileIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Storyline = z.infer<typeof StorylineSchema>;

export const StorylineBeatSchema = z.object({
  id: z.string(),
  lineId: z.string(),
  title: z.string(),
  summary: z.string().default(''),
  status: StorylineBeatStatusSchema.default('planned'),
  order: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StorylineBeat = z.infer<typeof StorylineBeatSchema>;

export const ForeshadowSchema = z.object({
  id: z.string(),
  lineId: z.string().default(''),
  title: z.string(),
  seed: z.string().default(''),
  payoff: z.string().default(''),
  status: ForeshadowStatusSchema.default('seeded'),
  relatedProfileIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Foreshadow = z.infer<typeof ForeshadowSchema>;

export const StorylinesScopeDataSchema = z.object({
  beats: z.array(StorylineBeatSchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
  hooks: z.array(ForeshadowSchema).default([]),
  lines: z.array(StorylineSchema).default([]),
});
export type StorylinesScopeData = z.infer<typeof StorylinesScopeDataSchema>;

export const storylineKindOptions: Array<{ id: StorylineKind; label: string }> = [
  { id: 'main', label: '主线' },
  { id: 'branch', label: '支线' },
  { id: 'character', label: '角色线' },
  { id: 'relationship', label: '关系线' },
  { id: 'mystery', label: '谜团线' },
];

export const storylineStatusOptions: Array<{ id: StorylineStatus; label: string }> = [
  { id: 'planned', label: '计划中' },
  { id: 'active', label: '推进中' },
  { id: 'paused', label: '暂缓' },
  { id: 'resolved', label: '已完成' },
  { id: 'archived', label: '归档' },
];

export const beatStatusOptions: Array<{ id: StorylineBeatStatus; label: string }> = [
  { id: 'planned', label: '计划' },
  { id: 'current', label: '当前' },
  { id: 'done', label: '完成' },
  { id: 'skipped', label: '跳过' },
];

export const foreshadowStatusOptions: Array<{ id: ForeshadowStatus; label: string }> = [
  { id: 'seeded', label: '已埋' },
  { id: 'developing', label: '发展中' },
  { id: 'ready', label: '待回收' },
  { id: 'resolved', label: '已回收' },
  { id: 'dropped', label: '废弃' },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanList(items: string[]) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

function getLabel<T extends string>(options: Array<{ id: T; label: string }>, id: T) {
  return options.find(option => option.id === id)?.label || id;
}

export function getStorylineKindLabel(kind: StorylineKind) {
  return getLabel(storylineKindOptions, kind);
}

export function getStorylineStatusLabel(status: StorylineStatus) {
  return getLabel(storylineStatusOptions, status);
}

export function getBeatStatusLabel(status: StorylineBeatStatus) {
  return getLabel(beatStatusOptions, status);
}

export function getForeshadowStatusLabel(status: ForeshadowStatus) {
  return getLabel(foreshadowStatusOptions, status);
}

export const useStorylinesStore = defineStore('storylines', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: storylinesField,
    schema: StorylinesScopeDataSchema,
    createDefault: () => validateInplace(StorylinesScopeDataSchema, {}),
  });

  const lines = computed(() => [...data.value.lines].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
  const hooks = computed(() => [...data.value.hooks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
  const beats = computed(() => [...data.value.beats].sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt)));
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'storylines_failed');

  function getLine(lineId: string) {
    return data.value.lines.find(line => line.id === lineId) ?? null;
  }

  function getHook(hookId: string) {
    return data.value.hooks.find(hook => hook.id === hookId) ?? null;
  }

  function getBeat(beatId: string) {
    return data.value.beats.find(beat => beat.id === beatId) ?? null;
  }

  function createLine(input: Partial<Pick<Storyline, 'goal' | 'kind' | 'relatedProfileIds' | 'stakes' | 'status' | 'summary' | 'tags'>> & Pick<Storyline, 'title'>) {
    const timestamp = nowIso();
    const line: Storyline = {
      id: createId('storyline'),
      title: input.title.trim() || '未命名剧情线',
      kind: input.kind ?? 'branch',
      status: input.status ?? 'planned',
      summary: input.summary?.trim() || '',
      goal: input.goal?.trim() || '',
      stakes: input.stakes?.trim() || '',
      relatedProfileIds: cleanList(input.relatedProfileIds ?? []),
      tags: cleanList(input.tags ?? []),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.lines = [line, ...data.value.lines];
    return line;
  }

  function updateLine(lineId: string, input: Pick<Storyline, 'goal' | 'kind' | 'relatedProfileIds' | 'stakes' | 'status' | 'summary' | 'tags' | 'title'>) {
    const line = getLine(lineId);
    if (!line) return null;
    line.title = input.title.trim() || line.title;
    line.kind = input.kind;
    line.status = input.status;
    line.summary = input.summary.trim();
    line.goal = input.goal.trim();
    line.stakes = input.stakes.trim();
    line.relatedProfileIds = cleanList(input.relatedProfileIds);
    line.tags = cleanList(input.tags);
    line.updatedAt = nowIso();
    return line;
  }

  function deleteLine(lineId: string) {
    data.value.lines = data.value.lines.filter(line => line.id !== lineId);
    data.value.beats = data.value.beats.filter(beat => beat.lineId !== lineId);
    data.value.hooks.forEach(hook => {
      if (hook.lineId === lineId) hook.lineId = '';
    });
  }

  function createBeat(input: Partial<Pick<StorylineBeat, 'order' | 'status' | 'summary'>> & Pick<StorylineBeat, 'lineId' | 'title'>) {
    const timestamp = nowIso();
    const beat: StorylineBeat = {
      id: createId('storyline_beat'),
      lineId: input.lineId,
      title: input.title.trim() || '未命名节点',
      summary: input.summary?.trim() || '',
      status: input.status ?? 'planned',
      order: input.order ?? data.value.beats.filter(item => item.lineId === input.lineId).length,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.beats = [...data.value.beats, beat];
    return beat;
  }

  function updateBeat(beatId: string, input: Pick<StorylineBeat, 'lineId' | 'order' | 'status' | 'summary' | 'title'>) {
    const beat = getBeat(beatId);
    if (!beat) return null;
    beat.lineId = input.lineId;
    beat.title = input.title.trim() || beat.title;
    beat.summary = input.summary.trim();
    beat.status = input.status;
    beat.order = Math.max(0, Math.round(input.order || 0));
    beat.updatedAt = nowIso();
    return beat;
  }

  function deleteBeat(beatId: string) {
    data.value.beats = data.value.beats.filter(beat => beat.id !== beatId);
  }

  function createHook(input: Partial<Pick<Foreshadow, 'lineId' | 'payoff' | 'relatedProfileIds' | 'seed' | 'status' | 'tags'>> & Pick<Foreshadow, 'title'>) {
    const timestamp = nowIso();
    const hook: Foreshadow = {
      id: createId('foreshadow'),
      lineId: input.lineId?.trim() || '',
      title: input.title.trim() || '未命名伏笔',
      seed: input.seed?.trim() || '',
      payoff: input.payoff?.trim() || '',
      status: input.status ?? 'seeded',
      relatedProfileIds: cleanList(input.relatedProfileIds ?? []),
      tags: cleanList(input.tags ?? []),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.hooks = [hook, ...data.value.hooks];
    return hook;
  }

  function updateHook(hookId: string, input: Pick<Foreshadow, 'lineId' | 'payoff' | 'relatedProfileIds' | 'seed' | 'status' | 'tags' | 'title'>) {
    const hook = getHook(hookId);
    if (!hook) return null;
    hook.lineId = input.lineId.trim();
    hook.title = input.title.trim() || hook.title;
    hook.seed = input.seed.trim();
    hook.payoff = input.payoff.trim();
    hook.status = input.status;
    hook.relatedProfileIds = cleanList(input.relatedProfileIds);
    hook.tags = cleanList(input.tags);
    hook.updatedAt = nowIso();
    return hook;
  }

  function deleteHook(hookId: string) {
    data.value.hooks = data.value.hooks.filter(hook => hook.id !== hookId);
  }

  return {
    beats,
    createBeat,
    createFailedDraft,
    createHook,
    createLine,
    data,
    deleteBeat,
    deleteFailedDraft,
    deleteHook,
    deleteLine,
    failedDrafts,
    getBeat,
    getFailedDraft,
    getHook,
    getLine,
    hooks,
    lines,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    updateBeat,
    updateFailedDraft,
    updateHook,
    updateLine,
  };
});
