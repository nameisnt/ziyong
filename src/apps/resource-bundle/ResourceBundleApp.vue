<template>
  <section class="pc-bundle-app pc-app-fill">
    <header class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">已选 {{ selectedCount }} 项</span>
      <button class="pc-soft-btn" type="button" :disabled="busy" @click="importOpen = true">
        <i class="fa-solid fa-file-import"></i>导入组合包
      </button>
      <button
        class="pc-icon-btn"
        type="button"
        title="刷新目录"
        aria-label="刷新目录"
        :disabled="busy"
        @click="refresh"
      >
        <i class="fa-solid fa-rotate"></i>
      </button>
    </header>
    <label class="pc-search-field">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="搜索资源名称" :disabled="busy" />
    </label>
    <p v-if="error" class="pc-bundle-error" role="alert">{{ error }}</p>
    <p v-if="busy || message" role="status">{{ busy ? progress || '正在读取目录…' : message }}</p>
    <div class="pc-bundle-catalog">
      <EmptyState v-if="!choices.length && !busy" title="暂无资源" />
      <details v-for="group in groups" :key="group.kind" open class="pc-bundle-group">
        <summary>{{ group.label }} · {{ group.rows.length }}</summary>
        <div v-if="group.rows.length" class="pc-compact-toolbar">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="selectGroup(group.rows, true)">
            全选
          </button>
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="selectGroup(group.rows, false)">
            取消全选
          </button>
        </div>
        <article v-for="choice in group.rows" :key="choice.key" class="pc-bundle-entry">
          <div class="pc-bundle-choice">
            <BulkSelectionCheckbox v-model="choice.selected" :label="choice.source.name" :disabled="busy" />
            <span class="pc-bundle-name"
              >{{ choice.source.name }}
              <small v-if="choice.source.kind === 'preset'">{{ choice.source.pluginId ? '插件' : '酒馆' }}</small>
            </span>
            <button
              v-if="choice.source.kind === 'theme'"
              class="pc-icon-btn"
              type="button"
              :disabled="busy"
              title="导出原生主题 JSON"
              :aria-label="`${choice.source.name}：导出原生主题 JSON`"
              @click="exportTheme(choice)"
            >
              <i class="fa-solid fa-file-export"></i>
            </button>
            <button
              v-if="choice.source.kind === 'character'"
              class="pc-icon-btn"
              type="button"
              :disabled="busy"
              :aria-expanded="choice.expanded"
              :title="choice.expanded ? '收起聊天' : '展开聊天'"
              :aria-label="`${choice.source.name}：${choice.expanded ? '收起聊天' : '展开聊天'}`"
              @click="toggleChats(choice)"
            >
              <i class="fa-solid" :class="choice.expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
          </div>
          <div v-if="choice.expanded && choice.chats" class="pc-bundle-chats">
            <div v-if="choice.chats.length" class="pc-compact-toolbar">
              <button class="pc-soft-btn" type="button" :disabled="busy" @click="selectChats(choice, true)">
                全选聊天
              </button>
              <button class="pc-soft-btn" type="button" :disabled="busy" @click="selectChats(choice, false)">
                取消聊天
              </button>
            </div>
            <EmptyState v-else title="暂无聊天记录" />
            <div v-for="chat in choice.chats" :key="chat.item.id" class="pc-bundle-choice pc-bundle-chat">
              <BulkSelectionCheckbox
                :model-value="chat.selected"
                :label="chat.item.name"
                :disabled="busy"
                @update:model-value="
                  chat.selected = $event;
                  if ($event) choice.selected = true;
                "
              />
              <span class="pc-bundle-name">{{ chat.item.name }}</span>
            </div>
          </div>
        </article>
      </details>
    </div>
    <footer class="pc-form-actions">
      <button class="pc-soft-btn" type="button" :disabled="busy || !choices.length" @click="exportFile(true)">
        <i class="fa-solid fa-box-archive"></i>导出全部
      </button>
      <button class="pc-primary-btn" type="button" :disabled="busy || !selectedCount" @click="exportFile(false)">
        <i class="fa-solid fa-file-export"></i>导出所选
      </button>
    </footer>
    <ResourceBundleDialog v-if="importOpen" @close="importOpen = false" @imported="catalogDirty = true" />
  </section>
</template>

<script setup lang="ts">
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import { listExportSources, planExport } from '@/resource-bundle/host';
import { buildSelectedExport, type ExportChoice } from '@/resource-bundle/exportSelection';
import { writeBundle, writeTheme } from '@/resource-bundle/zip';
import { usePhoneStore } from '@/store/phone';

