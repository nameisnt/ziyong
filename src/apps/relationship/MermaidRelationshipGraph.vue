<template>
  <div class="pc-mermaid-relationship">
    <EmptyState v-if="!characters.length" compact title="还没有人物" />
    <div v-else-if="errorMessage" class="pc-error-list">
      <span>{{ errorMessage }}</span>
    </div>
    <div v-else-if="rendering" class="pc-mermaid-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>
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

const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
const svg = ref('');
const rendering = ref(false);
const errorMessage = ref('');
let revision = 0;

type MermaidApi = {
  initialize: (options: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid() {
  mermaidPromise ??= import(/* @vite-ignore */ MERMAID_URL).then(module => module.default as MermaidApi);
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
        edgeLabelBackground: 'transparent',
        fontFamily: 'inherit',
        lineColor: 'currentColor',
        primaryBorderColor: 'currentColor',
        primaryColor: 'transparent',
        primaryTextColor: 'currentColor',
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

watch(() => [props.characters, props.links], renderGraph, { deep: true, immediate: true });
</script>

<style scoped>
.pc-mermaid-relationship {
  min-height: 220px;
  overflow: auto;
  color: var(--pc-text);
}
.pc-mermaid-loading {
  display: grid;
  min-height: 220px;
  place-items: center;
  color: var(--pc-muted);
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
