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
        <FamiliarDropdown
          ref="familiarDropdownRef"
          :show="showFamiliar"
          :options="familiarOptions"
          :selected-index="familiarIndex"
          :position="familiarPosition"
          @select="onFamiliarSelect"
        />
      </div>
    </div>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
  import type { RenderModeStore } from '@ec/CoreMixin/sheet/stores/RenderModeStore.mjs';
  import { RenderModeStoreSymbol } from '@ec/CoreMixin/sheet/stores/RenderModeStore.mjs';
  import FamiliarDropdown from '@vc/FamiliarDropdown.vue';
  import FormGroup from '@vc/Fields/FormGroups/FormGroup.vue';
  import { computed, inject, nextTick, onMounted, onUnmounted, type PropType, ref, useSlots, watch } from 'vue';

  import type { FormulaData } from './FormulaData.mjs';
  import type { FormulaField } from './FormulaField.mjs';
  import type { AutocompleteOption, FamiliarSchema, ValidationError } from './types.mts';
  import { measureTextOffset, useFamiliar } from './useFamiliar.mjs';
  import {
    filterExcludedFields,
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
  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  // Effective formula — from FormulaData, or legacy value prop
  const effectiveFormula = computed(() => {
    if (props.formulaData) {
      return props.formulaData.formula || '';
    }
    return props.value || '';
  });

  // Resolve the FormulaField schema entry for this field path to read excludedFields
  // If the field is wrapped in Dnd35eField, navigate to the inner FormulaField via .fields.value
  const formulaField = computed((): FormulaField | undefined => {
    const doc = (sheetStore as any)?.document?.value;
    if (!doc?.system?.schema?.fields) return undefined;
    // fieldPath is e.g. 'system.nameFormula' — strip 'system.' prefix to get the schema key
    const schemaKey = props.fieldPath.startsWith('system.') ? props.fieldPath.slice(7) : props.fieldPath;
    const field = doc.system.schema.fields[schemaKey];
    // Unwrap Dnd35eField compound if present (isFamiliarField marker)
    if ((field?.constructor as any)?.isFamiliarField && field?.fields?.value) {
      return field.fields.value as FormulaField;
    }
    return field as FormulaField | undefined;
  });

  // Effective contexts — explicit prop > store schema > FormulaData bindings > empty
  // Then filter out excludedFields declared on the FormulaField.
  const contexts = computed((): FamiliarSchema => {
    let schema: FamiliarSchema = {};
    if (props.contexts) {
      const raw = props.contexts;
      if (typeof raw === 'object' && '__v_isRef' in raw) {
        schema = (raw as any).value ?? {};
      } else {
        schema = raw;
      }
    } else if (sheetStore?.documentGetters?.familiarSchema?.value) {
      const storeSchema = sheetStore.documentGetters.familiarSchema.value;
      if (Object.keys(storeSchema).length > 0) schema = storeSchema;
    }

    const excluded = formulaField.value?.excludedFields ?? [];
    return filterExcludedFields(schema, excluded);
  });

  // Refs
  const formulaInput = ref<HTMLInputElement>();
  const highlightLayer = ref<HTMLDivElement>();
  const familiarDropdownRef = ref<InstanceType<typeof FamiliarDropdown>>();

  // Familiar composable — manages autocomplete state, keyboard nav, positioning
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

  // Local state
  const localValue = ref(effectiveFormula.value || '');
  const formulaErrors = ref<ValidationError[]>([]);

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

    // Check for autocomplete trigger (ignore escaped \#)
    const caretPosition = target.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, caretPosition);

    if (/(?<!\\)#/.test(textBeforeCursor)) {
      updateAutocompleteMenu(value, caretPosition);
    } else {
      dismissFamiliar();
    }
  }

  function onFocus() {
    isUserEditing = true;
  }

  function onBlur() {
    // Delay to allow autocomplete item clicks
    setTimeout(() => {
      dismissFamiliar();

      // Persist the value on blur
      if (isUserEditing) {
        isUserEditing = false;
        commitValue();
      }
    }, 200);
  }

  function commitValue() {
    if (typeof props.onUpdate === 'function') {
      // Only persist if the value actually changed from the source
      const current = effectiveFormula.value || '';
      if (localValue.value !== current) {
        props.onUpdate(localValue.value);
      }
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    // Delegate autocomplete navigation to the Familiar composable
    const result = handleFamiliarKeyDown(event);
    if (result.handled) {
      event.preventDefault();
      if (result.selectedOption) {
        selectAutocomplete(result.selectedOption);
      } else {
        // Arrow key nav — scroll the selected item into view
        scrollSelectedIntoView(familiarDropdownRef.value?.menuRef);
      }
      return;
    }

    // Enter without autocomplete = commit
    if (event.key === 'Enter') {
      event.preventDefault();
      isUserEditing = false;
      commitValue();
      formulaInput.value?.blur();
      return;
    }

    // Escape = cancel editing (Familiar already handled its own Escape above)
    if (event.key === 'Escape') {
      // Revert to prop value
      localValue.value = props.value || '';
      isUserEditing = false;
      formulaInput.value?.blur();
      event.preventDefault();
    }
  }

  function updateAutocompleteMenu(formula: string, cursorPosition: number) {
    const beforeCursor = formula.substring(0, cursorPosition);

    // Find the last unescaped '#' (not preceded by \)
    let lastHashIndex = -1;
    for (let i = beforeCursor.length - 1; i >= 0; i--) {
      if (beforeCursor[i] === '#' && (i === 0 || beforeCursor[i - 1] !== '\\')) {
        lastHashIndex = i;
        break;
      }
    }

    if (lastHashIndex === -1) {
      dismissFamiliar();
      return;
    }

    const partialVariable = beforeCursor.substring(lastHashIndex);

    // Compute dropdown position anchored to the '#' or last '.' in the variable
    let position = { top: 0, left: 0 };
    if (formulaInput.value) {
      const inputRect = formulaInput.value.getBoundingClientRect();
      const wrapperRect = formulaInput.value.closest('.formula-input-wrapper')?.getBoundingClientRect();
      if (wrapperRect) {
        const lastDotIndex = partialVariable.lastIndexOf('.');
        const anchorOffset = lastHashIndex + (lastDotIndex !== -1 ? lastDotIndex + 1 : 0);
        const anchorLeft = measureTextOffset(formulaInput.value, anchorOffset);
        position = {
          top: inputRect.bottom - wrapperRect.top + 2,
          left: anchorLeft,
        };
      }
    }

    updateFamiliarOptions(partialVariable, position, contexts.value);
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
        dismissFamiliar();
      }
    });
  }

  function onFamiliarSelect(option: AutocompleteOption) {
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
    isUserEditing = false;
    dismissFamiliar();
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

}

/* Animations */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>
