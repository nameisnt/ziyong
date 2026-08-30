<template>
  <section class="pc-macro-builder-app">
    <div class="pc-segment pc-macro-builder-tabs" aria-label="宏类型">
      <button :class="['pc-segment-btn', { active: mode === 'dice' }]" type="button" @click="mode = 'dice'">
        骰点判定
      </button>
      <button :class="['pc-segment-btn', { active: mode === 'pick' }]" type="button" @click="mode = 'pick'">
        随机抽取
      </button>
      <button :class="['pc-segment-btn', { active: mode === 'assign' }]" type="button" @click="mode = 'assign'">
        身份分配
      </button>
    </div>

    <section class="pc-page-section pc-macro-builder-form">
      <template v-if="mode === 'dice'">
        <div class="pc-macro-builder-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">最小值</span>
            <input v-model.number="dice.minimum" class="pc-field" type="number" />
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">最大值</span>
            <input v-model.number="dice.maximum" class="pc-field" type="number" />
          </label>
        </div>
        <div class="pc-macro-builder-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">判定方式</span>
            <select v-model="dice.operation" class="pc-select">
              <option value="gte">骰点 ≥ 目标</option>
              <option value="gt">骰点 ＞ 目标</option>
              <option value="lte">骰点 ≤ 目标</option>
              <option value="lt">骰点 ＜ 目标</option>
            </select>
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">目标值</span>
            <input v-model.number="dice.target" class="pc-field" type="number" />
          </label>
        </div>
        <div class="pc-macro-builder-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">成功文字</span>
            <input v-model="dice.success" class="pc-field" />
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">失败文字</span>
            <input v-model="dice.failure" class="pc-field" />
          </label>
        </div>
      </template>

      <template v-else-if="mode === 'pick'">
        <div class="pc-macro-builder-grid">
          <label class="pc-field-group">
            <span class="pc-field-label">最少抽取</span>
            <input v-model.number="pick.minimum" class="pc-field" min="0" type="number" />
          </label>
          <label class="pc-field-group">
            <span class="pc-field-label">最多抽取</span>
            <input v-model.number="pick.maximum" class="pc-field" min="0" type="number" />
          </label>
        </div>
        <label class="pc-field-group">
          <span class="pc-field-label">候选项（每行一项）</span>
          <textarea v-model="pick.items" class="pc-area" placeholder="角色甲&#10;角色乙&#10;角色丙"></textarea>
        </label>
        <div class="pc-macro-builder-toggle">
          <span>允许重复抽取</span>
          <label class="pc-toggle" title="允许重复抽取">
            <input v-model="pick.repeat" type="checkbox" aria-label="允许重复抽取" />
            <span aria-hidden="true"></span>
          </label>
        </div>
      </template>

      <template v-else>
        <label class="pc-field-group">
          <span class="pc-field-label">身份名称（每行一个）</span>
          <textarea v-model="assign.roles" class="pc-area" placeholder="A 身份&#10;B 身份"></textarea>
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">身份候选（每行一项）</span>
          <textarea v-model="assign.items" class="pc-area" placeholder="身份 1&#10;身份 2&#10;身份 3"></textarea>
        </label>
        <div class="pc-macro-builder-toggle">
          <span>允许不同身份取得相同候选</span>
          <label class="pc-toggle" title="允许重复分配">
            <input v-model="assign.repeat" type="checkbox" aria-label="允许重复分配" />
            <span aria-hidden="true"></span>
          </label>
        </div>
        <div class="pc-segment" aria-label="身份候选位置">
          <button
            :class="['pc-segment-btn', { active: assign.placement === 'before' }]"
            type="button"
            @click="assign.placement = 'before'"
          >
            候选在前
          </button>
          <button
            :class="['pc-segment-btn', { active: assign.placement === 'after' }]"
            type="button"
            @click="assign.placement = 'after'"
          >
            候选在后
          </button>
        </div>
      </template>
    </section>

    <section class="pc-page-section pc-macro-builder-result">
      <header>
        <strong>生成的宏</strong>
        <div>
          <button
            class="pc-icon-btn"
            type="button"
            title="重新测试"
            aria-label="重新测试"
            @click="previewRevision += 1"
          >
            <i class="fa-solid fa-dice"></i>
          </button>
          <button class="pc-icon-btn primary" type="button" title="复制宏" aria-label="复制宏" @click="copyMacro">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
      </header>
      <textarea class="pc-area pc-macro-output" :value="generatedMacro" readonly></textarea>
      <div class="pc-macro-preview">
        <span>本次测试</span>
        <strong>{{ previewResult || '无结果' }}</strong>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { replaceGenerationAliases, resolveGenerationIdentityAliases } from '@/util/generationAliases';
import { buildPluginMacro, replacePluginMacros, type PluginMacroKind } from '@/util/pluginMacros';

const generationAliases = useGenerationAliasesStore();
const mode = ref<PluginMacroKind>('dice');
const previewRevision = ref(0);
const dice = reactive({ failure: '失败', maximum: 100, minimum: 0, operation: 'gte', success: '成功', target: 60 });
const pick = reactive({ items: '角色甲\n角色乙\n角色丙', maximum: 3, minimum: 1, repeat: false });
const assign = reactive({
  items: '身份 1\n身份 2\n身份 3\n身份 4',
  placement: 'after' as 'after' | 'before',
  repeat: false,
  roles: '{{char}}\n{{user}}',
});

const generatedMacro = computed(() => {
  if (mode.value === 'dice') {
    return buildPluginMacro('dice', {
      min: dice.minimum,
      max: dice.maximum,
      op: dice.operation,
      target: dice.target,
      success: dice.success,
      failure: dice.failure,
    });
  }
  if (mode.value === 'pick') {
    return buildPluginMacro('pick', {
      min: pick.minimum,
      max: pick.maximum,
      repeat: pick.repeat,
      items: pick.items,
    });
  }
  return buildPluginMacro('assign', {
    roles: assign.roles,
    items: assign.items,
    placement: assign.placement,
    repeat: assign.repeat,
  });
});
const previewResult = computed(() => {
  void previewRevision.value;
  return (
    replaceGenerationAliases(
      replacePluginMacros(generatedMacro.value),
      resolveGenerationIdentityAliases(generationAliases),
    ) || ''
  );
});

async function copyMacro() {
  await navigator.clipboard.writeText(generatedMacro.value);
  toastr.success('宏已复制');
}
</script>

<style scoped>
.pc-macro-builder-app,
.pc-macro-builder-form,
.pc-macro-builder-result {
  display: grid;
  gap: 12px;
}
.pc-macro-builder-tabs > button {
  min-width: 0;
  flex: 1;
}
.pc-macro-builder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pc-macro-builder-toggle,
.pc-macro-builder-result header,
.pc-macro-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-macro-builder-result header > div {
  display: flex;
  gap: 8px;
}
.pc-macro-output {
  min-height: 120px;
}
.pc-macro-preview {
  min-width: 0;
  border-top: 1px solid var(--pc-border);
  padding-top: 10px;
}
.pc-macro-preview span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-macro-preview strong {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
}
@media (max-width: 370px) {
  .pc-macro-builder-grid {
    grid-template-columns: 1fr;
  }
}
</style>
