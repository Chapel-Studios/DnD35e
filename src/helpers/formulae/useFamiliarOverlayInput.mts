import { nextTick } from 'vue';

import type { AutocompleteOption, FamiliarSchema } from './types.mjs';
import { measureTextOffset, useFamiliar,type UseFamiliarOptions } from './useFamiliar.mjs';

export interface OverlayAutocompleteArgs {
  text: string;
  context: FamiliarSchema;
  inputEl?: HTMLInputElement;
  wrapperEl?: HTMLElement | null;
  dropdownEl?: HTMLElement;
  anchorIndex: number;
  verticalGap?: number;
  appContainer?: HTMLElement | null;
}

export interface FamiliarOverlayInputApi {
  syncScroll: (inputEl?: HTMLInputElement, highlightEl?: HTMLElement) => void;
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

  const syncScroll = (inputEl?: HTMLInputElement, highlightEl?: HTMLElement): void => {
    if (!inputEl || !highlightEl) return;
    highlightEl.scrollLeft = inputEl.scrollLeft;
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
  }: OverlayAutocompleteArgs): Promise<void> => {
    if (!inputEl) return;

    const requestId = ++autocompleteRequestId;
    const inputRect = inputEl.getBoundingClientRect();
    const resolvedWrapper = wrapperEl ?? inputEl.closest('.familiar-overlay-wrapper') as HTMLElement | null;

    if (!resolvedWrapper) {
      updateOptions(text, { top: 0, left: 0 }, context);
      return;
    }

    const wrapperRect = resolvedWrapper.getBoundingClientRect();
    const anchorLeft = measureTextOffset(inputEl, anchorIndex);

    const position = {
      top: inputRect.bottom - wrapperRect.top + verticalGap,
      left: anchorLeft,
    };

    updateOptions(text, position, context);

    await nextTick();

    if (requestId !== autocompleteRequestId || !showFamiliar.value) return;

    const resolvedAppContainer = appContainer
      ?? (inputEl.closest('.window-content') ?? inputEl.closest('.vue-root')) as HTMLElement | null;
    if (!resolvedAppContainer || !showFamiliar.value) return;

    const appRect = resolvedAppContainer.getBoundingClientRect();
    const dropdownHeight = dropdownEl?.getBoundingClientRect().height ?? 0;
    if (!dropdownHeight) return;

    const spaceBelow = appRect.bottom - inputRect.bottom;
    const spaceAbove = inputRect.top - appRect.top;

    if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
      familiarPosition.value = {
        top: inputRect.top - wrapperRect.top - dropdownHeight - verticalGap,
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
