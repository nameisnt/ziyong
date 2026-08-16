import { useMediaStore } from '@/apps/media/store';

type MediaLibraryScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function findButton(label: string, root: ParentNode = document) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  return (
    buttons.find(button => button.title === label || button.getAttribute('aria-label') === label) ??
    buttons.find(button => button.textContent?.includes(label))
  );
}

function setControlValue(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

async function waitForSelector(selector: string, context: MediaLibraryScenarioContext, error: string) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector(selector))))) throw new Error(error);
  await context.waitForPaint();
}

async function confirmMediaDeletion(context: MediaLibraryScenarioContext) {
  await waitForSelector('.pc-phone-notice-action', context, 'Media deletion confirmation is missing');
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('删除'),
  );
  if (!action) throw new Error('Media deletion confirmation action is missing');
  action.click();
  if (!(await context.waitForCondition(() => !document.querySelector('.pc-phone-notice-action')))) {
    throw new Error('Media deletion confirmation did not close');
  }
  await context.waitForPaint();
}

function fillMediaEditor(title: string, url: string, note: string) {
  const titleInput = document.querySelector<HTMLInputElement>('input[placeholder="标题"]');
  const urlInput = document.querySelector<HTMLInputElement>('input[placeholder*="URL"]');
  const noteArea = document.querySelector<HTMLTextAreaElement>('textarea');
  if (!titleInput || !urlInput || !noteArea) throw new Error('Media editor fields are incomplete');
  setControlValue(titleInput, title);
  setControlValue(urlInput, url);
  setControlValue(noteArea, note);
}

function assertKinds(imageCount: number, audioCount: number, videoCount: number) {
  const entries = useMediaStore().entries;
  if (entries.filter(entry => entry.kind === 'image').length !== imageCount) {
    throw new Error('Shared media store image kind count is incorrect');
  }
  if (entries.filter(entry => entry.kind === 'audio').length !== audioCount) {
    throw new Error('Shared media store audio kind count is incorrect');
  }
  if (entries.filter(entry => entry.kind === 'video').length !== videoCount) {
    throw new Error('Shared media store video kind count is incorrect');
  }
}

