<template>
  <div v-if="activeSelect" class="pc-native-select-layer" role="presentation">
    <div ref="anchorEl" class="pc-native-select-anchor" :style="anchorStyle" @pointerdown.stop>
      <SearchableCombobox
        ref="comboboxEl"
        v-model="selectedIndexValue"
        :empty-label="t`没有匹配选项`"
        :input-label="fieldLabel"
        :menu-max-height="menuMaxHeight"
        :menu-placement="menuPlacement"
        :options="options"
        :placeholder="searchPlaceholder"
        :toggle-title="toggleTitle"
        @close="handleComboboxClose"
        @select="choose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';

interface SelectOption {
  disabled: boolean;
  group?: string;
  label: string;
  value: string;
}

type ComboboxHandle = {
  focusAndOpen: (selectText?: boolean) => void;
};

const activeSelect = shallowRef<HTMLSelectElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const comboboxEl = ref<ComboboxHandle | null>(null);
const fieldLabel = ref('选择选项');
const options = ref<SelectOption[]>([]);
const selectedIndexValue = ref('');
const anchorStyle = ref<Record<string, string>>({});
const menuPlacement = ref<'bottom' | 'top'>('bottom');
const menuMaxHeight = ref(220);
let positionFrame = 0;

const searchPlaceholder = computed(() =>
  fieldLabel.value === '选择选项' ? '选择或搜索选项' : `选择或搜索${fieldLabel.value}`,
);
const toggleTitle = computed(() => (fieldLabel.value === '选择选项' ? '展开选项列表' : `展开${fieldLabel.value}列表`));

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);
  document.addEventListener('scroll', requestPositionUpdate, true);
  window.addEventListener('resize', requestPositionUpdate);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  document.removeEventListener('click', onDocumentClick, true);
  document.removeEventListener('keydown', onDocumentKeyDown, true);
  document.removeEventListener('scroll', requestPositionUpdate, true);
  window.removeEventListener('resize', requestPositionUpdate);
  cancelAnimationFrame(positionFrame);
});

function findSelect(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const select = target.closest<HTMLSelectElement>('#tavern-phone-root select');
  if (!select || select.disabled || select.multiple || select.size > 1 || select.closest('.pc-native-select-layer')) {
    return null;
  }
  return select;
}

function readFieldLabel(select: HTMLSelectElement) {
  const explicitLabel = select.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(select.id)}"]`)
    : null;
  const ownerLabel = explicitLabel ?? select.closest('label');
  const fieldContainer = select.closest<HTMLElement>(
    '.pc-field-group, .pc-select-field, .pc-number-field, .pc-inline-field',
  );
  const labelElement =
    ownerLabel?.querySelector<HTMLElement>(':scope > .pc-field-label, :scope > span') ??
    fieldContainer?.querySelector<HTMLElement>(
      ':scope > .pc-field-label, :scope > label.pc-field-label, :scope > span',
    );
  return (
    select.getAttribute('aria-label')?.trim() || labelElement?.textContent?.trim() || select.title.trim() || '选择选项'
  );
}

function readOptions(select: HTMLSelectElement) {
  return Array.from(select.options).map((option, index) => {
    const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement : null;
    return {
      disabled: option.disabled || Boolean(group?.disabled),
      group: group?.label.trim() || undefined,
      label: option.textContent?.trim() || option.label.trim() || option.value,
      value: String(index),
    } satisfies SelectOption;
  });
}

function open(select: HTMLSelectElement) {
  activeSelect.value = select;
  fieldLabel.value = readFieldLabel(select);
  options.value = readOptions(select);
  selectedIndexValue.value = select.selectedIndex >= 0 ? String(select.selectedIndex) : '';
  void nextTick(() => {
    updatePosition();
    comboboxEl.value?.focusAndOpen(true);
  });
}

function close(restoreFocus = false) {
  const select = activeSelect.value;
  activeSelect.value = null;
  options.value = [];
  selectedIndexValue.value = '';
  anchorStyle.value = {};
  cancelAnimationFrame(positionFrame);
  positionFrame = 0;
  if (restoreFocus && select?.isConnected) {
    void nextTick(() => select.focus({ preventScroll: true }));
  }
}

function handleComboboxClose() {
  close(false);
}

function choose(option: SelectOption) {
  const select = activeSelect.value;
  const optionIndex = Number.parseInt(option.value, 10);
  if (!select || option.disabled || !Number.isInteger(optionIndex) || !select.options[optionIndex]) return;
  select.selectedIndex = optionIndex;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  close(true);
}

function onDocumentPointerDown(event: PointerEvent) {
  const select = findSelect(event.target);
  if (!select) return;
  event.preventDefault();
  event.stopPropagation();
  open(select);
}

function onDocumentClick(event: MouseEvent) {
  const select = findSelect(event.target);
  if (!select) return;
  event.preventDefault();
  event.stopPropagation();
  if (activeSelect.value !== select) open(select);
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (activeSelect.value && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close(true);
    return;
  }
  const select = findSelect(event.target);
  if (!select || ![' ', 'Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  open(select);
}

function requestPositionUpdate() {
  if (!activeSelect.value || positionFrame) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0;
    updatePosition();
  });
}

function updatePosition() {
  const select = activeSelect.value;
  const shell = select?.closest<HTMLElement>('.pc-phone-shell');
  if (!select?.isConnected || !shell) {
    close(false);
    return;
  }

  const shellRect = shell.getBoundingClientRect();
  const selectRect = select.getBoundingClientRect();
  if (
    selectRect.bottom < shellRect.top ||
    selectRect.top > shellRect.bottom ||
    selectRect.right < shellRect.left ||
    selectRect.left > shellRect.right
  ) {
    close(false);
    return;
  }

  const edgeGap = 8;
  const width = Math.min(selectRect.width, shellRect.width - edgeGap * 2);
  const left = Math.max(edgeGap, Math.min(selectRect.left - shellRect.left, shellRect.width - width - edgeGap));
  const top = selectRect.top - shellRect.top;
  const availableBelow = shellRect.bottom - selectRect.bottom - edgeGap;
  const availableAbove = selectRect.top - shellRect.top - edgeGap;
  const groupCount = options.value.filter(
    (option, index, source) => option.group && option.group !== source[index - 1]?.group,
  ).length;
  const desiredMenuHeight = Math.min(220, Math.max(80, options.value.length * 38 + groupCount * 28 + 12));
  const shouldOpenAbove = availableBelow < Math.min(150, desiredMenuHeight) && availableAbove > availableBelow;
  const availableMenuHeight = (shouldOpenAbove ? availableAbove : availableBelow) - 6;

  menuPlacement.value = shouldOpenAbove ? 'top' : 'bottom';
  menuMaxHeight.value = Math.max(80, Math.min(desiredMenuHeight, Math.floor(availableMenuHeight)));
  anchorStyle.value = {
    height: `${selectRect.height}px`,
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
  };
}
</script>

<style scoped>
.pc-native-select-layer {
  position: absolute;
  z-index: 120;
  inset: 0;
  pointer-events: none;
}

.pc-native-select-anchor {
  position: absolute;
  min-width: 0;
  pointer-events: auto;
}

.pc-native-select-anchor :deep(.pc-combobox),
.pc-native-select-anchor :deep(.pc-combobox-input) {
  height: 100%;
}

.pc-native-select-anchor :deep(.pc-combobox-input) {
  min-height: 100%;
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
}

.pc-native-select-anchor :deep(.pc-combobox-menu) {
  overscroll-behavior: contain;
}
</style>
