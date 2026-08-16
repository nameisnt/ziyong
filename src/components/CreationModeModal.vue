<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <div
      v-if="open"
      class="pc-modal-backdrop pc-creation-modal-mask"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-creation-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
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
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';

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

const dialogRef = ref<HTMLElement | null>(null);

usePhoneModalLifecycle({
  dialogRef,
  isOpen: () => props.open,
  onClose: () => emit('close'),
});

function selectOption(id: string) {
  emit('close');
  emit('select', id);
}

</script>

<style scoped>
.pc-creation-modal-mask {
  --pc-modal-z: 70;
}

.pc-creation-modal {
  width: min(100%, 330px);
  padding: 14px;
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
