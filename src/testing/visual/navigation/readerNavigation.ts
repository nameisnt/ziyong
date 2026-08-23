import { waitForVisualPaint } from '@/testing/visual/context';

export async function toggleReaderFooter() {
  const readerShell = document.querySelector<HTMLElement>('.pc-reader-detail-shell');
  if (!readerShell) throw new Error('Reader detail shell is missing');
  const rect = readerShell.getBoundingClientRect();
  const pointerInit: PointerEventInit = {
    bubbles: true,
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    isPrimary: true,
    pointerId: 1,
  };
  readerShell.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
  readerShell.dispatchEvent(new PointerEvent('pointerup', pointerInit));
  await waitForVisualPaint();
}

export async function openReaderTools() {
  const trigger = document.querySelector<HTMLButtonElement>('.pc-reader-tool-trigger');
  if (!trigger) throw new Error('Reader tool trigger is missing');
  if (!document.querySelector('.pc-reader-tool-menu')) trigger.click();
  await waitForVisualPaint();
  if (!document.querySelector('.pc-reader-tool-menu')) throw new Error('Reader tool menu did not open');
}

export async function openReaderCatalog() {
  await toggleReaderFooter();
  const catalogButton = document.querySelector<HTMLButtonElement>('.pc-detail-nav .catalog');
  if (!catalogButton) throw new Error('Reader catalog button is missing after revealing the footer');
  catalogButton.click();
  await waitForVisualPaint();
  if (!document.querySelector('.pc-catalog-mask')) throw new Error('Reader catalog modal did not open');
}
