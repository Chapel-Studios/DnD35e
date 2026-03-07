import { ActorType } from '@actors/actorTypes.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import type { DnD35eActiveEffect } from '@effects/index.mjs';
import {
  ContextDocumentType,
  DocumentContext,
  getIntellisenseBuilder,
  hasIntellisenseSchema,
  IntellisenseContext,
  IntellisenseSchema,
  NonNullDocumentContext,
} from '@helpers/formulae/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/itemTypes.mjs';
import type {
  FieldOverride,
  FieldOverrides,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import { FIELD_OVERRIDES_FLAG_PATH } from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { Component, ComputedRef, ShallowRef } from 'vue';
import { computed, reactive, shallowRef, triggerRef, unref } from 'vue';

/**
 * Base document type that both Items and ActiveEffects share
 */
type SheetDocument = ItemDnd35e | DnD35eActiveEffect;

interface SheetTab {
  id: string;
  label: string;
  component: Component;
  order: number;
  icon?: string;
  tooltip?: string;
}

interface BaseSheetState {
  tabs: SheetTab[];
  activeTab: string;
  isEditable: boolean;
  renderOptions: { isFirstRender?: boolean } | undefined;
}

const createBaseState = (defaultTabs: SheetTab[] = [], defaultActiveTab: string = ''): BaseSheetState => ({
  tabs: defaultTabs,
  activeTab: defaultActiveTab || defaultTabs[0]?.id || '',
  isEditable: false,
  renderOptions: undefined,
});

type FormulaRegistration = {
  impactedField: string;
  formulaField: string;
  evaluate: (document: NonNullDocumentContext) => unknown;
  // contexts: {
  //   self: DocumentContext;
  //   [key: string]: DocumentContext;
  // };
}
type FormulaContextBuilder = (document: NonNullDocumentContext) => Record<string, DocumentContext> | null;

/**
 * Creates the base document sheet store with shared functionality for tabs and document management.
 * This is used by both useItemSheetStore and useActiveEffectConfigStore.
 */
const useDocumentSheetStore = <TDocument extends SheetDocument>(
  context: VueApplicationContext<TDocument>,
  options: {
    defaultTabs?: SheetTab[];
    defaultActiveTab?: string;
  } = {}
): DocumentSheetStore<TDocument> => {
  // Core state
  // Use shallowRef to avoid Vue's deep reactivity wrapping Foundry's document proxy,
  // which would conflict with EmbeddedCollection's non-configurable properties (e.g., effects)
  const document = shallowRef(context.document);
  const state = reactive({
    ...createBaseState(options.defaultTabs, options.defaultActiveTab),
    isEditable: context.isEditable,
    renderOptions: unref(context.renderOptions),
  });

  // const nameContextBuilder: Ref<FormulaContextBuilder> = ref(() => null);

  // const registeredFormulas = ref(new Set<FormulaRegistration>([
  //   {
  //     impactedField: 'system.derivedName',
  //     formulaField: 'system.nameFormula',
  //     evaluate: (document: NonNullDocumentContext) => {
  //       if (!document) return;

  //       const baseContext = nameContextBuilder.value(document) ?? {} as Record<string, DocumentContext>;
  //       baseContext.self = document;

  //       const newName = resolveFormulaField(
  //         document.system.nameFormula,
  //         baseContext,
  //         document.system.derivedName
  //       );
  //       console.log('[updateDocument] Resolved newName:', newName);
  //       return newName;
  //     },
  //   },
  //   {
  //     impactedField: 'name',
  //     formulaField: 'system.isIdentified',
  //     evaluate: (document: NonNullDocumentContext) => {
  //       return document.system.derivedName;
  //     },
  //   },
  // ]));

  // const setNameContextBuilder = (builder: FormulaContextBuilder) => {
  //   nameContextBuilder.value = builder;
  // };
  // const registerFormula = (registration: FormulaRegistration) => {
  //   registeredFormulas.value.add(registration);
  // };

  // Tabs
  const tabGetters = {
    activeTabId: computed(() => state.activeTab),
    tabs: computed(() => (state.tabs ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )),
    getIsTabOpen: (tabId: string) => computed(() => state.activeTab === tabId),
  };

  const tabActions = {
    activateTab: (tabId: string) => {
      state.activeTab = tabId;
    },
    replaceTabs: (newTabs: SheetTab[], resetActiveTab: boolean = true) => {
      state.tabs = [...newTabs];
      if (resetActiveTab) {
        state.activeTab = newTabs[0]?.id || '';
      }
    },
    appendTabs: (newTabs: SheetTab[]) => {
      state.tabs = [...state.tabs, ...newTabs];
    },
  };

  // Document getters - common to all document sheets
  const fieldOverrides = computed((): FieldOverrides => {
    return (foundry.utils.getProperty(document.value, FIELD_OVERRIDES_FLAG_PATH) as FieldOverrides | undefined) ?? {};
  });

  const documentGetters = {
    getProperty: <T,>(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),
    type: computed(() => document.value.type),
    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),

    name: computed(() => document.value.name || ''),
    displayName: computed(() => document.value.name || ''),
    nameFormula: computed(() => document.value.system.nameFormula?.formula || ''),

    img: computed(() => document.value.img || ''),

    systemUniqueId: computed(() => document.value.system.uniqueId || ''),
    documentUuid: computed(() => document.value.uuid || ''),

    description: computed(() => document.value.system.description.value || ''),

    // Field permission overrides
    fieldOverrides,
    getFieldOverride: (fieldPath: string): FieldOverride | undefined => {
      return fieldOverrides.value[fieldPath];
    },
  };

  const buildIntellisenseContext = <TSubType extends ContextDocumentType = ContextDocumentType> (doc: DocumentContext, aliases: string[] = []): IntellisenseContext => {
    const result = { properties: {}, aliases } satisfies IntellisenseContext;
    if (!doc) return result;

    const documentType = doc.documentName;
    const subtype = doc.type as TSubType;
    result.properties = hasIntellisenseSchema(documentType, subtype)
      ? getIntellisenseBuilder(documentType, subtype)!(doc)
      : {};
    
    return result;
  };
  const getSelf = (aliases: string[] = []) => computed((): IntellisenseContext => {
    return buildIntellisenseContext(document.value, aliases);
  });
  const getParent = (
    aliases: string[] = [],
    fallback?: { documentType: foundry.CONST.DocumentType; subtype: ContextDocumentType }
  ) => computed((): IntellisenseContext => {
    const doc = context.document?.parent;
    if (doc) return buildIntellisenseContext<ActorType | ItemType>(doc, aliases);

    // No parent — build a shell context from the fallback type (static schema, no live values)
    if (fallback && hasIntellisenseSchema(fallback.documentType, fallback.subtype)) {
      return {
        properties: getIntellisenseBuilder(fallback.documentType, fallback.subtype)!(),
        aliases,
      };
    }
    return { properties: {}, aliases };
  });
  const intellisense = {
    getSelf,
    getParent, // set as default so both item and effect get it, must be manually removed in actorStore
    nameFormulaIntellisenseSchema: computed((): IntellisenseSchema => {
      const selfContext = getSelf().value;
      return {
        self: selfContext,
      };
    }),
  };
  const localize = (text: string) => computed(() => game.i18n.localize(text));

  // Document actions
  const updateDocument =  async (
    data: Partial<TDocument>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {}
  ) => {
    const updatedDoc = await document.value.update(data, options) as TDocument;
    if (updatedDoc) {
      document.value = updatedDoc;
      // Since the object was mutated Vue refuses to see any changes;
      // TODO: write something smarter so we only have to refresh the parts of store that changed
      triggerRef(document);
      return true;
    }
    return false;
  };

  const documentActions = {
    updateDocument,
    getFieldUpdater: (path: string) => {
      return async (value: unknown) => {
        return await updateDocument({ [path]: value } as Partial<TDocument>);
      };
    },
    setFieldOverride: async (fieldPath: string, override: FieldOverride | null): Promise<boolean> => {
      const current = { ...fieldOverrides.value };
      if (override === null) {
        delete current[fieldPath];
      } else {
        current[fieldPath] = override;
      }
      return await updateDocument({ [FIELD_OVERRIDES_FLAG_PATH]: current } as unknown as Partial<TDocument>);
    },
    // setNameContextBuilder,
    // registerFormula,
    // removeFormula: (formulaFieldPath: string) => {
    //   for (const formula of registeredFormulas.value) {
    //     if (formula.formulaField === formulaFieldPath) {
    //       registeredFormulas.value.delete(formula);
    //       break;
    //     }
    //   }
    // },
  };

  // Edit mode - uses shared sheetState from context
  const isEditMode = computed(() => context.sheetState.editMode);

  const modeActions = {
    toggleEditMode: () => {
      context.sheetState.editMode = !context.sheetState.editMode;
    },
    setEditMode: (enabled: boolean) => {
      context.sheetState.editMode = enabled;
    },
  };

  // Field permissions
  const isGM = computed(() => game.user.isGM);
  const isOwnerOrGM = computed(() => {
    if (game.user.isGM) return true;
    return document.value.testUserPermission(game.user, 'OWNER');
  });

  return {
    isEditable: computed(() => state.isEditable && isEditMode.value),
    isEditMode,
    isFirstRender: computed(() => state.renderOptions?.isFirstRender),
    tabs: {
      tabGetters,
      tabActions,
    },
    modeActions,
    _document: document as ShallowRef<TDocument>,
    documentGetters,
    documentActions,
    intellisense,
    localize,
    // Field permissions
    isGM,
    isOwnerOrGM,
  };
};

