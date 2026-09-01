import type { PhoneAppDefinition } from '@/core/appRegistry';
import { validateTutorialAppCatalog } from './appCatalog';
import type { TutorialArticle, TutorialCategoryId } from './data';

type TutorialCategory = {
  id: 'all' | TutorialCategoryId;
  label: string;
};

export function validateTutorialRegistry(
  apps: PhoneAppDefinition[],
  articles: TutorialArticle[],
  categories: TutorialCategory[],
) {
  const errors = validateTutorialAppCatalog(apps);
  const categoryIds = new Set(categories.filter(category => category.id !== 'all').map(category => category.id));
  const appIds = new Set(apps.map(app => app.id));
  const articleCounts = new Map<string, number>();
  let directoryBlockCount = 0;

  categories.forEach(category => {
    if (!category.label.trim()) errors.push(`教程分类 ${category.id} 缺少名称`);
  });

  articles.forEach(article => {
    articleCounts.set(article.id, (articleCounts.get(article.id) ?? 0) + 1);
    if (!article.id.trim()) errors.push('存在没有 ID 的教程文章');
    if (!article.title.trim()) errors.push(`教程文章 ${article.id || '(unknown)'} 缺少标题`);
    if (!article.summary.trim()) errors.push(`教程文章 ${article.id} 缺少摘要`);
    if (!article.blocks.length) errors.push(`教程文章 ${article.id} 没有正文块`);
    if (!categoryIds.has(article.category)) errors.push(`教程文章 ${article.id} 使用了未知分类：${article.category}`);
    article.relatedAppIds?.forEach(appId => {
      if (!appIds.has(appId)) errors.push(`教程文章 ${article.id} 关联了不存在的 App：${appId}`);
    });
    directoryBlockCount += article.blocks.filter(block => block.type === 'app-directory').length;
  });

  articleCounts.forEach((count, articleId) => {
    if (count > 1) errors.push(`教程文章 ID 重复 ${count} 次：${articleId}`);
  });

  if (directoryBlockCount !== 1) errors.push(`教程必须且只能包含一个 App 目录块，当前为 ${directoryBlockCount} 个`);

  return errors;
}

export function assertTutorialRegistry(
  apps: PhoneAppDefinition[],
  articles: TutorialArticle[],
  categories: TutorialCategory[],
) {
  const errors = validateTutorialRegistry(apps, articles, categories);
  if (!errors.length) return;
  throw new Error(`教程注册表校验失败：\n- ${errors.join('\n- ')}`);
}
