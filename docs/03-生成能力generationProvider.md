# generationProvider 生成能力注册

`generationProvider` 用来把一个 App 的生成动作注册到统一能力表。它不替代现有生成引擎，而是把现有 `GenerationAdapter` 包装成可发现、可复用的 action。

## 注册结构

```ts
generationProvider: () => [{
  actionId: 'generate',
  label: '生成我的应用内容',
  description: '可选说明',
  createAdapter: () => createMyAppGenerationAdapter(useMyAppStore()),
}]
```

字段说明：

- `actionId`：App 内部唯一的生成动作标识。
- `label`：给 UI 或调试工具显示的动作名称。
- `description`：可选说明。
- `createAdapter`：返回一个 `GenerationAdapter`。

注册后可以通过：

```ts
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';

const adapter = getRegisteredPhoneGenerationAdapter('my-app', 'generate');
```

## GenerationAdapter 契约

`GenerationAdapter<TConfig, TResult, TSaveResult>` 定义在 `src/type/generation.ts`。

核心字段：

- `appId`：所属 App。
- `actionId`：生成动作。
- `configSchema`：生成配置的 zod schema。
- `buildRequest(config)`：把业务配置转成 `GenerationRequestParts`。
- `parse(raw, config)`：解析模型输出。
- `save(result, context)`：保存解析后的内容。

最小形态：

```ts
export const MyGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});

export function createMyAppGenerationAdapter(store: MyStore) {
  return {
    appId: 'my-app',
    actionId: 'generate',
    configSchema: MyGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseSimpleXmlResult(raw);
    },
    save(result, context) {
      const entry = store.createEntry({
        title: result.title,
        content: result.content,
        source: context.source,
      });
      return { entityId: entry.id, entry };
    },
  } satisfies GenerationAdapter<MyGenerateConfig, SimpleXmlResult, { entityId: string; entry: MyEntry }>;
}
```

## 生成服务复用

页面层通常复用三个函数：

- `buildGenerationPreview(adapter, config, options)`：构建提示词预览。
- `captureGenerationPrompt(adapter, config, options)`：捕获酒馆最终提示词。
- `generateContent(adapter, config, options)`：执行生成、解析、保存或生成预览。

这些函数统一处理：

- 聊天来源楼层选择。
- 引用内容合并。
- 外部兼容 API 配置。
- 酒馆预设名解析。
- 流式输出监听。
- 生成可见性事务。
- 失败草稿创建。

## GenerationRequestParts 分层

`buildRequest(config)` 不应把历史正文、界面配置和操作要求拼成一段。当前请求字段分工如下：

- `context`：App 自己携带的历史材料，例如已有章节、最近书信、主楼和已有回复。
- `references`：引用选择器和来源回退补入的内容，由生成服务合并。
- `taskInstruction`：本次人物、目标和操作，例如“由谁写给谁”“续写还是重写”。
- `appPrompt`：用户可在提示词 App 管理的通用 App 预设。
- `typePrompt`：番外类型、小剧场类型等本次类型预设。
- `userRequirement`：用户在生成页填写的追加要求。
- `outputFormat`：模型输出协议。

最终 `user_input` 按以下顺序拼接：

1. `context`
2. `references`
3. `taskInstruction`
4. `appPrompt`
5. `typePrompt`
6. `userRequirement`
7. `outputFormat`

不要把只用于保存的 ID、渲染模式或默认占位标题发送给模型。

`{{phoneUserInput}}` 保持精简，只包含 `appPrompt`、`typePrompt`、生成页填写内容和 `outputFormat`，不重复长篇上下文。

## 内置生成 action

内置注册集中在 `src/apps/builtinGeneration.ts`。

当前 action：

- `summary/generate`
- `diary/generate`
- `diary/read-reaction`
- `extras/chapter-generate`
- `extras/chapter-summary`
- `forum/generate-thread`
- `forum/generate-replies`
- `theater/generate`
- `letters/generate`

内置创作 App 的页面已经改为从注册表获取 adapter，因此新增 App 可以走同一套生成管线。

## 输出格式与提示词

生成 action 本身不保存默认提示词。默认提示词由 `promptDefinitions`、`specialPromptDefinitions` 和 `typePromptDomains` 提供。页面层把这些提示词读出后填入 adapter config。

这样做的好处是：

- 生成 action 专注解析和保存。
- 提示词 App 可以统一管理默认提示词。
- 新增 App 的输出格式预览可以自动显示在提示词 App。
