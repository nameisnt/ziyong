<template>
  <div ref="rootEl" class="pc-combobox" :class="{ 'menu-above': menuPlacement === 'top' }" :style="comboboxStyle">
    <input
      :id="inputId"
      ref="inputEl"
      class="pc-field pc-combobox-input"
      type="text"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-controls="listboxId"
      :aria-activedescendant="activeDescendant"
      :aria-expanded="isOpen"
      :aria-label="inputLabel"
      :disabled="disabled"
      :placeholder="placeholder"
      :value="inputText"
      @click="openMenu"
      @focus="openMenu"
      @input="handleInput"
      @keydown="handleKeydown"
    />
    <button
      class="pc-icon-btn pc-combobox-toggle"
      type="button"
      :disabled="disabled"
      :title="toggleTitle"
      @click="toggleMenu"
    >
      <i class="fa-solid fa-chevron-down"></i>
    </button>

    <div v-if="isOpen" :id="listboxId" class="pc-combobox-menu" role="listbox" :aria-labelledby="inputId">
      <template v-for="(option, index) in filteredOptions" :key="`${option.value}:${index}`">
        <div v-if="option.group && option.group !== filteredOptions[index - 1]?.group" class="pc-combobox-group">
          {{ option.group }}
        </div>
        <button
          :id="`${listboxId}-option-${index}`"
          class="pc-combobox-option"
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          :class="{ active: index === activeIndex, selected: option.value === modelValue }"
          :disabled="option.disabled"
          @mousedown.prevent
          @mouseenter="activeIndex = index"
          @click="selectOption(option)"
        >
          <span>{{ option.label }}</span>
          <i v-if="option.value === modelValue" class="fa-solid fa-check"></i>
        </button>
      </template>
      <div v-if="!filteredOptions.length" class="pc-combobox-empty" role="status">
        {{ emptyLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type ComboboxOption = {
  disabled?: boolean;
  group?: string;
  label: string;
  value: string;
};

const props = withDefaults(
  defineProps<{
    allowCustom?: boolean;
    disabled?: boolean;
    emptyLabel?: string;
    inputLabel?: string;
    menuMaxHeight?: number;
    menuPlacement?: 'bottom' | 'top';
    modelValue: string;
    options: ComboboxOption[];
    placeholder?: string;
    toggleTitle?: string;
  }>(),
  {
    allowCustom: false,
    disabled: false,
    emptyLabel: '没有匹配选项',
    inputLabel: '选择选项',
    menuMaxHeight: 220,
    menuPlacement: 'bottom',
    placeholder: '',
    toggleTitle: '展开选项',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  close: [];
  open: [];
  select: [option: ComboboxOption];
}>();

const rootEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const inputText = ref('');
const queryDirty = ref(false);
const activeIndex = ref(-1);
const idSuffix = Math.random().toString(36).slice(2, 9);
const inputId = `pc-combobox-input-${idSuffix}`;
const listboxId = `pc-combobox-list-${idSuffix}`;
const comboboxStyle = computed(() => ({
  '--pc-combobox-menu-max-height': `${Math.max(80, props.menuMaxHeight)}px`,
}));

const selectedOption = computed(() => props.options.find(option => option.value === props.modelValue) || null);
const filteredOptions = computed(() => {
  if (!queryDirty.value) return props.options;
  const query = inputText.value.trim().toLowerCase();
  if (!query) return props.options;
  return props.options.filter(option => `${option.group || ''} ${option.label}`.toLowerCase().includes(query));
});
const activeDescendant = computed(() =>
  isOpen.value && activeIndex.value >= 0 ? `${listboxId}-option-${activeIndex.value}` : undefined,
);

watch(
  () => props.modelValue,
  () => syncInputText(),
  { immediate: true },
);

watch(
  () => props.options,
  () => {
    syncInputText();
    resetActiveIndex();
  },
);

watch(filteredOptions, () => resetActiveIndex());

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown);
});

function syncInputText() {
  inputText.value = selectedOption.value?.label || (props.allowCustom ? props.modelValue : '');
}

function resetActiveIndex() {
  const selectedIndex = filteredOptions.value.findIndex(
    option => option.value === props.modelValue && !option.disabled,
  );
  if (selectedIndex >= 0) {
    activeIndex.value = selectedIndex;
    return;
  }
  activeIndex.value = filteredOptions.value.findIndex(option => !option.disabled);
}

function openMenu() {
  if (props.disabled) return;
  if (!isOpen.value) {
    queryDirty.value = false;
    emit('open');
  }
  isOpen.value = true;
  resetActiveIndex();
}

function closeMenu() {
  const wasOpen = isOpen.value;
  isOpen.value = false;
  queryDirty.value = false;
  syncInputText();
  if (wasOpen) emit('close');
}

function toggleMenu() {
  if (props.disabled) return;
  if (isOpen.value) {
    closeMenu();
    return;
  }
  inputEl.value?.focus();
  openMenu();
}

function handleInput(event: Event) {
  inputText.value = (event.target as HTMLInputElement).value;
  queryDirty.value = true;
  if (props.allowCustom) emit('update:modelValue', inputText.value);
  isOpen.value = true;
}

function moveActiveIndex(offset: number) {
  const options = filteredOptions.value;
  if (!options.length) return;
  let next = activeIndex.value;
  for (let index = 0; index < options.length; index += 1) {
    next = (next + offset + options.length) % options.length;
    if (!options[next]?.disabled) {
      activeIndex.value = next;
      return;
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    openMenu();
    moveActiveIndex(1);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    openMenu();
    moveActiveIndex(-1);
    return;
  }
  if (event.key === 'Enter') {
    if (!isOpen.value) return;
    event.preventDefault();
    const option = filteredOptions.value[activeIndex.value];
    if (option && !option.disabled) {
      selectOption(option);
      return;
    }
    if (props.allowCustom) closeMenu();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
  }
}

function selectOption(option: ComboboxOption) {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('select', option);
  inputText.value = option.label;
  const wasOpen = isOpen.value;
  isOpen.value = false;
  queryDirty.value = false;
  if (wasOpen) emit('close');
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!isOpen.value) return;
  const target = event.target;
  if (target instanceof Node && rootEl.value?.contains(target)) return;
  closeMenu();
}

function focusAndOpen(selectText = false) {
  void nextTick(() => {
    inputEl.value?.focus();
    if (selectText) inputEl.value?.select();
    openMenu();
  });
}

defineExpose({ focusAndOpen });
</script>

<style scoped>
.pc-combobox {
  position: relative;
  width: 100%;
  min-width: 0;
}

.pc-combobox-input {
  padding-right: 48px;
}

.pc-combobox-toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 34px;
  height: 34px;
  min-width: 34px;
  transform: translateY(-50%);
}

.pc-combobox-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  display: grid;
  max-height: var(--pc-combobox-menu-max-height, 220px);
  overflow-y: auto;
  border: 1px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
  padding: 6px;
}

.pc-combobox.menu-above .pc-combobox-menu {
  top: auto;
  bottom: calc(100% + 6px);
}

.pc-combobox-group {
  padding: 8px 10px 3px;
  color: var(--pc-muted);
  font-size: 11px;
  font-weight: 800;
}

.pc-combobox-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;
}

.pc-combobox-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-combobox-option.active,
.pc-combobox-option:hover {
  background: var(--pc-surface-strong);
}

.pc-combobox-option.selected {
  color: var(--pc-theme-accent);
  font-weight: 800;
}

.pc-combobox-option:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.pc-combobox-empty {
  color: var(--pc-muted);
  padding: 10px;
  text-align: center;
}
</style>
