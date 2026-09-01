import { appTutorialArticles } from './articles/apps';
import { dataTutorialArticles } from './articles/data';
import { dependencyTutorialArticles } from './articles/dependency';
import { generationTutorialArticles } from './articles/generation';
import { macroTutorialArticles } from './articles/macro';
import { startTutorialArticles } from './articles/start';
import { troubleshootingTutorialArticles } from './articles/troubleshooting';
import type { TutorialArticle } from './types';

export { tutorialCategories } from './categories';
export type { TutorialArticle, TutorialBlock, TutorialCategoryId, TutorialSearchResult } from './types';

export const tutorialArticles: TutorialArticle[] = [
  ...startTutorialArticles,
  ...appTutorialArticles,
  ...generationTutorialArticles,
  ...macroTutorialArticles,
  ...dependencyTutorialArticles,
  ...dataTutorialArticles,
  ...troubleshootingTutorialArticles,
];
