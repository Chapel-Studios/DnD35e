import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { WithIdentifiableComponent } from '@ec/Identifiable/index.mjs';
import {
  identifiableDescriptionTab,
} from '@ec/Identifiable/index.mjs';
import type { EditorViewMode, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const useIdentifiableStore = <TDocument extends WithIdentifiableComponent>(context: VueApplicationContext<TDocument>, baseStore: DocumentSheetStore<TDocument>) => {
  baseStore.tabs.tabActions.replaceTabs([
    identifiableDescriptionTab,
  ]);

  const document = baseStore._document as Ref<TDocument>;

  // Editor view mode uses shared sheetState from context

  // UnidentifiedInfoMode
  const showBoth = computed(() => (game.user.isGM || baseStore.isEditable) && document.value.system.isIdentifiable);
  const showOnlyIdentified = computed(() =>
    !document.value.system.isIdentifiable ||
    (document.value.system.unidentifiedInfo?.isIdentified || false),
  );
  const showOnlyUnidentified = computed(() => document.value.system.isIdentifiable && !document.value.system.unidentifiedInfo?.isIdentified);
  const showIdentified = computed(() => {
    if (showBoth.value) {
      return context.sheetState.editorViewMode === 'identified';
    }
    return showOnlyIdentified.value;
  });
  const showUnidentified = computed(() => {
    if (showBoth.value) {
      return context.sheetState.editorViewMode === 'unidentified';
    }
    return showOnlyUnidentified.value;
  });

  // Getters
  const identifiableGetters = {
    unidentifiedDescription: computed(() => document.value.system.unidentifiedInfo?.unidentifiedDescription || ''),
    isIdentifiable: computed(() => document.value.system.isIdentifiable),
    identifiedDisplayName: computed(() => document.value.identifiedDisplayName),
    unidentifiedDisplayName: computed(() => document.value.unidentifiedDisplayName),
    unidentifiedName: computed(() => document.value.system.unidentifiedInfo?.unidentifiedName || ''),
    isUnidentifiedNameFromFormula: computed(() => document.value.system.unidentifiedInfo?.isUnidentifiedNameFromFormula || false),
    unidentifiedNameFormula: computed(() => document.value.system.unidentifiedInfo?.unidentifiedNameFormula || ''),
    unidentifiedPrice: computed(() => document.value.system.unidentifiedInfo?.unidentifiedPrice),
  };

  // Actions for editor view mode - modifies shared sheetState
  const editorViewActions = {
    setEditorView: (mode: EditorViewMode) => {
      if (showBoth.value) {
        context.sheetState.editorViewMode = mode;
      }
    },
    toggleEditorView: () => {
      if (showBoth.value) {
        context.sheetState.editorViewMode = context.sheetState.editorViewMode === 'identified' ? 'unidentified' : 'identified';
      }
    },
  };

  return {
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
      showOnlyIdentified,
      showOnlyUnidentified,
    },
    identifiableGetters,
    editorViewActions,
    editorViewMode: computed(() => context.sheetState.editorViewMode),
  };
};

interface IdentifiableStore {
  unidentifiedInfoMode: {
    showBoth: ComputedRef<boolean>;
    showIdentified: ComputedRef<boolean>;
    showUnidentified: ComputedRef<boolean>;
    showOnlyIdentified: ComputedRef<boolean>;
    showOnlyUnidentified: ComputedRef<boolean>;
  };
  identifiableGetters: {
    unidentifiedDescription: ComputedRef<string>;
    isIdentifiable: ComputedRef<boolean>;
    identifiedDisplayName: ComputedRef<string>;
    unidentifiedDisplayName: ComputedRef<string>;
    unidentifiedName: ComputedRef<string>;
    isUnidentifiedNameFromFormula: ComputedRef<boolean>;
    unidentifiedNameFormula: ComputedRef<string>;
    unidentifiedPrice: ComputedRef<number | null | undefined>;
  };
  editorViewMode: ComputedRef<EditorViewMode>;
  editorViewActions: {
    setEditorView: (mode: EditorViewMode) => void;
    toggleEditorView: () => void;
  };
}

type IdentifiableDocumentStore = DocumentSheetStore<WithIdentifiableComponent> & IdentifiableStore;

export {
  identifiableDescriptionTab,
  useIdentifiableStore,
};

export type {
  IdentifiableDocumentStore,
  IdentifiableStore,
};
