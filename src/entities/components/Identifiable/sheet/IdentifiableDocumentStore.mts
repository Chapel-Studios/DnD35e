import { type DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { WithIdentifiableComponent } from '@ec/Identifiable/index.mjs';
import type { EditorViewMode, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const useIdentifiableStore = <TDocument extends WithIdentifiableComponent>(context: VueApplicationContext<TDocument>, baseStore: DocumentSheetStore<TDocument>) => {
  const document = baseStore._document as Ref<TDocument>;

  // UnidentifiedVisibilityMode - consolidated visibility and edit/display mode flags
  const showBoth = computed(() => (game.user.isGM || baseStore.isEditable.value));
  const showOnlyIdentified = computed(() => document.value.system.isIdentified);
  const showOnlyUnidentified = computed(() => !document.value.system.isIdentified);
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
    unidentifiedDescription: computed(() => document.value.system.unidentifiedDescription || ''),
    isIdentified: computed(() => document.value.system.isIdentified),
    identifiedDisplayName: computed(() => (document.value.system as unknown as Record<string, unknown>).derivedName as string || ''),
    unidentifiedDisplayName: computed(() => document.value.system.derivedUnidentifiedName || ''),
    unidentifiedNameFormula: computed(() => document.value.system.unidentifiedNameFormula?.formula || ''),
    unidentifiedPrice: computed(() => document.value.system.unidentifiedPrice ?? 0),
  };
  
  const identifiableActions = {};

  // Visibility conditions - used in headers and other components
  const showIdentifiedEditMode = computed(() => showIdentified.value && baseStore.isEditable.value);
  const showIdentifiedDisplayMode = computed(() => showIdentified.value && !baseStore.isEditable.value);
  const showUnidentifiedEditMode = computed(() => showUnidentified.value && baseStore.isEditable.value);
  const showUnidentifiedDisplayMode = computed(() => showUnidentified.value && !baseStore.isEditable.value);

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
    unidentifiedVisibilityMode: {
      showBoth,
      showIdentified,
      showUnidentified,
      showOnlyIdentified,
      showOnlyUnidentified,
      showIdentifiedEditMode,
      showIdentifiedDisplayMode,
      showUnidentifiedEditMode,
      showUnidentifiedDisplayMode,
    },
    identifiableGetters,
    identifiableActions,
    editorViewActions,
    editorViewMode: computed(() => context.sheetState.editorViewMode),
  };
};

interface IdentifiableStore {
  unidentifiedVisibilityMode: {
    showBoth: ComputedRef<boolean>;
    showIdentified: ComputedRef<boolean>;
    showUnidentified: ComputedRef<boolean>;
    showOnlyIdentified: ComputedRef<boolean>;
    showOnlyUnidentified: ComputedRef<boolean>;
    showIdentifiedEditMode: ComputedRef<boolean>;
    showIdentifiedDisplayMode: ComputedRef<boolean>;
    showUnidentifiedEditMode: ComputedRef<boolean>;
    showUnidentifiedDisplayMode: ComputedRef<boolean>;
  };
  identifiableGetters: {
    unidentifiedDescription: ComputedRef<string>;
    isIdentified: ComputedRef<boolean>;
    identifiedDisplayName: ComputedRef<string>;
    unidentifiedDisplayName: ComputedRef<string>;
    unidentifiedNameFormula: ComputedRef<string>;
    unidentifiedPrice: ComputedRef<number>;
  };
  identifiableActions: Record<string, never>;
  editorViewMode: ComputedRef<EditorViewMode>;
  editorViewActions: {
    setEditorView: (mode: EditorViewMode) => void;
    toggleEditorView: () => void;
  };
}

type IdentifiableDocumentStore = DocumentSheetStore<WithIdentifiableComponent> & IdentifiableStore;

export {
  useIdentifiableStore,
};

export type {
  IdentifiableDocumentStore,
  IdentifiableStore,
};
