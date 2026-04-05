<template>
  <div class="aspect-picker-wrapper">
    <input
      ref="inputRef"
      type="text"
      class="aspect-picker-input"
      :class="{ 'is-disabled': props.disabled, 'no-context': !props.familiarContext }"
      :value="displayValue"
      :disabled="props.disabled"
      :placeholder="props.placeholder"
      :name="props.name"
      @input="onInput"
      @blur="onBlur"
      @keydown="onKeyDown"
      @focus="onFocus"
      spellcheck="false"
      autocomplete="off"
    />

    <FamiliarDropdown
      ref="familiarDropdownRef"
      :show="showFamiliar"
      :options="familiarOptions"
      :selected-index="familiarIndex"
      :position="familiarPosition"
      @select="onFamiliarSelect"
    />
  </div>
</template>

<script setup lang="ts">
  import FamiliarDropdown from '@vc/FamiliarDropdown.vue';
  import { computed, nextTick, onUnmounted, type PropType, ref, watch } from 'vue';

  import type { AutocompleteOption, FamiliarContext, FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { measureTextOffset, useFamiliar } from '@helpers/formulae/useFamiliar.mjs';
  import { findAspectByAccessPath } from '@helpers/formulae/utils.mjs';

  const props = defineProps({
    /** Stored raw document path (e.g. 'system.hardness.value') */
    modelValue: { type: String, default: '' },
    /** Whether the picker is disabled (read-only display of familiar syntax) */
    disabled: { type: Boolean, default: false },
    /** Merged familiar context for autocomplete. Null = degrade to plain text. */
    familiarContext: { type: Object as PropType<FamiliarContext | null>, default: null },
    /** Context name prefix for display (e.g. 'item' or 'actor') */
    contextName: { type: String, default: 'item' },
    /** Placeholder text for empty input */
    placeholder: { type: String, default: 'Select property...' },
    /** Form field name attribute */
    name: { type: String, default: undefined },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
  }>();

  const inputRef = ref<HTMLInputElement>();
  const familiarDropdownRef = ref<InstanceType<typeof FamiliarDropdown>>();

  // Familiar composable — manages autocomplete state
  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    updateOptions: updateFamiliarOptions,
    handleKeyDown: handleFamiliarKeyDown,
    scrollSelectedIntoView,
    dismiss: dismissFamiliar,
  } = useFamiliar();

  // Wrap the single context into FamiliarSchema for getAutocompleteOptions
  const wrappedSchema = computed((): FamiliarSchema => {
    if (!props.familiarContext) return {};
    return { [props.contextName]: props.familiarContext };
  });

  /**
   * Translate a stored raw accessPath to familiar display syntax.
   * e.g. 'system.hardness.value' → '#item.hardness'
   */
  function rawToFamiliar(rawPath: string): string {
    if (!rawPath || !props.familiarContext) return rawPath;
    const result = findAspectByAccessPath(props.familiarContext.properties, rawPath);
    if (result) {
      return `#${props.contextName}.${result.treePath.join('.')}`;
    }
    // Unresolvable — show raw path as-is
    return rawPath;
  }

  /**
   * Translate familiar display syntax back to raw accessPath.
   * e.g. '#item.hardness' → 'system.hardness.value'
   *
   * Walks the context tree following the path segments to find the leaf FieldAspect.
   */
  function familiarToRaw(familiarPath: string): string {
    if (!props.familiarContext) return familiarPath;

    // Strip the '#contextName.' prefix
    const prefix = `#${props.contextName}.`;
    if (!familiarPath.startsWith(prefix)) return familiarPath;
    const innerPath = familiarPath.slice(prefix.length);
    if (!innerPath) return familiarPath;

    // Walk the context tree
    const segments = innerPath.split('.');
    let current: unknown = props.familiarContext.properties;
    for (const seg of segments) {
      if (typeof current !== 'object' || current === null || !(seg in current)) {
        return familiarPath; // Can't resolve — return display as-is
      }
      current = (current as Record<string, unknown>)[seg];
    }

    // If we landed on a FieldAspect, return its accessPath
    if (current && typeof current === 'object' && 'accessPath' in current) {
      return (current as { accessPath: string }).accessPath;
    }
    return familiarPath;
  }

  // The display value shown in the input
  const displayValue = ref(rawToFamiliar(props.modelValue));

  // Track whether user is actively editing
  let isUserEditing = false;

  // Sync external modelValue changes into display (but not during active editing)
  watch(() => props.modelValue, (newRaw) => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(newRaw);
    }
  });

  // Re-translate when context changes (e.g. target dropdown switch)
  watch(() => props.familiarContext, () => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(props.modelValue);
    }
  });

  function onFocus() {
    isUserEditing = true;
  }

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    // Strip spaces, commas, and other delimiters — single aspect only
    const value = target.value.replace(/[\s,;]/g, '');
    displayValue.value = value;

    if (!props.familiarContext || !value) {
      dismissFamiliar();
      return;
    }

    // Trigger autocomplete on every keystroke — auto-prefix with # if not present
    const searchText = value.startsWith('#') ? value : `#${value}`;
    updateAutocomplete(searchText);
  }

  function onBlur() {
    setTimeout(() => {
      dismissFamiliar();
      if (isUserEditing) {
        isUserEditing = false;
        commitValue();
      }
    }, 200);
  }

  function onKeyDown(event: KeyboardEvent) {
    const result = handleFamiliarKeyDown(event);
    if (result.handled) {
      event.preventDefault();
      if (result.selectedOption) {
        selectOption(result.selectedOption);
      } else {
        scrollSelectedIntoView(familiarDropdownRef.value?.menuRef);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      isUserEditing = false;
      commitValue();
      inputRef.value?.blur();
      return;
    }

    if (event.key === 'Escape') {
      // Revert to stored value
      displayValue.value = rawToFamiliar(props.modelValue);
      isUserEditing = false;
      dismissFamiliar();
      inputRef.value?.blur();
      event.preventDefault();
    }
  }

  function updateAutocomplete(text: string) {
    if (!inputRef.value) return;

    const inputRect = inputRef.value.getBoundingClientRect();
    const wrapperRect = inputRef.value.closest('.aspect-picker-wrapper')?.getBoundingClientRect();
    let position = { top: 0, left: 0 };
    if (wrapperRect) {
      // Anchor to the last '.' or the start of text
      const lastDotIndex = text.lastIndexOf('.');
      const anchorCharIndex = lastDotIndex !== -1 ? lastDotIndex + 1 : 0;
      // Map to input value offset (display value may differ from search text by '#' prefix)
      const displayOffset = displayValue.value.startsWith('#') ? anchorCharIndex : Math.max(0, anchorCharIndex - 1);
      const anchorLeft = measureTextOffset(inputRef.value, displayOffset);
      position = {
        top: inputRect.bottom - wrapperRect.top + 2,
        left: anchorLeft,
      };
    }

    updateFamiliarOptions(text, position, wrappedSchema.value);
  }

  function selectOption(option: AutocompleteOption) {
    // Display the familiar path
    displayValue.value = option.fullPath;

    if (option.isLeaf) {
      // Commit the raw accessPath
      const rawPath = option.accessPath ?? familiarToRaw(option.fullPath);
      emit('update:modelValue', rawPath);
      dismissFamiliar();
      isUserEditing = false;
    } else {
      // Branch selected — show next level
      nextTick(() => {
        const searchText = option.fullPath.startsWith('#') ? option.fullPath : `#${option.fullPath}`;
        updateAutocomplete(searchText);
        inputRef.value?.focus();
      });
    }
  }

  function onFamiliarSelect(option: AutocompleteOption) {
    selectOption(option);
  }

  /**
   * Commit the current display value.
   * If it's valid familiar syntax, translate to raw accessPath.
   * Otherwise, emit as-is (user typed a manual raw path).
   */
  function commitValue() {
    const current = displayValue.value;
    if (!current) {
      emit('update:modelValue', '');
      return;
    }

    const rawPath = familiarToRaw(current);
    emit('update:modelValue', rawPath);
    // Normalize display after commit
    displayValue.value = rawToFamiliar(rawPath);
  }

  onUnmounted(() => {
    dismissFamiliar();
  });
</script>

<style scoped lang="scss">
  .aspect-picker-wrapper {
    position: relative;
    display: inline-flex;
    width: 100%;
  }

  .aspect-picker-input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    background: transparent;
    color: #66b3ff;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.25);
      font-style: italic;
    }

    &:focus {
      border-color: rgba(102, 166, 255, 0.5);
      box-shadow: 0 0 0 2px rgba(102, 166, 255, 0.1);
    }

    &.is-disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &.no-context {
      color: #d4d4d4;
    }
  }
</style>
