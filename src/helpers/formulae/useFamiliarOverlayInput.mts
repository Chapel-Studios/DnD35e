import { nextTick } from 'vue';

import type { AutocompleteOption, FamiliarSchema } from './types.mjs';
import { measureTextareaCaretPosition, measureTextOffset, useFamiliar, type UseFamiliarOptions } from './useFamiliar.mjs';

export type OverlayInputElement = HTMLInputElement | HTMLTextAreaElement;

export interface OverlayAutocompleteArgs {
  text: string;
  context: FamiliarSchema;
  inputEl?: OverlayInputElement;
  wrapperEl?: HTMLElement | null;
  dropdownEl?: HTMLElement;
  anchorIndex: number;
  verticalGap?: number;
  appContainer?: HTMLElement | null;
  /** See `useFamiliar.mts`'s `updateOptions` — bypasses schema-driven resolution with a fixed list. */
  optionsOverride?: AutocompleteOption[];
}

export interface FamiliarOverlayInputApi {
  syncScroll: (inputEl?: OverlayInputElement, highlightEl?: HTMLElement) => void;
  handleNavigationKey: (
    event: KeyboardEvent,
    onSelect: (option: AutocompleteOption) => void,
    menuEl?: HTMLElement
  ) => boolean;
  updateAutocomplete: (args: OverlayAutocompleteArgs) => Promise<void>;
}

export function useFamiliarOverlayInput(options: UseFamiliarOptions = {}) {
  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    updateOptions,
    handleKeyDown,
    scrollSelectedIntoView,
    dismiss,
  } = useFamiliar(options);

  const familiarVerticalGapDefault = 2;
  let autocompleteRequestId = 0;

  const syncScroll = (inputEl?: OverlayInputElement, highlightEl?: HTMLElement): void => {
    if (!inputEl || !highlightEl) return;
    highlightEl.scrollLeft = inputEl.scrollLeft;
    highlightEl.scrollTop = inputEl.scrollTop;
  };

  const handleNavigationKey = (
    event: KeyboardEvent,
    onSelect: (option: AutocompleteOption) => void,
    menuEl?: HTMLElement
  ): boolean => {
    const result = handleKeyDown(event);
    if (!result.handled) return false;

    event.preventDefault();
    if (result.selectedOption) {
      onSelect(result.selectedOption);
    } else {
      scrollSelectedIntoView(menuEl);
    }
    return true;
  };

  const updateAutocomplete = async ({
    text,
    context,
    inputEl,
    wrapperEl,
    dropdownEl,
    anchorIndex,
    verticalGap = familiarVerticalGapDefault,
    appContainer,
    optionsOverride,
  }: OverlayAutocompleteArgs): Promise<void> => {
    if (!inputEl) return;

    const requestId = ++autocompleteRequestId;
    const inputRect = inputEl.getBoundingClientRect();
    const resolvedWrapper = wrapperEl ?? inputEl.closest('.familiar-overlay-wrapper') as HTMLElement | null;

    if (!resolvedWrapper) {
      updateOptions(text, { top: 0, left: 0 }, context, optionsOverride);
      return;
    }

    const wrapperRect = resolvedWrapper.getBoundingClientRect();
    const inputOffsetTop = inputRect.top - wrapperRect.top;
    const inputOffsetLeft = inputRect.left - wrapperRect.left;

    // Multiline (textarea): anchor to the caret's own row, since it can land on any line —
    // not just the bottom of the whole element like the single-line `<input>` case below.
    const isMultiline = inputEl instanceof HTMLTextAreaElement;
    const lineHeight = isMultiline
      ? (parseFloat(window.getComputedStyle(inputEl).lineHeight) || 0)
      : 0;
    const textareaCaret = isMultiline
      ? measureTextareaCaretPosition(inputEl, anchorIndex)
      : null;
    const caretBelowTop = textareaCaret
      ? inputOffsetTop + textareaCaret.top + lineHeight
      : inputRect.bottom - wrapperRect.top;
    // Both branches must be relative to the wrapper - measureTextOffset returns an
    // offset relative to the input's own left edge, so it needs inputOffsetLeft too.
    const anchorLeft = inputOffsetLeft + (textareaCaret
      ? textareaCaret.left
      : measureTextOffset(inputEl as HTMLInputElement, anchorIndex));

    const position = {
      top: caretBelowTop + verticalGap,
      left: anchorLeft,
    };

    updateOptions(text, position, context, optionsOverride);

    await nextTick();

    if (requestId !== autocompleteRequestId || !showFamiliar.value) return;

    const resolvedAppContainer = appContainer
      ?? (inputEl.closest('.window-content') ?? inputEl.closest('.vue-root')) as HTMLElement | null;
    if (!resolvedAppContainer || !showFamiliar.value) return;

    const appRect = resolvedAppContainer.getBoundingClientRect();
    const dropdownHeight = dropdownEl?.getBoundingClientRect().height ?? 0;
    if (!dropdownHeight) return;

    // Viewport Y bounds of the caret's own row (single-line: the whole input is "the row").
    const caretViewportBottom = wrapperRect.top + caretBelowTop;
    const caretViewportTop = isMultiline ? caretViewportBottom - lineHeight : inputRect.top;

    const spaceBelow = appRect.bottom - caretViewportBottom;
    const spaceAbove = caretViewportTop - appRect.top;

    if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
      familiarPosition.value = {
        top: caretViewportTop - wrapperRect.top - dropdownHeight - verticalGap,
        left: anchorLeft,
      };
    }
  };

  const api: FamiliarOverlayInputApi = {
    syncScroll,
    handleNavigationKey,
    updateAutocomplete,
  };

  return {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    dismissFamiliar: dismiss,
    ...api,
  };
}
