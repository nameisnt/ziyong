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

酒馆生成不再把所有字段拼成一段 `user_input`。当前组装分为两部分：

1. 覆盖聊天历史：所选可见聊天楼层保持原角色；其后追加一个用户角色的历史尾部，内容依次为 `context`、`references`。
2. 本轮原生 `user_input`：依次为 `taskInstruction`、`appPrompt`、`typePrompt`、`userRequirement`、`outputFormat`。

酒馆随后按本次选择的预设、角色信息、世界书、宏和原生注入位置完成整体组装。因此世界书或按深度插入的预设条目不保证全部位于覆盖历史之前。

不要把只用于保存的 ID、渲染模式或默认占位标题发送给模型。

`{{phoneUserInput}}` 保持精简，依次包含 `taskInstruction`、`appPrompt`、`typePrompt`、生成页填写内容和 `outputFormat`，不重复长篇上下文、来源楼层和引用内容。空白区段会自动省略。

`{{phoneUserInput}}` 不是本轮输入的定位锚点。本轮 `user_input` 会由生成接口原生追加；宏只供预设在其他位置额外展开相同内容，并允许出现多次。

## 生成模式与酒馆组装

两种文本提供方式共用同一个酒馆组装入口：

- 酒馆当前 API：调用酒馆助手 `generate()`，由本次选择的 `preset_name` 组装并使用酒馆当前 API / 模型生成。
- 外部兼容 API：先捕获酒馆组装后的有序 `system`、`user`、`assistant` 消息，再把该消息数组发送到外部 `/chat/completions`。它保留预设正文、世界书和宏展开结果，但当前不会转发酒馆预设里的温度等采样参数；请求只显式发送模型、消息、流式开关和可选 `max_tokens`。

本次选择的生成预设不会修改酒馆界面当前预设。需要特别区分两类“预设”：

- 生成页的“本次预设”负责这次请求的提示词条目和参数组装。
- 来源楼层预处理所用的预设正则来自酒馆当前正在使用的预设，而不是插件本次另选的生成预设。

## 来源楼层与正则

来源选择只读取当前聊天的可见楼层。写入覆盖历史前，每层会调用酒馆原生 `prompt` 正则管线：

- 用户楼层使用 `user_input` 来源，AI / system 楼层使用 `ai_output` 来源。
- 正则集合来自当前酒馆环境中的全局、当前角色卡和当前正在使用的预设，并继续服从酒馆自身的启用开关。
- 深度按最终选中的楼层集合重新编号：所选最新楼为 `depth: 0`，向旧楼递增，而不是使用原聊天绝对楼层号。
- 正则调用失败时保留原楼层文本，避免因为单条正则异常丢失整个来源。

AI 返回后，原始输出先用于结构化解析和保存。生成预览再应用酒馆原生 `display` 正则，随后应用插件自己的显示规则；显示正则不得反向污染 XML 解析或保存原文。

## 实现注意事项

- “不使用聊天楼层”只代表覆盖历史中没有聊天楼层；`context`、`references` 和本轮 `user_input` 仍可能存在。
- 不要重新通过隐藏、删除或临时改写聊天楼层来控制生成历史；使用 `overrides.chat_history.prompts`。
- 不要把 App 上下文和引用伪装成原聊天楼层；它们统一放在覆盖历史末尾。
- 普通提示词预览只展示插件组织的区段。需要验证预设、世界书、宏和最终角色顺序时，应使用酒馆最终提示词捕获。
- 外部 API 必须兼容 OpenAI `chat/completions` 消息格式，并允许当前浏览器环境访问。

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

生成 action 本身不保存 App 预设。App 预设由 `promptDefinitions`、`specialPromptDefinitions` 和 `typePromptDomains` 提供；动作级任务模板由 `taskTemplateDefinitions` 提供。页面层把 App 预设读入 adapter config，生成服务再按 `App + actionId` 渲染本次任务模板。

这样做的好处是：

- 生成 action 专注解析和保存。
- 提示词 App 可以统一管理默认提示词。
- 新增 App 的输出格式预览可以自动显示在提示词 App。
