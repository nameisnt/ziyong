<template>
  <section class="pc-chat-insert-app">
    <section class="pc-chat-insert-page">
      <ConfigurationRecoveryNotice
        v-if="configError"
        :error="configError"
        filename="sillytavern-phone-chat-insert-corrupted-data.json"
        :raw-data="rawConfig"
        @reset="resetCorruptedSettings"
        @retry="chatInsert.rehydrateFromSettings"
      />

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`插入方式` }}</strong>
        </div>
        <select v-model="settings.mode" class="pc-select">
          <option value="new-end">{{ t`作为新楼层插入末尾` }}</option>
          <option value="new-before">{{ t`作为新楼层插入到指定楼层前` }}</option>
          <option value="append-last">{{ t`追加到最后楼层结尾` }}</option>
          <option value="append-message">{{ t`追加到指定楼层结尾` }}</option>
        </select>
        <div class="pc-grid two">
          <label class="pc-number-field">
            <span>{{ t`楼层角色` }}</span>
            <select v-model="settings.role" class="pc-select" :disabled="settings.mode.startsWith('append')">
              <option value="assistant">assistant</option>
              <option value="user">user</option>
              <option value="system">system</option>
            </select>
          </label>
          <label v-if="needsTarget" class="pc-number-field">
            <span>{{ t`目标楼层` }}</span>
            <input v-model.number="settings.targetMessageId" class="pc-field" type="number" min="0" />
          </label>
        </div>
        <label v-if="settings.mode.startsWith('new')" class="pc-switch-row">
          <span>{{ t`隐藏新楼层` }}</span>
          <input v-model="settings.hidden" type="checkbox" />
        </label>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`引用内容` }}</strong>
          <InfoHint :text="referenceHelpText" />
        </div>
        <ReferencePicker v-model="selectedReferences" />
        <div v-if="placeholderTokens.length" class="pc-placeholder-list">
          <button
            class="pc-soft-btn compact pc-placeholder-chip"
            type="button"
            @click="insertPlaceholder(allReferencesToken)"
          >
            {{ t`全部` }} {{ allReferencesToken }}
          </button>
          <button
            v-for="token in placeholderTokens"
            :key="token.value"
            class="pc-soft-btn compact pc-placeholder-chip"
            type="button"
            @click="insertPlaceholder(token.value)"
          >
            {{ token.label }} {{ token.value }}
          </button>
        </div>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`格式模板` }}</strong>
          <div class="pc-head-actions">
            <InfoHint :text="placeholderHelpText" />
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="!quickTemplateGroups.length"
              :title="quickTemplateGroups.length ? t`插入模板快捷` : t`还没有模板快捷`"
              :aria-label="quickTemplateGroups.length ? t`插入模板快捷` : t`还没有模板快捷`"
              @click="templateShortcutOpen = !templateShortcutOpen"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="pc-soft-btn compact" type="button" @click="chatInsert.resetTemplate()">{{ t`默认` }}</button>
          </div>
        </div>
        <div v-if="templateShortcutOpen" class="pc-template-shortcut-panel">
          <article v-for="group in quickTemplateGroups" :key="group.id" class="pc-template-shortcut-group">
            <strong>{{ group.name }}</strong>
            <div class="pc-placeholder-list">
              <button
                v-for="template in group.phrases"
                :key="template.id"
                class="pc-soft-btn compact pc-placeholder-chip"
                type="button"
                @click="insertTemplateShortcut(template.text)"
              >
                {{ template.text }}
              </button>
            </div>
          </article>
        </div>
        <textarea v-model="settings.template" class="pc-area pc-area-multiline"></textarea>
      </article>

      <article class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`预览` }}</strong>
        </div>
        <pre class="pc-preview">{{ preview }}</pre>
        <div class="pc-form-actions pc-insert-actions">
          <button class="pc-soft-btn" type="button" @click="clearDraft">{{ t`清空` }}</button>
          <button class="pc-primary-btn" type="button" @click="confirmInsert">
            <i class="fa-solid fa-file-circle-plus"></i>
            <span>{{ t`确认写入` }}</span>
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { applyChatInsert, formatChatInsertTemplate } from '@/util/chatInsert';
import ConfigurationRecoveryNotice from '@/components/ConfigurationRecoveryNotice.vue';
import InfoHint from '@/components/InfoHint.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useChatInsertStore } from './store';
import type { GenerationReferenceItem } from '@/util/references';
import { storeToRefs } from 'pinia';

const chatInsert = useChatInsertStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const { configError, rawConfig, settings } = storeToRefs(chatInsert);
const { quickTemplateGroups } = storeToRefs(prompts);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const templateShortcutOpen = ref(false);
const allReferencesToken = '{{references}}';
const referenceTokenPrefixes: Record<string, string> = {
  diary: 'diary',
  digest: 'excerpt',
  extras: 'extra',
  forum: 'forum',
  letters: 'letter',
  summary: 'summary',
  theater: 'theater',
};
const referenceSourceLabels: Record<string, string> = {
  diary: '日记',
  digest: '摘抄',
  extras: '番外',
  forum: '论坛',
  letters: '书信',
  summary: '总结',
  theater: '小剧场',
};