const ResourceBundleDialog = defineAsyncComponent(() => import('@/resource-bundle/ResourceBundleDialog.vue'));
const phone = usePhoneStore();
const choices = ref<ExportChoice[]>([]);
const busy = ref(false),
  error = ref(''),
  progress = ref(''),
  message = ref(''),
  query = ref('');
const importOpen = ref(false),
  catalogDirty = ref(false);
const categories = [
  { kind: 'character', label: '角色卡' },
  { kind: 'preset', label: '预设' },
  { kind: 'worldbook', label: '世界书' },
  { kind: 'regex', label: '正则' },
  { kind: 'theme', label: 'UI 主题' },
];
const groups = computed(() =>
  categories.map(group => ({
    ...group,
    rows: choices.value.filter(
      choice =>
        choice.source.kind === group.kind &&
        choice.source.name.toLowerCase().includes(query.value.trim().toLowerCase()),
    ),
  })),
);
const selectedCount = computed(() => choices.value.filter(choice => choice.selected).length);
const stopGuard = phone.registerNavigationGuard(() => !busy.value);
onBeforeUnmount(stopGuard);
onDeactivated(() => {
  importOpen.value = false;
});
watch(importOpen, open => {
  if (!open && catalogDirty.value) void refresh();
});

async function refresh() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    const sources = await listExportSources();
    choices.value = sources.map((source, i) => ({
      key: String(i),
      source,
      selected: false,
      expanded: false,
      chats: null,
    }));
    catalogDirty.value = false;
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
async function selectGroup(rows: ExportChoice[], selected: boolean) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    for (const row of rows) {
      if (row.source.kind === 'character') {
        if (selected && !row.chats) {
          progress.value = `读取聊天目录：${row.source.name}`;
          row.chats = (await planExport(row.source)).rows.filter(item => item.item.kind === 'chat');
        }
        selectChats(row, selected);
      }
      row.selected = selected;
    }
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
function selectChats(choice: ExportChoice, selected: boolean) {
  choice.chats?.forEach(chat => {
    chat.selected = selected;
  });
  if (selected) choice.selected = true;
}
async function toggleChats(choice: ExportChoice) {
  if (choice.expanded) {
    choice.expanded = false;
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    if (!choice.chats) choice.chats = (await planExport(choice.source)).rows.filter(row => row.item.kind === 'chat');
    choice.expanded = true;
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
  }
}
function exportTheme(choice: ExportChoice) {
  if (busy.value || choice.source.kind !== 'theme') return;
  error.value = '';
  try {
    writeTheme(choice.source.data);
    message.value = 'UI 主题 JSON 已导出';
  } catch (caught) {
    error.value = String(caught);
  }
}
async function exportFile(all: boolean) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    // Export-all uses a separate selection so cancelling never overwrites the user's manual choices.
    const selection = choices.value.map(choice => ({ ...choice, selected: all || choice.selected }));
    if (all) {
      for (const choice of selection.filter(choice => choice.source.kind === 'character')) {
        progress.value = `读取聊天目录：${choice.source.name}`;
        choice.chats = (await planExport(choice.source)).rows
          .filter(row => row.item.kind === 'chat')
          .map(row => ({ ...row, selected: true }));
      }
      const chats = selection.reduce((sum, choice) => sum + (choice.chats?.length || 0), 0);
      if (
        !(await phone.confirmNotice(
          `导出全部 ${selection.length} 项资源及 ${chats} 个聊天？预设附带的脚本和正则将一起导出。`,
          { title: '确认导出全部', confirmLabel: '导出全部', kind: 'warning' },
        ))
      )
        return;
    }
    const plan = await buildSelectedExport(selection, planExport, name => {
      progress.value = `准备：${name}`;
    });
    await writeBundle(plan.manifest, plan.rows, name => {
      progress.value = `导出：${name}`;
    });
    message.value = '组合包已导出';
  } catch (caught) {
    error.value = String(caught);
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
onMounted(refresh);
</script>

<style scoped>
.pc-bundle-app {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}
.pc-bundle-app > header,
.pc-bundle-app > footer {
  flex-shrink: 0;
}
.pc-bundle-app p {
  margin: 0;
  overflow-wrap: anywhere;
}
.pc-bundle-catalog {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.pc-bundle-group > summary {
  padding: 10px 0;
  font-weight: 600;
  cursor: pointer;
}
.pc-bundle-entry {
  padding: 8px 0;
  border-bottom: 1px solid var(--pc-border);
}
.pc-bundle-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pc-bundle-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.pc-bundle-name small {
  margin-left: 6px;
  color: var(--pc-muted);
}
.pc-bundle-chats {
  margin-left: 16px;
  padding-top: 8px;
}
.pc-bundle-chat {
  padding: 8px 0;
}
.pc-bundle-error {
  color: var(--pc-danger);
}
</style>
