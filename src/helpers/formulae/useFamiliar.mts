import { type Ref, ref } from 'vue';

import type { AutocompleteOption, FamiliarSchema } from './types.mjs';
import { getAutocompleteOptions, type GetAutocompleteOptionsConfig } from './utils.mjs';

export interface UseFamiliarOptions {
  /** Override fullPath formatting for autocomplete options */
  formatFullPath?: GetAutocompleteOptionsConfig['formatFullPath'];
}

export interface FamiliarKeyDownResult {
  /** Whether the key event was handled by the Familiar (caller should preventDefault) */
  handled: boolean;
  /** If Enter/Tab was pressed and an option was selected, returns it */
  selectedOption?: AutocompleteOption;
}

/**
 * Composable that manages the FormulaFamiliar's autocomplete state.
 * Trigger-agnostic — callers decide when to invoke `updateOptions()`.
 * Used by FormulaFormGroup (triggered on `#`) and AspectPicker (triggered on every keystroke).
 */
export function useFamiliar(options: UseFamiliarOptions = {}) {
  const familiarOptions: Ref<AutocompleteOption[]> = ref([]);
  const showFamiliar = ref(false);
  const familiarIndex = ref(0);
  const familiarPosition = ref({ top: 0, left: 0 });

  /**
   * Update the Familiar's autocomplete options based on current text and position.
   * @param text - The partial text to match (e.g., `#self.hard` or `item.hard`)
   * @param position - Where to position the dropdown `{ top, left }` relative to the wrapper
   * @param context - The FamiliarSchema to search within
   * @param optionsOverride - When provided, used verbatim instead of resolving `text`
   *   against `context` — used by the `$`-function name dropdown (poc §7.2b), whose fixed
   *   option list isn't schema-driven.
   */
  function updateOptions(
    text: string,
    position: { top: number; left: number },
    context: FamiliarSchema,
    optionsOverride?: AutocompleteOption[]
  ): void {
    const config: GetAutocompleteOptionsConfig = {};
    if (options.formatFullPath) {
      config.formatFullPath = options.formatFullPath;
    }

    const results = optionsOverride ?? getAutocompleteOptions(text, context, config);
    familiarOptions.value = results;
    showFamiliar.value = results.length > 0;
    familiarIndex.value = 0;
    familiarPosition.value = position;
  }

  /**
   * Handle keyboard events for Familiar navigation.
   * Returns whether the event was consumed and any selected option.
   */
  function handleKeyDown(event: KeyboardEvent): FamiliarKeyDownResult {
    if (!showFamiliar.value || familiarOptions.value.length === 0) {
      return { handled: false };
    }

    switch (event.key) {
      case 'ArrowDown':
        familiarIndex.value = (familiarIndex.value + 1) % familiarOptions.value.length;
        return { handled: true };

      case 'ArrowUp':
        familiarIndex.value = (familiarIndex.value - 1 + familiarOptions.value.length) % familiarOptions.value.length;
        return { handled: true };

      case 'Enter':
      case 'Tab':
        return {
          handled: true,
          selectedOption: familiarOptions.value[familiarIndex.value],
        };

      case 'Escape':
        dismiss();
        return { handled: true };

      default:
        return { handled: false };
    }
  }

  /**
   * Scroll the currently selected item into view within the dropdown menu.
   * @param menuEl - The dropdown's root DOM element
   */
  function scrollSelectedIntoView(menuEl: HTMLElement | undefined): void {
    if (!menuEl) return;
    const items = menuEl.querySelectorAll('.familiar-item');
    const selectedItem = items[familiarIndex.value] as HTMLElement | undefined;
    selectedItem?.scrollIntoView({ block: 'nearest' });
  }

  /** Hide the Familiar and reset selection index. */
  function dismiss(): void {
    showFamiliar.value = false;
    familiarIndex.value = 0;
  }

  return {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    updateOptions,
    handleKeyDown,
    scrollSelectedIntoView,
    dismiss,
  };
}

/**
 * Measure the pixel offset of a character position inside an `<input>`,
 * accounting for font, padding, and scroll.
 */
export function measureTextOffset(input: HTMLInputElement, charIndex: number): number {
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
/**
 * Measure the on-screen `{top, left}` of a character position inside a `<textarea>`,
 * relative to the textarea's own top-left corner. Unlike `measureTextOffset` (single-line,
 * horizontal-only), wrapping/multiple lines mean the caret can land on any row — this
 * mirrors the textarea's exact box model (width, padding, font, line-height,
 * `white-space: pre-wrap`) in a hidden div, inserts a marker at the caret position, and
 * reads the marker's offset. Used to position the autocomplete dropdown in the
 * multiline formula editor (poc §7.10).
 */
export function measureTextareaCaretPosition(
  textarea: HTMLTextAreaElement,
  charIndex: number
): { top: number; left: number } {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflowWrap = 'break-word';

  const propsToCopy = [
    'font', 'letterSpacing', 'wordSpacing', 'lineHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing',
  ] as const;
  for (const prop of propsToCopy) mirror.style[prop] = style[prop];
  mirror.style.width = `${textarea.clientWidth}px`;

  mirror.textContent = textarea.value.substring(0, charIndex);
  const marker = document.createElement('span');
  marker.textContent = '\u200b'; // zero-width space — a real node to measure the caret's position
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  document.body.removeChild(mirror);

  return { top, left };
}