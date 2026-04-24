<template>
  <FamiliarOverlayInput
    ref="overlayRef"
    :model-value="displayValue"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :name="props.name"
    input-class="aspect-picker-input"
    highlight-class="highlight-layer"
    wrapper-class="aspect-picker-wrapper"
    edit-container-class="aspect-picker-edit-container"
    hint-class="aspect-picker-hint"
    :input-state-classes="{
      'has-error': validationErrors.length > 0,
      'is-disabled': props.disabled,
      'no-context': !props.familiarContext,
    }"
    :highlight-state-classes="{ 'no-context': !props.familiarContext }"
    :highlighted-html="highlightedHTML"
    :show-familiar="showFamiliar"
    :familiar-options="familiarOptions"
    :familiar-index="familiarIndex"
    :familiar-position="familiarPosition"
    :hint="displayHint"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeyDown"
    @focus="onFocus"
    @scroll="syncScroll"
    @select="onFamiliarSelect"
  />
</template>

<script setup lang="ts">
  import type { AutocompleteOption, FamiliarContext, FamiliarSchema, ValidationError } from '@helpers/formulae/types.mjs';
  import { useFamiliarOverlayInput } from '@helpers/formulae/useFamiliarOverlayInput.mjs';
  import { canonicalizeFormula, findAspectByAccessPath, localizeFormula, parseFormula, renderFormulaHTML, validateFormula } from '@helpers/formulae/utils.mjs';
  import FamiliarOverlayInput from '@vc/Fields/FormGroups/FamiliarOverlayInput.vue';
  import { computed, nextTick, onUnmounted, type PropType, ref, watch } from 'vue';

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

  const familiarVerticalGap = 2;

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const validationErrors = ref<ValidationError[]>([]);

  // Familiar composable — manages autocomplete state
  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    dismissFamiliar,
    handleNavigationKey,
    syncScroll: syncOverlayScroll,
    updateAutocomplete: updateOverlayAutocomplete,
  } = useFamiliarOverlayInput();

  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  // Wrap the single context into FamiliarSchema for getAutocompleteOptions
  const wrappedSchema = computed((): FamiliarSchema => {
    if (!props.familiarContext) return {};
    return { [props.contextName]: props.familiarContext };
  });

  /**
   * Translate a stored raw accessPath to familiar display syntax (localized).
   * e.g. 'system.hardness' → '#item.Hardness' (English) / '#item.Twardość' (Polish)
   */
  function rawToFamiliar(rawPath: string): string {
    if (!rawPath || !props.familiarContext) return rawPath;
    const result = findAspectByAccessPath(props.familiarContext.properties, rawPath);
    if (result) {
      const canonical = `#${props.contextName}.${result.treePath.join('.')}`;
      return localizeFormula(canonical, wrappedSchema.value);
    }
    // Unresolvable — show raw path as-is
    return rawPath;
  }

  /**
   * Translate familiar display syntax back to raw accessPath.
   * Handles both localized (#item.Twardość) and canonical (#item.hardness) input.
   *
   * Canonicalizes first so localized display names map to canonical tree keys,
   * then walks the tree to find the leaf FieldAspect's accessPath.
   */
  function familiarToRaw(familiarPath: string): string {
    if (!props.familiarContext) return familiarPath;

    // Canonicalize: e.g. '#item.Twardość' → '#item.hardness'
    const canonical = canonicalizeFormula(familiarPath, wrappedSchema.value);

    // Strip the '#contextName.' prefix
    const prefix = `#${props.contextName}.`;
    if (!canonical.startsWith(prefix)) return familiarPath;
    const innerPath = canonical.slice(prefix.length);
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

  const highlightedHTML = computed(() => {
    const value = displayValue.value;
    if (!value) return '';
    if (!props.familiarContext) return escapeHTML(value);
    const tokens = parseFormula(value);
    return renderFormulaHTML(value, tokens, validationErrors.value, wrappedSchema.value);
  });

  const dynamicHint = computed(() => {
    if (!props.familiarContext) return '';
    const ctx = wrappedSchema.value[props.contextName];
    const displayName = ctx?.display ?? (props.contextName.charAt(0).toUpperCase() + props.contextName.slice(1));
    return `Available Contexts: [${displayName}]`;
  });

  const displayHint = computed(() => props.disabled ? '' : dynamicHint.value);

  // Track whether user is actively editing
  let isUserEditing = false;

  function escapeHTML(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
  }

  function updateValidation() {
    if (!props.familiarContext || !displayValue.value) {
      validationErrors.value = [];
      return;
    }

    validationErrors.value = validateFormula(displayValue.value, wrappedSchema.value);
  }

  function syncScroll() {
    syncOverlayScroll(getInputElement(), getHighlightElement());
  }

  // Sync external modelValue changes into display (but not during active editing)
  watch(() => props.modelValue, (newRaw) => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(newRaw);
      updateValidation();
      nextTick(syncScroll);
    }
  });

  // Re-translate when context changes (e.g. target dropdown switch)
  watch(() => props.familiarContext, () => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(props.modelValue);
      updateValidation();
      nextTick(syncScroll);
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
    updateValidation();
    nextTick(syncScroll);

    if (!props.familiarContext || !value) {
      dismissFamiliar();
      return;
    }

    // Trigger autocomplete on every keystroke — auto-prefix with # if not present
    const searchText = value.startsWith('#') ? value : `#${value}`;
    updateAutocompleteMenu(searchText);
  }

  function onBlur() {
    setTimeout(() => {
      dismissFamiliar();
      if (isUserEditing) {
        isUserEditing = false;
        commitValue();
      }
      updateValidation();
    }, 200);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (handleNavigationKey(event, selectOption, getDropdownMenuElement())) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      isUserEditing = false;
      commitValue();
      getInputElement()?.blur();
      return;
    }

    if (event.key === 'Escape') {
      // Revert to stored value
      displayValue.value = rawToFamiliar(props.modelValue);
      isUserEditing = false;
      dismissFamiliar();
      updateValidation();
      getInputElement()?.blur();
      event.preventDefault();
    }
  }

  async function updateAutocompleteMenu(text: string) {
    const inputEl = getInputElement();
    if (!inputEl) return;

    const lastDotIndex = text.lastIndexOf('.');
    const anchorCharIndex = lastDotIndex !== -1 ? lastDotIndex + 1 : 0;
    const displayOffset = displayValue.value.startsWith('#') ? anchorCharIndex : Math.max(0, anchorCharIndex - 1);

    await updateOverlayAutocomplete({
      text,
      context: wrappedSchema.value,
      inputEl,
      wrapperEl: inputEl.closest('.aspect-picker-wrapper') as HTMLElement | null,
      anchorIndex: displayOffset,
      verticalGap: familiarVerticalGap,
      dropdownEl: getDropdownMenuElement(),
    });
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
      updateValidation();
    } else {
      // Branch selected — show next level
      nextTick(() => {
        const searchText = option.fullPath.startsWith('#') ? option.fullPath : `#${option.fullPath}`;
        updateAutocompleteMenu(searchText);
        getInputElement()?.focus();
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
    updateValidation();
    nextTick(syncScroll);
  }

  updateValidation();

  onUnmounted(() => {
    dismissFamiliar();
  });
</script>

<style scoped lang="scss">
  .aspect-picker-wrapper {
    width: 100%;
  }

  .aspect-picker-hint {
    margin: 0.25rem 0 0;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
  }

  .aspect-picker-edit-container {
    width: 100%;
  }

  .aspect-picker-input {
    padding: 0.35rem 0.5rem;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    background: transparent;
    color: transparent;
    caret-color: #66b3ff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.25);
      font-style: italic;
    }

    &:focus {
      border-color: rgba(102, 166, 255, 0.5);
      box-shadow: 0 0 0 2px rgba(102, 166, 255, 0.1);
    }

    &.has-error {
      border-color: rgba(255, 100, 100, 0.45);
      box-shadow: 0 0 0 1px rgba(255, 100, 100, 0.15);
    }

    &.is-disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  .highlight-layer {
    padding: 0.35rem 0.5rem;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #d4d4d4;

    &.no-context {
      color: #d4d4d4;
    }
  }
</style>
