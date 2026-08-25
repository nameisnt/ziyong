import { useWorkbenchStore } from '@/apps/workbench/store';

type WorkbenchVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function findButtonByTitle(title: string, root: ParentNode = document) {
  return root.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
}

async function selectNextStepOption(
  picker: HTMLElement,
  excludedLabel: string,
  context: WorkbenchVisualScenarioContext,
) {
  const input = picker.querySelector<HTMLInputElement>('.pc-combobox-input');
  if (!input) throw new Error('Workbench step picker input is missing');
  input.click();
  await context.waitForPaint();
  const option = [...picker.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button => {
    const label = button.textContent?.trim() || '';
    return label && label !== excludedLabel && !button.disabled;
  });
  if (!option) throw new Error('Workbench step picker has no distinct enabled option');
  const label = option.textContent?.trim() || '';
  option.click();
  await context.waitForPaint();
  findButtonByTitle('新增步骤', picker)?.click();
  await context.waitForPaint();
  return label;
}

async function confirmWorkbenchDeletion(context: WorkbenchVisualScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Workbench deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('删除'),
  );
  if (!action) throw new Error('Workbench deletion action is missing');
  action.click();
  await context.waitForPaint();
}

export async function applyWorkbenchVisualScenario(name: string, context: WorkbenchVisualScenarioContext) {
  if (name === 'workbench-profile-step') {
    const workbench = useWorkbenchStore();
    workbench.settings.insertDrafts = [];
    workbench.settings.logs = [];
    workbench.settings.workflows = [];
    (globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> }).AutoCardUpdaterAPI = {
      exportTableAsJson: () => ({
        sheet_people: { content: [['姓名', '详情']], name: '重要人物表', uid: 'people' },
      }),
    };
    const workflow = workbench.createWorkflow('外部资料整理');
    const step = workbench.addStep(workflow.id, { actionId: 'generate', appId: 'profiles' });
    step.config.profileSheetKey = 'sheet_people';
    step.config.profileTitleColumn = '姓名';
    step.config.profileTitleHint = '李沐晨';
    context.resetPhoneToRoute('workbench', 'root', '工作台');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-workflow-title')?.click();
    await context.waitForPaint();
    findButtonByTitle('展开步骤')?.click();
    await context.waitForPaint();
    const tableInput = [...document.querySelectorAll<HTMLInputElement>('.pc-step-card .pc-combobox-input')].find(
      input => input.getAttribute('aria-label') === '选择外部资料表',
    );
    if (tableInput?.value !== '重要人物表') {
      throw new Error('Workbench profile step did not render the selected external table');
    }
    const workflowBody = document.querySelector<HTMLElement>('.pc-workflow-body');
    const stepList = workflowBody?.querySelector<HTMLElement>('.pc-step-list');
    if (!workflowBody || !stepList) throw new Error('Workbench profile step list is missing');
    for (const child of workflowBody.children) {
      if (child !== stepList) (child as HTMLElement).style.display = 'none';
    }
    tableInput.scrollIntoView({ block: 'center' });
    await context.waitForPaint();
    return true;
  }

  if (name !== 'workbench-crud') return false;

  const workbench = useWorkbenchStore();
  workbench.settings.insertDrafts = [];
  workbench.settings.logs = [];
  workbench.settings.workflows = [];
  context.resetPhoneToRoute('workbench', 'root', '工作台');
  await context.waitForPaint();

  findButtonByTitle('新建流程')?.click();
  if (!(await context.waitForCondition(() => workbench.settings.workflows.length === 1))) {
    throw new Error('Workbench UI did not create a workflow');
  }

  const workflow = workbench.settings.workflows[0];
  const workflowBody = document.querySelector<HTMLElement>('.pc-workflow-body');
  const nameInput = workflowBody?.querySelector<HTMLInputElement>('.pc-form-grid input.pc-field[type="text"]');
  if (!workflow || !workflowBody || !nameInput) throw new Error('Workbench workflow editor did not open');
  setInputValue(nameInput, '视觉工作流 CRUD');
  if (!(await context.waitForCondition(() => workbench.settings.workflows[0]?.name === '视觉工作流 CRUD'))) {
    throw new Error('Workbench workflow rename did not persist');
  }

  const picker = document.querySelector<HTMLElement>('.pc-step-picker');
  if (!picker) throw new Error('Workbench step picker is missing');
  const firstLabel = await selectNextStepOption(picker, '', context);
  if (!(await context.waitForCondition(() => workbench.settings.workflows[0]?.steps.length === 1))) {
    throw new Error('Workbench UI did not add the first step');
  }
  await selectNextStepOption(picker, firstLabel, context);
  if (!(await context.waitForCondition(() => workbench.settings.workflows[0]?.steps.length === 2))) {
    throw new Error('Workbench UI did not add the second step');
  }

  const beforeMove = workbench.settings.workflows[0]?.steps.map(step => step.id) || [];
  const secondCard = document.querySelectorAll<HTMLElement>('.pc-step-card')[1];
  findButtonByTitle('上移', secondCard)?.click();
  if (
    !(await context.waitForCondition(() => {
      const current = workbench.settings.workflows[0]?.steps || [];
      return current[0]?.id === beforeMove[1] && current[1]?.id === beforeMove[0];
    }))
  ) {
    throw new Error('Workbench moveStep action did not reorder the steps');
  }

  const firstCardAfterMove = document.querySelector<HTMLElement>('.pc-step-card');
  findButtonByTitle('删除', firstCardAfterMove || document)?.click();
  await confirmWorkbenchDeletion(context);
  if (!(await context.waitForCondition(() => workbench.settings.workflows[0]?.steps.length === 1))) {
    throw new Error('Workbench confirmed step deletion did not persist');
  }

  const workflowActions = document.querySelector<HTMLElement>('.pc-workflow-actions');
  const deleteWorkflowButton = [...(workflowActions?.querySelectorAll<HTMLButtonElement>('button') || [])].find(
    button => button.textContent?.includes('删除'),
  );
  if (!deleteWorkflowButton) throw new Error('Workbench workflow delete button is missing');
  deleteWorkflowButton.click();
  await confirmWorkbenchDeletion(context);
  if (!(await context.waitForCondition(() => workbench.settings.workflows.length === 0))) {
    throw new Error('Workbench confirmed workflow deletion did not persist');
  }

  return true;
}
