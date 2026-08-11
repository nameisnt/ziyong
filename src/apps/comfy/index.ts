import ComfyApp from './ComfyApp.vue';
import { createComfyGenerationAdapter } from './generation';
import { ComfySettingsSchema, comfyField, useComfyStore } from './store';
import { objectListField, textField, xmlParser } from '@/apps/outputDefinitions';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'comfy',
  name: 'ComfyUI',
  icon: 'fa-image',
  description: '模型、采样器和工作流设置',
  accent: '#ff7a00',
  defaultRoute: 'root',
  defaultOrder: 130,
  backupDomains: [
    {
      category: 'configuration',
      key: 'comfy',
      exportData: () => _.get(extension_settings, comfyField, {}),
      importData: data => {
        _.set(extension_settings, comfyField, data);
      },
      rehydrateFromSettings: () => useComfyStore().rehydrateFromSettings(),
      schema: ComfySettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: ComfyApp,
  generationProvider: () => [
    {
      actionId: 'generate-prompt',
      label: '生成 ComfyUI 参数',
      createAdapter: () => createComfyGenerationAdapter(),
    },
  ],
  promptDefinitions: [
    {
      key: 'comfy',
      label: 'ComfyUI',
      defaultPrompt: [
        '你负责把用户的自然语言需求转换为适合 ComfyUI 工作流的结构化参数。',
        '根据来源楼层和引用内容理解画面、声音或视频目标，但不要把聊天原文直接塞进提示词。',
        '只填写可填写工作流参数；如果正向或负向内容需要由你生成，也必须作为对应参数输出。',
        '只填写你有把握且和本次需求相关的参数。',
        '不要输出 XML 之外的解释。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'comfy.generate',
          label: 'ComfyUI 参数',
          content: [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '<result>',
            '  <title>媒体标题</title>',
            '  <params>',
            '    <param key="占位符名">参数值</param>',
            '  </params>',
            '  <note>生成说明，可留空</note>',
            '</result>',
          ].join('\n'),
          parser: xmlParser([
            textField('title', '媒体标题', 'title'),
            textField('prompt', '正向提示词', 'prompt'),
            textField('negativePrompt', '负向提示词', 'negative'),
            textField('note', '生成说明', 'note'),
            objectListField('params', '参数列表', 'params/param', [
              textField('key', '参数名', '@key', { required: true }),
              textField('value', '参数值', '#text', { required: true }),
            ]),
          ]),
        },
      ],
    },
  ],
});
