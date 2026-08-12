<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <div v-if="open" class="pc-creation-modal-mask" role="presentation" @click.self="emit('close')">
      <section class="pc-section-card pc-creation-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header>
          <strong>{{ title }}</strong>
          <small>{{ subtitle }}</small>
        </header>
        <div class="pc-creation-modal-options">
          <button
            v-for="option in options"
            :key="option.id"
            class="pc-list-row"
            type="button"
            @click="selectOption(option.id)"
          >
            <i :class="option.icon"></i>
            <span class="pc-list-row-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface CreationModeOption {
  description: string;
  icon: string;
  id: string;
  label: string;
}

const props = defineProps<{
  open: boolean;
  options: CreationModeOption[];
  subtitle: string;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [id: string];
}>();

function selectOption(id: string) {
  emit('close');
  emit('select', id);
}

useEventListener(window, 'phone-before-back', event => {
  if (!props.open) return;
  event.preventDefault();
  emit('close');
});

useEventListener(window, 'keydown', event => {
  if (!props.open || event.key !== 'Escape') return;
  event.preventDefault();
  emit('close');
});
</script>

<style scoped>
.pc-creation-modal-mask {
  position: absolute;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 18px;
  background: color-mix(in srgb, var(--pc-text) 30%, transparent 70%);
}

.pc-creation-modal {
  width: min(100%, 330px);
  padding: 14px;
  background: var(--pc-bg);
  box-shadow: 0 18px 44px color-mix(in srgb, var(--pc-text) 22%, transparent 78%);
}

.pc-creation-modal header {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}

.pc-creation-modal header small {
  color: var(--pc-muted);
}

.pc-creation-modal-options {
  display: grid;
}

.pc-creation-modal-options .pc-list-row {
  grid-template-columns: 24px minmax(0, 1fr) auto;
}
</style>
