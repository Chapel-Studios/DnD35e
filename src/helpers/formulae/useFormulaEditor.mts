import { computed, type ComputedRef, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { FormulaResolver } from './FormulaResolver.mjs';
import { resolveItAutocompleteContext } from './itContext.mjs';
import type { AutocompleteOption, FamiliarSchema, ValidationError } from './types.mjs';
import type { OverlayInputElement } from './useFamiliarOverlayInput.mjs';
import { useFamiliarOverlayInput } from './useFamiliarOverlayInput.mjs';
import {
  canonicalizeFormula,
  collapseFormulaLineBreaks,
  getFunctionAutocompleteOptions,
  localizeFormula,
  renderFormulaHTML,
} from './utils.mjs';

const { parseFormula, validateFormula, validateFormulaType } = FormulaResolver;

/** Index of the last unescaped occurrence of `char` in `text` before `text.length`, or -1. */
function findLastUnescapedIndex(text: string, char: string): number {
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === char && (i === 0 || text[i - 1] !== '\\')) return i;
  }
  return -1;
}

type FormulaEditorOptions = {
  contexts: ComputedRef<FamiliarSchema>;
  currentValue: ComputedRef<string>;
  getInputElement: () => OverlayInputElement | undefined;
  getHighlightElement: () => HTMLDivElement | undefined;
  getDropdownMenuElement: () => HTMLElement | undefined;
  onCommit: (canonicalValue: string) => void;
  focusOnMount?: () => boolean;
  /** When provided, a resolved value that doesn't match this type surfaces a validation error. */
  expectedType?: ComputedRef<'string' | 'number' | 'boolean' | undefined>;
  /**
   * Multiline (textarea, poc §7.10 advanced editor modal) mode: `Enter` inserts a real
   * newline instead of committing, and the at-rest display never collapses line
   * breaks (that collapse is single-line-field-only, so a multiline formula still
   * renders sensibly in the plain `FormulaFormGroup` input at rest).
   */
  multiline?: boolean;
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
  // Single-line mode only: whether the user actually typed since the last focus
  // (vs. just tabbing/clicking through without editing) — see `commitNow`.
  let editedSinceFocus = false;

  const highlightedHTML = computed(() => {
    const val = localValue.value;
    if (!val) return '';
    const tokens = parseFormula(val);
    const errors = validateFormula(val, options.contexts.value, isFocused.value);
    return renderFormulaHTML(val, tokens, errors, options.contexts.value, isFocused.value);
  });

  const syncScroll = () => {
    syncOverlayScroll(options.getInputElement(), options.getHighlightElement());
  };

  /** Localized real (uncollapsed) current value, per `options.currentValue`/`options.contexts`. */
  const getLocalizedCurrent = () => localizeFormula(options.currentValue.value || '', options.contexts.value);

  /**
   * At-rest display value for the single-line field (default mode): collapses real
   * line breaks so a multiline formula (authored via the advanced editor modal)
   * doesn't render broken in a plain `<input>`. Multiline mode never collapses.
   */
  const toDisplayValue = (real: string) => (options.multiline ? real : collapseFormulaLineBreaks(real));

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
    const errors = validateFormula(localValue.value, options.contexts.value, isFocused.value);
    const expectedType = options.expectedType?.value;
    const typeError = expectedType
      ? validateFormulaType(localValue.value, options.contexts.value, expectedType)
      : null;
    formulaErrors.value = typeError ? [...errors, typeError] : errors;
  };

  const updateAutocompleteMenu = (formula: string, cursorPosition: number) => {
    const beforeCursor = formula.substring(0, cursorPosition);

    const lastHashIndex = findLastUnescapedIndex(beforeCursor, '#');

    if (lastHashIndex === -1) {
      dismissFamiliar();
      return;
    }

    const partialVariable = beforeCursor.substring(lastHashIndex);
    const inputEl = options.getInputElement();
    if (!inputEl) return;

    const lastDotIndex = partialVariable.lastIndexOf('.');
    const anchorOffset = lastHashIndex + (lastDotIndex !== -1 ? lastDotIndex + 1 : 0);

    // While the caret sits inside an open $contains/$find/$any/$count(...) call's
    // predicate argument, `#it` temporarily becomes a valid autocomplete context
    // scoped to that array field's object-element schema (poc §7.2b).
    const itContext = resolveItAutocompleteContext(formula, cursorPosition, options.contexts.value);
    const effectiveContext = itContext
      ? { ...options.contexts.value, it: itContext }
      : options.contexts.value;

    void updateAutocomplete({
      text: partialVariable,
      context: effectiveContext,
      inputEl,
      wrapperEl: inputEl.closest('.formula-input-wrapper') as HTMLElement | null,
      anchorIndex: anchorOffset,
      verticalGap: 2,
      dropdownEl: options.getDropdownMenuElement(),
    });
  };

  /**
   * `$`-function name dropdown (poc §7.2b) — a sibling to `updateAutocompleteMenu`'s `#`
   * context dropdown, but for the fixed `contains`/`find`/`any`/`count`/`stringContains`
   * keyword set instead of schema-driven properties. Only called while the text
   * between the last unescaped `$` and the caret is still a bare partial keyword
   * (no `(` typed yet) — see `onInput`.
   */
  const updateFunctionAutocompleteMenu = (dollarIndex: number, cursorPosition: number) => {
    const partial = localValue.value.substring(dollarIndex + 1, cursorPosition);
    const optionsOverride = getFunctionAutocompleteOptions(partial);
    if (optionsOverride.length === 0) {
      dismissFamiliar();
      return;
    }

    const inputEl = options.getInputElement();
    if (!inputEl) return;

    void updateAutocomplete({
      text: partial,
      context: options.contexts.value,
      inputEl,
      wrapperEl: inputEl.closest('.formula-input-wrapper') as HTMLElement | null,
      anchorIndex: dollarIndex,
      verticalGap: 2,
      dropdownEl: options.getDropdownMenuElement(),
      optionsOverride,
    });
  };

  const commitValue = () => {
    const canonical = canonicalizeFormula(localValue.value, options.contexts.value);
    if (canonical === (options.currentValue.value ?? '')) return;
    options.onCommit(canonical);
  };

  const onInput = (event: Event) => {
    const target = event.target as OverlayInputElement;
    const value = target.value;

    isFocused.value = true;
    editedSinceFocus = true;
    localValue.value = value;
    updateValidation();
    nextTick(syncScroll);

    const caretPosition = target.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, caretPosition);

    // A `$` more recent than the last `#` triggers the function-name dropdown
    // instead — but only while nothing but bare letters have been typed after
    // it (a still-in-progress keyword, e.g. `$`, `$c`, `$contains`). Once `(`
    // (or anything else) follows, the user has moved on to the call's argument
    // — that argument is typically a `#`-context reference, which falls through
    // to the normal `#` dropdown below on the next keystroke.
    const lastHashIndex = findLastUnescapedIndex(textBeforeCursor, '#');
    const lastDollarIndex = findLastUnescapedIndex(textBeforeCursor, '$');
    const dollarPartial = lastDollarIndex !== -1 ? textBeforeCursor.substring(lastDollarIndex + 1) : '';

    if (lastDollarIndex > lastHashIndex && /^[A-Za-z]*$/.test(dollarPartial)) {
      updateFunctionAutocompleteMenu(lastDollarIndex, caretPosition);
    } else if (lastHashIndex !== -1) {
      updateAutocompleteMenu(value, caretPosition);
    } else {
      dismissFamiliar();
    }
  };

  const onFocus = () => {
    isFocused.value = true;
    editedSinceFocus = false;
  };

  /**
   * Commit + settle display state. Also called directly by the multiline editor
   * modal (poc §7.10) on close (Done/backdrop/Escape) so a pending edit is
   * guaranteed to commit before the modal (and this composable instance) unmounts.
   */
  const commitNow = () => {
    dismissFamiliar();
    if (isFocused.value) {
      isFocused.value = false;
      // Single-line mode's at-rest display collapses real line breaks to a single
      // space (a native `<input>` can't hold a literal newline anyway, so there's
      // no "real" uncollapsed value to show while focused). That means comparing
      // the collapsed `localValue` against the real `currentValue` would always
      // differ for a multiline formula, firing a spurious flatten-commit on every
      // benign (edit-free) blur — only commit when the user actually typed.
      if (options.multiline || editedSinceFocus) {
        commitValue();
      }
      // `validateFormula`'s generic unbalanced-parens check is suppressed while
      // focused (see its JSDoc) — re-validate now that focus has dropped so a
      // formula left genuinely malformed at blur surfaces its error immediately,
      // rather than waiting on the `currentValue` watch below (which only fires
      // if the commit above actually changed the document's stored value).
      updateValidation();
    }
    if (!options.multiline) {
      localValue.value = toDisplayValue(localValue.value);
    }
  };

  // A dropdown-option click never actually blurs the input in the first place —
  // `FamiliarDropdown.vue` guards its options with `@mousedown.prevent` — so this
  // can commit immediately rather than deferring (a deferred commit could otherwise
  // fire after the row it belongs to has already been deleted elsewhere in the UI).
  const onBlur = commitNow;

  const selectAutocomplete = (option: AutocompleteOption) => {
    const inputEl = options.getInputElement();
    if (!inputEl) return;

    const caretPos = inputEl.selectionStart ?? localValue.value.length;
    const beforeCursor = localValue.value.substring(0, caretPos);
    // Function-name options (poc §7.2b) carry an explicit `trigger` (`when`/`else` insert
    // bare, with no `$` sigil, so it can't be inferred from `fullPath`'s leading character
    // like every other option can); every other option is a `#`-context path.
    const triggerChar = option.trigger ?? (option.fullPath.startsWith('$') ? '$' : '#');
    const lastTriggerIndex = beforeCursor.lastIndexOf(triggerChar);
    if (lastTriggerIndex === -1) return;

    const newValue = localValue.value.substring(0, lastTriggerIndex) + option.fullPath + localValue.value.substring(caretPos);
    localValue.value = newValue;
    updateValidation();

    const newCursorPos = lastTriggerIndex + option.fullPath.length;
    nextTick(() => {
      const currentInput = options.getInputElement();
      if (currentInput) {
        currentInput.value = newValue;
        currentInput.setSelectionRange(newCursorPos, newCursorPos);
        currentInput.focus();
        if (currentInput instanceof HTMLInputElement) {
          scrollToCursor(currentInput, newCursorPos);
        } else {
          syncScroll();
        }
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
      // Multiline mode: let Enter insert a real newline (unless the autocomplete
      // dropdown intercepted it above); commit happens on blur/close instead.
      if (options.multiline) return;

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
      localValue.value = toDisplayValue(localizeFormula(newValue || '', options.contexts.value));
      updateValidation();
    }
  });

  watch(options.contexts, (newContexts, oldContexts) => {
    if (!isFocused.value) {
      const oldLocalized = toDisplayValue(localizeFormula(options.currentValue.value || '', oldContexts));
      if (localValue.value === oldLocalized) {
        localValue.value = toDisplayValue(localizeFormula(options.currentValue.value || '', newContexts));
      }
      updateValidation();
    }
  });

  onMounted(() => {
    localValue.value = toDisplayValue(getLocalizedCurrent());
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
    commitNow,
  };
};
