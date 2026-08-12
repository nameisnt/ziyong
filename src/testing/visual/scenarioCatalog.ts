export type VisualScenarioGroup = {
  id: string;
  scenarios: string[];
};

export function createVisualScenarioGroups(rootAppScenarios: string[]): VisualScenarioGroup[] {
  return [
    {
      id: 'shell',
      scenarios: ['home', 'home-five-columns', 'side-swipe-back', 'home-tasks', 'home-tasks-dark', ...rootAppScenarios],
    },
    {
      id: 'generation',
      scenarios: [
        'generation-rewrite-replay',
        'generation-preview-long-title',
        'generation-preview-long-title-edit',
        'generation-preview-long-title-raw',
        'preview-session-navigation',
        'generation-connection-override',
        'preview-draft-deferred-save',
      ],
    },
    { id: 'migration', scenarios: ['legacy-data-migrations', 'app-deferred-mount-order'] },
    {
      id: 'custom-app',
      scenarios: [
        'custom-app-conversion',
        'custom-app-conversion-complete',
        'custom-app-conversion-merge',
        'custom-app-extract-rules',
        'custom-app-save-flow',
        'content-transfer-dialog',
      ],
    },
    {
      id: 'converter',
      scenarios: ['content-converter-source', 'content-converter-target', 'content-converter-complete'],
    },
    { id: 'card-writer', scenarios: ['card-writer-saved-preview'] },
    { id: 'archive', scenarios: ['archive-owner-list', 'archive-floor-backup'] },
    {
      id: 'recovery',
      scenarios: [
        'recovery-home',
        'recovery-shelf',
        'recovery-group',
        'recovery-cleanup',
        'recovery-duplicates',
        'recovery-reader',
        'recovery-confirm',
        'recovery-result',
        'recovery-settings',
      ],
    },
    { id: 'bagu', scenarios: ['bagu-scan-actions', 'bagu-hit-details', 'bagu-scan-applied'] },
    {
      id: 'settings',
      scenarios: [
        'settings',
        'settings-interface',
        'settings-connection',
        'settings-connection-external',
        'settings-connection-dark',
        'settings-advanced',
        'theme-form-control-isolation',
      ],
    },
    { id: 'cloud-media', scenarios: ['cloud-media-generate', 'cloud-media-settings'] },
    { id: 'mvu', scenarios: ['mvu-modifier-tree'] },
    { id: 'regex-wizard', scenarios: ['regex-wizard-fields'] },
    {
      id: 'entry-library',
      scenarios: [
        'entry-library-action-menu',
        'entry-library-manual-create',
        'entry-library-bindings',
        'entry-library-collect-manual-dedupe',
        'entry-library-collect-worldbook',
        'entry-library-ordering',
        'entry-library-scroll-return',
      ],
    },
    {
      id: 'world-slots',
      scenarios: ['world-slots-batch-import', 'world-slots-entry-library', 'world-slots-root-cleanup'],
    },
    { id: 'worldbook', scenarios: ['worldbook-link-legacy-entry', 'worldbook-entry-editor'] },
    { id: 'comfy', scenarios: ['comfy-action-menu'] },
    { id: 'preset-link', scenarios: ['preset-link-auto-reload', 'preset-link-history'] },
    {
      id: 'forum',
      scenarios: [
        'forum-generate-thread',
        'forum-catalog',
        'forum-board',
        'forum-board-editor',
        'forum-bagu',
        'forum-failed-draft',
        'forum-thread',
        'forum-thread-editor',
        'forum-generate-replies',
        'forum-preview',
        'forum-thread-versions',
        'forum-version-interactions',
        'forum-rewrite-generate',
      ],
    },
    {
      id: 'preset-manager',
      scenarios: [
        'preset-detail',
        'preset-copy-reorder',
        'preset-copy-editor',
        'preset-editor',
        'preset-scroll-return',
      ],
    },
    {
      id: 'reader',
      scenarios: [
        'reader-detail',
        'reader-theme-appearance',
        'reader-catalog',
        'reader-footer-persistence',
        'searchable-select',
      ],
    },
    {
      id: 'diary',
      scenarios: [
        'diary-batch',
        'diary-creation-mode',
        'diary-book',
        'diary-entry-editor',
        'diary-bagu',
        'diary-generate',
        'diary-preview',
        'diary-failed-draft',
        'diary-entry-detail',
      ],
    },
    {
      id: 'extras',
      scenarios: [
        'extras-book-generate',
        'extras-book-name-fallback',
        'extras-summary-overview',
        'extras-summary-generate',
        'extras-chapter-detail',
        'content-versions',
        'content-version-interactions',
        'content-version-deletion',
        'extras-chapter-editor',
        'extras-legacy-continuation',
        'extras-continuation-references',
      ],
    },
    {
      id: 'summary',
      scenarios: [
        'summary-create',
        'summary-generate',
        'summary-preview',
        'summary-book',
        'summary-entry-detail',
        'summary-entry-editor',
        'summary-bagu',
        'summary-import',
        'summary-batch',
        'content-directory-sort-persistence',
        'summary-failed-draft',
      ],
    },
    {
      id: 'prompts',
      scenarios: [
        'prompts-app-detail',
        'prompts-task-detail',
        'prompts-task-editor',
        'prompts-type-detail',
        'prompts-type-editor',
        'prompts-output-list',
        'prompts-output-editor',
        'prompts-group-editor',
        'prompts-phrase-editor',
        'prompts-phrase-list',
        'prompts-template-list',
      ],
    },
    {
      id: 'theater',
      scenarios: [
        'theater-generate',
        'theater-rewrite-generate',
        'theater-generate-dark-inputs',
        'theater-editor',
        'theater-frontend-footer',
        'theater-history',
        'theater-failed-draft',
      ],
    },
    {
      id: 'letters',
      scenarios: [
        'letters-entry-detail',
        'letters-book',
        'letters-entry-editor',
        'letters-bagu',
        'letters-generate',
        'letters-preview',
        'letters-failed-draft',
        'letters-rewrite-generate',
      ],
    },
    {
      id: 'tutorial',
      scenarios: [
        'tutorial-article',
        'tutorial-app-directory',
        'tutorial-missing-article',
        'tutorial-scroll-return',
        'tutorial-search-results',
      ],
    },
    { id: 'video', scenarios: ['video-viewer'] },
    { id: 'workbench', scenarios: ['workbench-logs', 'workbench-forum-step'] },
    {
      id: 'profiles',
      scenarios: [
        'profiles-table',
        'profiles-empty-toolbar',
        'profiles-table-grid',
        'profiles-table-editor',
        'profiles-field-management',
        'profiles-field-detail',
        'profiles-detail',
      ],
    },
  ];
}

export function flattenVisualScenarioGroups(groups: VisualScenarioGroup[]) {
  const scenarios = groups.flatMap(group => group.scenarios);
  const duplicates = scenarios.filter((name, index) => scenarios.indexOf(name) !== index);
  if (duplicates.length) throw new Error(`Duplicate visual scenarios: ${[...new Set(duplicates)].join(', ')}`);
  return scenarios;
}
