# Phone App Modules

Add future phone apps as `src/apps/<app-id>/index.ts` and default export a module created with `definePhoneApp`.

```ts
import MyApp from './MyApp.vue';
import { useMyAppStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'my-app',
  name: '我的应用',
  icon: 'fa-star',
  description: '应用说明',
  accent: '#4c9f70',
  defaultRoute: 'root',
  defaultOrder: 130,
  backupDomains: [{
    key: 'my-app',
    exportData: currentScopeKey => ({ currentScopeKey, data: {} }),
    importData: data => useMyAppStore().importBackup(data),
    rehydrateFromSettings: () => useMyAppStore().rehydrateFromSettings(),
  }],
  component: MyApp,
  generationProvider: () => [{
    actionId: 'generate',
    label: '生成我的应用内容',
    createAdapter: () => createMyAppGenerationAdapter(useMyAppStore()),
  }],
  promptDefinitions: [{
    key: 'my-app',
    label: '我的应用',
    defaultPrompt: '这里填写这个 App 的默认生成提示词。',
    outputFormats: [{
      label: '输出格式',
      content: '<result>\n  <content>内容</content>\n</result>',
    }],
  }],
  specialPromptDefinitions: [{
    key: 'my-app-special',
    label: '我的应用特殊提示词',
    defaultPrompt: '',
  }],
  typePromptDomains: [{
    key: 'my-app',
    label: '我的应用',
    emptyLabel: '还没有我的应用类型提示词',
    defaultOpen: true,
    defaultPrompts: [{
      id: 'prompt_type_my_app_default',
      domain: 'my-app',
      name: '默认类型',
      prompt: '这里填写类型提示词。',
    }],
  }],
  contentStatsProvider: currentScopeKey => ({
    current: { scopeCount: 0, collections: 0, items: 0, chars: 0, averageChars: 0, latestUpdatedAt: '' },
    domain: {
      id: 'my-app',
      label: '我的应用',
      collectionLabel: '分组',
      itemLabel: '项',
      scopeCount: 0,
      collections: 0,
      items: 0,
      chars: 0,
      averageChars: 0,
      latestUpdatedAt: '',
    },
    overview: { scopeCount: 0, collections: 0, items: 0, chars: 0, averageChars: 0, latestUpdatedAt: '' },
    scopeKeys: currentScopeKey ? [] : [],
    warnings: [],
  }),
  favoriteProvider: () => [],
  referenceProvider: () => ({
    id: 'app:my-app',
    kind: 'branch',
    label: '我的应用',
    children: [],
  }),
  resetCurrentScope: () => useMyAppStore().resetCurrentScope(),
});
```

The phone shell discovers these modules automatically through `src/data/apps.ts`. Store-level layout reads should use `src/core/appLayout.ts` so they do not import the registration side-effect module.
