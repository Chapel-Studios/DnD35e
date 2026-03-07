import { type DocumentSheetStore, FormulaContextBuilder } from '@ec/CoreMixin/index.mjs';
import type { WithIdentifiableComponent } from '@ec/Identifiable/index.mjs';
import { identifiableDescriptionTab } from '@ec/Identifiable/index.mjs';
import type { EditorViewMode, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const useIdentifiableStore = <TDocument extends WithIdentifiableComponent>(context: VueApplicationContext<TDocument>, baseStore: DocumentSheetStore<TDocument>) => {
  baseStore.tabs.tabActions.replaceTabs([
    identifiableDescriptionTab,
  ]);

  const document = baseStore._document as Ref<TDocument>;
  // const unidentifiedNameContextBuilder: Ref<FormulaContextBuilder | ((document: DocumentContext) => null)> = ref(() => null);

  // baseStore.documentActions.registerFormula({
  //   impactedField: 'system.derivedUnidentifiedName',
  //   formulaField: 'system.unidentifiedNameFormula',
  //   evaluate: (document: DocumentContext) => {
  //     const idocument = document as IdentifiableDocumentLike;
  //     if (!idocument || !idocument.system.isIdentified) return;

  //     const baseContext = unidentifiedNameContextBuilder.value(idocument) ?? {} as Record<string, DocumentContext>;
  //     baseContext.self = idocument;

  //     const newName = resolveFormulaField(
  //       idocument.system.unidentifiedNameFormula,
  //       baseContext,
  //       idocument.system.derivedUnidentifiedName || idocument.name
  //     );
  //     console.log('[updateDocument] Resolved newName:', newName);
  //   },
  // });
  // baseStore.documentActions.removeFormula('name');
  // baseStore.documentActions.registerFormula({
  //   impactedField: 'name',
  //   formulaField: 'system.isIdentified',
  //   evaluate: (document: DocumentContext) => {
  //     const idocument = document as IdentifiableDocumentLike;
  //     if (!idocument) return;

  //     return idocument.system.isIdentified
  //       ? idocument.system.derivedName
  //       : idocument.system.derivedUnidentifiedName || '';
  //   },
  // });
  // const setUnidentifiedNameContextBuilder = (builder: FormulaContextBuilder) => {
  //   unidentifiedNameContextBuilder.value = builder;
  // };

  // Editor view mode uses shared sheetState from context

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
    identifiedDisplayName: computed(() => document.value.identifiedDisplayName),
    unidentifiedDisplayName: computed(() => document.value.unidentifiedDisplayName),
    unidentifiedNameFormula: computed(() => document.value.system.unidentifiedNameFormula?.formula || ''),
    unidentifiedPrice: computed(() => document.value.system.unidentifiedPrice ?? 0),
  };
  
  const identifiableActions = {
    // setUnidentifiedNameContextBuilder,
  };

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

  // // Override documentActions to handle both identified and unidentified name formulas
  // const updateDocument = async (
  //   data: any,
  //   options: any = {}
  // ) => {
  //   const updateData = { ...data };
    
  //   // Merge the update data into a copy of the document for formula evaluation
  //   const evaluationContext = foundry.utils.mergeObject(
  //     foundry.utils.deepClone((document.value as any).toObject()),
  //     updateData,
  //     { inplace: false }
  //   ) as any;

  //   // Determine if we're in identified state
  //   const isIdentified = evaluationContext.system.unidentifiedInfo?.isIdentified ?? true;

  //   // Build document data map for formula resolution
  //   // evaluationContext is a plain object; get actor from live document for #owner
  //   const actor = (document.value as any).actor;
  //   const documentDataMap: Record<string, ItemDnd35e | ActorDnd35e> = {
  //     self: evaluationContext,
  //     ...(actor ? { owner: actor.toObject() } : {}),
  //   };

  //   // Evaluate only the relevant formula based on identification state
  //   if (isIdentified && evaluationContext.system.nameFormula) {
  //     const newName = resolveFormulaField(evaluationContext.system.nameFormula, documentDataMap, document.value.name);
  //     updateData.name = newName;
  //   } else if (!isIdentified && evaluationContext.system.unidentifiedInfo?.unidentifiedNameFormula) {
  //     const newName = resolveFormulaField(evaluationContext.system.unidentifiedInfo.unidentifiedNameFormula, documentDataMap, document.value.name);
  //     updateData.name = newName;
  //   }

  //   // Call raw update directly without going through base store's updateDocument to avoid double evaluation
  //   const updatedDoc = await document.value.update(updateData, options) as any;
  //   if (updatedDoc) {
  //     document.value = updatedDoc;
  //     triggerRef(document);
  //     return true;
  //   }
  //   return false;
  // };

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
    isIdentifiable: ComputedRef<boolean>;
    identifiedDisplayName: ComputedRef<string>;
    unidentifiedDisplayName: ComputedRef<string>;
    unidentifiedNameFormula: ComputedRef<string>;
    unidentifiedPrice: ComputedRef<number>;
  };
  identifiableActions: {
    setUnidentifiedNameContextBuilder: (builder: FormulaContextBuilder) => void;
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
