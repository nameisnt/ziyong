import { ComfySettingsSchema, useComfyStore } from '@/apps/comfy/store';

type ComfyVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function openComfyActionMenu(context: ComfyVisualScenarioContext) {
  const root = document.querySelector<HTMLElement>('.pc-comfy-actions');
  const summary = root?.querySelector<HTMLButtonElement>('.pc-action-menu summary');
  if (!root || !summary) throw new Error('ComfyUI pc-comfy-actions menu is missing');
  if (!root.querySelector('.pc-action-menu-panel')) summary.click();
  await context.waitForPaint();
  return root;
}

async function clickComfyMenuAction(label: string, context: ComfyVisualScenarioContext) {
  const root = await openComfyActionMenu(context);
  const action = [...root.querySelectorAll<HTMLButtonElement>('.pc-action-menu-panel button')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`ComfyUI management action is missing: ${label}`);
  action.click();
  await context.waitForPaint();
}

async function selectComfyWorkflow(label: string, context: ComfyVisualScenarioContext) {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="选择当前工作流"]');
  const combobox = input?.closest<HTMLElement>('.pc-combobox');
  if (!input || !combobox) throw new Error('ComfyUI workflow combobox is missing');
  input.click();
  await context.waitForPaint();
  const option = [...combobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
    button.textContent?.includes(label),
  );
  if (!option) throw new Error(`ComfyUI workflow option is missing: ${label}`);
  option.click();
  await context.waitForPaint();
}

async function confirmComfyWorkflowDeletion(label: '取消' | '删除', context: ComfyVisualScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('ComfyUI workflow deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`ComfyUI workflow confirmation action is missing: ${label}`);
  action.click();
  await context.waitForPaint();
}

export async function applyComfyVisualScenario(name: string, context: ComfyVisualScenarioContext) {
  if (name !== 'comfy-workflow-crud') return false;

  const comfy = useComfyStore();
  const initialSettings = ComfySettingsSchema.parse(comfy.settings);
  const fixture = ComfySettingsSchema.parse({
    activeWorkflowId: 'visual-comfy-original',
    workflowJson: '{"fixture":true}',
    workflows: [
      {
        id: 'visual-comfy-original',
        json: '{"fixture":true}',
        kind: 'image',
        name: '原始工作流',
      },
    ],
  });
  Object.assign(comfy.settings, fixture);

  try {
    context.resetPhoneToRoute('comfy', 'root', 'ComfyUI');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('button[title="新建工作流"]')?.click();
    if (!(await context.waitForCondition(() => comfy.settings.workflows.length === 2))) {
      throw new Error('ComfyUI did not create a workflow');
    }
    const createdId = comfy.settings.activeWorkflowId;
    const nameInput = document.querySelector<HTMLInputElement>('.pc-workflow-meta-grid input[type="text"]');
    if (!nameInput) throw new Error('ComfyUI workflow name field is missing');
    setInputValue(nameInput, '视觉新工作流');
    if (
      !(await context.waitForCondition(
        () => comfy.settings.workflows.find(workflow => workflow.id === createdId)?.name === '视觉新工作流',
      ))
    ) {
      throw new Error('ComfyUI workflow rename did not persist');
    }

    await clickComfyMenuAction('复制当前工作流', context);
    if (!(await context.waitForCondition(() => comfy.settings.workflows.length === 3))) {
      throw new Error('ComfyUI workflow duplication did not persist');
    }
    const copyId = comfy.settings.activeWorkflowId;
    if (comfy.settings.workflows.find(workflow => workflow.id === copyId)?.name !== '视觉新工作流 副本') {
      throw new Error('ComfyUI duplicate did not preserve the source workflow name');
    }

    await selectComfyWorkflow('原始工作流', context);
    if (comfy.settings.activeWorkflowId !== 'visual-comfy-original') {
      throw new Error('ComfyUI combobox did not select the original workflow');
    }
    await selectComfyWorkflow('视觉新工作流 副本', context);
    if (comfy.settings.activeWorkflowId !== copyId) {
      throw new Error('ComfyUI combobox did not return to the copied workflow');
    }

    await clickComfyMenuAction('删除当前工作流', context);
    await confirmComfyWorkflowDeletion('取消', context);
    if (comfy.settings.workflows.length !== 3) {
      throw new Error('Cancelling ComfyUI workflow deletion changed settings.workflows');
    }
    await clickComfyMenuAction('删除当前工作流', context);
    await confirmComfyWorkflowDeletion('删除', context);
    if (
      !(await context.waitForCondition(
        () =>
          comfy.settings.workflows.length === 2 &&
          !comfy.settings.workflows.some(workflow => workflow.id === copyId) &&
          comfy.settings.activeWorkflowId === 'visual-comfy-original',
      ))
    ) {
      throw new Error('Confirmed ComfyUI workflow deletion did not restore the first active workflow');
    }
  } finally {
    Object.assign(comfy.settings, ComfySettingsSchema.parse(initialSettings));
  }

  return true;
}
