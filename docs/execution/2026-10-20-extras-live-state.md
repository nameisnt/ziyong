# 番外生成状态修复

根因：ExtrasChapterGeneratePage 绑定 chapterGenerationState（预览业务状态），而非 chapterGenerationViewState（持久任务状态）。导致重新生成及续写页面无法反映 running、rawOutput、error。

修复仅替换 ExtrasApp.vue 中章节生成页的 generation-state 绑定，以已正确接入的新建番外页为参考。未修改生成请求、内容解析、保存或总结配置。

| 验收项 | 证据 |
| --- | --- |
| 三个番外生成入口绑定任务视图状态 | single-generation-content-consumer-contract.test.mjs，4项通过 |
| 生成按钮禁用、实时输出、失败反馈 | extrasGenerationScenarios.ts 注入任务状态，在章节与独立总结页验证 |
| 三种手机尺寸与日夜状态 | 350x700、390x844、430x900；每场景分别切换 light/dark 断言 |
| 隔离浏览器结果 | tmp/ui-check/extras-live-state/report.json，6场景通过 |
| 静态检查 | typecheck、局部 ESLint、UI reuse 通过 |
| 同类排查 | 新建番外、独立章节总结绑定正确；论坛两处绑定为任务派生 computed |
| 真实 API 生成、停止与保存 | 未验证；本次没有发送真实请求 |
| 导入、导出、删除、作用域 | 不适用，本次仅修正视图状态绑定 |

未部署到酒馆，未打包、升版本或推送。

## 默认摘要移除补充

- `ExtrasChapterGeneratePage.vue`：默认规则下允许切换移除摘要块；生成时禁用解析与移除开关、自定义类型名称。
- `ExtrasBookEditorPage.vue`：生成时禁用书名及自定义类型名称。
- `extrasGeneration.ts`：默认规则仅删除正文内唯一完整的 summary 标签块；重复、嵌套、缺失或不完整时保留正文并提示。自定义正则继续走原匹配流程。
- `content-regex.test.mjs`：默认移除、关闭、大小写及属性、多行、重复/嵌套/不完整和自定义规则回归；连同单次任务契约共19项通过。
- `tmp/ui-check/extras-default-summary/report.json`：6个场景通过；默认开关实际点击及生成状态校验，任务状态断言覆盖日夜间与三种手机尺寸。
- typecheck、局部 ESLint、UI reuse 通过；真实 API 生成仍未验证。