async function resetCorruptedSettings() {
  if (
    !(await phone.confirmNotice('要重置插入工具配置吗？这会替换无法读取的原始数据。', {
      confirmLabel: '重置',
      kind: 'warning',
    }))
  )
    return;
  chatInsert.resetCorruptedSettings();
  toastr.success('已重置插入工具配置');
}

const needsTarget = computed(() => settings.value.mode === 'new-before' || settings.value.mode === 'append-message');
const referenceTokens = computed(() => {
  const counts = new Map<string, number>();
  return selectedReferences.value
    .map(item => {
      const sourceId = item.id.split(':')[0] || 'reference';
      const prefix = referenceTokenPrefixes[sourceId] || sourceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'reference';
      const nextCount = (counts.get(prefix) || 0) + 1;
      counts.set(prefix, nextCount);
      const sourceLabel = referenceSourceLabels[sourceId] || item.sourcePath[0] || sourceId;
      return {
        content: item.content.trim(),
        label: `${sourceLabel} ${nextCount}`,
        time: item.timeLabel?.trim() || '',
        title: item.title || `${sourceLabel} ${nextCount}`,
        value: `{{${prefix}${nextCount}}}`,
      };
    })
    .filter(item => item.content);
});
const referenceContents = computed(() => referenceTokens.value.map(token => token.content));
const placeholderTokens = computed(() =>
  referenceTokens.value.flatMap(token => [
    { label: `${token.label}正文`, value: token.value },
    { label: `${token.label}标题`, value: `${token.value.slice(0, -2)}Title}}` },
    { label: `${token.label}时间`, value: `${token.value.slice(0, -2)}Time}}` },
  ]),
);
const referenceHelpText = computed(() =>
  referenceTokens.value.length
    ? `每条引用都会按来源生成正文、标题、时间占位符：${placeholderTokens.value.map(token => token.value).join('、')}。{{references}} 会合并全部引用正文。`
    : '选择引用后，会生成 {{diary1}}、{{diary1Title}}、{{diary1Time}} 这样的来源占位符。',
);
const placeholderHelpText = computed(() =>
  [
    '模板会决定最终写入聊天的格式。',
    '可用占位符：{{references}}。',
    referenceTokens.value.length
      ? `当前引用：${placeholderTokens.value.map(token => token.value).join('、')}`
      : '选择引用后还会按来源出现正文、标题、时间占位符。',
  ].join('\n'),
);
const preview = computed(() =>
  formatChatInsertTemplate(settings.value.template, {
    content: '',
    referenceReplacements: referenceTokens.value.map(token => ({
      content: token.content,
      time: token.time,
      title: token.title,
      token: token.value,
    })),
    references: referenceContents.value,
    title: '',
  }),
);

function insertPlaceholder(token: string) {
  const current = settings.value.template.trimEnd();
  const separator = current ? '\n' : '';
  settings.value.template = `${current}${separator}${token}`;
}

function insertTemplateShortcut(template: string) {
  insertPlaceholder(template);
  templateShortcutOpen.value = false;
}

function clearDraft() {
  selectedReferences.value = [];
  templateShortcutOpen.value = false;
}

async function confirmInsert() {
  if (!preview.value.trim()) {
    toastr.warning('请先填写要写入的内容');
    return;
  }

  const shouldInsert = await phone.confirmNotice('确认要写入当前酒馆聊天吗？这个操作会修改聊天记录。', {
    confirmLabel: '写入',
    kind: 'warning',
  });
  if (!shouldInsert) return;

  try {
    const result = await applyChatInsert({
      content: '',
      hidden: settings.value.hidden,
      mode: settings.value.mode,
      referenceReplacements: referenceTokens.value.map(token => ({
        content: token.content,
        time: token.time,
        title: token.title,
        token: token.value,
      })),
      references: referenceContents.value,
      role: settings.value.role,
      separator: settings.value.separator,
      targetMessageId: settings.value.targetMessageId,
      template: settings.value.template,
      title: '',
    });
    toastr.success(result.mode.startsWith('append') ? '已追加到聊天楼层' : '已插入新聊天楼层');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '写入聊天失败';
    toastr.error(message);
  }
}
</script>

<style scoped>
.pc-chat-insert-app,
.pc-chat-insert-page {
  min-height: 100%;
}

.pc-chat-insert-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-head-actions,
.pc-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-grid {
  margin-top: 12px;
}

.pc-head-actions {
  justify-content: flex-end;
}

.pc-placeholder-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.pc-placeholder-chip {
  max-width: 100%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface-strong) 88%);
  font-size: 12px;
  min-inline-size: 0;
  padding: 7px 10px;
}

.pc-switch-row {
  margin-top: 12px;
}

.pc-preview {
  min-height: 120px;
  margin: 12px 0 0;
  white-space: pre-wrap;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}

.pc-template-shortcut-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-template-shortcut-group strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.pc-insert-actions {
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
