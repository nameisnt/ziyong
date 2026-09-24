import { waitForVisualCondition, waitForVisualPaint } from './context';

export async function checkArchiveDeleteEntrance(root: boolean) {
  const selector = root
    ? '.pc-current-chat-card .pc-archive-backup-actions'
    : '.pc-floor-backup-card .pc-archive-backup-actions';
  let trigger: HTMLButtonElement | undefined;
  if (
    !(await waitForVisualCondition(() => {
      trigger = [...document.querySelectorAll<HTMLButtonElement>(`${selector} button`)].find(
        button => button.textContent?.trim() === '删除聊天',
      );
      return Boolean(trigger && !trigger.disabled);
    }, 2500))
  )
    throw new Error('Direct chat delete button missing or disabled');
  trigger!.click();
  if (!(await waitForVisualCondition(() => Boolean(document.querySelector('.pc-chat-delete-dialog')))))
    throw new Error('First delete confirmation missing');
  const checks = [...document.querySelectorAll<HTMLInputElement>('.pc-chat-delete-dialog input[type="checkbox"]')];
  if (checks.length !== 2 || checks.some(input => input.checked)) throw new Error('Cleanup defaults changed');
  document.querySelector<HTMLButtonElement>('.pc-chat-delete-dialog .pc-primary-btn')!.click();
  if (
    !(await waitForVisualCondition(() => Boolean(document.querySelector('.pc-phone-notice-action[data-role="soft"]'))))
  )
    throw new Error('Final delete confirmation missing');
  document.querySelector<HTMLButtonElement>('.pc-phone-notice-action[data-role="soft"]')!.click();
  await waitForVisualPaint();
  if (document.querySelector<HTMLButtonElement>('.pc-chat-delete-dialog .pc-primary-btn')?.disabled !== false)
    throw new Error('Cancel final confirmation did not unlock dialog');
  [...document.querySelectorAll<HTMLButtonElement>('.pc-chat-delete-dialog button')]
    .find(button => button.textContent?.trim() === '取消')!
    .click();
  await waitForVisualPaint();
  if (document.querySelector('.pc-chat-delete-dialog'))
    throw new Error('Cancel first confirmation did not close dialog');
  if (!root && document.querySelector('.pc-archive-page > .pc-directory-toolbar .pc-action-menu'))
    throw new Error('Single-action detail menu remains');
}
