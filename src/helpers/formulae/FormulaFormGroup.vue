<template>
  <FormGroup
    :label="props.label"
    :hint="dynamicHint"
    :localize-hint="false"
    :field-path="props.fieldPath"
    :default-visibility="props.defaultVisibility"
    :default-editability="props.defaultEditability"
  >
    <template #readonly>
      <slot v-if="!slots.readonly" />
      <div
        v-else
        class="formula-display"
        :class="{ 'has-error': formulaErrors.length > 0 }"
      >
        <template v-if="formulaErrors.length > 0">
          <span class="error-indicator" title="Formula has errors">⚠</span>
          <span class="formula-result error">{{ formulaError }}</span>
        </template>
        <template v-else>
          <span class="formula-result">{{ props.value || '—' }}</span>
        </template>
      </div>
    </template>
    <div class="formula-form-group">
      <div class="formula-input-wrapper">
        <div class="formula-edit-container">
          <!-- Real input: transparent text, user types here -->
          <input
            ref="formulaInput"
            type="text"
            class="formula-input"
            :class="{ 'has-error': formulaErrors.length > 0 }"
            :value="localValue"
            @input="onInput"
            @blur="onBlur"
            @keydown="onKeyDown"
            @focus="onFocus"
            @scroll="syncScroll"
            spellcheck="false"
            placeholder="Enter name or formula (e.g. #self.name)"
          />

          <!-- Highlight layer: purely visual, all mouse events pass through to input -->
          <div
            ref="highlightLayer"
            class="highlight-layer"
            v-html="highlightedHTML"
          ></div>
        </div>

        <!-- Familiar autocomplete menu -->
        <div
          v-if="showAutocomplete && autocompleteOptions.length > 0"
          ref="autocompleteMenu"
          class="autocomplete-menu"
          :style="{
            top: `${autocompletePosition.top}px`,
            left: `${autocompletePosition.left}px`,
          }"
          @mousedown.prevent
        >
          <div
            v-for="(option, index) in autocompleteOptions"
            :key="`${option.fullPath}-${index}`"
            class="autocomplete-item"
            :class="{ 'is-selected': index === autocompleteIndex }"
            @click="onAutocompleteItemClick(option)"
            :title="option.display"
          >
            <span class="option-path">{{ option.path }}</span>
            <template v-if="option.isLeaf && option.value != null">
              <span class="option-value">=</span>
              <span class="option-value">{{ option.value }}</span>
            </template>
            <span v-else-if="option.isLeaf && option.accessPath" class="option-type">{{ option.accessPath }}</span>
            <span v-else-if="!option.isLeaf" class="option-type">[object]</span>
          </div>
        </div>
      </div>
    </div>
  </FormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
  import FormGroup from '@vc/Fields/FormGroups/FormGroup.vue';
  import { computed, inject, nextTick, onMounted, onUnmounted, type PropType, ref, useSlots, watch } from 'vue';

  import type { FormulaData } from './FormulaData.mjs';
  import type { AutocompleteOption, EditorViewMode, FamiliarSchema, ValidationError } from './types.mts';
  import {
    getAutocompleteOptions,
    parseFormula,
    renderFormulaHTML,
    validateFormula,
  } from './utils.mjs';

  const slots = useSlots();

  // Use runtime props definition for better compatibility
  const props = defineProps({
    label: { type: String, default: undefined },
    hint: { type: String, default: undefined },
    isDmOnly: { type: Boolean, default: false },
    /** Formula string (legacy). When formulaData is provided, this is ignored. */
    value: { type: String, default: '' },
    onUpdate: { type: Function as PropType<(value: string) => void>, required: true },
    disabled: { type: Boolean, default: false },
    /** Explicit familiar contexts. When omitted, auto-derived from the store's document. */
    contexts: { type: Object as PropType<FamiliarSchema>, default: undefined },
    fieldPath: { type: String, required: true },
    defaultVisibility: { type: String as PropType<'everyone' | 'ownerPlus' | 'gmOnly'>, default: undefined },
    defaultEditability: { type: String as PropType<'normal' | 'gmOnly'>, default: undefined },
    /** FormulaData instance for formula/unidentified formula access. */
    formulaData: { type: Object as PropType<FormulaData | null>, default: undefined },
  });
  const { isEditViewMode, identifiedViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  // Effective formula — from FormulaData + viewMode, or legacy value prop
  const effectiveFormula = computed(() => {
    if (props.formulaData) {
      return props.formulaData.getEffectiveFormula(identifiedViewMode.value) || '';
    }
    return props.value || '';
  });

  // Effective contexts — explicit prop > store schema > FormulaData bindings > empty
  const contexts = computed((): FamiliarSchema => {
    if (props.contexts) {
      const raw = props.contexts;
      if (typeof raw === 'object' && '__v_isRef' in raw) {
        return (raw as any).value ?? {};
      }
      return raw;
    }
    if (sheetStore?.documentGetters?.familiarSchema?.value) {
      const schema = sheetStore.documentGetters.familiarSchema.value;
      if (Object.keys(schema).length > 0) return schema;
    }
    if (props.formulaData && Object.keys(props.formulaData.contextBindings ?? {}).length > 0) {
      return props.formulaData.buildFamiliarSchema();
    }
    return {};
  });

  // Refs
  const formulaInput = ref<HTMLInputElement>();
  const highlightLayer = ref<HTMLDivElement>();
  const autocompleteMenu = ref<HTMLDivElement>();

  // Local state
  const localValue = ref(effectiveFormula.value || '');
  const formulaErrors = ref<ValidationError[]>([]);
  const autocompleteOptions = ref<AutocompleteOption[]>([]);
  const showAutocomplete = ref(false);
  const autocompleteIndex = ref(0);
  const autocompletePosition = ref({ top: 0, left: 0 });

  // Track whether the user is actively editing to avoid feedback loops
  let isUserEditing = false;

  // Read isEditable from the store, with disabled prop as override
  const sheetStore = inject(DocumentSheetStoreSymbol, null) as DocumentSheetStore | null;
  const isEditable = computed(() => {
    if (props.disabled) return false;
    return isEditViewMode.value;
  });

  const formulaError = computed(() => {
    if (formulaErrors.value.length === 0) return '';
    return formulaErrors.value.map((e: ValidationError) => e.error).join('; ');
  });

  /** Auto-generate hint from context keys, e.g. "Available Contexts: [Self, Owner]" */
  const dynamicHint = computed(() => {
    if (props.hint) return props.hint;
    const keys = Object.keys(contexts.value);
    if (keys.length === 0) return '';
    const capitalized = keys.map(k => k.charAt(0).toUpperCase() + k.slice(1));
    return `Available Contexts: [${capitalized.join(', ')}]`;
  });

  /**
   * Highlighted HTML for the overlay layer.
   * Renders the formula with variable spans styled for syntax highlighting.
   * Plain text is escaped and rendered as-is so it aligns 1:1 with the input.
   */
  const highlightedHTML = computed(() => {
    const val = localValue.value;
    if (!val) return '';
    const tokens = parseFormula(val);
    const errors = validateFormula(val, contexts.value);
    return renderFormulaHTML(val, tokens, errors, contexts.value);
  });

  /**
   * Scroll the input so the cursor (at charIndex) is visible,
   * then sync the highlight layer.
   */
  function scrollToCursor(input: HTMLInputElement, charIndex: number) {
    // Measure text width up to the cursor
    const mirror = document.createElement('span');
    const style = window.getComputedStyle(input);
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.wordSpacing = style.wordSpacing;
    mirror.style.visibility = 'hidden';
    mirror.style.position = 'absolute';
    mirror.style.whiteSpace = 'pre';
    mirror.textContent = input.value.substring(0, charIndex);
    document.body.appendChild(mirror);
    const textWidth = mirror.offsetWidth;
    document.body.removeChild(mirror);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const inputWidth = input.clientWidth - paddingLeft - (parseFloat(style.paddingRight) || 0);

    // If cursor is past the visible area, scroll to reveal it
    if (textWidth - input.scrollLeft > inputWidth) {
      input.scrollLeft = textWidth - inputWidth + 4; // small buffer
    }
    syncScroll();
  }

  /** Sync scroll position between the real input and the highlight layer */
  function syncScroll() {
    if (formulaInput.value && highlightLayer.value) {
      highlightLayer.value.scrollLeft = formulaInput.value.scrollLeft;
    }
  }

  // Sync external value changes into local state (but not during active editing)
  watch(effectiveFormula, (newValue) => {
    if (!isUserEditing) {
      localValue.value = newValue || '';
      updateValidation();
    }
  });

  function updateValidation() {
    const errors = validateFormula(localValue.value, contexts.value);
    formulaErrors.value = errors;
  }

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    isUserEditing = true;
    localValue.value = value;
    updateValidation();
    nextTick(syncScroll);

    // Check for autocomplete trigger
    const caretPosition = target.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, caretPosition);

    if (textBeforeCursor.includes('#')) {
      updateAutocompleteMenu(value, caretPosition);
    } else {
      showAutocomplete.value = false;
    }
  }

  function onFocus() {
    isUserEditing = true;
  }

  function onBlur() {
    // Delay to allow autocomplete item clicks
    setTimeout(() => {
      showAutocomplete.value = false;
      autocompleteIndex.value = 0;

      // Persist the value on blur
      if (isUserEditing) {
        isUserEditing = false;
        commitValue();
      }
    }, 200);
  }

  function commitValue() {
    if (typeof props.onUpdate === 'function') {
      props.onUpdate(localValue.value);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    // Handle autocomplete navigation
    if (showAutocomplete.value && autocompleteOptions.value.length > 0) {
      switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        autocompleteIndex.value = (autocompleteIndex.value + 1) % autocompleteOptions.value.length;
        scrollAutocompleteIntoView();
        return;
      case 'ArrowUp':
        event.preventDefault();
        autocompleteIndex.value = (autocompleteIndex.value - 1 + autocompleteOptions.value.length) % autocompleteOptions.value.length;
        scrollAutocompleteIntoView();
        return;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        selectAutocomplete(autocompleteOptions.value[autocompleteIndex.value]);
        return;
      }
    }

    // Enter without autocomplete = commit
    if (event.key === 'Enter') {
      event.preventDefault();
      isUserEditing = false;
      commitValue();
      formulaInput.value?.blur();
      return;
    }

    // Escape = dismiss autocomplete or cancel editing
    if (event.key === 'Escape') {
      if (showAutocomplete.value) {
        showAutocomplete.value = false;
      } else {
        // Revert to prop value
        localValue.value = props.value || '';
        isUserEditing = false;
        formulaInput.value?.blur();
      }
      event.preventDefault();
    }
  }

  function scrollAutocompleteIntoView() {
    if (!autocompleteMenu.value) return;
    const items = autocompleteMenu.value.querySelectorAll('.autocomplete-item');
    const selectedItem = items[autocompleteIndex.value] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Measure the pixel offset of a character position inside an <input>,
   * accounting for font, padding, scroll, etc.
   */
  function measureTextOffset(input: HTMLInputElement, charIndex: number): number {
    const mirror = document.createElement('span');
    const style = window.getComputedStyle(input);
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.wordSpacing = style.wordSpacing;
    mirror.style.visibility = 'hidden';
    mirror.style.position = 'absolute';
    mirror.style.whiteSpace = 'pre';
    mirror.textContent = input.value.substring(0, charIndex);
    document.body.appendChild(mirror);
    const textWidth = mirror.offsetWidth;
    document.body.removeChild(mirror);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    return paddingLeft + textWidth - input.scrollLeft;
  }

  function updateAutocompleteMenu(formula: string, cursorPosition: number) {
    const beforeCursor = formula.substring(0, cursorPosition);
    const lastHashIndex = beforeCursor.lastIndexOf('#');

    if (lastHashIndex === -1) {
      showAutocomplete.value = false;
      return;
    }

    const partialVariable = beforeCursor.substring(lastHashIndex);
    const options = getAutocompleteOptions(partialVariable, contexts.value);

    autocompleteOptions.value = options;
    showAutocomplete.value = options.length > 0;
    autocompleteIndex.value = 0;

    // Position autocomplete anchored to the '#' or last '.' in the variable
    if (formulaInput.value) {
      const inputRect = formulaInput.value.getBoundingClientRect();
      const wrapperRect = formulaInput.value.closest('.formula-input-wrapper')?.getBoundingClientRect();
      if (wrapperRect) {
        // Find the anchor character: last '.' if present, otherwise the '#'
        const lastDotIndex = partialVariable.lastIndexOf('.');
        const anchorOffset = lastHashIndex + (lastDotIndex !== -1 ? lastDotIndex + 1 : 0);

        // Measure text width up to the anchor using a mirror span
        const anchorLeft = measureTextOffset(formulaInput.value, anchorOffset);

        autocompletePosition.value = {
          top: inputRect.bottom - wrapperRect.top + 2,
          left: anchorLeft,
        };
      }
    }
  }

  function selectAutocomplete(option: AutocompleteOption) {
    if (!formulaInput.value) return;

    const caretPos = formulaInput.value.selectionStart ?? localValue.value.length;
    const beforeCursor = localValue.value.substring(0, caretPos);
    const lastHashIndex = beforeCursor.lastIndexOf('#');

    if (lastHashIndex === -1) return;

    // Replace from # to cursor with the selected option
    const newValue = localValue.value.substring(0, lastHashIndex) + option.fullPath + localValue.value.substring(caretPos);
    localValue.value = newValue;

    updateValidation();

    // Restore cursor position after the inserted text
    const newCursorPos = lastHashIndex + option.fullPath.length;
    nextTick(() => {
      if (formulaInput.value) {
        formulaInput.value.value = newValue;
        formulaInput.value.setSelectionRange(newCursorPos, newCursorPos);
        formulaInput.value.focus();
        scrollToCursor(formulaInput.value, newCursorPos);
      }

      // If the selected option is a branch (context or object), immediately
      // show the next level of autocomplete options
      if (!option.isLeaf) {
        updateAutocompleteMenu(newValue, newCursorPos);
      } else {
        showAutocomplete.value = false;
      }
    });
  }

  function onAutocompleteItemClick(option: AutocompleteOption) {
    selectAutocomplete(option);
  }

  // Initialize
  onMounted(() => {
    localValue.value = effectiveFormula.value || '';
    updateValidation();
    if (isEditable.value && formulaInput.value) {
      nextTick(() => formulaInput.value?.focus());
    }
  });

  onUnmounted(() => {
    showAutocomplete.value = false;
  });
</script>

<style scoped lang="scss">
// Readonly slot content (sibling of .formula-form-group)
.formula-display {
  padding: 0.65rem;
  min-height: 2.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #d4d4d4;
  user-select: none;
  word-break: break-word;
  white-space: pre-wrap;

  &.has-error {
    background: rgba(255, 100, 100, 0.08);
    border-color: rgba(255, 100, 100, 0.25);
  }

  .error-indicator {
    display: inline-block;
    margin-right: 0.5rem;
    color: #ff6b6b;
    font-weight: bold;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .formula-result {
    &.error {
      color: #ff8b8b;
    }
  }
}

// Default slot content wrapper
.formula-form-group {
  .formula-input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .formula-edit-container {
    position: relative;
    width: 100%;
  }

  // Shared font metrics for perfect alignment between input and highlight layer
  %formula-font {
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .highlight-layer {
    @extend %formula-font;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0.65rem;
    border: 1px solid transparent; // match input border width for alignment
    box-sizing: border-box;
    pointer-events: none; // purely visual — input sits on top and handles all interaction
    white-space: pre;
    overflow: hidden;
    z-index: 1; // below input — colors show through input's transparent text
    color: #d4d4d4; // plain text visible — variables override with their own color

    :deep(.formula-variable) {
      background: rgba(102, 166, 255, 0.18);
      color: #66b3ff;
      border-radius: 2px;
      padding: 1px 0;

      &.is-error {
        background: rgba(255, 100, 100, 0.2);
        color: #ff9999;
        text-decoration: wavy underline rgba(255, 100, 100, 0.6);
        text-underline-offset: 3px;
      }

      &.is-warning {
        background: rgba(255, 200, 50, 0.15);
        color: #e6c44d;
        text-decoration: wavy underline rgba(255, 200, 50, 0.5);
        text-underline-offset: 3px;
      }

      // Nested spans for split highlighting (e.g. blue prefix + red/yellow suffix)
      .is-error {
        color: #ff9999;
        text-decoration: wavy underline rgba(255, 100, 100, 0.6);
        text-underline-offset: 3px;
      }

      .is-warning {
        color: #e6c44d;
        text-decoration: wavy underline rgba(255, 200, 50, 0.5);
        text-underline-offset: 3px;
      }
    }
  }

  .formula-input {
    @extend %formula-font;
    position: relative;
    z-index: 2; // on top of highlight layer — receives all mouse and keyboard events directly
    width: 100%;
    padding: 0.65rem;
    min-height: 2.5rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    background: transparent;
    color: transparent; // text invisible — highlight layer provides all coloring
    caret-color: #d4d4d4; // cursor remains visible
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &::placeholder {
      color: rgba(255, 255, 255, 0.25);
      font-style: italic;
    }

    &:focus {
      border-color: rgba(102, 166, 255, 0.6);
      box-shadow:
        0 0 0 3px rgba(102, 166, 255, 0.1),
        inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    &.has-error {
      border-color: rgba(255, 100, 100, 0.4);

      &:focus {
        border-color: rgba(255, 100, 100, 0.6);
        box-shadow:
          0 0 0 3px rgba(255, 100, 100, 0.1),
          inset 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }

    &::selection {
      background: rgba(102, 166, 255, 0.35);
      color: inherit;
    }
  }

  .autocomplete-menu {
    position: absolute;
    max-height: 180px;
    min-width: 140px;
    max-width: 320px;
    overflow-y: auto;
    border: 1px solid rgba(102, 166, 255, 0.3);
    background: rgba(30, 30, 30, 0.98);
    border-radius: 3px;
    backdrop-filter: blur(8px);
    z-index: 1000;
    font-size: 0.78rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    animation: autocompleteSlideUp 0.15s ease-out;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(102, 166, 255, 0.2);
      border-radius: 3px;

      &:hover {
        background: rgba(102, 166, 255, 0.4);
      }
    }

    .autocomplete-item {
      padding: 0.15rem 0.4rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.1s ease;
      line-height: 1.3;
      white-space: nowrap;

      &:last-child {
        border-bottom: none;
      }

      &:hover,
      &.is-selected {
        background: rgba(102, 166, 255, 0.15);
      }

      .option-path {
        font-weight: 500;
        color: #66b3ff;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .option-value {
        font-family: 'Courier New', monospace;
        font-size: 0.72rem;
        color: #b3b3b3;
        white-space: nowrap;

        &:first-of-type {
          color: #888;
          margin: 0 -0.5rem;
        }
      }

      .option-type {
        font-size: 0.68rem;
        color: #888;
        font-style: italic;
        white-space: nowrap;
      }
    }
  }

}

/* Animations */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

@keyframes autocompleteSlideUp {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
