import { EditorViewMode, IDENTIFIED, UNIDENTIFIED } from '@helpers/formulae/types.mjs';
import type { ComputedRef } from 'vue';
import { computed, reactive } from 'vue';

type RenderModeStore = {
  isEditViewMode: ComputedRef<boolean>;
  identifiedViewMode: ComputedRef<EditorViewMode>;
  isIdentifiedViewMode: ComputedRef<boolean>;
  isOwnerOrGM: ComputedRef<boolean>;
  isGM: ComputedRef<boolean>;
  updateIdentifiedViewMode: (newValue?: EditorViewMode) => void;
  updateIsEditViewMode: (newValue?: boolean) => void;
  updateIsViewIdentified: (newValue?: boolean) => void;
  /** Set or update the header element reference and isEditable flag, then render buttons. */
  setHeaderElement: (header: Element, isEditable: boolean) => void;
  /** Force re-render of all header buttons. */
  renderHeaderButtons: (refreshTooltipFor?: 'editMode' | 'identifiedView') => void;
};

const useRenderModeStore = (
  isOwner: boolean,
  isIdentified: boolean = true,
  isIdentifiable: boolean = true,
  isEditMode: boolean = false
): RenderModeStore => {
  const state = reactive({
    isEditViewMode: isEditMode,
    identifiedViewMode: (!isIdentifiable || isIdentified) ? IDENTIFIED : UNIDENTIFIED,
    isIdentified,
    isOwner,
    isGM: game.user.isGM,
  });

  // Header button management — set via setHeaderElement after DOM is ready
  let headerElement: Element | null = null;
  let editable = false;
  
  const isGM = computed(() => {
    return game.user.isGM;
  });
  
  const isOwnerOrGM = computed(() => {
    return state.isOwner || isGM.value;
  });

  const isEditViewMode = computed(() => {
    return state.isEditViewMode;
  });

  const identifiedViewMode = computed(() => {
    return state.identifiedViewMode;
  });

  const isIdentifiedViewMode = computed(() => {
    return state.identifiedViewMode === IDENTIFIED;
  });

  // --- Header button rendering ---

  const renderEditModeButton = (refreshTooltip = false): void => {
    if (!headerElement) return;
    const existingBtn = headerElement.querySelector('.edit-mode-btn') as HTMLButtonElement | null;

    if (editable && !existingBtn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('header-control', 'icon', 'edit-mode-btn');
      btn.dataset.action = 'toggleEditMode';
      btn.dataset.tooltip = game.i18n.localize(state.isEditViewMode ? 'D35E.SheetModeEdit' : 'D35E.SheetModePlay');
      btn.dataset.tooltipDirection = 'DOWN';
      btn.setAttribute('aria-label', btn.dataset.tooltip);
      btn.innerHTML = `<i class="${state.isEditViewMode ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'}" inert></i>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateIsEditMode();
      });
      btn.addEventListener('dblclick', e => e.stopPropagation());
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      headerElement.prepend(btn);
    } else if (editable && existingBtn) {
      const icon = existingBtn.querySelector('i');
      if (icon) {
        icon.className = state.isEditViewMode ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock';
      }
      existingBtn.dataset.tooltip = game.i18n.localize(state.isEditViewMode ? 'D35E.SheetModeEdit' : 'D35E.SheetModePlay');
      existingBtn.setAttribute('aria-label', existingBtn.dataset.tooltip);
      if (refreshTooltip) {
        game.tooltip.deactivate();
        game.tooltip.activate(existingBtn, { text: existingBtn.dataset.tooltip, direction: 'DOWN' });
      }
    } else if (!editable && existingBtn) {
      existingBtn.remove();
    }
  };

  const renderIdentifiedViewButton = (refreshTooltip = false): void => {
    if (!headerElement) return;
    const shouldShow = isIdentifiable && game.user.isGM;
    const existingBtn = headerElement.querySelector('.identified-view-btn') as HTMLButtonElement | null;
    const isShowingIdentified = state.identifiedViewMode === IDENTIFIED;

    if (shouldShow && !existingBtn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('header-control', 'icon', 'identified-view-btn');
      btn.dataset.action = 'toggleIdentifiedView';
      btn.dataset.tooltip = game.i18n.localize(isShowingIdentified ? 'D35E.Identified' : 'D35E.Unidentified');
      btn.dataset.tooltipDirection = 'DOWN';
      btn.setAttribute('aria-label', btn.dataset.tooltip);
      btn.innerHTML = `<i class="${isShowingIdentified ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}" inert></i>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateIdentifiedMode();
      });
      btn.addEventListener('dblclick', e => e.stopPropagation());
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      headerElement.prepend(btn);
    } else if (shouldShow && existingBtn) {
      const icon = existingBtn.querySelector('i');
      if (icon) {
        icon.className = isShowingIdentified ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
      }
      existingBtn.dataset.tooltip = game.i18n.localize(isShowingIdentified ? 'D35E.Identified' : 'D35E.Unidentified');
      existingBtn.setAttribute('aria-label', existingBtn.dataset.tooltip);
      if (refreshTooltip) {
        game.tooltip.deactivate();
        game.tooltip.activate(existingBtn, { text: existingBtn.dataset.tooltip, direction: 'DOWN' });
      }
    } else if (!shouldShow && existingBtn) {
      existingBtn.remove();
    }
  };

  const renderHeaderButtons = (refreshTooltipFor?: 'editMode' | 'identifiedView'): void => {
    renderEditModeButton(refreshTooltipFor === 'editMode');
    renderIdentifiedViewButton(refreshTooltipFor === 'identifiedView');
  };

  const setHeaderElement = (header: Element, isEditable: boolean): void => {
    headerElement = header;
    editable = isEditable;
    renderHeaderButtons();
  };

  // --- State update methods ---
  
  const updateIdentifiedMode = (newValue?: EditorViewMode) => {
    if (!isIdentifiable) return; // Don't allow changing mode if not identifiable
    if (newValue === undefined) {
      newValue = state.identifiedViewMode === IDENTIFIED
        ? UNIDENTIFIED
        : IDENTIFIED;
    }

    if (state.identifiedViewMode !== newValue) {
      state.identifiedViewMode = newValue;
      renderHeaderButtons('identifiedView');
    }
  };

  // Toggle edit mode when called with no argument, otherwise set to the provided value
  const updateIsEditMode = (newValue?: boolean) => {
    if (newValue === undefined) {
      newValue = !state.isEditViewMode;
    }

    if (state.isEditViewMode !== newValue) {
      state.isEditViewMode = newValue;
      renderHeaderButtons('editMode');
    }
  };

  const updateIsIdentified = (newValue?: boolean) => {
    if (!isIdentifiable) return; // Don't allow changing mode if not identifiable
    if (newValue === undefined) {
      newValue = !state.isIdentified;
    }

    if (state.isIdentified !== newValue) {
      state.isIdentified = newValue;
    }
  };

  return {
    identifiedViewMode,
    isEditViewMode,
    isIdentifiedViewMode,
    updateIdentifiedViewMode: updateIdentifiedMode,
    updateIsEditViewMode: updateIsEditMode,
    updateIsViewIdentified: updateIsIdentified,
    isOwnerOrGM,
    isGM,
    setHeaderElement,
    renderHeaderButtons,
  };
};

const RenderModeStoreSymbol = Symbol('RenderModeStore');

export {
  RenderModeStoreSymbol,
  useRenderModeStore,
};

export type {
  RenderModeStore,
};