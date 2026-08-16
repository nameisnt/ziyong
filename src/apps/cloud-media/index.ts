import CloudMediaApp from './CloudMediaApp.vue';
import { createCloudMediaGenerationAdapter } from './generation';
import { cloudMediaField, CloudMediaSettingsSchema, useCloudMediaStore, type CloudMediaSettings } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { textField, xmlParser } from '@/apps/outputDefinitions';
import { extension_settings } from '@sillytavern/scripts/extensions';

function exportSettingsWithoutKeys(): CloudMediaSettings {
  const settings = CloudMediaSettingsSchema.parse(klona(_.get(extension_settings, cloudMediaField, {})));
  settings.profiles.forEach(profile => {
    profile.apiKey = '';
  });
  return settings;
}

export default definePhoneApp({
  id: 'cloud-media',
  name: '云媒体',
  icon: 'fa-cloud-arrow-up',
  description: '用 API 生成图片、音乐与视频',
  accent: '#0f9f8f',
  defaultRoute: 'root',
  defaultOrder: 134,
  backupDomains: [
    {
      category: 'configuration',
      key: 'cloud-media',
      exportData: exportSettingsWithoutKeys,
      importData: data => {
        _.set(extension_settings, cloudMediaField, CloudMediaSettingsSchema.parse(data));
      },
      rehydrateFromSettings: () => useCloudMediaStore().rehydrateFromSettings(),
      schema: CloudMediaSettingsSchema,
      schemaVersion: 1,
      scope: 'global',
    },
  ],
  component: CloudMediaApp,
  generationProvider: () => [
    {
      actionId: 'generate-prompt',
      label: '生成云媒体提示词',
      createAdapter: () => createCloudMediaGenerationAdapter(),
    },
  ],
  taskTemplateDefinitions: [
    {
      actionId: 'generate-prompt',
      label: '生成云媒体提示词',
      defaultTemplate: '请根据当前目标服务、媒体类型和模型配置，生成一份可直接使用的媒体提示词。',
    },
  ],
  promptDefinitions: [
    {
      key: 'cloud-media',
      label: '云媒体',
      defaultPrompt: [
        '你负责根据聊天剧情、引用内容和用户要求，编写可以直接交给媒体生成模型的提示词。',
        '图片提示词应明确主体、外观、动作、构图、场景、光线、风格和重要细节。',
        '视频提示词还应明确动作过程、镜头运动、时长内的变化与画面连续性。',
        '音乐提示词应明确情绪、曲风、速度、乐器、结构和听感；只有歌曲模式才填写歌词。',
        '不要照抄聊天原文，不要输出楼层号，不要把人物对话原样塞进提示词。',
        '提示词应具体、紧凑、可直接使用。只输出规定 XML，不要解释。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'cloud-media.generate',
          label: '云媒体提示词',
          content: [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '<result>',
            '  <title>简短媒体标题</title>',
            '  <prompt>可直接交给目标模型的完整提示词</prompt>',
            '  <negative>图片负面提示词；不需要时留空</negative>',
            '  <lyrics>仅歌曲模式填写歌词；其他情况留空</lyrics>',
            '  <note>生成思路或补充说明，可留空</note>',
            '</result>',
          ].join('\n'),
          parser: xmlParser([
            textField('title', '媒体标题', 'title'),
            textField('prompt', '生成提示词', 'prompt', { required: true }),
            textField('negativePrompt', '负面提示词', 'negative'),
            textField('lyrics', '歌词', 'lyrics'),
            textField('note', '生成说明', 'note'),
          ]),
        },
      ],
    },
  ],
});
