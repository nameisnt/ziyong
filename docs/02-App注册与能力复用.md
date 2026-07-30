# App 注册与能力复用

新增 App 推荐放在 `src/apps/<app-id>/index.ts`，默认导出 `definePhoneApp(...)`。`src/data/apps.ts` 会自动发现这些模块，不需要再修改中心 App 列表。

注册初始化由 `src/data/apps.ts` 负责；store 层读取首页布局和 App 定义时使用 `src/core/appLayout.ts`，避免业务 store 反向依赖带副作用的注册入口。

## 最小 App

```ts
import MyApp from './MyApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'my-app',
  name: '我的应用',
  icon: 'fa-star',
  description: '应用说明',
  accent: '#4c9f70',
  defaultRoute: 'root',
  defaultOrder: 130,
  component: MyApp,
});
```

`id` 必须匹配 `/^[a-z][a-z0-9-]*$/`，并且不能与已有 App 重复。

## 注册字段

基础字段：

- `id`：App 唯一标识。
- `name`：显示名称。
- `icon`：Font Awesome 图标名。
- `description`：首页说明。
- `accent`：主题强调色。
- `defaultRoute`：打开 App 时的默认页面。
- `defaultOrder`：首页默认排序。
- `component`：Vue App 组件。

能力字段：

- `generationProvider`：声明生成 action。
- `promptDefinitions`：声明 App 默认提示词。
- `specialPromptDefinitions`：声明特殊提示词。
- `typePromptDomains`：声明类型提示词域。
- `backupDomains`：声明备份导入导出。
- `contentStatsProvider`：声明统计贡献。
- `favoriteProvider`：声明收藏贡献。
- `referenceProvider`：声明生成引用来源。
- `resetCurrentScope`：声明当前聊天清理逻辑，可同步返回，也可返回 `Promise<void>`。

## 首页与导航复用

首页渲染来自 `PHONE_APPS`，而 `PHONE_APPS` 来自注册表快照。新增 App 注册后会自动参与：

- 首页图标展示。
- 拖拽排序。
- `phone.openApp(appId)` 导航。
- `phone.pushPage(...)` 子页面导航。
- 动态组件渲染。

App 内部推荐使用 `usePhoneStore()` 管理页面栈，不要自己维护全局路由。

## 收藏复用

提供 `favoriteProvider` 后，收藏 App 会自动聚合内容。

```ts
favoriteProvider: () => [{
  key: 'my-app:item:1',
  appId: 'my-app',
  entryId: '1',
  title: '标题',
  preview: '预览内容',
  bookTitle: '分组名',
  subtitle: '副标题',
  updatedAt: new Date().toISOString(),
  exists: () => true,
  open: () => phone.pushRoute('my-app', 'detail', '详情', { id: '1' }),
  removeFavorite: () => store.toggleFavorite('1'),
}]
```

收藏项的 `open` 和 `removeFavorite` 是可选的，但建议提供。这样收藏页不需要知道业务 store 的细节。

## 引用来源复用

提供 `referenceProvider` 后，生成引用选择器会自动展示该 App 的内容。

```ts
referenceProvider: () => ({
  id: 'app:my-app',
  kind: 'branch',
  label: '我的应用',
  children: [{
    id: 'my-app:item:1',
    kind: 'leaf',
    item: {
      id: 'my-app:item:1',
      title: '标题',
      content: '可被引用的正文',
      appId: 'my-app',
      updatedAt: new Date().toISOString(),
    },
  }],
})
```

引用树只负责提供可引用内容。生成时由 `ReferencePicker` 和 `formatGenerationReferences` 汇总为提示词片段。

## 统计复用

提供 `contentStatsProvider` 后，统计页和设置页的数据概览会自动出现新 App 的统计。

统计贡献包含三层：

- `current`：当前聊天的统计。
- `domain`：该 App 的全局统计。
- `overview`：可用于总览聚合的统计。

内置 `src/apps/builtinStats.ts` 里有通用 `createContentStatsProvider` 可参考。
