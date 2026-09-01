export type TutorialCategoryId = 'apps' | 'data' | 'dependency' | 'generation' | 'macro' | 'start' | 'troubleshooting';

export type TutorialBlock =
  | {
      type: 'app-directory';
    }
  | {
      text: string;
      title?: string;
      type: 'note' | 'paragraph';
    }
  | {
      code: string;
      label?: string;
      type: 'code';
    }
  | {
      items: string[];
      title?: string;
      type: 'steps';
    };

export type TutorialArticle = {
  blocks: TutorialBlock[];
  category: TutorialCategoryId;
  id: string;
  keywords: string[];
  relatedAppIds?: string[];
  requirements?: string[];
  summary: string;
  title: string;
};

export type TutorialSearchResult = {
  article: TutorialArticle;
  blockIndex?: number;
  snippet: string;
};
