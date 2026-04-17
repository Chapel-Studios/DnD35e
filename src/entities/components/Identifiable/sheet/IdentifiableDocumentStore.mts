import { type DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { WithIdentifiableComponent } from '@ec/Identifiable/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Extends a base document store with identifiable-specific functionality.
 * This modifies the base store's behavior via setters and returns only identifiable-specific properties.
 * The base store's documentGetters/documentActions are automatically enhanced.
 */
const useIdentifiableStore = <TDocument extends WithIdentifiableComponent>(
  _context: VueApplicationContext<TDocument>,
  baseStore: DocumentSheetStore<TDocument>
): IdentifiableStore => {
  const {
    document,
  } = baseStore._storeUtils;

  // // ===== UNIDENTIFIED OVERRIDES =====
  // // Dnd35eField-wrapped fields store unidentifiedValue inline in the compound shape.
  // // Legacy non-schema fields (name, img) still fall back to the flags bag.
  // const unidentifiedOverrides = computed((): UnidentifiedOverrides => {
  //   return (document.value.getFlag('dnd35e', UNIDENTIFIED_OVERRIDES_FLAG) as UnidentifiedOverrides | undefined) ?? {};
  // });

  // ===== IDENTIFIABLE STATE =====
  const isIdentifiable = computed(() => {
    const system = document.value.system as { isIdentifiable?: boolean };
    return system?.isIdentifiable === true;
  });

  const isIdentified = computed(() => {
    const system = document.value.system as { isIdentified?: boolean };
    return system?.isIdentified ?? true; // default to identified if field doesn't exist
  });

  // // ===== SCHEMA-AWARE HELPERS =====
  // // The base store normalizes Dnd35eField paths by appending `.value`.
  // // Detect that suffix to find the parent compound shape with `unidentifiedValue`.
  // const getDnd35eParentData = (fieldPath: string): { parentPath: string; data: Record<string, unknown> } | undefined => {
  //   if (!fieldPath.endsWith('.value')) return undefined;
  //   const parentPath = fieldPath.slice(0, -'.value'.length);
  //   const parentData = foundry.utils.getProperty(document.value._source, parentPath) as Record<string, unknown> | null;
  //   if (parentData && typeof parentData === 'object' && 'unidentifiedValue' in parentData) {
  //     return { parentPath, data: parentData };
  //   }
  //   return undefined;
  // };

  // ===== OVERRIDE BASE STORE IMPLEMENTATIONS =====
  // These modify the base store's behavior via the setter utilities

  // const getUnidentifiedOverride = <T,>(fieldPath: string): T | undefined => {
  //   // Schema-based: Dnd35eField stores unidentifiedValue inline
  //   const compound = getDnd35eParentData(fieldPath);
  //   if (compound) return compound.data.unidentifiedValue as T | undefined;
  //   // Legacy fallback: flags bag
  //   const encodedPath = encodeUnidentifiedPath(fieldPath);
  //   return unidentifiedOverrides.value[encodedPath] as T | undefined;
  // };

  // Override getViewAwareFieldValue to consider view mode and unidentified overrides
  // setGetEffectiveFieldValue(<T,>(fieldPath: string, realValue: T): T => {
  //   if (!isViewingAsUnidentified.value) return realValue;
  //   // Schema-based: Dnd35eField stores unidentifiedValue inline
  //   const compound = getDnd35eParentData(fieldPath);
  //   if (compound) {
  //     const unidentified = compound.data.unidentifiedValue;
  //     return (unidentified != null ? unidentified : realValue) as T;
  //   }
  //   // Legacy fallback: flags bag
  //   const encodedPath = encodeUnidentifiedPath(fieldPath);
  //   const override = unidentifiedOverrides.value[encodedPath];
  //   return (override !== undefined ? override : realValue) as T;
  // });

  // Override getViewAwareFieldUpdater to write to overrides when in unidentified view
  // setGetViewAwareFieldUpdater((path: string) => {
  //   return async (value: unknown) => {
  //     if (isViewingAsUnidentified.value) {
  //       // Schema-based: Dnd35eField stores unidentifiedValue inline
  //       const compound = getDnd35eParentData(path);
  //       if (compound) {
  //         return await updateDocument({ [`${compound.parentPath}.unidentifiedValue`]: value } as Partial<TDocument>);
  //       }
  //       // Legacy fallback: flags bag
  //       return await setUnidentifiedOverride(path, value);
  //     } else {
  //       return await updateDocument({ [path]: value } as Partial<TDocument>);
  //     }
  //   };
  // });

  // Override editorViewMode to track the actual view mode
  // setEditorViewMode(() => editorViewMode.value);

  // ===== IDENTIFIABLE ACTIONS =====
  // const setUnidentifiedOverride = async (fieldPath: string, value: unknown): Promise<boolean> => {
  //   // Schema-based: Dnd35eField stores unidentifiedValue inline
  //   const compound = getDnd35eParentData(fieldPath);
  //   if (compound) {
  //     return await updateDocument({ [`${compound.parentPath}.unidentifiedValue`]: value } as Partial<TDocument>);
  //   }
  //   // Legacy fallback: flags bag for non-schema fields (name, img, etc.)
  //   const encodedPath = encodeUnidentifiedPath(fieldPath);
  //   const current = { ...unidentifiedOverrides.value };
  //   if (value === undefined) {
  //     delete current[encodedPath];
  //   } else {
  //     current[encodedPath] = value;
  //   }
  //   try {
  //     const updatedDoc = await document.value.setFlag('dnd35e', UNIDENTIFIED_OVERRIDES_FLAG, current);
  //     triggerDocumentRef({ ...context, document: updatedDoc as TDocument });
  //     return true;
  //   } catch (err) {
  //     console.error(`setUnidentifiedOverride('${fieldPath}'): error`, err);
  //     return false;
  //   }
  // };

  // ===== VISIBILITY MODE FLAGS =====
  // These are used by UI components to show/hide elements
  // Only GMs can see both identified/unidentified views and toggle between them
  // const showBoth = computed(() => game.user.isGM);
  // const showIdentified = computed(() => !isViewingAsUnidentified.value);
  // const showUnidentified = computed(() => isViewingAsUnidentified.value);
  // const showOnlyIdentified = computed(() => isIdentified.value);
  // const showOnlyUnidentified = computed(() => !isIdentified.value);

  // Visibility conditions - used in headers and other components
  // const showIdentifiedEditMode = computed(() => showIdentified.value && baseStore.isEditable.value);
  // const showIdentifiedDisplayMode = computed(() => showIdentified.value && !baseStore.isEditable.value);
  // const showUnidentifiedEditMode = computed(() => showUnidentified.value && baseStore.isEditable.value);
  // const showUnidentifiedDisplayMode = computed(() => showUnidentified.value && !baseStore.isEditable.value);

  // ===== EDITOR VIEW ACTIONS =====
  const editorViewActions = {
    // setEditorView: (mode: EditorViewMode) => {
    //   if (showBoth.value) {
    //     context.sheetState.editorViewMode = mode;
    //   }
    // },
    // toggleEditorView: () => {
    //   if (showBoth.value) {
    //     context.sheetState.editorViewMode = context.sheetState.editorViewMode === 'identified' ? 'unidentified' : 'identified';
    //   }
    // },
  };

  return {
    documentGetters: {
      isIdentifiable,
      isIdentified,
    },
    _storeUtils: {},
    documentActions: editorViewActions,
  };
};

type IdentifiableDocumentGetters = {
  isIdentifiable: ComputedRef<boolean>;
  isIdentified: ComputedRef<boolean>;
  // isViewingAsUnidentified: ComputedRef<boolean>;
  // unidentifiedOverrides: ComputedRef<UnidentifiedOverrides>;
  // getUnidentifiedOverride: <T>(fieldPath: string) => T | undefined;
  // identifiedDisplayName: ComputedRef<string>;
  // unidentifiedDisplayName: ComputedRef<string>;
};

type IdentifiableDocumentActions = Record<string, unknown>;
type IdentifiableDocumentStoreUtils = Record<string, unknown>;

interface IdentifiableStore {
  documentGetters: IdentifiableDocumentGetters;
  documentActions: IdentifiableDocumentActions;
  _storeUtils: IdentifiableDocumentStoreUtils;
}

type IdentifiableDocumentStore = DocumentSheetStore<WithIdentifiableComponent> & IdentifiableStore;

export {
  useIdentifiableStore,
};

export type {
  IdentifiableDocumentActions,
  IdentifiableDocumentGetters,
  IdentifiableDocumentStore,
  IdentifiableDocumentStoreUtils,
  IdentifiableStore,
};
