import type { ViewMode } from '@helpers/formulae/types.mjs';
import { EDIT, PLAY, TRUE } from '@helpers/formulae/types.mjs';
import type { ComputedRef } from 'vue';
import { computed, reactive } from 'vue';

type RenderModeStore = {
  viewMode: ComputedRef<ViewMode>;
  isEditMode: ComputedRef<boolean>;
  isPlayMode: ComputedRef<boolean>;
  isTrueMode: ComputedRef<boolean>;
  isOwnerOrGM: ComputedRef<boolean>;
  isSheetEditable: ComputedRef<boolean>;
  isGM: ComputedRef<boolean>;
  hasSecrets: ComputedRef<boolean>;
  setHasSecrets: (hasSecrets: boolean) => void;
  setViewMode: (newMode: ViewMode) => void;
  setSheetEditable: (isEditable: boolean) => void;
  /** Set or update the header element reference and isEditable flag, then render the view mode bar. */
  setHeaderElement: (header: Element, isEditable: boolean) => void;
  /** Force re-render of the view mode bar. */
  renderViewModeBar: () => void;
};

const useRenderModeStore = (
  isOwner: boolean,
  hasSecrets: boolean = false,
  initialMode: ViewMode = PLAY,
  initialEditable = false
): RenderModeStore => {
  const state = reactive({
    viewMode: initialMode === EDIT && !initialEditable
      ? PLAY
      : initialMode,
    isSheetEditable: initialEditable,
    isOwner,
    isGM: game.user.isGM,
    hasSecrets,
  });

  // Header button management — set via setHeaderElement after DOM is ready
  let headerElement: Element | null = null;
  const isSheetEditable = computed(() => state.isSheetEditable);

  const isGM = computed(() => {
    return game.user.isGM;
  });

  const hasSecretsRef = computed(() => {
    return state.hasSecrets;
  });

  const isOwnerOrGM = computed(() => {
    return state.isOwner || isGM.value;
  });

  const viewMode = computed(() => {
    return state.viewMode;
  });

  const isEditMode = computed(() => {
    return state.viewMode === EDIT;
  });

  const isPlayMode = computed(() => {
    return state.viewMode === PLAY;
  });

  const isTrueMode = computed(() => {
    return state.viewMode === TRUE;
  });

  // --- View mode bar rendering ---

  const VIEW_MODE_BUTTONS: Array<{
    mode: ViewMode;
    icon: string;
    tooltipKey: string;
    /** Show only when these conditions are met */
    visible: () => boolean;
  }> = [
    {
      mode: PLAY,
      icon: 'fa-solid fa-dice-d20',
      tooltipKey: 'dnd35e.COMMON.SheetModePlay',
      visible: () => true,
    },
    {
      mode: TRUE,
      icon: 'fa-solid fa-eye',
      tooltipKey: 'dnd35e.COMMON.SheetModeTrue',
      visible: () => state.hasSecrets && game.user.isGM,
    },
    {
      mode: EDIT,
      icon: 'fa-solid fa-pen-to-square',
      tooltipKey: 'dnd35e.COMMON.SheetModeEdit',
      visible: () => state.isSheetEditable,
    },
  ];

  const renderViewModeBar = (): void => {
    if (!headerElement) return;

    let bar = headerElement.querySelector('.view-mode-bar') as HTMLElement | null;

    if (!bar) {
      bar = document.createElement('div');
      bar.classList.add('view-mode-bar');
      bar.addEventListener('dblclick', e => e.stopPropagation());
      bar.addEventListener('pointerdown', e => e.stopPropagation());
      headerElement.prepend(bar);
    }

    // Rebuild buttons
    bar.innerHTML = '';

    for (const def of VIEW_MODE_BUTTONS) {
      if (!def.visible()) continue;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('view-mode-btn');
      if (state.viewMode === def.mode) btn.classList.add('active');
      btn.dataset.tooltip = game.i18n.localize(def.tooltipKey);
      btn.dataset.tooltipDirection = 'DOWN';
      btn.setAttribute('aria-label', btn.dataset.tooltip);
      btn.innerHTML = `<i class="${def.icon}" inert></i>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setViewMode(def.mode);
      });
      bar.appendChild(btn);
    }
  };

  const setSheetEditable = (isEditable: boolean): void => {
    state.isSheetEditable = isEditable;
    if (state.viewMode === EDIT && !isEditable) {
      state.viewMode = PLAY;
    }
    if (state.viewMode === TRUE && !state.hasSecrets) {
      state.viewMode = PLAY;
    }
    renderViewModeBar();
  };

  const setHeaderElement = (header: Element, isEditable: boolean): void => {
    headerElement = header;
    setSheetEditable(isEditable);
  };

  const setHasSecrets = (hasSecrets: boolean): void => {
    if (state.hasSecrets === hasSecrets) return;
    state.hasSecrets = hasSecrets;
    if (state.viewMode === TRUE && !state.hasSecrets) {
      state.viewMode = PLAY;
    }
    renderViewModeBar();
  };

  // --- State update ---

  const setViewMode = (newMode: ViewMode): void => {
    // Don't allow True Mode when there are no secrets or the user isn't a GM.
    if (newMode === TRUE && (!state.hasSecrets || !game.user.isGM)) return;
    // Don't allow edit for non-editable
    if (newMode === EDIT && !state.isSheetEditable) return;

    if (state.viewMode !== newMode) {
      state.viewMode = newMode;
      renderViewModeBar();
    }
  };

  return {
    viewMode,
    isEditMode,
    isPlayMode,
    isTrueMode,
    isOwnerOrGM,
    isSheetEditable,
    isGM,
    hasSecrets: hasSecretsRef,
    setHasSecrets,
    setViewMode,
    setSheetEditable,
    setHeaderElement,
    renderViewModeBar,
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