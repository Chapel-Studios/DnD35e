import DefaultHeaderName from './components/DefaultHeaderName.vue';
import DocumentHeader from './components/DocumentHeader.vue';
import DocumentName from './components/DocumentName.vue';
import DocumentSheetBody from './components/DocumentSheetBody.vue';
import EditModeToggle from './components/EditModeToggle.vue';
import HeaderNameField from './components/HeaderNameField.vue';
import ItemArt from './components/ItemArt.vue';
import {
  defaultDetailsTab,
  DocumentDetails,
} from './tabs/index.mjs';
import type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  FormulaContextBuilder,
  FormulaRegistration,
  SheetDocument,
  SheetTab,
} from './useDocumentSheetStore.mjs';
import {
  useDocumentSheetStore,
} from './useDocumentSheetStore.mjs';

type SheetMode = 'item' | 'effect';

export {
  defaultDetailsTab,
  DefaultHeaderName,
  DocumentDetails,
  DocumentHeader,
  DocumentName,
  DocumentSheetBody,
  EditModeToggle,
  HeaderNameField,
  ItemArt,
  useDocumentSheetStore,
};

export type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  FormulaContextBuilder,
  FormulaRegistration,
  SheetDocument,
  SheetMode,
  SheetTab,
};
