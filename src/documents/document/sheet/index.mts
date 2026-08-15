import DescriptionEditor from './components/DescriptionEditor.vue';
import DocumentArt from './components/DocumentArt.vue';
import DocumentHeader from './components/DocumentHeader.vue';
import DocumentName from './components/DocumentName.vue';
import DocumentSheetBody from './components/DocumentSheetBody.vue';
import HeaderNameField from './components/HeaderNameField.vue';
import type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  SheetDocument,
} from './DocumentSheetStore.mjs';
import {
  DocumentSheetStoreSymbol,
  useDocumentSheetStore,
} from './DocumentSheetStore.mjs';
import type { 
  DocumentSheetStoreTabActions,
  DocumentSheetStoreTabGetters,
  FieldMeta,
  FieldOverridesStore,
  FieldOverridesStoreActions,
  FieldOverridesStoreGetters,
  FieldOverridesStoreOptions,
  FieldOverridesStoreUtils,
  FieldOverrideValue,
  RenderModeStore,
  SheetTab,
  TabsState,
  TabStore,
  TabStoreOptions,
} from './stores/index.mjs';
import {
  defaultTabStoreOptions,
  FieldOverridesStoreSymbol,
  pickMoreRestrictive,
  RenderModeStoreSymbol,
  TabStoreSymbol,
  useFieldOverridesStore,
  useRenderModeStore,
  useTabStore,
} from './stores/index.mjs';
import {
  defaultDetailsTab,
  DocumentDetails,
  preparationWarningsTab,
} from './tabs/index.mjs';
import type { EvaluationDocument, FormulaRegistration } from './types.mjs';

type SheetMode = 'item' | 'effect';

export {
  defaultDetailsTab,
  defaultTabStoreOptions,
  DescriptionEditor,
  DocumentArt,
  DocumentDetails,
  DocumentHeader,
  DocumentName,
  DocumentSheetBody,
  DocumentSheetStoreSymbol,
  FieldOverridesStoreSymbol,
  HeaderNameField,
  pickMoreRestrictive,
  preparationWarningsTab,
  RenderModeStoreSymbol,
  TabStoreSymbol,
  useDocumentSheetStore,
  useFieldOverridesStore,
  useRenderModeStore,
  useTabStore,
};

export type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreTabActions,
  DocumentSheetStoreTabGetters,
  DocumentSheetStoreUtils,
  EvaluationDocument,
  FieldMeta,
  FieldOverridesStore,
  FieldOverridesStoreActions,
  FieldOverridesStoreGetters,
  FieldOverridesStoreOptions,
  FieldOverridesStoreUtils,
  FieldOverrideValue,
  FormulaRegistration,
  RenderModeStore,
  SheetDocument,
  SheetMode,
  SheetTab,
  TabsState,
  TabStore,
  TabStoreOptions,
};
