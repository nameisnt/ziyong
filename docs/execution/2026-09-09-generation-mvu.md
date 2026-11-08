# 插件生成 MVU 楼层来源

## 当前批次

- 用户授权：按最近楼层方案修改，仅本插件；不推送、不修改真实变量或聊天。
- 工作树：开始时无已跟踪修改。既有未跟踪素材、脚本、原型、执行记录均不属于本批次，不修改。
- 参考：共享 generationService、GenerationSourceFields、runtime 事件与失败反馈。
- 已替代：使用最新快照、仅向前查找，均不再采用。

| 要求 | 实现位置 | 验证 | 状态 |
| --- | --- | --- | --- |
| 目标层优先，双向最近，同距较早层优先 | generationMvu.ts | generation-mvu.test.mjs；浏览器旧快照清理副本 | 通过 |
| 当前 swipe、合法 0/false、清理后缺失 | generationMvu.ts | generation-mvu.test.mjs | 通过 |
| 仅本插件请求，预览与正式路径一致 | generationMvuRuntime.ts、generationService.ts | 单测与真实提示词捕获 | 捕获通过；正式 AI 回复未执行 |
| 不写入真实 MVU、世界书、预设或聊天 | 请求副本及只读快照 | 浏览器聊天完整 JSON 前后相同、当前预设选项相同；实现无写入接口 | 通过 |
| 楼层选择不遗漏未声明 is_system 的消息 | generationService.ts | 共用读取不传助手 hide_state，按归一化后的 is_hidden 筛选；实际 0/1/2 均可读 | 通过 |
| 来源文字及移动端日夜布局 | GenerationSourceFields.vue | 350x700、390x844、430x900、1280x900，日夜共 8 场景，输入范围/切换模式事件链 | 通过 |

仅处理 get/format_message_variable 的 stat_data 及其子路径。聊天级、角色级、全局变量和任意脚本读取不拦截。不使用聊天楼层的生成沿用原行为。快照仅在请求准备时复制一次，不持久化；重新发起的请求重新读取。

新建、编辑、删除、导入、导出和数据迁移：不适用，本次不增加持久化对象。

## 浏览器证据

将实际新增模块打包到内存后，在当前酒馆页面调用，使用现有助手 generate/generateRaw 组装提示词，在 CHAT_COMPLETION_SETTINGS_READY 捕获后停止，不发送正式 AI 生成。

| 对照 | 读取层 | 捕获的积分 / 好感度 |
| --- | --- | --- |
| 选择 0–2 层 | 2 | 1000 / 15 |
| 选择 0–4 层 | 4 | 1030 / 20 |
| 只在内存副本中清理 0–3 层，目标为 2 | 4 | 1030 / 20 |
| 不使用本插件包装器的普通请求 | 默认当前状态 | 1030 / 20 |
| 指定当前酒馆预设名，选择到 2 | 2 | 1000 |
| generateRaw 插件预设路径，选择到 2 | 2 | 1000 |

所有成功捕获均不含内部请求标识，聊天长度仍为 5，前后 JSON 相同。清理仅发生在测试副本，未删除真实变量。

全部快照缺失的副本测试返回“MVU：目标第 2 层，当前聊天没有有效快照”。助手会吞掉事件监听器抛出的错误并继续构造请求，因此包装器同时停止该 generation_id，并在结束时重抛原始错误。拦截 fetch 验证发送参数 signal.aborted=true，未放行网络请求；测试后恢复原 fetch 和监听器。

## 验证记录

- 首轮全量静态检查：693 项单测通过，类型、ESLint、结构契约、样式及 UI 复用检查通过，见 tmp/mvu-static.log。
- 新增并发隔离单测后最终检查：694 项单测及全部静态检查通过，见 tmp/mvu-static-final.log。
- 最终构建通过，输出 tmp/build-check；日志 tmp/mvu-build-final.log。不覆盖正式 dist，不提交、不推送。
- UI：tmp/ui-check/mvu-source/report.json，8 项 findings 均为空；截图已查看。新场景无历史基线，使用 --no-baseline 按零缺陷标准验证，没有放宽旧基线。
- 实际浏览器验证的是本批次模块与当前酒馆接口；未将完整开发包替换当前已安装插件，未执行正式 AI 回复生成及保存。
