type RepositorySettings = {
  autoEnabled: boolean;
  manifestPath: string;
  retention: number;
  snapshots: unknown[];
  version: 1;
};

type FileRepositoryVisualContext = {
  repository: {
    lastError: string;
    settings: RepositorySettings;
    snapshots: unknown[];
    stopAutoSnapshots: () => void;
  };
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function findButton(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
    button.textContent?.includes(label),
  );
}

export async function applyFileRepositoryVisualScenario(
  name: string,
  { repository, resetPhoneToRoute, waitForCondition, waitForPaint }: FileRepositoryVisualContext,
) {
  if (name !== 'file-repository-operations') return false;

  repository.stopAutoSnapshots();
  repository.settings = {
    autoEnabled: false,
    manifestPath: 'user/files/phone-file-repository-manifest.json',
    retention: 10,
    snapshots: [],
    version: 1,
  };
  repository.lastError = '';
  const fileService = installMemoryFileService();

  resetPhoneToRoute('file-repository', 'root', '插件文件仓库');
  await waitForPaint();
  const createButton = findButton('立即快照');
  if (!createButton) throw new Error('File repository create action is missing');
  createButton.click();
  if (!(await waitForCondition(() => repository.snapshots.length === 1 && Boolean(document.querySelector('.pc-repository-row'))))) {
    throw new Error(`File repository did not create one snapshot: ${repository.lastError || 'no error'}`);
  }

  document.querySelector<HTMLButtonElement>('.pc-repository-row > button')?.click();
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-repository-metrics'))))) {
    throw new Error('File repository did not read the created snapshot detail');
  }

  findButton('保护版本')?.click();
  if (
    !(await waitForCondition(() =>
      Boolean(findButton('取消保护') && document.querySelector<HTMLButtonElement>('.pc-soft-btn.danger')?.disabled),
    ))
  ) {
    throw new Error('File repository did not protect the selected snapshot');
  }
  findButton('取消保护')?.click();
  if (
    !(await waitForCondition(() =>
      Boolean(findButton('保护版本') && !document.querySelector<HTMLButtonElement>('.pc-soft-btn.danger')?.disabled),
    ))
  ) {
    throw new Error('File repository did not remove snapshot protection');
  }

  findButton('删除')?.click();
  if (
    !(await waitForCondition(() =>
      Boolean(
        [...document.querySelectorAll<HTMLElement>('.pc-phone-notice')].some(notice =>
          notice.textContent?.includes('确认删除这份文件快照吗'),
        ),
      ),
    ))
  ) {
    throw new Error('File repository delete confirmation is missing');
  }
  const confirmDelete = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('删除'),
  );
  confirmDelete?.click();
  if (
    !(await waitForCondition(() =>
      repository.snapshots.length === 0 && Boolean(document.querySelector('.pc-repository-settings')),
    ))
  ) {
    throw new Error('File repository did not delete only the confirmed snapshot and return to its root');
  }

  fileService.failRead('user/files/phone-file-repository-manifest.json');
  document.querySelector<HTMLButtonElement>('button[title="刷新仓库清单"]')?.click();
  if (
    !(await waitForCondition(() =>
      document.querySelector<HTMLElement>('.pc-status-card.danger')?.textContent?.includes('文件仓库操作失败') === true,
    ))
  ) {
    throw new Error('File repository did not keep a failed refresh visible in its status card');
  }
  await waitForPaint();
  return true;
}
import { installMemoryFileService } from './memoryFileService';
