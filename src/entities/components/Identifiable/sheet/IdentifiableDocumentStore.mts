import { type DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentLike, WithIdentifiableComponent } from '@ec/Identifiable/index.mjs';
import type { UnidentifiedOverrides } from '@vc/Fields/FormGroups/unidentifiedOverrides.mjs';
import {
  encodeFieldPath as encodeUnidentifiedPath,
  UNIDENTIFIED_OVERRIDES_FLAG,
} from '@vc/Fields/FormGroups/unidentifiedOverrides.mjs';
import type { EditorViewMode, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Extends a base document store with identifiable-specific functionality.
 * This modifies the base store's behavior via setters and returns only identifiable-specific properties.
 * The base store's documentGetters/documentActions are automatically enhanced.
 */
const useIdentifiableStore = <TDocument extends WithIdentifiableComponent>(
  context: VueApplicationContext<TDocument>,
  baseStore: DocumentSheetStore<TDocument>
): IdentifiableStore => {
  const {
    document,
    updateDocument,
    refreshContext: triggerDocumentRef,
    setGetEffectiveFieldValue,
    setGetViewAwareFieldUpdater,
    setEditorViewMode,
  } = baseStore._storeUtils;

  // ===== UNIDENTIFIED OVERRIDES =====
  // These are stored in flags and allow any field to have a different value when unidentified
  const unidentifiedOverrides = computed((): UnidentifiedOverrides => {
    return (document.value.getFlag('dnd35e', UNIDENTIFIED_OVERRIDES_FLAG) as UnidentifiedOverrides | undefined) ?? {};
  });

  // ===== IDENTIFIABLE STATE =====
  const isIdentifiable = computed(() => {
    const system = document.value.system as { isIdentifiable?: boolean };
    return system?.isIdentifiable === true;
  });

  const isIdentified = computed(() => {
    const system = document.value.system as { isIdentified?: boolean };
    return system?.isIdentified ?? true; // default to identified if field doesn't exist
  });

  // Editor view mode from shared sheet state
  const editorViewMode = computed(() => context.sheetState?.editorViewMode ?? 'identified');

  // Determine if we should show/use unidentified values
  // - For GMs/editors who can toggle: based on their editorViewMode selection
  // - For players who can't toggle: based on the item's isIdentified status
  const isViewingAsUnidentified = computed(() => {
    if (!isIdentifiable.value) return false;
    
    // If user can toggle views (GM or has edit permission), use their selection
    const canToggleView = game.user.isGM || context.isEditable;
    if (canToggleView) {
      return editorViewMode.value === 'unidentified';
    }
    
    // Otherwise, show unidentified view if item is not identified
    return !isIdentified.value;
  });

  // ===== OVERRIDE BASE STORE IMPLEMENTATIONS =====
  // These modify the base store's behavior via the setter utilities

  const getUnidentifiedOverride = <T,>(fieldPath: string): T | undefined => {
    const encodedPath = encodeUnidentifiedPath(fieldPath);
    return unidentifiedOverrides.value[encodedPath] as T | undefined;
  };

  // Override getEffectiveFieldValue to consider view mode and unidentified overrides
  setGetEffectiveFieldValue(<T,>(fieldPath: string, realValue: T): T => {
    if (!isViewingAsUnidentified.value) return realValue;
    const encodedPath = encodeUnidentifiedPath(fieldPath);
    const override = unidentifiedOverrides.value[encodedPath];
    return (override !== undefined ? override : realValue) as T;
  });

  // Override getViewAwareFieldUpdater to write to overrides when in unidentified view
  setGetViewAwareFieldUpdater((path: string) => {
    return async (value: unknown) => {
      if (isViewingAsUnidentified.value) {
        return await setUnidentifiedOverride(path, value);
      } else {
        return await updateDocument({ [path]: value } as Partial<TDocument>);
      }
    };
  });

  // Override editorViewMode to track the actual view mode
  setEditorViewMode(() => editorViewMode.value);

  // ===== IDENTIFIABLE ACTIONS =====
  const setUnidentifiedOverride = async (fieldPath: string, value: unknown): Promise<boolean> => {
    const encodedPath = encodeUnidentifiedPath(fieldPath);
    const current = { ...unidentifiedOverrides.value };
    if (value === undefined) {
      delete current[encodedPath];
    } else {
      current[encodedPath] = value;
    }
    try {
      const updatedDoc = await document.value.setFlag('dnd35e', UNIDENTIFIED_OVERRIDES_FLAG, current);
      triggerDocumentRef({ ...context, document: updatedDoc as TDocument });
      return true;
    } catch (err) {
      console.error(`setUnidentifiedOverride('${fieldPath}'): error`, err);
      return false;
    }
  };

  // ===== VISIBILITY MODE FLAGS =====
  // These are used by UI components to show/hide elements
  const showBoth = computed(() => (game.user.isGM || baseStore.isEditable.value));
  const showIdentified = computed(() => !isViewingAsUnidentified.value);
  const showUnidentified = computed(() => isViewingAsUnidentified.value);
  const showOnlyIdentified = computed(() => isIdentified.value);
  const showOnlyUnidentified = computed(() => !isIdentified.value);

  // Visibility conditions - used in headers and other components
  const showIdentifiedEditMode = computed(() => showIdentified.value && baseStore.isEditable.value);
  const showIdentifiedDisplayMode = computed(() => showIdentified.value && !baseStore.isEditable.value);
  const showUnidentifiedEditMode = computed(() => showUnidentified.value && baseStore.isEditable.value);
  const showUnidentifiedDisplayMode = computed(() => showUnidentified.value && !baseStore.isEditable.value);

  // ===== EDITOR VIEW ACTIONS =====
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
    documentGetters: {
      isIdentifiable,
      isIdentified,
      isViewingAsUnidentified,
      unidentifiedOverrides,
      getUnidentifiedOverride,
      // Display names are derived/computed by the system, not direct overrides
      identifiedDisplayName: computed(() => (document.value.system as unknown as Record<string, unknown>).derivedName as string || ''),
      unidentifiedDisplayName: computed(() => document.value.system.derivedUnidentifiedName || ''),
      // Name formula for unidentified name (kept for now, may be refactored later)
      unidentifiedNameFormula: computed(() => document.value.system.unidentifiedNameFormula?.formula || ''),
    },
    _storeUtils: {
      setUnidentifiedOverride,
    },
    editorViewActions,
  };
};

type IdentifiableDocumentGetters = {
  isIdentifiable: ComputedRef<boolean>;
  isIdentified: ComputedRef<boolean>;
  isViewingAsUnidentified: ComputedRef<boolean>;
  unidentifiedOverrides: ComputedRef<UnidentifiedOverrides>;
  getUnidentifiedOverride: <T>(fieldPath: string) => T | undefined;
  identifiedDisplayName: ComputedRef<string>;
  unidentifiedDisplayName: ComputedRef<string>;
  unidentifiedNameFormula: ComputedRef<string>;
};

type IdentifiableDocumentStoreUtils = {
  setUnidentifiedOverride: (fieldPath: string, value: unknown) => Promise<boolean>;
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
  documentGetters: IdentifiableDocumentGetters;
  _storeUtils: IdentifiableDocumentStoreUtils;
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
  IdentifiableDocumentGetters,
  IdentifiableDocumentStore,
  IdentifiableDocumentStoreUtils,
  IdentifiableStore,
};
