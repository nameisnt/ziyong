import { ScenePlannerScopeDataSchema, useScenePlannerStore } from '@/apps/scene-planner/store';

type ScenePlannerVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function findPlanRow(title: string) {
  return [...document.querySelectorAll<HTMLElement>('.pc-scene-history-item')].find(
    row => row.querySelector('.pc-scene-history-main strong')?.textContent?.trim() === title,
  );
}

function sceneTitleInput() {
  return document.querySelector<HTMLInputElement>('.pc-scene-editor > input.pc-field');
}

function clickSceneMenuAction(container: ParentNode, menuLabel: string, actionLabel: string) {
  const trigger = container.querySelector<HTMLButtonElement | HTMLElement>(
    `.pc-action-menu > summary[aria-label="${menuLabel}"]`,
  );
  trigger?.click();
  const action = [...container.querySelectorAll<HTMLButtonElement>('.pc-action-menu-panel button')].find(button =>
    button.textContent?.includes(actionLabel),
  );
  if (!action) throw new Error(`Scene Planner menu action is missing: ${menuLabel} / ${actionLabel}`);
  action.click();
}

async function confirmScenePlanDeletion(
  label: '取消' | '删除',
  { waitForCondition, waitForPaint }: ScenePlannerVisualScenarioContext,
) {
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Scene Planner deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`Scene Planner confirmation action is missing: ${label}`);
  action.click();
  await waitForPaint();
}

export async function applyScenePlannerVisualScenario(
  name: string,
  context: ScenePlannerVisualScenarioContext,
) {
  if (name !== 'scene-planner-history') return false;

  const planner = useScenePlannerStore();
  const initialData = ScenePlannerScopeDataSchema.parse(JSON.parse(JSON.stringify(planner.data)));
  const timestamp = '2026-08-15T08:00:00.000Z';
  Object.assign(
    planner.data,
    ScenePlannerScopeDataSchema.parse({
      failedDrafts: [],
      plans: [
        {
          id: 'visual-scene-current',
          title: '当前场景',
          brief: '主角抵达雨夜车站。',
          analysis: '先建立误会。',
          prompt: '续写车站重逢。',
          styleNote: '克制、缓慢',
          avoidNote: '不要立刻和解',
          status: 'ready',
          turns: [],
          createdAt: timestamp,
          updatedAt: '2026-08-15T09:00:00.000Z',
        },
        {
          id: 'visual-scene-spare',
          title: '备用场景',
          brief: '备用方案正文。',
          status: 'draft',
          turns: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }),
  );

  try {
    context.resetPhoneToRoute('scene-planner', 'root', '场景编排');
    await context.waitForPaint();
    const currentRow = findPlanRow('当前场景');
    if (!currentRow) throw new Error('Scene Planner current history row is missing');
    currentRow.querySelector<HTMLButtonElement>('.pc-scene-history-main')?.click();
    await context.waitForPaint();
    const titleInput = sceneTitleInput();
    const briefArea = document.querySelector<HTMLTextAreaElement>('.pc-scene-brief');
    if (titleInput?.value !== '当前场景' || briefArea?.value !== '主角抵达雨夜车站。') {
      throw new Error('Scene Planner history selection did not refill the editor');
    }

    const editor = document.querySelector<HTMLElement>('.pc-scene-editor');
    if (!editor) throw new Error('Scene Planner editor is missing');
    clickSceneMenuAction(editor, '新增', '新方案');
    await context.waitForPaint();
    if (sceneTitleInput()?.value || document.querySelector<HTMLTextAreaElement>('.pc-scene-brief')?.value) {
      throw new Error('Scene Planner new-plan action did not clear the active editor');
    }

    findPlanRow('当前场景')?.querySelector<HTMLButtonElement>('.pc-scene-history-main')?.click();
    await context.waitForPaint();
    let activeRow = findPlanRow('当前场景');
    if (!activeRow?.classList.contains('active')) throw new Error('Scene Planner did not mark the selected plan active');
    clickSceneMenuAction(activeRow, '管理', '删除');
    await confirmScenePlanDeletion('取消', context);
    if (planner.plans.length !== 2 || !planner.getPlan('visual-scene-current')) {
      throw new Error('Cancelling Scene Planner deletion changed the plan collection');
    }

    activeRow = findPlanRow('当前场景');
    if (!activeRow) throw new Error('Scene Planner active row disappeared before confirmed deletion');
    clickSceneMenuAction(activeRow, '管理', '删除');
    await confirmScenePlanDeletion('删除', context);
    if (
      !(await context.waitForCondition(
        () =>
          planner.plans.length === 1 &&
          planner.getPlan('visual-scene-current') === null &&
          planner.getPlan('visual-scene-spare')?.title === '备用场景' &&
          sceneTitleInput()?.value === '',
      ))
    ) {
      throw new Error('Confirmed Scene Planner deletion did not remove only the active plan and reset the editor');
    }
  } finally {
    Object.assign(planner.data, ScenePlannerScopeDataSchema.parse(initialData));
  }

  return true;
}
