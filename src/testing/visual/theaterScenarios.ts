import { useSettingsStore } from '@/store/settings';
import { useTheaterStore } from '@/store/theater';
import type { HiddenGenerationRecord } from '@/type/generation';

interface TheaterScenarioContext {
  createHiddenGenerationRecord: (
    actionId: string,
    userRequirement: string,
    config?: Record<string, unknown>,
  ) => HiddenGenerationRecord;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
}

export function createTheaterFixture() {
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  const firstEntry = theater.createEntry({
    content: '后台灯光还没有完全亮起，角色们在幕布后完成一场短暂而轻快的对话。',
    participants: [{ name: 'Nova' }, { name: 'Zod' }],
    renderMode: 'markdown',
    title: '【直播】问心台满月宴：全仙门都在等一个笑点',
    typeId: 'prompt_type_theater_funny',
    typeName: '搞笑',
  });
  theater.createEntry({
    content: '两人把争执藏进一句普通的问候里，直到雨声替他们把停顿说出口。',
    participants: [{ name: 'Kaios' }, { name: 'Mira' }],
    renderMode: 'markdown',
    title: '雨夜后台，谢幕之后',
    typeId: 'prompt_type_theater_dialogue',
    typeName: '对话体',
  });
  return firstEntry;
}

export async function applyTheaterVisualScenario(name: string, context: TheaterScenarioContext) {
  if (!name.startsWith('theater-')) return false;
  const { resetPhoneToRoute, waitForPaint } = context;
  if (name === 'theater-generate') {
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
  } else if (name === 'theater-rewrite-generate') {
    const entry = createTheaterFixture();
    const requirement = '小剧场当前版本的隐藏追加要求。';
    entry.generationRecord = context.createHiddenGenerationRecord('generate', requirement, {
      renderMode: entry.renderMode, typeId: entry.typeId, typeName: entry.typeName,
    });
    resetPhoneToRoute('theater', 'generate', '重写小剧场', { rewriteEntryId: entry.id, typeId: entry.typeId || '' });
    await waitForPaint();
    if (document.querySelector<HTMLTextAreaElement>('.pc-requirement-field textarea')?.value !== requirement) {
      throw new Error('Theater rewrite did not restore the current version hidden generation record');
    }
  } else if (name === 'theater-generate-dark-inputs') {
    const settingsStore = useSettingsStore();
    const hostThemeOverride = document.createElement('style');
    hostThemeOverride.id = 'visual-host-theme-override';
    hostThemeOverride.textContent = 'textarea:not(#send_textarea) { background-color: rgb(255, 255, 255) !important; color: rgb(60, 60, 70) !important; }';
    document.head.append(hostThemeOverride);
    settingsStore.setTheme('dark');
    settingsStore.settings.visualTheme.backgroundColor = '#242129';
    settingsStore.settings.visualTheme.surfaceColor = 'rgba(255, 255, 255, 0.08)';
    settingsStore.settings.visualTheme.surfaceStrongColor = '#ffffff';
    settingsStore.settings.visualTheme.textColor = '#f5f5f7';
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
    await waitForPaint();
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.pc-theater-app textarea.pc-area');
    if (textareas.length < 2) throw new Error('Theater dark input fixture is incomplete');
    textareas.forEach(textarea => {
      const style = getComputedStyle(textarea);
      const background = style.backgroundColor.replace(/\s+/g, '');
      const color = style.color.replace(/\s+/g, '');
      if (background !== 'rgb(44,44,46)' || color !== 'rgb(245,245,247)') throw new Error(`Theater dark input colors are invalid: ${background} / ${color}`);
    });
  } else if (name === 'theater-editor') {
    const entry = createTheaterFixture();
    resetPhoneToRoute('theater', 'editor', '编辑小剧场', { entryId: entry.id });
  } else if (name === 'theater-frontend-footer') {
    const theater = useTheaterStore();
    theater.resetCurrentScope();
    const entry = theater.createEntry({ content: '<main><button type="button">网页内部按钮</button><p>网页渲染正文</p></main>', participants: [], renderMode: 'frontend', title: '网页渲染底栏测试', typeName: '网页测试' });
    resetPhoneToRoute('theater', 'entry', entry.title, { entryId: entry.id });
    await waitForPaint();
    if (!document.querySelector('.pc-reader-footer-popover')) throw new Error('Frontend theater detail did not keep its footer visible');
  } else if (name === 'theater-history') {
    createTheaterFixture();
    const theater = useTheaterStore();
    Array.from({ length: 18 }, (_, index) => theater.createEntry({ content: `标签筛选测试正文 ${index + 1}`, participants: [], renderMode: 'markdown', title: `标签筛选测试 ${index + 1}`, typeName: `类型 ${index + 1}` }));
    resetPhoneToRoute('theater', 'history', '小剧场记录');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-theater-filter-toggle')?.click();
    await waitForPaint();
    const tagList = document.querySelector<HTMLElement>('.pc-history-tag-list');
    if (!tagList || tagList.scrollHeight <= tagList.clientHeight) throw new Error('Theater history tag panel did not constrain a long tag list');
  } else if (name === 'theater-failed-draft') {
    const theater = useTheaterStore();
    theater.resetCurrentScope();
    const draft = theater.createFailedDraft({ actionId: 'generate', appId: 'theater', context: { renderMode: 'frontend' }, rawOutput: '<theater><title>未闭合</title><content>等待修复的小剧场', source: visualSource(), warnings: ['缺少结束标签'] });
    resetPhoneToRoute('theater', 'failed-draft', '解析失败草稿', { draftId: draft.id });
  } else {
    return false;
  }
  return true;
}

function visualSource() {
  return { chatIdAtGeneration: 'visual-theater-chat', label: '第 6-18 楼', messageIds: [], mode: 'range' as const, ranges: [{ end: 18, start: 6 }], scopeId: 'visual-theater-scope', sortKey: 18 };
}
