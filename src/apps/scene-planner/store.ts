import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { FailedGenerationDraftSchema } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const scenePlannerField = 'sillytavern_phone_scene_planner';

export const ScenePlanStatusSchema = z.enum(['draft', 'ready', 'used', 'archived']);
export type ScenePlanStatus = z.infer<typeof ScenePlanStatusSchema>;

export const ScenePlanTurnSchema = z.object({
  id: z.string(),
  role: z.enum(['assistant', 'user']),
  content: z.string(),
  createdAt: z.string(),
});
export type ScenePlanTurn = z.infer<typeof ScenePlanTurnSchema>;

export const ScenePlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  brief: z.string().default(''),
  analysis: z.string().default(''),
  prompt: z.string().default(''),
  styleNote: z.string().default(''),
  avoidNote: z.string().default(''),
  status: ScenePlanStatusSchema.default('draft'),
  turns: z.array(ScenePlanTurnSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScenePlan = z.infer<typeof ScenePlanSchema>;

export const ScenePlannerScopeDataSchema = z.object({
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
  plans: z.array(ScenePlanSchema).default([]),
});
export type ScenePlannerScopeData = z.infer<typeof ScenePlannerScopeDataSchema>;

export const scenePlanStatusOptions: Array<{ id: ScenePlanStatus; label: string }> = [
  { id: 'draft', label: '草稿' },
  { id: 'ready', label: '可使用' },
  { id: 'used', label: '已采用' },
  { id: 'archived', label: '归档' },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getScenePlanStatusLabel(status: ScenePlanStatus) {
  return scenePlanStatusOptions.find(option => option.id === status)?.label || '草稿';
}

export const useScenePlannerStore = defineStore('scene-planner', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: scenePlannerField,
    schema: ScenePlannerScopeDataSchema,
    createDefault: () => validateInplace(ScenePlannerScopeDataSchema, {}),
  });

  const plans = computed(() => [...data.value.plans].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
  const { createFailedDraft, deleteFailedDraft, failedDrafts, getFailedDraft, updateFailedDraft } =
    createFailedDraftCollection(data, 'scene_planner_failed');

  function getPlan(planId: string) {
    return data.value.plans.find(plan => plan.id === planId) ?? null;
  }

  function createPlan(input: Partial<Pick<ScenePlan, 'analysis' | 'avoidNote' | 'brief' | 'prompt' | 'status' | 'styleNote' | 'turns'>> & Pick<ScenePlan, 'title'>) {
    const timestamp = nowIso();
    const plan: ScenePlan = {
      id: createId('scene_plan'),
      title: input.title.trim() || '未命名场景',
      brief: input.brief?.trim() || '',
      analysis: input.analysis?.trim() || '',
      prompt: input.prompt?.trim() || '',
      styleNote: input.styleNote?.trim() || '',
      avoidNote: input.avoidNote?.trim() || '',
      status: input.status ?? 'draft',
      turns: input.turns ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.plans = [plan, ...data.value.plans];
    return plan;
  }

  function updatePlan(planId: string, input: Pick<ScenePlan, 'analysis' | 'avoidNote' | 'brief' | 'prompt' | 'status' | 'styleNote' | 'title'>) {
    const plan = getPlan(planId);
    if (!plan) return null;
    plan.title = input.title.trim() || plan.title;
    plan.brief = input.brief.trim();
    plan.analysis = input.analysis.trim();
    plan.prompt = input.prompt.trim();
    plan.styleNote = input.styleNote.trim();
    plan.avoidNote = input.avoidNote.trim();
    plan.status = input.status;
    plan.updatedAt = nowIso();
    return plan;
  }

  function appendTurn(planId: string, role: ScenePlanTurn['role'], content: string) {
    const plan = getPlan(planId);
    const normalized = content.trim();
    if (!plan || !normalized) return null;
    const timestamp = nowIso();
    const turn: ScenePlanTurn = {
      id: createId('scene_plan_turn'),
      role,
      content: normalized,
      createdAt: timestamp,
    };
    plan.turns = [...plan.turns, turn];
    plan.updatedAt = timestamp;
    return turn;
  }

  function deletePlan(planId: string) {
    data.value.plans = data.value.plans.filter(plan => plan.id !== planId);
  }

  return {
    appendTurn,
    createFailedDraft,
    createPlan,
    data,
    deleteFailedDraft,
    deletePlan,
    failedDrafts,
    getFailedDraft,
    getPlan,
    plans,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    updateFailedDraft,
    updatePlan,
  };
});
