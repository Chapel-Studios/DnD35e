import { computed, type ComputedRef, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { FormulaResolver } from './FormulaResolver.mjs';
import type { AutocompleteOption, FamiliarSchema, ValidationError } from './types.mjs';
import { useFamiliarOverlayInput } from './useFamiliarOverlayInput.mjs';
import {
  canonicalizeFormula,
  localizeFormula,
  renderFormulaHTML,
} from './utils.mjs';

const { parseFormula, validateFormula, validateFormulaType } = FormulaResolver;

type FormulaEditorOptions = {
  contexts: ComputedRef<FamiliarSchema>;
  currentValue: ComputedRef<string>;
  getInputElement: () => HTMLInputElement | undefined;
  getHighlightElement: () => HTMLDivElement | undefined;
  getDropdownMenuElement: () => HTMLElement | undefined;
  onCommit: (canonicalValue: string) => void;
  focusOnMount?: () => boolean;
  /** When provided, a resolved value that doesn't match this type surfaces a validation error. */
  expectedType?: ComputedRef<'string' | 'number' | 'boolean' | undefined>;
};

export const useFormulaEditor = (options: FormulaEditorOptions) => {
  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    dismissFamiliar,
    handleNavigationKey,
    syncScroll: syncOverlayScroll,
    updateAutocomplete,
  } = useFamiliarOverlayInput();

  const localValue = ref('');
  const formulaErrors = ref<ValidationError[]>([]);
  // Tracks whether the field is currently being actively edited (focused/typed
  // in). Reactive so `highlightedHTML` can escalate still-typing (yellow)
  // states to definitive errors (red) once the user has moved on (blurred).
  const isFocused = ref(false);

  const highlightedHTML = computed(() => {
    const val = localValue.value;
    if (!val) return '';
    const tokens = parseFormula(val);
    const errors = validateFormula(val, options.contexts.value);
    return renderFormulaHTML(val, tokens, errors, options.contexts.value, isFocused.value);
  });

  const syncScroll = () => {
    syncOverlayScroll(options.getInputElement(), options.getHighlightElement());
  };

  const scrollToCursor = (input: HTMLInputElement, charIndex: number) => {
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

    if (textWidth - input.scrollLeft > inputWidth) {
      input.scrollLeft = textWidth - inputWidth + 4;
    }
    syncScroll();
  };

  const updateValidation = () => {
    const errors = validateFormula(localValue.value, options.contexts.value);
    const expectedType = options.expectedType?.value;
    const typeError = expectedType
      ? validateFormulaType(localValue.value, options.contexts.value, expectedType)
      : null;
    formulaErrors.value = typeError ? [...errors, typeError] : errors;
  };

  const updateAutocompleteMenu = (formula: string, cursorPosition: number) => {
    const beforeCursor = formula.substring(0, cursorPosition);

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
    const inputEl = options.getInputElement();
    if (!inputEl) return;

    const lastDotIndex = partialVariable.lastIndexOf('.');
    const anchorOffset = lastHashIndex + (lastDotIndex !== -1 ? lastDotIndex + 1 : 0);

    void updateAutocomplete({
      text: partialVariable,
      context: options.contexts.value,
      inputEl,
      wrapperEl: inputEl.closest('.formula-input-wrapper') as HTMLElement | null,
      anchorIndex: anchorOffset,
      verticalGap: 2,
      dropdownEl: options.getDropdownMenuElement(),
    });
  };

  const commitValue = () => {
    const canonical = canonicalizeFormula(localValue.value, options.contexts.value);
    if (canonical === (options.currentValue.value ?? '')) return;
    options.onCommit(canonical);
  };

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    isFocused.value = true;
    localValue.value = value;
    updateValidation();
    nextTick(syncScroll);

    const caretPosition = target.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, caretPosition);

    if (/(?<!\\)#/.test(textBeforeCursor)) {
      updateAutocompleteMenu(value, caretPosition);
    } else {
      dismissFamiliar();
    }
  };

  const onFocus = () => {
    isFocused.value = true;
  };

  const onBlur = () => {
    setTimeout(() => {
      dismissFamiliar();
      if (isFocused.value) {
        isFocused.value = false;
        commitValue();
      }
    }, 200);
  };

  const selectAutocomplete = (option: AutocompleteOption) => {
    const inputEl = options.getInputElement();
    if (!inputEl) return;

    const caretPos = inputEl.selectionStart ?? localValue.value.length;
    const beforeCursor = localValue.value.substring(0, caretPos);
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    if (lastHashIndex === -1) return;

    const newValue = localValue.value.substring(0, lastHashIndex) + option.fullPath + localValue.value.substring(caretPos);
    localValue.value = newValue;
    updateValidation();

    const newCursorPos = lastHashIndex + option.fullPath.length;
    nextTick(() => {
      const currentInput = options.getInputElement();
      if (currentInput) {
        currentInput.value = newValue;
        currentInput.setSelectionRange(newCursorPos, newCursorPos);
        currentInput.focus();
        scrollToCursor(currentInput, newCursorPos);
      }

      if (!option.isLeaf) {
        updateAutocompleteMenu(newValue, newCursorPos);
      } else {
        dismissFamiliar();
      }
    });
  };

  const onFamiliarSelect = (option: AutocompleteOption) => {
    selectAutocomplete(option);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (handleNavigationKey(event, selectAutocomplete, options.getDropdownMenuElement())) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      isFocused.value = false;
      commitValue();
      options.getInputElement()?.blur();
      return;
    }

    if (event.key === 'Escape') {
      localValue.value = localizeFormula(options.currentValue.value || '', options.contexts.value);
      isFocused.value = false;
      options.getInputElement()?.blur();
      event.preventDefault();
    }
  };

  watch(options.currentValue, (newValue) => {
    if (!isFocused.value) {
      localValue.value = localizeFormula(newValue || '', options.contexts.value);
      updateValidation();
    }
  });

  watch(options.contexts, (newContexts, oldContexts) => {
    if (!isFocused.value) {
      const oldLocalized = localizeFormula(options.currentValue.value || '', oldContexts);
      if (localValue.value === oldLocalized) {
        localValue.value = localizeFormula(options.currentValue.value || '', newContexts);
      }
      updateValidation();
    }
  });

  onMounted(() => {
    localValue.value = localizeFormula(options.currentValue.value || '', options.contexts.value);
    updateValidation();
    if (options.focusOnMount?.() && options.getInputElement()) {
      nextTick(() => options.getInputElement()?.focus());
    }
  });

  onUnmounted(() => {
    isFocused.value = false;
    dismissFamiliar();
  });

  return {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    localValue,
    formulaErrors,
    highlightedHTML,
    syncScroll,
    onInput,
    onBlur,
    onKeyDown,
    onFocus,
    onFamiliarSelect,
  };
};
