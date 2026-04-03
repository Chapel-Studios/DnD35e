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
  
  const updateIdentifiedMode = (newValue?: EditorViewMode) => {
    if (!isIdentifiable) return; // Don't allow changing mode if not identifiable
    if (newValue === undefined) {
      newValue = state.identifiedViewMode === IDENTIFIED
        ? UNIDENTIFIED
        : IDENTIFIED;
    }

    if (state.identifiedViewMode !== newValue) {
      state.identifiedViewMode = newValue;
    }
  };

  // Toggle edit mode when called with no argument, otherwise set to the provided value
  const updateIsEditMode = (newValue?: boolean) => {
    if (newValue === undefined) {
      newValue = !state.isEditViewMode;
    }

    if (state.isEditViewMode !== newValue) {
      state.isEditViewMode = newValue;
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