type DocumentSheetStore<TDocument extends SheetDocument = SheetDocument> = {
  isEditable: ComputedRef<boolean>;
  isEditMode: ComputedRef<boolean>;
  isFirstRender: ComputedRef<boolean | undefined>;
  tabs: {
    tabGetters: {
      activeTabId: ComputedRef<string>;
      tabs: ComputedRef<(SheetTab & { order: number })[]>;
      getIsTabOpen: (tabId: string) => ComputedRef<boolean>;
    };
    tabActions: {
      activateTab: (tabId: string) => void;
      replaceTabs: (newTabs: SheetTab[]) => void;
      appendTabs: (newTabs: SheetTab[]) => void;
    };
  };
  modeActions: {
    toggleEditMode: () => void;
    setEditMode: (enabled: boolean) => void;
  };
  _document: ShallowRef<TDocument>;
  documentGetters: {
    getProperty: <T>(path: string) => ComputedRef<T>;
    type: ComputedRef<string>;
    localizedType: ComputedRef<string>;
    name: ComputedRef<string>;
    displayName: ComputedRef<string>;
    nameFormula: ComputedRef<string>;
    img: ComputedRef<string>;
    systemUniqueId: ComputedRef<string>;
    documentUuid: ComputedRef<string>;
    description: ComputedRef<string>;
    // Field permission overrides
    fieldOverrides: ComputedRef<FieldOverrides>;
    getFieldOverride: (fieldPath: string) => FieldOverride | undefined;
  };
  intellisense: {
    getSelf: (aliases?: string[]) => ComputedRef<IntellisenseContext>;
    getParent: (aliases?: string[], fallback?: { documentType: foundry.CONST.DocumentType; subtype: ContextDocumentType }) => ComputedRef<IntellisenseContext>;
    nameFormulaIntellisenseSchema: ComputedRef<IntellisenseSchema>;
  };
  documentActions: {
    updateDocument: (data: Partial<TDocument>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
    getFieldUpdater: (path: string) => (value: unknown) => Promise<boolean>;
    setFieldOverride: (fieldPath: string, override: FieldOverride | null) => Promise<boolean>;
    // registerFormula: (registration: FormulaRegistration) => void;
    // removeFormula: (formulaFieldPath: string) => void;
  };
  localize: (text: string) => ComputedRef<string>;
  // Field permissions
  isGM: ComputedRef<boolean>;
  isOwnerOrGM: ComputedRef<boolean>;
};

export {
  useDocumentSheetStore,
};

export type {
  DocumentSheetStore,
  FormulaContextBuilder,
  FormulaRegistration,
  SheetDocument,
  SheetTab,
};