export async function applyMediaLibraryVisualScenario(name: string, context: MediaLibraryScenarioContext) {
  if (name !== 'media-library-crud') return false;

  const media = useMediaStore();
  media.resetCurrentScope();

  context.resetPhoneToRoute('gallery', 'root', '相册');
  await context.waitForPaint();
  const addImage = findButton('新增图片', document.querySelector('.pc-gallery-app') || document);
  if (!addImage) throw new Error('Gallery create action is missing');
  addImage.click();
  await waitForSelector('.pc-gallery-editor', context, 'Gallery editor did not open');
  fillMediaEditor(
    '视觉相册条目',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="2" height="2"%3E%3C/svg%3E',
    '相册初始备注',
  );
  findButton('保存', document.querySelector('.pc-gallery-editor') || document)?.click();
  await waitForSelector('.pc-gallery-viewer', context, 'Gallery save did not open its viewer');
  assertKinds(1, 0, 0);

  context.resetPhoneToRoute('music', 'root', '音乐');
  await context.waitForPaint();
  if (document.querySelector('.pc-track-row')) throw new Error('Gallery entry leaked into the music list');
  const addAudio = findButton('新增音乐', document.querySelector('.pc-music-app') || document);
  if (!addAudio) throw new Error('Music create action is missing');
  addAudio.click();
  await waitForSelector('.pc-music-editor', context, 'Music editor did not open');
  fillMediaEditor('视觉音乐条目', 'data:audio/wav;base64,', '音乐初始歌词');
  findButton('保存', document.querySelector('.pc-music-editor') || document)?.click();
  await waitForSelector('.pc-track-row', context, 'Music save did not return to its list');
  assertKinds(1, 1, 0);

  context.resetPhoneToRoute('video', 'root', '视频');
  await context.waitForPaint();
  if (document.querySelector('.pc-video-card')) throw new Error('Image or audio entry leaked into the video list');
  const addVideo = findButton('新增视频', document.querySelector('.pc-video-app') || document);
  if (!addVideo) throw new Error('Video create action is missing');
  addVideo.click();
  await waitForSelector('.pc-video-editor', context, 'Video editor did not open');
  fillMediaEditor('视觉视频条目', 'data:video/mp4;base64,', '视频初始备注');
  findButton('保存', document.querySelector('.pc-video-editor') || document)?.click();
  await waitForSelector('.pc-video-viewer', context, 'Video save did not open its viewer');
  assertKinds(1, 1, 1);

  findButton('编辑', document.querySelector('.pc-video-viewer') || document)?.click();
  await waitForSelector('.pc-video-editor', context, 'Video edit action did not open its editor');
  fillMediaEditor('视觉视频已编辑', 'data:video/mp4;base64,', '视频修改后备注');
  findButton('保存', document.querySelector('.pc-video-editor') || document)?.click();
  await waitForSelector('.pc-video-viewer', context, 'Video edit did not return to its viewer');
  const video = media.entries.find(entry => entry.kind === 'video');
  if (video?.title !== '视觉视频已编辑' || video.note !== '视频修改后备注') {
    throw new Error('Video edit did not persist in the shared media store');
  }
  findButton('删除', document.querySelector('.pc-video-viewer') || document)?.click();
  await confirmMediaDeletion(context);
  assertKinds(1, 1, 0);

  context.resetPhoneToRoute('music', 'root', '音乐');
  await waitForSelector('.pc-track-row', context, 'Saved music entry is missing from its list');
  findButton('编辑', document.querySelector('.pc-track-row') || document)?.click();
  await waitForSelector('.pc-music-editor', context, 'Music edit action did not open its editor');
  fillMediaEditor('视觉音乐已编辑', 'data:audio/wav;base64,', '音乐修改后歌词');
  findButton('保存', document.querySelector('.pc-music-editor') || document)?.click();
  await waitForSelector('.pc-track-row', context, 'Music edit did not return to its list');
  const audio = media.entries.find(entry => entry.kind === 'audio');
  if (audio?.title !== '视觉音乐已编辑' || audio.note !== '音乐修改后歌词') {
    throw new Error('Music edit did not persist in the shared media store');
  }
  findButton('编辑', document.querySelector('.pc-track-row') || document)?.click();
  await waitForSelector('.pc-music-editor', context, 'Music editor did not reopen for deletion');
  findButton('删除', document.querySelector('.pc-music-editor') || document)?.click();
  await confirmMediaDeletion(context);
  assertKinds(1, 0, 0);

  context.resetPhoneToRoute('gallery', 'root', '相册');
  await waitForSelector('.pc-gallery-tile', context, 'Saved gallery entry is missing from its grid');
  document.querySelector<HTMLButtonElement>('.pc-gallery-tile')?.click();
  await waitForSelector('.pc-gallery-viewer', context, 'Gallery tile did not open its viewer');
  findButton('编辑', document.querySelector('.pc-gallery-viewer') || document)?.click();
  await waitForSelector('.pc-gallery-editor', context, 'Gallery edit action did not open its editor');
  fillMediaEditor(
    '视觉相册已编辑',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="2" height="2"%3E%3C/svg%3E',
    '相册修改后备注',
  );
  findButton('保存', document.querySelector('.pc-gallery-editor') || document)?.click();
  await waitForSelector('.pc-gallery-viewer', context, 'Gallery edit did not return to its viewer');
  const image = media.entries.find(entry => entry.kind === 'image');
  if (image?.title !== '视觉相册已编辑' || image.note !== '相册修改后备注') {
    throw new Error('Gallery edit did not persist in the shared media store');
  }
  findButton('删除', document.querySelector('.pc-gallery-viewer') || document)?.click();
  await confirmMediaDeletion(context);
  assertKinds(0, 0, 0);

  return true;
}
