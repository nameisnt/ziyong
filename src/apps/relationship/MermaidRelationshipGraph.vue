<template>
  <div ref="graphRootEl" :class="['pc-mermaid-relationship', { 'is-empty': !characters.length }]">
    <EmptyState v-if="!characters.length" compact title="还没有人物" />
    <div v-else-if="errorMessage" class="pc-mermaid-state pc-mermaid-error" role="alert">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>关系图加载失败</strong>
      <small>{{ errorMessage }}</small>
      <button class="pc-soft-btn" type="button" @click="renderGraph">
        <i class="fa-solid fa-rotate-right"></i>
        <span>重新加载</span>
      </button>
    </div>
    <div v-else-if="rendering" class="pc-mermaid-state pc-mermaid-loading" role="status">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>正在加载关系图</span>
    </div>
    <!-- Mermaid returns its own strict-mode SVG. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="pc-mermaid-canvas" v-html="svg"></div>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { RelationshipCharacter, RelationshipLink } from './store';

const props = defineProps<{
  characters: RelationshipCharacter[];
  links: RelationshipLink[];
}>();

const svg = ref('');
const rendering = ref(false);
const errorMessage = ref('');
const graphRootEl = ref<HTMLElement | null>(null);
let revision = 0;

type MermaidApi = {
  initialize: (options: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid() {
  mermaidPromise ??= import('mermaid')
    .then(module => module.default as unknown as MermaidApi)
    .catch(error => {
      mermaidPromise = null;
      throw error;
    });
  return mermaidPromise;
}

function quoteLabel(value: string) {
  return value.replace(/["\r\n]/gu, ' ').trim();
}

function buildSource() {
  const nodeIds = new Map(props.characters.map((character, index) => [character.id, `n${index}`]));
  const lines = ['flowchart LR'];
  props.characters.forEach(character => {
    lines.push(`  ${nodeIds.get(character.id)}["${quoteLabel(character.name)}"]`);
  });
  props.links.forEach(link => {
    const from = nodeIds.get(link.fromId);
    const to = nodeIds.get(link.toId);
    if (from && to) lines.push(`  ${from} -->|"${quoteLabel(link.label)}"| ${to}`);
  });
  return lines.join('\n');
}

function resolveThemeColor(variable: string, fallback: string) {
  if (!graphRootEl.value) return fallback;
  const probe = document.createElement('span');
  probe.style.color = `var(${variable})`;
  graphRootEl.value.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  if (!color) return fallback;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return fallback;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

async function renderGraph() {
  const current = ++revision;
  if (!props.characters.length) {
    svg.value = '';
    return;
  }
  rendering.value = true;
  errorMessage.value = '';
  try {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      flowchart: { curve: 'basis', htmlLabels: false },
      securityLevel: 'strict',
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        edgeLabelBackground: resolveThemeColor('--pc-form-control-popup-bg', '#ffffff'),
        fontFamily: 'inherit',
        lineColor: resolveThemeColor('--pc-muted', '#6b7280'),
        primaryBorderColor: resolveThemeColor('--pc-theme-accent', '#0a84ff'),
        primaryColor: resolveThemeColor('--pc-form-control-bg', '#ffffff'),
        primaryTextColor: resolveThemeColor('--pc-text', '#1c1c1e'),
      },
    });
    const result = await mermaid.render(`pc_relationship_${Date.now()}_${current}`, buildSource());
    if (current === revision) svg.value = result.svg;
  } catch (error) {
    if (current === revision) errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (current === revision) rendering.value = false;
  }
}

watch(() => [props.characters, props.links], renderGraph, { deep: true });
onMounted(renderGraph);
</script>

<style scoped>
.pc-mermaid-relationship {
  overflow: auto;
  color: var(--pc-text);
}
.pc-mermaid-relationship:not(.is-empty) {
  min-height: 220px;
}
.pc-mermaid-relationship.is-empty {
  min-height: 0;
}
.pc-mermaid-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 20px;
  color: var(--pc-muted);
  text-align: center;
}
.pc-mermaid-state strong {
  color: var(--pc-text);
}
.pc-mermaid-state small {
  max-width: 100%;
  overflow-wrap: anywhere;
}
.pc-mermaid-error > i {
  color: var(--pc-danger);
}
.pc-mermaid-canvas {
  min-width: max-content;
}
.pc-mermaid-canvas :deep(svg) {
  display: block;
  width: auto;
  min-width: 100%;
  height: auto;
  max-height: none;
}
</style>
