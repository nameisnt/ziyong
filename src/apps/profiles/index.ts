import ProfilesApp from './ProfilesApp.vue';
import { createProfilesContentReceiver } from '@/apps/contentReceivers';
import { createProfileGenerationAdapter } from './generation';
import { createExternalProfileReferenceCatalog } from './externalReferenceCatalog';
import {
  externalProfileGenerationDraftsField,
  ExternalProfileGenerationScopeDataSchema,
  useExternalProfileGenerationStore,
} from './generationDrafts';
import { createExternalProfilesRepository } from './externalCrud';
import { runLegacyProfilesCleanup } from './legacyCleanup';
import { objectListField, textField, textListField, xmlParser } from '@/apps/outputDefinitions';
import { definePhoneApp } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { createChatScopedBackupSchema } from '@/type/backup';

runLegacyProfilesCleanup();

export default definePhoneApp({
  id: 'profiles',
  name: '资料表',
  icon: 'fa-address-card',
  description: '人物、地点、组织、物品与世界观资料',
  accent: '#4c9aff',
  defaultRoute: 'root',
  defaultOrder: 69,
  contentReceiver: createProfilesContentReceiver(),
  backupDomains: [
    {
      category: 'content',
      key: 'external-profile-generation-drafts',
      exportData: currentScopeKey =>
        readChatScopedEnvelope(externalProfileGenerationDraftsField, currentScopeKey || getCurrentChatScopeKey()),
      importData: data => {
        _.set(extension_settings, externalProfileGenerationDraftsField, data);
      },
      rehydrateFromSettings: () => useExternalProfileGenerationStore().rehydrateFromSettings(),
      schema: createChatScopedBackupSchema(ExternalProfileGenerationScopeDataSchema),
      schemaVersion: 1,
      scope: 'chat',
    },
  ],
  component: ProfilesApp,
  generationProvider: () => [
    {
      actionId: 'generate',
      label: '生成资料卡片',
      createAdapter: () => {
        const repository = createExternalProfilesRepository();
        return createProfileGenerationAdapter({
          getTables: () => repository.readCurrent().tables,
          insertRow: (sheetKey, values) => repository.insertRow(sheetKey, values),
        });
      },
    },
  ],
  generationRecoveryProvider: scopeKey => {
    const externalStore = useExternalProfileGenerationStore();
    if (externalStore.scopeKey !== scopeKey) return [];
    return externalStore.failedDrafts.map(draft => ({
      appId: 'profiles',
      id: draft.id,
      kind: 'failed-draft' as const,
      routePage: 'failed-draft',
      routeParams: { draftId: draft.id, draftSource: 'external' },
      scopeKey,
      title: typeof draft.context.titleHint === 'string' ? draft.context.titleHint : '待修复资料草稿',
    }));
  },
  taskTemplateDefinitions: [
    {
      actionId: 'generate',
      label: '生成资料卡片',
      defaultTemplate: [
        '目标外部表：{{tableName}}',
        '{{fieldInstruction}}',
        '{{titleInstruction}}',
      ].join('\n'),
      variables: [
        { key: 'tableName', label: '外部资料表名' },
        { key: 'fieldInstruction', label: '完整启用字段要求（程序生成）' },
        { key: 'titleInstruction', label: '完整标题提示（程序生成）' },
      ],
    },
  ],
  promptDefinitions: [
    {
      key: 'profiles',
      label: '资料表',
      defaultPrompt: [
        '你负责根据聊天上下文整理可复用的资料卡片。',
        '资料必须来自上下文中能确认的信息；不确定的信息请明确写成“未知”或不要写。',
        '各字段要结构清楚，适合作为后续世界书、角色设定或剧情资料引用。',
        '不要输出 XML 之外的解释。',
      ].join('\n'),
      outputFormats: [
        {
          id: 'profiles.generate',
          label: '资料卡片输出',
          content: [
            '请只输出一个完整 XML，不要输出 XML 之外的解释。',
            '字段值必须基于上下文已确认信息；没有可靠信息时留空。',
            '<result>',
            '  <title>资料标题</title>',
            '  <summary>一句话摘要，可留空</summary>',
            '  <tags>标签1、标签2</tags>',
            '  <fields>',
            '    <field id="字段id">字段值</field>',
            '  </fields>',
            '</result>',
          ].join('\n'),
          parser: xmlParser([
            textField('title', '资料标题', 'title', { required: true }),
            textField('summary', '一句话摘要', 'summary'),
            textListField('tags', '标签', 'tags', '[,，、\\n]'),
            objectListField('fields', '资料字段', 'fields/field', [
              textField('id', '字段 ID', '@id', { required: true }),
              textField('value', '字段值', '#text'),
            ]),
          ]),
        },
      ],
    },
  ],
  referenceProvider: () => createExternalProfileReferenceCatalog(),
  resetCurrentScope: () => {
    useExternalProfileGenerationStore().resetCurrentScope();
  },
  scopeSwitchHandler: scopeKey => {
    useExternalProfileGenerationStore().switchScope(scopeKey);
  },
});
