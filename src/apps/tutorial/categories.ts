import type { TutorialCategoryId } from './types';

export const tutorialCategories: Array<{ id: 'all' | TutorialCategoryId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'start', label: '入门' },
  { id: 'apps', label: '功能' },
  { id: 'generation', label: '生成' },
  { id: 'macro', label: '宏' },
  { id: 'dependency', label: '依赖' },
  { id: 'data', label: '数据' },
  { id: 'troubleshooting', label: '排查' },
];
